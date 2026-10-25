import { useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { useStore } from "../lib/store.jsx";
import { punch, dayInfo } from "../lib/attendance.js";
import { todayKey, timeLabel } from "../lib/date.js";
import { Card } from "./ui.jsx";

export default function AdminPunch() {
  const { state, update } = useStore();
  const staff = state.employees.filter((e) => e.active !== false);
  const [empId, setEmpId] = useState(staff[0]?.id || "");
  const [msg, setMsg] = useState("");
  const emp = staff.find((e) => e.id === empId) || staff[0];
  if (!emp) return null;
  const today = dayInfo(emp, todayKey(), state.settings, state.attendance);

  const doPunch = (kind) => {
    const r = punch(state.attendance, emp.id, kind);
    if (!r)
      return setMsg(kind === "in" ? "Already punched in today." : "Punch in first.");
    update((s) => {
      (s.attendance[r.date] ||= {})[emp.id] = r.rec;
      return s;
    });
    setMsg(`${emp.name} punched ${kind} successfully.`);
  };

  return (
    <Card title="Punch for an employee (today)">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="input w-64"
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
        <button className="btn-primary" disabled={!!today.inTime} onClick={() => doPunch("in")}>
          <LogIn size={16} /> Punch In
        </button>
        <button className="btn-ghost" disabled={!today.inTime} onClick={() => doPunch("out")}>
          <LogOut size={16} /> Punch Out
        </button>
        <span className="text-sm text-slate-500">
          In: {timeLabel(today.inTime)} · Out: {timeLabel(today.outTime)}
        </span>
      </div>
      {msg && <p className="mt-2 text-sm text-emerald-600">{msg}</p>}
    </Card>
  );
}