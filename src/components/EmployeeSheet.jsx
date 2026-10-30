import { useState, useMemo } from "react";
import { LogIn, LogOut, FileSpreadsheet, FileText } from "lucide-react";
import { useStore } from "../lib/store.jsx";
import {
  punch,
  dayInfo,
  monthSummary,
  MANUAL_OPTIONS,
  STATUS,
} from "../lib/attendance.js";
import { todayKey, timeLabel, fmtHours, dayName } from "../lib/date.js";
import { Card, StatusBadge, Pill } from "./ui.jsx";

const hhmm = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const toIso = (date, t) => {
  if (!t) return "";
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  return new Date(y, m - 1, d, h, mi).toISOString();
};

export default function EmployeeSheet({ mk }) {
  const { state, update } = useStore();
  const staff = state.employees.filter((e) => e.active !== false);
  const [empId, setEmpId] = useState(staff[0]?.id || "");
  const [msg, setMsg] = useState("");
  const emp = staff.find((e) => e.id === empId) || staff[0];
  const sum = useMemo(
    () =>
      emp ? monthSummary(emp, mk, state.settings, state.attendance) : null,
    [emp, mk, state],
  );
  if (!emp) return <Card>Add an employee first.</Card>;
  const today = dayInfo(emp, todayKey(), state.settings, state.attendance);

  const doPunch = (kind) => {
    const r = punch(state.attendance, emp.id, kind);
    if (!r)
      return setMsg(
        kind === "in" ? "Already punched in today." : "Punch in first.",
      );
    update((s) => {
      (s.attendance[r.date] ||= {})[emp.id] = r.rec;
      return s;
    });
    setMsg(`${emp.name} punched ${kind} successfully.`);
  };

  // change one field (in / out / status) of one day
  const setField = (date, field, value) =>
    update((s) => {
      const day = (s.attendance[date] ||= {});
      const r = { ...(day[emp.id] || {}) };
      if (value) r[field] = field === "status" ? value : toIso(date, value);
      else delete r[field];
      if (Object.keys(r).length) day[emp.id] = r;
      else delete day[emp.id];
      return s;
    });

  const exp = async (kind) => {
    const x = await import("../lib/exporters.js");
    if (kind === "xlsx") x.employeeXlsx(state, emp.id, mk);
    else x.employeePdf(state, emp.id, mk);
  };

  const box = (label, v) => (
    <div className="rounded-lg bg-slate-50 p-3 text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-bold">{v}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card title="Select employee">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="input w-72"
            value={emp.id}
            onChange={(e) => {
              setEmpId(e.target.value);
              setMsg("");
            }}
          >
            {staff.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.id})
              </option>
            ))}
          </select>
          <button
            className="btn-primary"
            disabled={!!today.inTime}
            onClick={() => doPunch("in")}
          >
            <LogIn size={16} /> Punch In now
          </button>
          <button
            className="btn-ghost"
            disabled={!today.inTime}
            onClick={() => doPunch("out")}
          >
            <LogOut size={16} /> Punch Out now
          </button>
          <span className="text-sm text-slate-500">
            Today: In {timeLabel(today.inTime)} · Out {timeLabel(today.outTime)}
          </span>
          <div className="ml-auto flex gap-2">
            <button className="btn-ghost" onClick={() => exp("xlsx")}>
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button className="btn-ghost" onClick={() => exp("pdf")}>
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>
        {msg && <p className="mt-2 text-sm text-emerald-600">{msg}</p>}
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {box("Present", sum.counts.P)}
        {box("Half day", sum.counts.HD)}
        {box("Absent", sum.counts.A)}
        {box("Leaves", sum.counts.EL + sum.counts.CL)}
        {box("Late", sum.late)}
        {box("Overtime", fmtHours(sum.otHours))}
        {box("Total hours", fmtHours(sum.hours))}
        {box("Paid days", sum.paidDays)}
      </div>

      <Card
        pad={false}
        title={`${emp.name} · type punch in / out times, they save when you click outside the box`}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {[
                  "Date",
                  "Day",
                  "Punch in",
                  "Punch out",
                  "Hours",
                  "Overtime",
                  "Result",
                  "Override",
                ].map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sum.days.map((d) => {
                const manual = state.attendance[d.date]?.[emp.id]?.status || "";
                return (
                  <tr
                    key={d.date}
                    className={d.weekOff || d.holiday ? "bg-slate-50" : ""}
                  >
                    <td className="td whitespace-nowrap">
                      {d.date.split("-").reverse().join("-")}
                    </td>
                    <td className="td">{dayName(d.date).slice(0, 3)}</td>
                    <td className="td">
                      <input
                        type="time"
                        className="input w-32"
                        key={d.date + "in" + d.inTime}
                        defaultValue={hhmm(d.inTime)}
                        onBlur={(ev) =>
                          ev.target.value !== hhmm(d.inTime) &&
                          setField(d.date, "in", ev.target.value)
                        }
                      />
                    </td>
                    <td className="td">
                      <input
                        type="time"
                        className="input w-32"
                        key={d.date + "out" + d.outTime}
                        defaultValue={hhmm(d.outTime)}
                        onBlur={(ev) =>
                          ev.target.value !== hhmm(d.outTime) &&
                          setField(d.date, "out", ev.target.value)
                        }
                      />
                    </td>
                    <td className="td">
                      {d.outTime ? fmtHours(d.hours) : "—"}
                    </td>
                    <td className="td">
                      {d.otHours ? (
                        <b className="text-brand">{fmtHours(d.otHours)}</b>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="td">
                      <StatusBadge code={d.code} />{" "}
                      {d.late && (
                        <Pill cls="bg-red-100 text-red-600">Late</Pill>
                      )}
                    </td>
                    <td className="td">
                      <select
                        className="input w-36"
                        value={manual}
                        onChange={(ev) =>
                          setField(d.date, "status", ev.target.value)
                        }
                      >
                        <option value="">Auto</option>
                        {MANUAL_OPTIONS.map((k) => (
                          <option key={k} value={k}>
                            {STATUS[k].label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
