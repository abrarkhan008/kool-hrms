import { useEffect, useState } from "react";
import {
  LogIn,
  LogOut,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  KeyRound,
} from "lucide-react";
import { useStore } from "../../lib/store.jsx";
import { punch, dayInfo } from "../../lib/attendance.js";
import { monthSummary, leaveUsed } from "../../lib/attendance.js";
import {
  todayKey,
  monthKey,
  timeLabel,
  monthLabel,
  addMonths,
  fmtHours,
  prettyDate,
  inr,
} from "../../lib/date.js";
import { calcSalary } from "../../lib/payroll.js";
import { sha256, checkPin } from "../../lib/auth.js";
import MonthCalendar, { Legend } from "../../components/MonthCalendar.jsx";
import { Card, Stat, Modal, Field, MonthPicker } from "../../components/ui.jsx";
import { CalendarCheck, Timer, Hourglass, Target } from "lucide-react";
import BrandBar from "../../components/BrandBar.jsx";
import LocationTracker from "../../components/LocationTracker.jsx";
import WorkSheet from "../../components/WorkSheet.jsx";

export default function Punch() {
  const { state, session, update } = useStore();
  const emp = state.employees.find((e) => e.id === session.empId);
  const [now, setNow] = useState(new Date());
  const [mk, setMk] = useState(monthKey());
  const [msg, setMsg] = useState(null);
  const [pinOpen, setPinOpen] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!emp) return <Card>Employee not found.</Card>;
  const t = state.settings.timing;
  const today = dayInfo(emp, todayKey(), state.settings, state.attendance);
  const sum = monthSummary(emp, mk, state.settings, state.attendance);
  const year = Number(mk.slice(0, 4));
  const used = leaveUsed(emp, year, state.attendance);

  const doPunch = (kind) => {
    const r = punch(state.attendance, emp.id, kind);
    if (!r) {
      setMsg({
        ok: false,
        text:
          kind === "in"
            ? "You have already punched in today."
            : "Punch in first.",
      });
      return;
    }
    update((s) => {
      (s.attendance[r.date] ||= {})[emp.id] = r.rec;
      return s;
    });
    setMsg({
      ok: true,
      text:
        kind === "in"
          ? "Punched in successfully."
          : "Punched out successfully. Have a good evening!",
    });
  };

  const downloadSlip = async () => {
    const { slipPdf } = await import("../../lib/exporters.js");
    slipPdf(
      [calcSalary(emp, mk, state)],
      state.settings,
      `Salary_Slip_${emp.name.replace(/\s+/g, "_")}_${mk}.pdf`,
    );
  };

  const clock = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const canIn = !today.inTime,
    canOut = !!today.inTime;

  return (
    <div className="space-y-6">
      <BrandBar />
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand to-brand-dark p-6 text-center text-white sm:p-8">
          <div className="text-sm text-white/80">{dateStr}</div>
          <div className="my-2 font-mono text-5xl font-bold tracking-tight sm:text-6xl">
            {clock}
          </div>
          <div className="text-sm text-white/80">
            Hello <b>{emp.name}</b> · {emp.designation} · {emp.id}
          </div>
          <LocationTracker emp={emp} />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => doPunch("in")}
              disabled={!canIn}
              className="flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-emerald-700 shadow-lg transition hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
            >
              <LogIn size={20} /> Punch In
            </button>
            <button
              onClick={() => doPunch("out")}
              disabled={!canOut}
              className="flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-red-600 shadow-lg transition hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
            >
              <LogOut size={20} /> Punch Out
            </button>
          </div>
          {msg && (
            <div
              className={`mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-white/20" : "bg-red-500/80"}`}
            >
              {msg.ok ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertTriangle size={16} />
              )}
              {msg.text}
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
          <div className="p-4">
            <div className="text-xs text-slate-500">Punch In</div>
            <div className="font-semibold">{timeLabel(today.inTime)}</div>
            {today.late && (
              <div className="text-xs font-semibold text-red-500">Late</div>
            )}
          </div>
          <div className="p-4">
            <div className="text-xs text-slate-500">Punch Out</div>
            <div className="font-semibold">{timeLabel(today.outTime)}</div>
          </div>
          <div className="p-4">
            <div className="text-xs text-slate-500">Worked</div>
            <div className="font-semibold">
              {today.outTime
                ? fmtHours(today.hours)
                : today.inTime
                  ? "In progress"
                  : "—"}
            </div>
          </div>
        </div>
      </div>
      <p className="-mt-3 text-center text-xs text-slate-400">
        Office time {t.loginTime} – {t.logoutTime} · Late after {t.graceTime} ·
        Overtime after {t.otStart}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">My attendance · {monthLabel(mk)}</h2>
        <div className="flex gap-2">
          <MonthPicker value={mk} onChange={setMk} />
          {/* <button className="btn-ghost" onClick={downloadSlip}><FileDown size={16} /> Salary slip</button> */}
          <button className="btn-ghost" onClick={() => setPinOpen(true)}>
            <KeyRound size={16} /> PIN
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat
          icon={CalendarCheck}
          tone="green"
          label="Present days"
          value={sum.counts.P}
          sub={`${sum.counts.HD} half day`}
        />
        <Stat
          icon={Timer}
          tone="amber"
          label="Late marks"
          value={sum.late}
          sub={`Punctuality ${sum.punctuality}%`}
        />
        <Stat icon={Hourglass} label="Overtime" value={fmtHours(sum.otHours)} />
        <Stat
          icon={Target}
          tone="purple"
          label="Leaves taken"
          value={sum.counts.EL + sum.counts.CL}
          sub={`CL ${sum.counts.CL} · EL ${sum.counts.EL}`}
        />
        <Stat icon={Target} tone="red" label="Absent" value={sum.counts.A} />
        <Stat
          icon={Target}
          label="Leave balance (month)"
          value={`CL ${Math.max(0, 1 - sum.counts.CL)} · EL ${Math.max(0, 1 - sum.counts.EL)}`}
          sub="1 paid CL + 1 paid EL"
        />
      </div>

      <Card title="Calendar" action={<Legend />}>
        <MonthCalendar emp={emp} mk={mk} state={state} />
      </Card>
      <WorkSheet empId={emp.id} />
      <PinModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        emp={emp}
        update={update}
      />
    </div>
  );
}

function PinModal({ open, onClose, emp, update }) {
  const [oldP, setOld] = useState("");
  const [n1, setN1] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const save = async () => {
    setErr("");
    if (!(await checkPin(emp, oldP))) return setErr("Current PIN is wrong");
    if (!/^\d{4}$/.test(n1)) return setErr("New PIN must be 4 digits");
    const h = await sha256(n1);
    update((s) => {
      const e = s.employees.find((x) => x.id === emp.id);
      e.pinHash = h;
      delete e.pin;
      return s;
    });
    setOk(true);
    setOld("");
    setN1("");
  };
  return (
    <Modal
      open={open}
      onClose={() => {
        setOk(false);
        onClose();
      }}
      title="Change my PIN"
      footer={
        <button className="btn-primary" onClick={save}>
          Save PIN
        </button>
      }
    >
      <div className="space-y-3">
        <Field label="Current PIN">
          <input
            className="input"
            type="password"
            value={oldP}
            onChange={(e) => setOld(e.target.value)}
          />
        </Field>
        <Field label="New 4-digit PIN">
          <input
            className="input"
            type="password"
            maxLength={4}
            value={n1}
            onChange={(e) => setN1(e.target.value)}
          />
        </Field>
        {err && <div className="text-sm text-red-600">{err}</div>}
        {ok && <div className="text-sm text-emerald-600">PIN changed.</div>}
      </div>
    </Modal>
  );
}
