import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "../../lib/store.jsx";
import { leaveUsed, monthSummary } from "../../lib/attendance.js";
import { monthKey, monthLabel, prettyDate } from "../../lib/date.js";
import {
  Card,
  PageHeader,
  MonthPicker,
  Field,
  StatusBadge,
  Pill,
} from "../../components/ui.jsx";
import MonthCalendar, { Legend } from "../../components/MonthCalendar.jsx";
import { DayEditor } from "./Attendance.jsx";
import LeaveRequests from "../../components/LeaveRequests.jsx";

export default function Leaves() {
  const { state, update } = useStore();
  const staff = state.employees.filter((e) => e.active !== false);
  const [empId, setEmpId] = useState(staff[0]?.id);
  const [mk, setMk] = useState(monthKey());
  const [target, setTarget] = useState(null);
  const [hd, setHd] = useState({ date: "", name: "" });
  const emp = staff.find((e) => e.id === empId) || staff[0];
  if (!emp) return <Card>Add an employee first.</Card>;
  const year = Number(mk.slice(0, 4));
  const used = leaveUsed(emp, year, state.attendance);
  const sum = monthSummary(emp, mk, state.settings, state.attendance);
  const L = state.settings.leave;
  const holidays = [...state.settings.holidays].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const addHoliday = () => {
    if (!hd.date || !hd.name.trim()) return;
    update((s) => {
      s.settings.holidays = [
        ...s.settings.holidays.filter((h) => h.date !== hd.date),
        { date: hd.date, name: hd.name.trim() },
      ];
      return s;
    });
    setHd({ date: "", name: "" });
  };
  const delHoliday = (date) =>
    update((s) => {
      s.settings.holidays = s.settings.holidays.filter((h) => h.date !== date);
      return s;
    });

  const bal = (label, quota, u) => (
    <div className="rounded-lg border border-slate-100 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-slate-500">
          {u} / {quota} used
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${u > quota ? "bg-red-500" : "bg-brand"}`}
          style={{ width: `${Math.min(100, (u / Math.max(1, quota)) * 100)}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-slate-400">
        {quota - u >= 0
          ? `${quota - u} remaining`
          : `${u - quota} over the limit`}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Leaves & Holidays"
        sub="Click a day on the calendar to mark EL, CL, Half Day or Absent. Days with no information are counted Absent."
      >
        <select
          className="input w-60"
          value={emp.id}
          onChange={(e) => setEmpId(e.target.value)}
        >
          {staff.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.id})
            </option>
          ))}
        </select>
        <MonthPicker value={mk} onChange={setMk} />
      </PageHeader>
      <div className="mb-6">
        <LeaveRequests />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          title={`${emp.name} · ${monthLabel(mk)}`}
          className="xl:col-span-2"
          action={<Legend />}
        >
          <MonthCalendar
            emp={emp}
            mk={mk}
            state={state}
            onDayClick={(date) => setTarget({ emp, date })}
          />
        </Card>
        <div className="space-y-6">
          <Card title={`Leave balance ${year}`}>
            <div className="space-y-3">
              {bal("Earned Leave (EL)", L.elPerYear, used.EL)}
              {bal("Casual Leave (CL)", L.clPerYear, used.CL)}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
              {[
                ["P", sum.counts.P],
                ["HD", sum.counts.HD],
                ["A", sum.counts.A],
                ["WO", sum.counts.WO],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-slate-50 p-2">
                  <StatusBadge code={k} />
                  <div className="mt-1 text-base font-bold">{v}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Company holidays">
            <div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
              <input
                type="date"
                className="input"
                value={hd.date}
                onChange={(e) => setHd({ ...hd, date: e.target.value })}
              />
              <button className="btn-primary" onClick={addHoliday}>
                <Plus size={16} />
              </button>
              <input
                className="input col-span-2"
                placeholder="Holiday name e.g. Diwali"
                value={hd.name}
                onChange={(e) => setHd({ ...hd, name: e.target.value })}
              />
            </div>
            <ul className="max-h-64 space-y-1.5 overflow-auto text-sm">
              {holidays.map((h) => (
                <li
                  key={h.date}
                  className="flex items-center justify-between rounded-lg bg-purple-50 px-3 py-2"
                >
                  <span>
                    <b>{h.name}</b>{" "}
                    <span className="text-xs text-slate-500">
                      {prettyDate(h.date)}
                    </span>
                  </span>
                  <button
                    onClick={() => delHoliday(h.date)}
                    className="text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
              {!holidays.length && (
                <li className="text-xs text-slate-400">
                  No holidays added yet. Holidays are paid days.
                </li>
              )}
            </ul>
          </Card>
        </div>
      </div>
      <DayEditor target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
