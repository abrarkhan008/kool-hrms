import express from "express";
import cors from "cors";
import pg from "pg";
import crypto from "crypto";

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json({ limit: "10mb" }));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const SECRET = process.env.SECRET,
  ADMIN_KEY = process.env.ADMIN_KEY;

const sha = (t) => crypto.createHash("sha256").update(String(t)).digest("hex");
const sign = (id) =>
  id + "." + crypto.createHmac("sha256", SECRET).update(id).digest("hex");
const empFromToken = (req) => {
  const t = (req.get("authorization") || "").replace("Bearer ", "");
  const id = t.split(".")[0];
  return t && sign(id) === t ? id : null;
};
const isAdmin = (req) => !!ADMIN_KEY && req.get("x-admin-key") === ADMIN_KEY;

await pool.query(
  `create table if not exists config (id int primary key, data jsonb not null)`,
);
await pool.query(`create table if not exists visits (
  id text primary key, emp_id text, emp_name text, date text, client text, work text,
  status text, data jsonb, lat double precision, lng double precision, updated_at timestamptz default now())`);
await pool.query(
  `delete from visits where updated_at < now() - interval '90 days'`,
);

app.get("/", (_, res) => res.send("ok"));

// Admin publishes the employee list + settings
app.put("/api/config", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Wrong admin key" });
  await pool.query(
    `insert into config(id,data) values(1,$1) on conflict (id) do update set data=$1`,
    [req.body],
  );
  res.json({ ok: true });
});

// Employee login on any phone
app.post("/api/login", async (req, res) => {
  const { id = "", pin = "" } = req.body;
  const r = await pool.query("select data from config where id=1");
  const cfg = r.rows[0]?.data;
  if (!cfg)
    return res.status(400).json({ error: "Admin has not published yet" });
  const e = (cfg.employees || []).find(
    (x) =>
      x.id.toLowerCase() === String(id).trim().toLowerCase() &&
      x.active !== false,
  );
  const ok =
    e &&
    (e.pinHash
      ? sha(pin) === e.pinHash
      : String(pin) === String(e.pin || "1234"));
  if (!ok) return res.status(401).json({ error: "Wrong Employee ID or PIN" });
  const { pin: _a, pinHash: _b, ...safe } = e;
  res.json({ token: sign(e.id), employee: safe, settings: cfg.settings });
});

// Employee saves a visit (new or edited)
app.post("/api/visit", async (req, res) => {
  const admin = isAdmin(req);
  const v = req.body;
  const empId = admin ? v.empId : empFromToken(req);
  if (!empId) return res.status(401).json({ error: "Login again" });
  await pool.query(
    `insert into visits(id,emp_id,emp_name,date,client,work,status,data,lat,lng,updated_at)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
     on conflict (id) do update set emp_id=$2, emp_name=$3, date=$4, client=$5, work=$6, status=$7, data=$8,
       lat=coalesce($9, visits.lat), lng=coalesce($10, visits.lng), updated_at=now()
     where $11::boolean or visits.emp_id=$2`,
    [
      v.id,
      empId,
      v.empName || "",
      v.date,
      v.client,
      v.work,
      v.status,
      v,
      v.gps?.lat ?? null,
      v.gps?.lng ?? null,
      admin,
    ],
  );
  res.json({ ok: true });
});

app.get("/api/visits", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Wrong admin key" });
  const { date, emp, month } = req.query;
  const r = await pool.query(
    `select * from visits where ($1::text is null or date=$1) and ($2::text is null or emp_id=$2)
     and ($3::text is null or date like ($3::text || '%')) order by updated_at asc`,
    [date || null, emp || null, month || null],
  );
  res.json(r.rows);
});

// Employee reads own tasks (this month + anything not completed)
app.get("/api/mywork", async (req, res) => {
  const empId = empFromToken(req);
  if (!empId) return res.status(401).json({ error: "Login again" });
  const from = new Date(Date.now() - 62 * 864e5).toISOString().slice(0, 10);
  const r = await pool.query(
    `select id, emp_id, data from visits where emp_id=$1 and (date>=$2 or status<>'Completed') order by updated_at`,
    [empId, from],
  );
  res.json(r.rows);
});

app.delete("/api/visit/:id", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Wrong admin key" });
  await pool.query("delete from visits where id=$1", [req.params.id]);
  res.json({ ok: true });
});

// Live position (item 5)
await pool.query(`create table if not exists live (emp_id text primary key, emp_name text, lat double precision,
  lng double precision, on_site boolean, site text, acc int, updated_at timestamptz default now())`);

app.post("/api/live", async (req, res) => {
  const empId = empFromToken(req);
  if (!empId) return res.status(401).json({ error: "Login again" });
  const v = req.body;
  await pool.query(
    `insert into live(emp_id,emp_name,lat,lng,on_site,site,acc,updated_at) values($1,$2,$3,$4,$5,$6,$7,now())
     on conflict (emp_id) do update set emp_name=$2, lat=$3, lng=$4, on_site=$5, site=$6, acc=$7, updated_at=now()`,
    [
      empId,
      v.empName || "",
      v.lat,
      v.lng,
      !!v.on,
      v.site || "",
      Math.round(v.acc || 0),
    ],
  );
  res.json({ ok: true });
});

app.get("/api/live", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Wrong admin key" });
  res.json((await pool.query("select * from live order by emp_name")).rows);
});

// Admin reads visits
app.get("/api/visits", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Wrong admin key" });
  const { date, emp } = req.query;
  const r = await pool.query(
    `select * from visits where ($1::text is null or date=$1) and ($2::text is null or emp_id=$2) order by updated_at asc`,
    [date || null, emp || null],
  );
  res.json(r.rows);
});
await pool.query(
  `create table if not exists punches (emp_id text, date text, data jsonb, updated_at timestamptz default now(), primary key (emp_id, date))`,
);
await pool.query(
  `create table if not exists leaves (id text primary key, emp_id text, emp_name text, status text default 'Pending', data jsonb, updated_at timestamptz default now())`,
);
await pool.query(
  `create table if not exists notices (id serial primary key, emp_id text, text text, created_at timestamptz default now())`,
);

// Punch times: phone -> server -> admin
app.post("/api/punch", async (req, res) => {
  const empId = empFromToken(req);
  if (!empId) return res.status(401).json({ error: "Login again" });
  const { date, in: inT, out } = req.body;
  if (!date || Math.abs(Date.now() - new Date(date).getTime()) > 3 * 864e5)
    return res.status(400).json({ error: "Bad date" });
  const data = {};
  if (inT) data.in = inT;
  if (out) data.out = out;
  await pool.query(
    `insert into punches(emp_id,date,data) values($1,$2,$3::jsonb)
    on conflict (emp_id,date) do update set data = punches.data || $3::jsonb, updated_at=now()`,
    [empId, date, data],
  );
  res.json({ ok: true });
});
app.get("/api/punches", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Wrong admin key" });
  const r = await pool.query(
    `select emp_id, date, data from punches where date like $1`,
    [(req.query.month || "") + "%"],
  );
  res.json(r.rows);
});

// Leave requests
const leaveOut = (r) => ({
  ...r.data,
  id: r.id,
  empId: r.emp_id,
  empName: r.emp_name,
  status: r.status,
});
app.post("/api/leave", async (req, res) => {
  const empId = empFromToken(req);
  if (!empId) return res.status(401).json({ error: "Login again" });
  const v = req.body;
  if (!["CL", "EL"].includes(v.type) || !v.from || !v.to)
    return res.status(400).json({ error: "Bad request" });
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  await pool.query(
    `insert into leaves(id,emp_id,emp_name,data) values($1,$2,$3,$4)`,
    [
      id,
      empId,
      v.empName || "",
      { type: v.type, from: v.from, to: v.to, reason: v.reason || "" },
    ],
  );
  res.json({ ok: true, id });
});
app.get("/api/myleaves", async (req, res) => {
  const empId = empFromToken(req);
  if (!empId) return res.status(401).json({ error: "Login again" });
  res.json(
    (
      await pool.query(
        "select * from leaves where emp_id=$1 order by updated_at desc limit 50",
        [empId],
      )
    ).rows.map(leaveOut),
  );
});
app.get("/api/leaves", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Wrong admin key" });
  res.json(
    (
      await pool.query(
        "select * from leaves order by updated_at desc limit 300",
      )
    ).rows.map(leaveOut),
  );
});
app.post("/api/leave/:id", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Wrong admin key" });
  if (!["Approved", "Rejected"].includes(req.body.status))
    return res.status(400).json({ error: "Bad status" });
  await pool.query(
    "update leaves set status=$2, updated_at=now() where id=$1",
    [req.params.id, req.body.status],
  );
  res.json({ ok: true });
});

// Messages from admin (fines etc.)
app.post("/api/notice", async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: "Wrong admin key" });
  await pool.query("insert into notices(emp_id,text) values($1,$2)", [
    req.body.empId,
    req.body.text,
  ]);
  res.json({ ok: true });
});
app.get("/api/notices", async (req, res) => {
  const empId = empFromToken(req);
  if (!empId) return res.status(401).json({ error: "Login again" });
  res.json(
    (
      await pool.query(
        `select id, text, created_at from notices where emp_id=$1 and created_at > now() - interval '30 days' order by id desc limit 10`,
        [empId],
      )
    ).rows,
  );
});

// Employee refreshes own profile (photos, settings) after admin presses Publish
app.get("/api/me", async (req, res) => {
  const empId = empFromToken(req);
  if (!empId) return res.status(401).json({ error: "Login again" });
  const cfg = (await pool.query("select data from config where id=1")).rows[0]
    ?.data;
  const e = (cfg?.employees || []).find((x) => x.id === empId);
  if (!e) return res.status(404).json({ error: "Not published" });
  const { pin: _a, pinHash: _b, ...safe } = e;
  res.json({ employee: safe, settings: cfg.settings });
});

app.listen(process.env.PORT || 3000, () => console.log("server running"));
