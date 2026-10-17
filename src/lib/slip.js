import { monthLabel } from "./date.js";

const A = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const B = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];
const two = (n) =>
  n < 20 ? A[n] : B[Math.floor(n / 10)] + (n % 10 ? " " + A[n % 10] : "");
const three = (n) =>
  (n >= 100
    ? A[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " : "")
    : "") + (n % 100 ? two(n % 100) : "");

export function rupeesInWords(v) {
  let n = Math.round(Number(v) || 0);
  if (n <= 0) return "Rupees Zero only";
  const p = [];
  const cr = Math.floor(n / 1e7);
  n %= 1e7;
  const lk = Math.floor(n / 1e5);
  n %= 1e5;
  const th = Math.floor(n / 1000);
  n %= 1000;
  if (cr) p.push(two(cr) + " Crore");
  if (lk) p.push(two(lk) + " Lakh");
  if (th) p.push(two(th) + " Thousand");
  if (n) p.push(three(n));
  return "Rupees " + p.join(" ") + " only";
}
export const dmy = (k) => (k ? k.split("-").reverse().join("-") : "");

export function slipData(r, settings) {
  const S = settings.salary;
  const spPct = Math.max(0, 100 - S.basicPct - S.hraPct - S.conveyancePct);
  const full = (p) => (r.ctc * p) / 100;
  const additional = r.otAmount + r.nightStayAmt + r.kpi + r.bonus + r.other;
  const earn = [
    ["Basic", full(S.basicPct), r.basic],
    ["HRA", full(S.hraPct), r.hra],
    ["Conveyance Allowance", full(S.conveyancePct), r.conveyance],
    ["Special Allowance", full(spPct), r.special],
    ["Petrol Allowance", null, r.bike],
    ["System Overtime / Additional", null, additional],
  ];
  const dl = [
    ["PF", r.pf],
    ["ESI", r.esi],
    ["Loan", r.advance],
    ["System Fine", r.otherDed],
    ["Total Deductions", r.deductions, true],
  ];
  const n = Math.max(earn.length, dl.length);
  const [y, m] = r.mk.split("-").map(Number);
  const payDate = `06-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-${m === 12 ? y + 1 : y}`;
  return {
    lines: Array.from({ length: n }, (_, i) => ({ e: earn[i], d: dl[i] })),
    title: monthLabel(r.mk).toUpperCase(),
    payDate,
    lop: Math.max(0, r.basis - r.paidDays),
    words: rupeesInWords(r.net),
  };
}
