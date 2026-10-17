import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Repeat } from "lucide-react";
import { useStore } from "../lib/store.jsx";
import { dayInfo } from "../lib/attendance.js";
import {
  todayKey,
  monthKey,
  addMonths,
  monthLabel,
  prettyDate,
} from "../lib/date.js";
import { Card, PageHeader, Modal, Field, Pill } from "./ui.jsx";
import { api, apiOn } from "../lib/api.js";
import { getPosition } from "../lib/geo.js";
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

  const save = async () => {
    if (!f.client.trim() || !f.work.trim())
      return alert("Enter the client name and the complaint / service name");
    let gps = f.gps;
    if (!f.id) {
      try {
        const p = await getPosition();
        gps = { lat: p.lat, lng: p.lng, time: new Date().toISOString() };
      } catch {
        /* no permission */
      }
    }
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
    if (apiOn && empId) {
      try {
        await api("/api/visit", {
          method: "POST",
          body: { ...rec, empName: name(empId) },
        });
      } catch (e) {
        alert("Saved on this phone, but could not send to admin: " + e.message);
      }
    }
  };
  const del = (w) => {
    if (confirm("Delete this work entry?"))
      update((s) => {
        s.work = s.work.filter((x) => x.id !== w.id);
        return s;
      });
  };
  const reassign = (w, to) =>
    update((s) => {
      s.work = s.work.map((x) =>
        x.id === w.id ? { ...x, empId: to, from: x.from || x.empId } : x,
      );
      return s;
    });
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
                  <td className="td whitespace-nowrap">{prettyDate(w.date)}</td>
                  <td className="td whitespace-nowrap text-xs">
                    {w.start || "—"} – {w.end || "—"}
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
            <Field label="Materials: new">
              <textarea
                rows={2}
                className={inputCls}
                value={f.mNew}
                onChange={(e) => set("mNew", e.target.value)}
              />
            </Field>
            <Field label="Materials: defective">
              <textarea
                rows={2}
                className={inputCls}
                value={f.mDefect}
                onChange={(e) => set("mDefect", e.target.value)}
              />
            </Field>
            <Field label="Materials: changed" className="sm:col-span-2">
              <textarea
                rows={2}
                className={inputCls}
                value={f.mChanged}
                onChange={(e) => set("mChanged", e.target.value)}
              />
            </Field>
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
