import { useState, useMemo } from "react";
import { Pencil, FileSpreadsheet } from "lucide-react";
import { useStore } from "../../lib/store.jsx";
import {
  dayInfo,
  monthSummary,
  MANUAL_OPTIONS,
  STATUS,
} from "../../lib/attendance.js";
import {
  todayKey,
  monthKey,
  monthDays,
  timeLabel,
  fmtHours,
  monthLabel,
  dayName,
  prettyDate,
} from "../../lib/date.js";
import {
  Card,
  PageHeader,
  Modal,
  Field,
  StatusBadge,
  Pill,
  MonthPicker,
} from "../../components/ui.jsx";
import { Legend } from "../../components/MonthCalendar.jsx";
import AdminPunch from "../../components/AdminPunch.jsx";

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

export function DayEditor({ target, onClose }) {
  const { state, update } = useStore();
  const [f, setF] = useState(null);
  const rec = target
    ? state.attendance[target.date]?.[target.emp.id] || {}
    : {};
  // initialise form when a new target opens
  const key = target ? target.date + target.emp.id : "";
  const [lastKey, setLastKey] = useState("");
  if (!target && lastKey) setLastKey("");
  if (target && key !== lastKey) {
    setLastKey(key);
    setF({
      status: rec.status || "",
      in: hhmm(rec.in),
      out: hhmm(rec.out),
      note: rec.note || "",
    });
  }
  if (!target || !f) return null;

  const save = () => {
    update((s) => {
      const day = (s.attendance[target.date] ||= {});
      const r = {
        in: toIso(target.date, f.in),
        out: toIso(target.date, f.out),
        status: f.status,
        note: f.note,
      };
      Object.keys(r).forEach((k) => !r[k] && delete r[k]);
      if (Object.keys(r).length) day[target.emp.id] = r;
      else delete day[target.emp.id];
      return s;
    });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`${target.emp.name} · ${prettyDate(target.date)}`}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save}>
            Save
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="Status"
          hint="Leave on 'Auto' to decide from punch in / out. Choose EL / CL / Half Day / Absent to override."
        >
          <div className="flex flex-wrap gap-2">
            {[
              ["", "Auto"],
              ...MANUAL_OPTIONS.map((k) => [k, STATUS[k].label]),
            ].map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setF({ ...f, status: k })}
                className={`rounded-lg border px-3 py-1.5 text-sm ${f.status === k ? "border-brand bg-brand text-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Punch in">
            <input
              type="time"
              className="input"
              value={f.in}
              onChange={(e) => setF({ ...f, in: e.target.value })}
            />
          </Field>
          <Field label="Punch out">
            <input
              type="time"
              className="input"
              value={f.out}
              onChange={(e) => setF({ ...f, out: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Note (optional)">
          <input
            className="input"
            value={f.note}
            onChange={(e) => setF({ ...f, note: e.target.value })}
            placeholder="e.g. forgot to punch out"
          />
        </Field>
      </div>
    </Modal>
  );
}

export default function Attendance() {
  const { state } = useStore();
  const [tab, setTab] = useState("daily");
  const [date, setDate] = useState(todayKey());
  const [mk, setMk] = useState(monthKey());
  const [target, setTarget] = useState(null);
  const staff = state.employees.filter((e) => e.active !== false);

  const daily = useMemo(
    () =>
      staff.map((e) => ({
        e,
        d: dayInfo(e, date, state.settings, state.attendance),
      })),
    [state, date],
  );
  const grid = useMemo(
    () =>
      staff.map((e) => ({
        e,
        s: monthSummary(e, mk, state.settings, state.attendance),
      })),
    [state, mk],
  );
  const days = monthDays(mk);

  const exportXlsx = async () => {
    const { attendanceXlsx } = await import("../../lib/exporters.js");
    attendanceXlsx(state, mk);
  };

  return (
    <div>
      <PageHeader
        title="Attendance"
        sub="Punch in / out times update here automatically. Click any row or day to edit."
      >
        <div className="flex rounded-lg bg-slate-200/70 p-1 text-sm">
          {[
            ["daily", "Daily"],
            ["monthly", "Monthly grid"],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-md px-3 py-1.5 font-medium ${tab === k ? "bg-white text-brand shadow-sm" : "text-slate-500"}`}
            >
              {l}
            </button>
          ))}
        </div>
        {tab === "daily" ? (
          <input
            type="date"
            className="input w-44"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        ) : (
          <MonthPicker value={mk} onChange={setMk} />
        )}
        <button className="btn-ghost" onClick={exportXlsx}>
          <FileSpreadsheet size={16} /> Excel
        </button>
      </PageHeader>
      <div className="mb-6">
        <AdminPunch />
      </div>
      {tab === "daily" && (
        <Card
          pad={false}
          title={`${prettyDate(date)} (${dayName(date)})`}
          action={
            <span className="text-xs text-slate-400">
              {daily.filter((r) => r.d.inTime).length} of {staff.length} punched
              in
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {[
                    "Employee",
                    "Punch in",
                    "Punch out",
                    "Hours",
                    "Overtime",
                    "Status",
                    "Remarks",
                    "",
                  ].map((h) => (
                    <th key={h} className="th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daily.map(({ e, d }) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="td">
                      <div className="font-medium">{e.name}</div>
                      <div className="text-xs text-slate-400">{e.id}</div>
                    </td>
                    <td className="td">
                      {timeLabel(d.inTime)}{" "}
                      {d.late && (
                        <Pill cls="bg-red-100 text-red-600">Late</Pill>
                      )}
                    </td>
                    <td className="td">
                      {timeLabel(d.outTime)}{" "}
                      {d.missedOut && (
                        <Pill cls="bg-amber-100 text-amber-700">
                          No punch-out
                        </Pill>
                      )}
                    </td>
                    <td className="td">
                      {d.outTime ? fmtHours(d.hours) : "—"}
                    </td>
                    <td className="td">
                      {d.otHours ? (
                        <span className="font-semibold text-brand">
                          {fmtHours(d.otHours)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="td">
                      <StatusBadge code={d.code} />{" "}
                      {d.manual && (
                        <span className="text-[10px] text-slate-400">
                          manual
                        </span>
                      )}
                    </td>
                    <td className="td text-xs text-slate-500">
                      {d.holiday || (d.weekOff ? "Week off" : "")} {d.note}
                    </td>
                    <td className="td text-right">
                      <button
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                        onClick={() => setTarget({ emp: e, date })}
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "monthly" && (
        <Card pad={false} title={monthLabel(mk)} action={<Legend />}>
          <div className="overflow-x-auto">
            <table className="border-collapse text-center">
              <thead>
                <tr>
                  <th className="th sticky left-0 z-10 min-w-[180px] text-left">
                    Employee
                  </th>
                  {days.map((d) => (
                    <th
                      key={d}
                      className={`th px-1 text-center ${new Date(d).getDay() === 0 ? "text-red-400" : ""}`}
                    >
                      <div>{d.slice(8)}</div>
                      <div className="text-[9px] font-normal normal-case">
                        {dayName(d).slice(0, 2)}
                      </div>
                    </th>
                  ))}
                  {[
                    "P",
                    "HD",
                    "EL",
                    "CL",
                    "A",
                    "WO",
                    "H",
                    "Late",
                    "OT hrs",
                    "Paid days",
                    "Punctual %",
                  ].map((h) => (
                    <th key={h} className="th text-center">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grid.map(({ e, s }) => (
                  <tr key={e.id}>
                    <td className="td sticky left-0 bg-white text-left font-medium">
                      {e.name}
                    </td>
                    {s.days.map((d) => (
                      <td key={d.date} className="px-0.5 py-1">
                        <button
                          onClick={() => setTarget({ emp: e, date: d.date })}
                          title={
                            d.holiday ||
                            (d.inTime
                              ? `${timeLabel(d.inTime)} – ${timeLabel(d.outTime)}`
                              : "")
                          }
                        >
                          <StatusBadge code={d.code} />
                        </button>
                      </td>
                    ))}
                    {[
                      s.counts.P,
                      s.counts.HD,
                      s.counts.EL,
                      s.counts.CL,
                      s.counts.A,
                      s.counts.WO,
                      s.counts.HOL,
                      s.late,
                      s.otHours.toFixed(1),
                      s.paidDays,
                      s.punctuality + "%",
                    ].map((v, i) => (
                      <td key={i} className="td text-center font-medium">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <DayEditor target={target} onClose={() => setTarget(null)} />
    </div>
  );
}
