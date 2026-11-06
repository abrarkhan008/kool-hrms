import { monthDays } from "./date.js";

// half "1" = 1st to 15th, half "2" = 16th to month end (same as your Excel sheets)
export const periodDays = (mk, half) =>
  monthDays(mk).filter((d) =>
    half === "1" ? Number(d.slice(8)) <= 15 : Number(d.slice(8)) > 15,
  );
export const periodKey = (mk, half) => `${mk}-${half}`;
export const periodLabel = (mk, half) => {
  const d = periodDays(mk, half);
  const [y, m] = mk.split("-");
  return `${d[0].slice(8)}.${m}.${y} to ${d[d.length - 1].slice(8)}.${m}.${y}`;
};

const num = (v) =>
  v === "" || v == null || isNaN(Number(v)) ? null : Number(v);
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;

export const dayKm = (rec) => {
  const s = num(rec?.s),
    e = num(rec?.e);
  return s == null || e == null ? 0 : Math.max(0, r1(e - s));
};

/** Bike calculation for ONE employee and ONE half-month */
export function bikeCalc(state, emp, mk, half) {
  const ex = state.bikeExtra?.[periodKey(mk, half)]?.[emp.id] || {};
  const rows = periodDays(mk, half).map((d) => {
    const rec = state.bike?.[d]?.[emp.id] || {};
    return { date: d, s: rec.s ?? "", e: rec.e ?? "", km: dayKm(rec) };
  });
  const autoKm = r1(rows.reduce((a, x) => a + x.km, 0));
  const km = num(ex.km) ?? autoKm;
  const rate = num(ex.rate) ?? Number(state.settings.salary.bikeRate ?? 3);
  const amount = r2(km * rate);
  const maint = Number(ex.maint) || 0;
  const advance = Number(ex.advance) || 0;
  return {
    emp,
    mk,
    half,
    rows,
    autoKm,
    km,
    rate,
    amount,
    maint,
    advance,
    total: r2(amount + maint - advance),
    note: ex.note || "",
    extra: ex,
  };
}

export const bikeAll = (state, mk, half) =>
  state.employees
    .filter((e) => e.active !== false)
    .map((e) => bikeCalc(state, e, mk, half));

/** both halves of a month added together (used as a hint in the Salary page) */
export const bikeMonthAmount = (state, emp, mk) =>
  r2(["1", "2"].reduce((a, h) => a + bikeCalc(state, emp, mk, h).total, 0));
