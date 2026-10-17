import { daysInMonth, round2 } from "./date.js";
import { monthSummary } from "./attendance.js";
import { score } from "./performance.js";

/**
 * Salary calculation for ONE employee for ONE month.
 * Every % and rule comes from Settings -> Salary, so the admin can change them anytime.
 */
export function calcSalary(emp, mk, state) {
  const { settings, attendance, payroll, performance } = state;
  const s = settings.salary;
  const sum = monthSummary(emp, mk, settings, attendance);
  const inp = payroll?.[mk]?.[emp.id] || {};
  const num = (v) => Number(v) || 0;

  const basis = s.daysBasis === "calendar" ? daysInMonth(mk) : 30;
  const ctc = num(emp.ctc);
  const perDay = ctc / basis;
  const perHour = perDay / (settings.timing.dutyHours || 9);
  const paidDays = Math.min(sum.paidDays, basis === 30 ? 30 : daysInMonth(mk));
  const earned = perDay * paidDays;

  // salary structure (as % of CTC, applied on earned salary)
  const pctSpecial = Math.max(0, 100 - s.basicPct - s.hraPct - s.conveyancePct);
  const basic = (earned * s.basicPct) / 100;
  const hra = (earned * s.hraPct) / 100;
  const conveyance = (earned * s.conveyancePct) / 100;
  const special = (earned * pctSpecial) / 100;

  // additions
  const otHours =
    inp.otHours !== undefined && inp.otHours !== ""
      ? num(inp.otHours)
      : sum.otHours;
  const otAmount = settings.timing.otEnabled
    ? perHour * otHours * s.otMultiplier
    : 0;
  const nightStays = num(inp.nightStays);
  const nightStayAmt = perDay * s.nightStayDays * nightStays;
  const bike = num(inp.bike),
    bonus = num(inp.bonus),
    other = num(inp.other);
  const perf = score(emp, performance?.[mk]?.[emp.id]);
  const kpiPct = s.kpiEnabled && perf.grade ? s.kpiSlabs[perf.grade] || 0 : 0;
  const kpi = (earned * kpiPct) / 100;
  const gross = earned + otAmount + nightStayAmt + bike + bonus + other + kpi;

  // deductions
  const pfBase = s.pfCeilingOn ? Math.min(basic, s.pfCeiling) : basic;
  const pf = emp.pf ? (pfBase * s.pfPct) / 100 : 0;
  const esiApplies = emp.esi && ctc <= s.esiCeiling;
  const esi = esiApplies ? ((earned + otAmount) * s.esiPct) / 100 : 0;
  const pfEmployer = emp.pf ? (pfBase * (s.pfEmployerPct ?? 12)) / 100 : 0;
  const esiEmployer = esiApplies
    ? ((earned + otAmount) * (s.esiEmployerPct ?? 3.25)) / 100
    : 0;
  const loan = num(inp.advance),
    fine = num(inp.otherDed);
  const advance = num(inp.advance),
    otherDed = num(inp.otherDed);
  const deductions = pf + esi + advance + otherDed;
  const net = gross - deductions;

  return {
    emp,
    mk,
    basis,
    perDay,
    perHour,
    ctc,
    counts: sum.counts,
    paidDays,
    workingDays: sum.workingDays,
    late: sum.late,
    punctuality: sum.punctuality,
    earned,
    basic,
    hra,
    conveyance,
    pfEmployer,
    esiEmployer,
    loan,
    fine,
    special,
    otHours,
    otAmount,
    nightStays,
    nightStayAmt,
    bike,
    bonus,
    other,
    kpi,
    kpiPct,
    grade: perf.grade,
    perfScore: perf.total,
    gross,
    pf,
    esi,
    advance,
    otherDed,
    deductions,
    net,
    inputs: inp,
  };
}

export const calcAll = (mk, state) =>
  state.employees
    .filter((e) => e.active !== false)
    .map((e) => calcSalary(e, mk, state));

export const totals = (rows) => {
  const keys = [
    "ctc",
    "earned",
    "basic",
    "hra",
    "conveyance",
    "special",
    "otAmount",
    "nightStayAmt",
    "bike",
    "bonus",
    "other",
    "kpi",
    "gross",
    "pf",
    "esi",
    "advance",
    "otherDed",
    "deductions",
    "net",
  ];
  const t = {};
  for (const k of keys)
    t[k] = round2(rows.reduce((a, r) => a + (r[k] || 0), 0));
  return t;
};
