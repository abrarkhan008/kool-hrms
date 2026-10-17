import express from 'express'
import cors from 'cors'
import pg from 'pg'
import crypto from 'crypto'

const app = express()
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))
app.use(express.json({ limit: '10mb' }))

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
const SECRET = process.env.SECRET, ADMIN_KEY = process.env.ADMIN_KEY

const sha = (t) => crypto.createHash('sha256').update(String(t)).digest('hex')
const sign = (id) => id + '.' + crypto.createHmac('sha256', SECRET).update(id).digest('hex')
const empFromToken = (req) => {
  const t = (req.get('authorization') || '').replace('Bearer ', '')
  const id = t.split('.')[0]
  return t && sign(id) === t ? id : null
}
const isAdmin = (req) => !!ADMIN_KEY && req.get('x-admin-key') === ADMIN_KEY

await pool.query(`create table if not exists config (id int primary key, data jsonb not null)`)
await pool.query(`create table if not exists visits (
  id text primary key, emp_id text, emp_name text, date text, client text, work text,
  status text, data jsonb, lat double precision, lng double precision, updated_at timestamptz default now())`)
await pool.query(`delete from visits where updated_at < now() - interval '90 days'`)

app.get('/', (_, res) => res.send('ok'))

// Admin publishes the employee list + settings
app.put('/api/config', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Wrong admin key' })
  await pool.query(`insert into config(id,data) values(1,$1) on conflict (id) do update set data=$1`, [req.body])
  res.json({ ok: true })
})

// Employee login on any phone
app.post('/api/login', async (req, res) => {
  const { id = '', pin = '' } = req.body
  const r = await pool.query('select data from config where id=1')
  const cfg = r.rows[0]?.data
  if (!cfg) return res.status(400).json({ error: 'Admin has not published yet' })
  const e = (cfg.employees || []).find((x) => x.id.toLowerCase() === String(id).trim().toLowerCase() && x.active !== false)
  const ok = e && (e.pinHash ? sha(pin) === e.pinHash : String(pin) === String(e.pin || '1234'))
  if (!ok) return res.status(401).json({ error: 'Wrong Employee ID or PIN' })
  const { pin: _a, pinHash: _b, ...safe } = e
  res.json({ token: sign(e.id), employee: safe, settings: cfg.settings })
})

// Employee saves a visit (new or edited)
app.post('/api/visit', async (req, res) => {
  const empId = empFromToken(req)
  if (!empId) return res.status(401).json({ error: 'Login again' })
  const v = req.body
  await pool.query(
    `insert into visits(id,emp_id,emp_name,date,client,work,status,data,lat,lng,updated_at)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
     on conflict (id) do update set client=$5, work=$6, status=$7, data=$8, updated_at=now()`,
    [v.id, empId, v.empName || '', v.date, v.client, v.work, v.status, v, v.gps?.lat ?? null, v.gps?.lng ?? null])
  res.json({ ok: true })
})

// Admin reads visits
app.get('/api/visits', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Wrong admin key' })
  const { date, emp } = req.query
  const r = await pool.query(
    `select * from visits where ($1::text is null or date=$1) and ($2::text is null or emp_id=$2) order by updated_at asc`,
    [date || null, emp || null])
  res.json(r.rows)
})

app.listen(process.env.PORT || 3000, () => console.log('server running'))