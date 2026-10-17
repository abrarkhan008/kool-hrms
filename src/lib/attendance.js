import {
  minutesOf,
  minutesOfIso,
  monthDays,
  todayKey,
  weekdayIndex,
  round2,
  fromKey,
} from "./date.js";

// Status codes shown everywhere in the app
export const STATUS = {
  P: {
    label: "Present",
    short: "P",
    cls: "bg-emerald-100 text-emerald-700",
    paid: 1,
  },
  HD: {
    label: "Half Day",
    short: "HD",
    cls: "bg-amber-100 text-amber-700",
    paid: 0.5,
  },
  EL: {
    label: "Emergency Leave",
    short: "EL",
    cls: "bg-sky-100 text-sky-700",
    paid: 1,
  },
  CL: {
    label: "Casual Leave",
    short: "CL",
    cls: "bg-indigo-100 text-indigo-700",
    paid: 1,
  },
  A: { label: "Absent", short: "A", cls: "bg-red-100 text-red-700", paid: 0 },
  WO: {
    label: "Week Off",
    short: "WO",
    cls: "bg-slate-200 text-slate-600",
    paid: 1,
  },
  HOL: {
    label: "Holiday",
    short: "H",
    cls: "bg-purple-100 text-purple-700",
    paid: 1,
  },
  "": { label: "—", short: "·", cls: "bg-white text-slate-300", paid: 0 },
};
export const MANUAL_OPTIONS = ["P", "HD", "EL", "CL", "A"];

export const holidayOn = (settings, date) =>
  settings.holidays.find((h) => h.date === date);
export const isWeekOff = (settings, date) =>
  settings.timing.weekOffs.includes(weekdayIndex(date));

/**
 * Work out one employee's status for one day.
 * Order of rules:  admin override  ->  punches  ->  holiday / weekoff  ->  absent (past days only)
 */
export function dayInfo(emp, date, settings, attendance) {
  const rec = attendance?.[date]?.[emp.id] || {};
  const t = settings.timing;
  const hol = holidayOn(settings, date);
  const off = isWeekOff(settings, date);
  const today = todayKey();
  const info = {
    date,
    code: "",
    inTime: rec.in || "",
    outTime: rec.out || "",
    hours: 0,
    late: false,
    otHours: 0,
    holiday: hol?.name || "",
    weekOff: off,
    manual: !!rec.status,
    missedOut: false,
    note: rec.note || "",
  };

  if (emp.doj && date < emp.doj) return info; // before joining

  if (rec.in && rec.out)
    info.hours = Math.max(0, (new Date(rec.out) - new Date(rec.in)) / 3600000);
  if (rec.in) info.late = minutesOfIso(rec.in) > minutesOf(t.graceTime);

  const worked = !!rec.in || rec.status === "P" || rec.status === "HD";
  const restDay = off || !!hol;

  // overtime: hours after OT start time; on week off / holiday every worked hour is overtime
  if (t.otEnabled && rec.in && rec.out) {
    if (restDay) info.otHours = info.hours;
    else {
      const mins = minutesOfIso(rec.out) - minutesOf(t.otStart);
      info.otHours = mins >= t.minOtMinutes ? mins / 60 : 0;
    }
    info.otHours = round2(info.otHours);
  }

  if (rec.status) {
    info.code = rec.status;
    return info;
  }

  if (rec.in) {
    if (!rec.out) {
      info.missedOut = date < today;
      info.code = "P";
      return info;
    }
    info.code = restDay
      ? hol
        ? "HOL"
        : "WO"
      : info.hours < t.halfDayHours
        ? "HD"
        : "P";
    if (restDay) info.worked = true;
    if (restDay && info.hours < t.halfDayHours) info.worked = true;
    return info;
  }
  if (hol) {
    info.code = "HOL";
    return info;
  }
  if (off) {
    info.code = "WO";
    return info;
  }
  if (date < today) info.code = "A"; // no information = absent
  return info;
}

/** Whole-month summary for one employee */
export function monthSummary(emp, mk, settings, attendance) {
  const days = monthDays(mk).map((d) => dayInfo(emp, d, settings, attendance));
  const c = { P: 0, HD: 0, EL: 0, CL: 0, A: 0, WO: 0, HOL: 0 };
  let late = 0,
    ot = 0,
    paid = 0,
    onTime = 0,
    hours = 0,
    workedRest = 0;
  for (const d of days) {
    if (d.code) {
      c[d.code]++;
      if (d.code !== "EL" && d.code !== "CL") paid += STATUS[d.code].paid;
    }
    if (d.code === "P" || d.code === "HD") {
      if (d.inTime) {
        if (d.late) late++;
        else onTime++;
      }
    }
    if (d.worked) workedRest++;
    ot += d.otHours;
    hours += d.hours;
  }
  paid +=
    Math.min(c.EL, settings.leave.elPerMonth ?? 1) +
    Math.min(c.CL, settings.leave.clPerMonth ?? 1);
  paid += Math.min(c.EL, 1) + Math.min(c.CL, 1);
  const present = c.P + c.HD * 0.5;
  const attended = c.P + c.HD;
  return {
    days,
    counts: c,
    late,
    otHours: round2(ot),
    paidDays: paid,
    hours: round2(hours),
    workedRest,
    presentDays: present,
    punctuality: attended ? Math.round((onTime / attended) * 100) : 0,
    workingDays: days.filter(
      (d) =>
        d.date <= todayKey() &&
        !d.weekOff &&
        !d.holiday &&
        !(d.date < (emp.doj || "")),
    ).length,
  };
}

/** Leave taken in a calendar year (for the balance card) */
export function leaveUsed(emp, year, attendance) {
  let EL = 0,
    CL = 0;
  for (const [date, byEmp] of Object.entries(attendance)) {
    if (!date.startsWith(String(year))) continue;
    const s = byEmp[emp.id]?.status;
    if (s === "EL") EL++;
    if (s === "CL") CL++;
  }
  return { EL, CL };
}

export function punch(attendance, empId, kind, now = new Date()) {
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const rec = { ...(attendance[date]?.[empId] || {}) };
  if (kind === "in") {
    if (rec.in) return null;
    rec.in = now.toISOString();
  } else {
    if (!rec.in) return null;
    rec.out = now.toISOString();
  }
  return { date, rec };
}

export const workDaysBetween = (a, b) => (fromKey(b) - fromKey(a)) / 86400000;
