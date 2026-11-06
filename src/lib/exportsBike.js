// PDFs for bike slips, bank letters and the Full report (bike + salary + bank)
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { monthLabel, dayName } from "./date.js";
import { calcAll, totals } from "./payroll.js";
import { bikeAll, periodDays, periodLabel } from "./bike.js";
import { pdfHeader, pdfSettings, rs, rgbOf } from "./exporters.js";

const dmyToday = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
};
const f2 = (n) => (Number(n) || 0).toFixed(2);

/* ---------- one page: bank transfer letter ---------- */
function bankPage(doc, settings, subject, items) {
  const c = settings.company,
    W = doc.internal.pageSize.getWidth();
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(dmyToday(), W - 14, 20, { align: "right" });
  const lines = [
    "To,",
    "The Manager",
    c.bankName || "Union Bank of India",
    c.bankBranch || "Bannimantap Branch, Mysuru",
  ];
  lines.forEach((l, i) => doc.text(l, 14, 20 + i * 6));
  let y = 20 + lines.length * 6 + 6;
  doc.setFont("helvetica", "bold");
  doc.text(`Sub: ${subject}`, 14, y);
  doc.setFont("helvetica", "normal");
  y += 8;
  doc.text(
    doc.splitTextToSize(
      "With reference to the above subject, please find enclosed the list of employees and the amounts to be transferred to their respective accounts.",
      W - 28,
    ),
    14,
    y,
  );
  y += 14;
  doc.text(`Our Account Number : ${c.bankAcNo || "510101003200174"}`, 14, y);
  const total = items.reduce((a, x) => a + x.amount, 0);
  autoTable(doc, {
    startY: y + 5,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 1.8,
      textColor: 0,
      lineColor: 0,
      lineWidth: 0.2,
    },
    headStyles: { fillColor: rgbOf(c.color), textColor: 255 },
    footStyles: { fillColor: [226, 232, 240], textColor: 0, fontStyle: "bold" },
    head: [
      [
        "Sl",
        "Amount",
        "IFSC Code",
        "Beneficiary Account Number",
        "Beneficiary Name",
        "Beneficiary Bank Name",
      ],
    ],
    body: items.map((x, i) => [
      i + 1,
      f2(x.amount),
      x.ifsc || "",
      x.acNo || "",
      x.name,
      x.bank || "",
    ]),
    foot: [["", f2(total), "", "", "TOTAL", ""]],
    columnStyles: { 1: { halign: "right" } },
  });
}

const bankItems = (rows, pick) =>
  rows
    .map((r) => ({
      amount: Math.round(pick(r)),
      ifsc: r.emp.ifsc,
      acNo: r.emp.acNo,
      name: r.emp.name,
      bank: r.emp.bankName,
    }))
    .filter((x) => x.amount > 0);

/* ---------- one page: bike reading grid (daily KM) ---------- */
function bikeGridPage(doc, settings, mk, half, rows) {
  const days = periodDays(mk, half);
  const y = pdfHeader(
    doc,
    settings,
    "BIKE READING SHEET",
    `${monthLabel(mk)} · ${periodLabel(mk, half)}`,
  );
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  autoTable(doc, {
    startY: y,
    styles: { fontSize: 7, cellPadding: 1.2, halign: "center" },
    headStyles: { fillColor: rgbOf(settings.company.color) },
    footStyles: { fillColor: [226, 232, 240], textColor: 0, fontStyle: "bold" },
    head: [
      [
        "#",
        "Employee",
        ...days.map((d) => d.slice(8) + " " + dayName(d).slice(0, 2)),
        "Total KM",
        "Rate",
        "Amount",
        "Maint.",
        "Advance",
        "Net",
      ],
    ],
    body: rows.map((r, i) => [
      i + 1,
      r.emp.name,
      ...r.rows.map((x) => x.km || ""),
      r.km,
      r.rate,
      f2(r.amount),
      f2(r.maint),
      f2(r.advance),
      f2(r.total),
    ]),
    foot: [
      [
        "",
        "TOTAL",
        ...days.map(() => ""),
        sum("km").toFixed(1),
        "",
        f2(sum("amount")),
        f2(sum("maint")),
        f2(sum("advance")),
        f2(sum("total")),
      ],
    ],
    columnStyles: { 1: { halign: "left", cellWidth: 40 } },
  });
}

/* ---------- one page: salary calculation sheet ---------- */
function salaryPage(doc, settings, rows, t, mk) {
  const y = pdfHeader(
    doc,
    settings,
    "SALARY CALCULATION SHEET",
    monthLabel(mk),
  );
  autoTable(doc, {
    startY: y,
    styles: { fontSize: 7.5, cellPadding: 1.5 },
    headStyles: { fillColor: rgbOf(settings.company.color), halign: "center" },
    footStyles: { fillColor: [226, 232, 240], textColor: 20 },
    head: [
      [
        "#",
        "Employee",
        "CTC",
        "Paid days",
        "OT hrs",
        "Earned",
        "Basic",
        "HRA",
        "Conv.",
        "Special",
        "OT",
        "Night stay",
        "KPI",
        "Petrol/Other",
        "Gross",
        "PF",
        "ESI",
        "Advance/Fine",
        "Net pay",
      ],
    ],
    body: rows.map((r, i) => [
      i + 1,
      r.emp.name,
      rs(r.ctc),
      r.paidDays,
      r.otHours,
      ...[
        r.earned,
        r.basic,
        r.hra,
        r.conveyance,
        r.special,
        r.otAmount,
        r.nightStayAmt,
        r.kpi,
        r.bike + r.bonus + r.other,
        r.gross,
        r.pf,
        r.esi,
        r.advance + r.otherDed,
        r.net,
      ].map(rs),
    ]),
    foot: [
      [
        "",
        "TOTAL",
        rs(t.ctc),
        "",
        "",
        rs(t.earned),
        rs(t.basic),
        rs(t.hra),
        rs(t.conveyance),
        rs(t.special),
        rs(t.otAmount),
        rs(t.nightStayAmt),
        rs(t.kpi),
        rs(t.bike + t.bonus + t.other),
        rs(t.gross),
        rs(t.pf),
        rs(t.esi),
        rs(t.advance + t.otherDed),
        rs(t.net),
      ],
    ],
    columnStyles: Object.fromEntries(
      Array.from({ length: 17 }, (_, i) => [i + 2, { halign: "right" }]),
    ),
  });
}

/* ---------- PUBLIC: bike slips (one A4 page per employee) ---------- */
export async function bikeSlipPdf(list, settings0, filename) {
  const settings = await pdfSettings(settings0);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  list.forEach((r, i) => {
    if (i) doc.addPage();
    const y = pdfHeader(
      doc,
      settings,
      "BIKE READING SLIP",
      `${monthLabel(r.mk)} · ${periodLabel(r.mk, r.half)}`,
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(
      `${r.emp.name} (${r.emp.id})  ${r.emp.designation || ""}`,
      14,
      y + 2,
    );
    autoTable(doc, {
      startY: y + 6,
      styles: { fontSize: 8, cellPadding: 1.3, halign: "center" },
      headStyles: { fillColor: rgbOf(settings.company.color) },
      head: [["Date", "Day", "Starting reading", "Ending reading", "KM"]],
      body: r.rows.map((x) => [
        x.date.split("-").reverse().join("-"),
        dayName(x.date).slice(0, 3),
        x.s,
        x.e,
        x.km || "",
      ]),
    });
    const bank = [
      r.emp.bankName,
      r.emp.acNo && "A/C " + r.emp.acNo,
      r.emp.ifsc && "IFSC " + r.emp.ifsc,
    ]
      .filter(Boolean)
      .join(" · ");
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 5,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 1.8,
        textColor: 0,
        lineColor: 0,
        lineWidth: 0.2,
      },
      body: [
        ["Total KM", r.km],
        ["Rate per KM", rs(r.rate)],
        ["Bike amount", rs(r.amount)],
        ["Bike maintenance allowance", rs(r.maint)],
        ["Advance / deduction", rs(r.advance)],
        [
          { content: "NET BIKE PAYABLE", styles: { fontStyle: "bold" } },
          { content: rs(r.total), styles: { fontStyle: "bold" } },
        ],
        ["Bank details", bank || "N/A"],
        ...(r.note ? [["Note", r.note]] : []),
      ],
      columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" } },
    });
  });
  doc.save(filename);
}

/* ---------- PUBLIC: bank letter for bike reimbursement ---------- */
export async function bikeBankPdf(rows, settings0, mk, half) {
  const settings = await pdfSettings(settings0);
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  bankPage(
    doc,
    settings,
    `Employees Petrol Reimbursement from ${periodLabel(mk, half).replace(" to ", " to ")}`,
    bankItems(rows, (r) => r.total),
  );
  doc.save(`Bike_Bank_Letter_${mk}-${half}.pdf`);
}

/* ---------- PUBLIC: FULL REPORT = bike sheets + salary sheet + bank letters ---------- */
export async function fullReportPdf(state, mk) {
  const settings = await pdfSettings(state.settings);
  const doc = new jsPDF({ unit: "mm", format: "a3", orientation: "landscape" });
  let first = true;
  const next = () => {
    if (!first) doc.addPage();
    first = false;
  };
  const bike = { 1: bikeAll(state, mk, "1"), 2: bikeAll(state, mk, "2") };
  for (const h of ["1", "2"]) {
    next();
    bikeGridPage(doc, settings, mk, h, bike[h]);
  }
  const rows = calcAll(mk, state);
  next();
  salaryPage(doc, settings, rows, totals(rows), mk);
  next();
  bankPage(
    doc,
    settings,
    `Employees Salary for the month of ${monthLabel(mk)} - Reg`,
    bankItems(rows, (r) => r.net),
  );
  for (const h of ["1", "2"]) {
    const items = bankItems(bike[h], (r) => r.total);
    if (!items.length) continue;
    next();
    bankPage(
      doc,
      settings,
      `Employees Petrol Reimbursement from ${periodLabel(mk, h)}`,
      items,
    );
  }
  doc.save(`Full_Report_${mk}.pdf`);
}
