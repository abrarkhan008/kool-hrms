import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Repeat, FileSpreadsheet } from "lucide-react";
import { useStore } from "../lib/store.jsx";
import { dayInfo } from "../lib/attendance.js";
import {
  todayKey,
  monthKey,
  addMonths,
  monthLabel,
  prettyDate,
  timeLabel,
} from "../lib/date.js";
import { Card, PageHeader, Modal, Field, Pill } from "./ui.jsx";
import { api, apiOn } from "../lib/api.js";
import { getPosition } from "../lib/geo.js";
import { DEFAULT_PARTS } from "../lib/parts.js";

export const WSTATUS = ["Not started", "In process", "Pending", "Completed"];
const CLS = {
  "Not started": "bg-slate-100 text-slate-600",
  "In process": "bg-sky-100 text-sky-700",
  Pending: "bg-amber-100 text-amber-700",
  Completed: "bg-emerald-100 text-emerald-700",
};
const blank = (empId) => ({
  id: "",
  empId,
  date: todayKey(),
  start: "",
  end: "",
  client: "",
  work: "",
  status: "Not started",
  action: "",
  mNew: "",
  mDefect: "",
  mChanged: "",
  repeat: false,
  repeatBy: "",
});

export default function WorkSheet({ empId = null }) {
  const admin = !empId;
  const { state, update } = useStore();
  const [mk, setMk] = useState(monthKey());
  const [flt, setFlt] = useState("All");
  const [who, setWho] = useState("all");
  const [f, setF] = useState(null);
  const staff = state.employees.filter((e) => e.active !== false);
  const name = (id) => state.employees.find((e) => e.id === id)?.name || id;
  const months = Array.from({ length: 12 }, (_, i) =>
    addMonths(monthKey(), i - 11),
  );
  const today = todayKey();
  const PARTS = state.settings.partsText
    ? state.settings.partsText
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean)
    : DEFAULT_PARTS;

  const mine = useMemo(
    () =>
      (state.work || []).filter(
        (w) =>
          w.date.startsWith(mk) &&
          (admin ? who === "all" || w.empId === who : w.empId === empId),
      ),
    [state.work, mk, who, empId],
  );
  const rows = mine
    .filter((w) => flt === "All" || w.status === flt)
    .sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
  const count = (s) => mine.filter((w) => w.status === s).length;
  const scope = admin
    ? staff.filter((e) => who === "all" || e.id === who)
    : staff.filter((e) => e.id === empId);
  const upd = useRef(update);
  upd.current = update;

  const askKey = () => {
    if (!localStorage.getItem("admin_key")) {
      const k = prompt("Enter the ADMIN_KEY you set in Render");
      if (k) localStorage.setItem("admin_key", k);
    }
    return !!localStorage.getItem("admin_key");
  };

  const push = async (rec) => {
    if (!apiOn) return;
    try {
      const body = { ...rec, empName: name(rec.empId) };
      if (admin) {
        if (!askKey()) return;
        await api("/api/visit", { method: "POST", admin: true, body });
      } else await api("/api/visit", { method: "POST", body });
    } catch (e) {
      alert("Saved here, but could not send to the server: " + e.message);
    }
  };

  const sync = async () => {
    if (!apiOn) return;
    try {
      let list;
      if (admin) {
        if (!localStorage.getItem("admin_key")) return;
        list = await api(`/api/visits?month=${mk}`, { admin: true });
      } else list = await api("/api/mywork");
      const incoming = list.map((r) => ({
        ...r.data,
        id: r.id,
        empId: r.emp_id,
      }));
      upd.current((s) => {
        const m = new Map((s.work || []).map((w) => [w.id, w]));
        incoming.forEach((w) => m.set(w.id, w));
        s.work = [...m.values()];
        return s;
      });
    } catch {
      /* server asleep or offline */
    }
  };
  useEffect(() => {
    sync();
    const t = setInterval(sync, 30000);
    return () => clearInterval(t);
  }, [mk, admin]);

  const stamp = async (w) => {
    if (w.gps || admin) return w.gps;
    try {
      const p = await getPosition();
      return { lat: p.lat, lng: p.lng, time: new Date().toISOString() };
    } catch {
      return undefined;
    }
  };

  const save = async () => {
    if (!f.client.trim() || !f.work.trim())
      return alert("Enter the client name and the complaint / service name");
    const gps = await stamp(f);
    const id =
      f.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const rec = { ...f, id, gps };
    update((s) => {
      s.work ||= [];
      if (f.id) s.work = s.work.map((w) => (w.id === f.id ? rec : w));
      else s.work.push(rec);
      return s;
    });
    setF(null);
    push(rec);
  };

  const setStatus = async (w, status) => {
    const rec = { ...w, status, gps: await stamp(w) };
    update((s) => {
      s.work = s.work.map((x) => (x.id === w.id ? rec : x));
      return s;
    });
    push(rec);
  };

  const del = async (w) => {
    if (!confirm("Delete this work entry?")) return;
    update((s) => {
      s.work = s.work.filter((x) => x.id !== w.id);
      return s;
    });
    if (apiOn && askKey()) {
      try {
        await api(`/api/visit/${w.id}`, { method: "DELETE", admin: true });
      } catch {
        /* ignore */
      }
    }
  };

  const reassign = (w, to) => {
    const rec = { ...w, empId: to, from: w.from || w.empId };
    update((s) => {
      s.work = s.work.map((x) => (x.id === w.id ? rec : x));
      return s;
    });
    push(rec);
  };

  const focus = (state.work || [])
    .filter(
      (w) =>
        (admin ? who === "all" || w.empId === who : w.empId === empId) &&
        (w.date === today || w.status !== "Completed"),
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  const onLeave = (w) => {
    const e = state.employees.find((x) => x.id === w.empId);
    return (
      !!e &&
      w.status !== "Completed" &&
      w.date <= today &&
      ["EL", "CL", "A"].includes(
        dayInfo(e, w.date, state.settings, state.attendance).code,
      )
    );
  };
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const addPart = () =>
    set("parts", [...(f.parts || []), { item: "", qty: 1, kind: "New" }]);
  const editPart = (i, k, v) =>
    set(
      "parts",
      (f.parts || []).map((p, n) => (n === i ? { ...p, [k]: v } : p)),
    );
  const delPart = (i) =>
    set(
      "parts",
      (f.parts || []).filter((_, n) => n !== i),
    );
  const exportX = async (onlyToday) => {
    const { workXlsx } = await import("../lib/exporters.js");
    const list = (onlyToday ? mine.filter((w) => w.date === today) : mine)
      .slice()
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    workXlsx(list, state, onlyToday ? today : mk);
  };
  const inputCls = "input";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Daily work process"
        sub="One row per site / customer visit. Each row counts as one site visited."
      >
        {admin && (
          <select
            className="input w-52"
            value={who}
            onChange={(e) => setWho(e.target.value)}
          >
            <option value="all">All employees</option>
            {staff.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        )}
        {admin && (
          <>
            <button className="btn-ghost" onClick={() => exportX(false)}>
              <FileSpreadsheet size={16} /> Excel (month)
            </button>
            <button className="btn-ghost" onClick={() => exportX(true)}>
              <FileSpreadsheet size={16} /> Excel (today)
            </button>
          </>
        )}
        <button
          className="btn-primary"
          onClick={() =>
            setF(blank(empId || (who !== "all" ? who : staff[0]?.id)))
          }
        >
          <Plus size={16} /> Add work
        </button>
      </PageHeader>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-200/70 p-1 text-sm">
        {months.map((m) => (
          <button
            key={m}
            onClick={() => setMk(m)}
            className={`shrink-0 rounded-lg px-3 py-1.5 font-medium ${m === mk ? "bg-white text-brand shadow-sm" : "text-slate-500"}`}
          >
            {monthLabel(m).slice(0, 3)} {m.slice(2, 4)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <button
          onClick={() => setFlt("All")}
          className={`rounded-full border px-3 py-1 ${flt === "All" ? "border-brand bg-brand text-white" : "bg-white"}`}
        >
          All ({mine.length})
        </button>
        {WSTATUS.map((s) => (
          <button
            key={s}
            onClick={() => setFlt(s)}
            className={`rounded-full border px-3 py-1 ${flt === s ? "border-brand bg-brand text-white" : "bg-white"}`}
          >
            {s} ({count(s)})
          </button>
        ))}
      </div>
      <Card
        title={`Today's work and pending · ${prettyDate(today)}`}
        pad={false}
      >
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          {WSTATUS.map((s) => (
            <div key={s} className="rounded-lg bg-slate-50 p-3 text-center">
              <Pill cls={CLS[s]}>{s}</Pill>
              <div className="mt-1 text-2xl font-bold">
                {focus.filter((w) => w.status === s).length}
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {[
                  "Date",
                  ...(admin ? ["Employee"] : []),
                  "Client",
                  "Complaint / service",
                  "Status",
                  "Update",
                ].map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {focus.map((w) => (
                <tr key={w.id}>
                  <td className="td whitespace-nowrap">
                    {prettyDate(w.date)}
                    {w.date < today && (
                      <div className="text-[10px] font-semibold text-amber-600">
                        carried over
                      </div>
                    )}
                  </td>
                  {admin && <td className="td">{name(w.empId)}</td>}
                  <td className="td font-medium">{w.client}</td>
                  <td className="td">{w.work}</td>
                  <td className="td">
                    <Pill cls={CLS[w.status]}>{w.status}</Pill>
                  </td>
                  <td className="td whitespace-nowrap">
                    {WSTATUS.filter((s) => s !== w.status).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(w, s)}
                        className="mr-1 rounded border px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        {s}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!focus.length && (
            <div className="p-6 text-center text-sm text-slate-400">
              No work for today and nothing pending
            </div>
          )}
        </div>
      </Card>

      <Card title="Sites visited" pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {[
                  "Employee",
                  "Today",
                  "This month",
                  "Average / day",
                  "Target / day",
                ].map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scope.map((e) => {
                const all = (state.work || []).filter(
                  (w) => w.empId === e.id && w.date.startsWith(mk),
                );
                const days = new Set(all.map((w) => w.date)).size;
                const td = (state.work || []).filter(
                  (w) => w.empId === e.id && w.date === today,
                ).length;
                return (
                  <tr key={e.id}>
                    <td className="td font-medium">{e.name}</td>
                    <td className="td">{td}</td>
                    <td className="td">{all.length}</td>
                    <td className="td">
                      {days ? (all.length / days).toFixed(1) : "—"}
                    </td>
                    <td className="td">{e.siteTarget || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {[
                  "Date",
                  "Time",
                  ...(admin ? ["Employee"] : []),
                  "Client",
                  "Complaint / service",
                  "Status",
                  "Action taken",
                  "Materials",
                  "Repeat",
                  "",
                ].map((h, i) => (
                  <th key={i} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((w) => (
                <tr key={w.id} className="align-top hover:bg-slate-50">
                  <td className="td whitespace-nowrap text-xs">
                    {w.start || "—"} – {w.end || "—"}
                    {(() => {
                      const e = state.employees.find((x) => x.id === w.empId);
                      const d =
                        e &&
                        dayInfo(e, w.date, state.settings, state.attendance);
                      return d?.inTime ? (
                        <div className="text-[10px] text-slate-500">
                          Punch {timeLabel(d.inTime)} –{" "}
                          {d.outTime ? timeLabel(d.outTime) : "working"}
                        </div>
                      ) : null;
                    })()}
                  </td>
                  {admin && (
                    <td className="td">
                      <div className="font-medium">{name(w.empId)}</div>
                      {w.from && (
                        <div className="text-[10px] text-slate-400">
                          from {name(w.from)}
                        </div>
                      )}
                    </td>
                  )}
                  <td className="td font-medium">
                    {w.client}
                    {w.gps && (
                      <a
                        className="block text-xs font-normal text-brand"
                        target="_blank"
                        rel="noreferrer"
                        href={`https://www.google.com/maps?q=${w.gps.lat},${w.gps.lng}`}
                      >
                        📍 Map
                      </a>
                    )}
                  </td>
                  <td className="td">{w.work}</td>
                  <td className="td">
                    <Pill cls={CLS[w.status]}>{w.status}</Pill>
                    {onLeave(w) && (
                      <div className="mt-1">
                        <Pill cls="bg-red-100 text-red-600">
                          Employee on leave
                        </Pill>
                        {admin && (
                          <select
                            className="input mt-1 w-40 py-1 text-xs"
                            value=""
                            onChange={(e) =>
                              e.target.value && reassign(w, e.target.value)
                            }
                          >
                            <option value="">Reassign to…</option>
                            {staff
                              .filter((x) => x.id !== w.empId)
                              .map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.name}
                                </option>
                              ))}
                          </select>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="td max-w-[200px] text-xs">{w.action}</td>
                  <td className="td text-xs">
                    {(w.parts || []).map((p, i) => (
                      <div key={i}>
                        <b>{p.kind}:</b> {p.item} × {p.qty}
                      </div>
                    ))}
                    {w.mNew && (
                      <div>
                        <b>New:</b> {w.mNew}
                      </div>
                    )}
                    {w.mDefect && (
                      <div>
                        <b>Defective:</b> {w.mDefect}
                      </div>
                    )}
                    {w.mChanged && (
                      <div>
                        <b>Changed:</b> {w.mChanged}
                      </div>
                    )}
                  </td>
                  <td className="td text-xs">
                    {w.repeat ? (
                      <span className="flex items-center gap-1 font-semibold text-red-600">
                        <Repeat size={12} /> {w.repeatBy || "Yes"}
                      </span>
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="td whitespace-nowrap text-right">
                    <button
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                      onClick={() => setF({ ...w })}
                    >
                      <Pencil size={15} />
                    </button>
                    {admin && (
                      <button
                        className="rounded p-1.5 text-red-500 hover:bg-red-50"
                        onClick={() => del(w)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <div className="p-10 text-center text-sm text-slate-400">
              No work entries for {monthLabel(mk)}
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={!!f}
        onClose={() => setF(null)}
        wide
        title={f?.id ? "Edit work" : "Add work"}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setF(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={save}>
              Save
            </button>
          </>
        }
      >
        {f && (
          <div className="grid gap-4 sm:grid-cols-2">
            {admin && (
              <Field label="Employee" className="sm:col-span-2">
                <select
                  className={inputCls}
                  value={f.empId}
                  onChange={(e) => set("empId", e.target.value)}
                >
                  {staff.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Date">
              <input
                type="date"
                className={inputCls}
                value={f.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Work started">
                <input
                  type="time"
                  className={inputCls}
                  value={f.start}
                  onChange={(e) => set("start", e.target.value)}
                />
              </Field>
              <Field label="Work finished">
                <input
                  type="time"
                  className={inputCls}
                  value={f.end}
                  onChange={(e) => set("end", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Client / customer name">
              <input
                className={inputCls}
                value={f.client}
                onChange={(e) => set("client", e.target.value)}
              />
            </Field>
            <Field label="Complaint / service name">
              <input
                className={inputCls}
                value={f.work}
                onChange={(e) => set("work", e.target.value)}
              />
            </Field>
            <Field label="Work status" className="sm:col-span-2">
              <div className="flex flex-wrap gap-2">
                {WSTATUS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("status", s)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${f.status === s ? "border-brand bg-brand text-white" : "bg-white"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Action taken" className="sm:col-span-2">
              <textarea
                rows={2}
                className={inputCls}
                value={f.action}
                onChange={(e) => set("action", e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <div className="label">Materials / spares used</div>
              <datalist id="ac-parts">
                {PARTS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
              <div className="space-y-2">
                {(f.parts || []).map((p, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_64px_110px_auto] gap-2"
                  >
                    <input
                      className="input"
                      list="ac-parts"
                      placeholder="Pick or type part"
                      value={p.item}
                      onChange={(e) => editPart(i, "item", e.target.value)}
                    />
                    <input
                      className="input px-2"
                      type="number"
                      min="1"
                      value={p.qty}
                      onChange={(e) => editPart(i, "qty", e.target.value)}
                    />
                    <select
                      className="input px-2"
                      value={p.kind}
                      onChange={(e) => editPart(i, "kind", e.target.value)}
                    >
                      <option>New</option>
                      <option>Defective</option>
                      <option>Changed</option>
                    </select>
                    <button
                      type="button"
                      className="btn-danger px-2"
                      onClick={() => delPart(i)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn-ghost mt-2"
                onClick={addPart}
              >
                <Plus size={15} /> Add part
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={f.repeat}
                onChange={(e) => set("repeat", e.target.checked)}
              />{" "}
              Repeat complaint
            </label>
            {f.repeat && (
              <Field label="Who made the repeat complaint">
                <input
                  className={inputCls}
                  value={f.repeatBy}
                  onChange={(e) => set("repeatBy", e.target.value)}
                />
              </Field>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
