// Excel + PDF downloads. Loaded only when the user clicks a download button (keeps the site fast).
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { monthLabel, monthDays, round2, dayName, timeLabel } from "./date.js";
import { monthSummary, STATUS } from "./attendance.js";
import { totals } from "./payroll.js";
import { slipData, dmy } from "./slip.js";

const rs = (n) =>
  "Rs. " +
  (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const hex = (c) => (c || "#0e7490").replace("#", "").toUpperCase();
const rgbOf = (c) => {
  const n = parseInt(hex(c), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const save = async (wb, name) => {
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

/* ------------------------------ PDF: header used by every PDF ------------------------------ */
function pdfHeader(doc, settings, title, sub) {
  const c = settings.company,
    w = doc.internal.pageSize.getWidth();
  const col = rgbOf(c.color);
  doc.setFillColor(...col);
  doc.rect(0, 0, w, 26, "F");
  let x = 14;
  if (c.logo) {
    try {
      doc.addImage(c.logo, "PNG", 10, 4, 18, 18);
      x = 32;
    } catch {
      /* ignore bad logo */
    }
  }
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(c.name, x, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(doc.splitTextToSize(c.address || "", w - x - 14), x, 17);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(title, w - 14, 11, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(sub, w - 14, 17, { align: "right" });
  doc.setTextColor(30);
  return 34;
}

/* ------------------------------ PDF: salary slips (one page per employee) ------------------------------ */
function putImg(doc, src, x, y, maxW, maxH) {
  try {
    const p = doc.getImageProperties(src),
      k = Math.min(maxW / p.width, maxH / p.height),
      w = p.width * k,
      h = p.height * k;
    doc.addImage(src, x + (maxW - w) / 2, y + (maxH - h) / 2, w, h);
  } catch {
    /* ignore bad image */
  }
}

export function slipPdf(rows, settings, filename) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const c = settings.company,
    col = rgbOf(c.color),
    X = 10,
    W = 190;
  const tbl = {
    theme: "grid",
    margin: { left: X },
    tableWidth: W,
    styles: {
      fontSize: 9,
      cellPadding: 1.6,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      textColor: 0,
      fillColor: false,
    },
  };
  rows.forEach((r, i) => {
    if (i) doc.addPage();
    const d = slipData(r, settings),
      e = r.emp;
    const wm = c.logoRight || c.logoLeft || c.logo;
    if (wm) {
      try {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.07 }));
        putImg(doc, wm, 45, 95, 120, 120);
        doc.restoreGraphicsState();
      } catch {
        /* no opacity support */
      }
    }
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.rect(X, 10, W, 30);
    doc.line(X + 50, 10, X + 50, 40);
    doc.line(X + 140, 10, X + 140, 40);
    if (c.logoLeft) putImg(doc, c.logoLeft, X + 2, 12, 46, 20);
    doc.setTextColor(...col);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Authorized Dealer", X + 3, 37);
    doc.setFontSize(14);
    doc.text(c.name, X + 95, 20, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize(c.address || "", 86), X + 95, 26, {
      align: "center",
    });
    if (c.logoRight) putImg(doc, c.logoRight, X + 142, 12, 46, 26);
    doc.setTextColor(0);
    doc.rect(X, 40, W, 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Payslip for the Month of ${d.title}`, X + W / 2, 45.5, {
      align: "center",
    });

    const info = [
      ["Employee Name", e.name],
      ["Designation", e.designation],
      ["Date of Joining", dmy(e.doj)],
      ["Pay Period", monthLabel(r.mk)],
      ["Pay Date", d.payDate],
      ["A/C Number", e.acNo || "N/A"],
      ["Bank Name", e.bankName || "N/A"],
      ["UAN Number", e.uan || "N/A"],
    ];
    const right = {
      content: `Employee Net Pay\n${rs(r.net)}\nPaid Days: ${r.paidDays} | LOP Days: ${d.lop}`,
      rowSpan: 8,
      styles: {
        halign: "center",
        valign: "middle",
        fontStyle: "bold",
        fontSize: 11,
      },
    };
    autoTable(doc, {
      ...tbl,
      startY: 48,
      body: info.map(([k, v], n) =>
        n === 0 ? [k, ": " + v, right] : [k, ": " + v],
      ),
      columnStyles: {
        0: { cellWidth: 32, fontStyle: "bold" },
        1: { cellWidth: 78 },
        2: { cellWidth: 80 },
      },
    });

    const B = { fontStyle: "bold" };
    autoTable(doc, {
      ...tbl,
      startY: doc.lastAutoTable.finalY,
      head: [["EARNINGS", "Actual", "Earned", "DEDUCTIONS", "AMOUNT"]],
      headStyles: {
        fillColor: false,
        textColor: 0,
        halign: "center",
        fontStyle: "bold",
      },
      body: d.lines.map((l) => [
        l.e?.[0] || "",
        l.e && l.e[1] != null ? rs(l.e[1]) : "",
        l.e ? rs(l.e[2]) : "",
        { content: l.d?.[0] || "", styles: l.d?.[2] ? B : {} },
        { content: l.d ? rs(l.d[1]) : "", styles: l.d?.[2] ? B : {} },
      ]),
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 30, halign: "right" },
        2: { cellWidth: 30, halign: "right" },
        3: { cellWidth: 45 },
        4: { cellWidth: 30, halign: "right" },
      },
    });
    const tot = (k, v) => [
      { content: k, styles: { halign: "right" } },
      { content: rs(v), styles: { halign: "right", fontStyle: "bold" } },
    ];
    autoTable(doc, {
      ...tbl,
      startY: doc.lastAutoTable.finalY,
      body: [
        tot("Total Gross Earnings :", r.gross),
        tot("Total Deductions", r.deductions),
        tot("Net Payable", r.net),
        [
          {
            content: d.words,
            colSpan: 2,
            styles: { halign: "center", fontStyle: "bold" },
          },
        ],
        [
          {
            content: `Employer contribution (not deducted): PF ${rs(r.pfEmployer)} | ESI ${rs(r.esiEmployer)}`,
            colSpan: 2,
            styles: { halign: "center", fontSize: 8 },
          },
        ],
        [
          {
            content: "This is computer generated slip, signature not required",
            colSpan: 2,
            styles: { halign: "center", fontSize: 8 },
          },
        ],
      ],
      columnStyles: { 0: { cellWidth: 160 }, 1: { cellWidth: 30 } },
    });
  });
  doc.save(filename);
}

/* ------------------------------ PDF: payroll summary (all employees) ------------------------------ */
export function payrollPdf(rows, t, settings, mk) {
  const doc = new jsPDF({ unit: "mm", format: "a3", orientation: "landscape" });
  const y = pdfHeader(doc, settings, "SALARY STATEMENT", monthLabel(mk));
  autoTable(doc, {
    startY: y,
    styles: { fontSize: 8, cellPadding: 1.6 },
    headStyles: { fillColor: rgbOf(settings.company.color), halign: "center" },
    head: [
      [
        "#",
        "Employee",
        "CTC",
        "Paid days",
        "Earned",
        "Basic",
        "HRA",
        "Conv.",
        "Special",
        "OT",
        "Night stay",
        "KPI",
        "Other add.",
        "Gross",
        "PF",
        "ESI",
        "Other ded.",
        "Net pay",
      ],
    ],
    body: rows.map((r, i) => [
      i + 1,
      r.emp.name,
      ...[r.ctc].map(rs),
      r.paidDays,
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
    footStyles: { fillColor: [226, 232, 240], textColor: 20 },
    columnStyles: Object.fromEntries(
      Array.from({ length: 16 }, (_, i) => [i + 2, { halign: "right" }]),
    ),
  });
  doc.save(`Salary_Statement_${mk}.pdf`);
}

/* ------------------------------ Excel: payroll with LIVE formulas + VLOOKUP / HLOOKUP slip ------------------------------ */
export async function payrollXlsx(rows, state, mk) {
  const s = state.settings,
    S = s.salary,
    T = s.timing;
  const wb = new ExcelJS.Workbook();
  wb.creator = s.company.name;
  const brand = "FF" + hex(s.company.color);
  const head = {
    font: { bold: true, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: brand } },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
  };
  const border = {
    top: { style: "thin", color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
    left: { style: "thin", color: { argb: "FFE2E8F0" } },
    right: { style: "thin", color: { argb: "FFE2E8F0" } },
  };
  const money = "#,##0.00";

  // ---- Settings sheet (the formulas read these cells, so you can change a % and the whole sheet updates)
  const st = wb.addWorksheet("Settings");
  st.columns = [{ width: 34 }, { width: 14 }];
  const sv = [
    ["Basic % of CTC", S.basicPct],
    ["HRA % of CTC", S.hraPct],
    ["Conveyance % of CTC", S.conveyancePct],
    ["Overtime multiplier", S.otMultiplier],
    ["Duty hours per day", T.dutyHours],
    ["PF %", S.pfPct],
    ["ESI %", S.esiPct],
    ["ESI ceiling (CTC)", S.esiCeiling],
    ["Night stay = days of salary", S.nightStayDays],
    ["PF wage ceiling", S.pfCeilingOn ? S.pfCeiling : 1e9],
  ];
  st.getCell("A1").value = "Salary rules (edit the blue cells)";
  st.getCell("A1").font = { bold: true, size: 13 };
  sv.forEach(([k, v], i) => {
    st.getCell(`A${i + 2}`).value = k;
    const c = st.getCell(`B${i + 2}`);
    c.value = v;
    c.font = { color: { argb: "FF1D4ED8" }, bold: true };
  });

  // ---- Payroll sheet
  const ws = wb.addWorksheet("Payroll", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 4 }],
  });
  ws.mergeCells("A1:S1");
  ws.getCell("A1").value =
    `${s.company.name} — Salary statement ${monthLabel(mk)}`;
  ws.getCell("A1").font = { bold: true, size: 15, color: { argb: brand } };
  ws.getCell("A2").value = s.company.address;
  ws.getCell("A2").font = { color: { argb: "FF64748B" } };
  const H = [
    "S.No",
    "Employee ID",
    "Name",
    "CTC",
    "Paid Days",
    "Earned Salary",
    "Basic",
    "HRA",
    "Conveyance",
    "Special Allowance",
    "OT Hours",
    "OT Amount",
    "Night Stay",
    "KPI Incentive",
    "Gross Salary",
    "Employee PF",
    "Employee ESI",
    "Total Deductions",
    "Net Pay",
    "Days basis",
    "Bike reimb.",
    "Bonus",
    "Other allowance",
    "Salary advance",
    "Other deduction",
    "Night stays (nos)",
    "PF? (1/0)",
    "ESI? (1/0)",
  ];
  ws.getRow(4).values = H;
  ws.getRow(4).height = 32;
  H.forEach((_, i) => {
    const c = ws.getCell(4, i + 1);
    Object.assign(c, head);
  });
  ws.columns = H.map((h, i) => ({ width: i === 2 ? 28 : i < 2 ? 12 : 14 }));
  const first = 5;
  rows.forEach((r, i) => {
    const n = first + i;
    const f = (formula, result) => ({ formula, result: round2(result) });
    ws.getRow(n).values = [
      i + 1,
      r.emp.id,
      r.emp.name,
      r.ctc,
      r.paidDays,
      f(`D${n}/T${n}*E${n}`, r.earned),
      f(`F${n}*Settings!$B$2/100`, r.basic),
      f(`F${n}*Settings!$B$3/100`, r.hra),
      f(`F${n}*Settings!$B$4/100`, r.conveyance),
      f(`F${n}-G${n}-H${n}-I${n}`, r.special),
      r.otHours,
      f(`D${n}/T${n}/Settings!$B$6*K${n}*Settings!$B$5`, r.otAmount),
      f(`D${n}/T${n}*Settings!$B$10*Z${n}`, r.nightStayAmt),
      round2(r.kpi),
      f(`F${n}+L${n}+M${n}+N${n}+U${n}+V${n}+W${n}`, r.gross),
      f(`IF(AA${n}=1,MIN(G${n},Settings!$B$11)*Settings!$B$7/100,0)`, r.pf),
      f(
        `IF(AND(AB${n}=1,D${n}<=Settings!$B$9),(F${n}+L${n})*Settings!$B$8/100,0)`,
        r.esi,
      ),
      f(`P${n}+Q${n}+X${n}+Y${n}`, r.deductions),
      f(`O${n}-R${n}`, r.net),
      r.basis,
      r.bike,
      r.bonus,
      r.other,
      r.advance,
      r.otherDed,
      r.nightStays,
      r.emp.pf ? 1 : 0,
      r.emp.esi ? 1 : 0,
    ];
    for (let c = 1; c <= 28; c++) {
      const cell = ws.getCell(n, c);
      cell.border = border;
      if (c >= 4 && c !== 5 && c !== 11 && c <= 19) cell.numFmt = money;
    }
    ws.getCell(n, 19).font = { bold: true };
    for (let c = 20; c <= 28; c++)
      ws.getCell(n, c).font = { color: { argb: "FF1D4ED8" } };
  });
  const last = first + rows.length - 1,
    tr = last + 1,
    tt = totals(rows);
  ws.getCell(tr, 3).value = "TOTAL";
  const sumCols = {
    D: tt.ctc,
    F: tt.earned,
    G: tt.basic,
    H: tt.hra,
    I: tt.conveyance,
    J: tt.special,
    L: tt.otAmount,
    M: tt.nightStayAmt,
    N: tt.kpi,
    O: tt.gross,
    P: tt.pf,
    Q: tt.esi,
    R: tt.deductions,
    S: tt.net,
  };
  Object.entries(sumCols).forEach(([L, v]) => {
    ws.getCell(`${L}${tr}`).value = {
      formula: `SUM(${L}${first}:${L}${last})`,
      result: v,
    };
    ws.getCell(`${L}${tr}`).numFmt = money;
  });
  for (let c = 1; c <= 19; c++) {
    const cell = ws.getCell(tr, c);
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
  }
  ws.getCell("A3").value =
    "Blue columns T–AB are inputs. Everything else is a formula, so editing a blue cell or a rule in the Settings sheet recalculates automatically.";
  ws.getCell("A3").font = { italic: true, color: { argb: "FF64748B" } };

  // ---- Slip sheet: pick an Employee ID in B4 -> VLOOKUP + HLOOKUP fill the rest
  const sl = wb.addWorksheet("Salary_Slip");
  sl.columns = [
    { width: 30 },
    { width: 22 },
    { width: 4 },
    { width: 30 },
    { width: 22 },
  ];
  sl.mergeCells("A1:E1");
  sl.getCell("A1").value = s.company.name;
  sl.getCell("A1").font = { bold: true, size: 18, color: { argb: brand } };
  sl.mergeCells("A2:E2");
  sl.getCell("A2").value = `SALARY SLIP — ${monthLabel(mk)}`;
  sl.getCell("A2").font = { bold: true, size: 12 };
  sl.getCell("A4").value = "Type Employee ID here  ➜";
  sl.getCell("A4").font = { bold: true };
  const e0 = rows[0];
  sl.getCell("B4").value = e0?.emp.id;
  sl.getCell("B4").font = { bold: true, color: { argb: "FF1D4ED8" }, size: 12 };
  sl.getCell("B4").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFEF9C3" },
  };
  sl.getCell("B4").dataValidation = {
    type: "list",
    allowBlank: false,
    formulae: [`Payroll!$B$${first}:$B$${last}`],
  };
  const V = (idx, result, fmt) => ({
    formula: `VLOOKUP($B$4,Payroll!$B$${first}:$S$${last},${idx},FALSE)`,
    result,
  });
  const Hh = (name, result) => ({
    formula: `HLOOKUP("${name}",Payroll!$A$4:$S$${last},MATCH($B$4,Payroll!$B$4:$B$${last},0),FALSE)`,
    result,
  });
  const put = (cell, label, v, fmt) => {
    sl.getCell(cell.l).value = label;
    sl.getCell(cell.v).value = v;
    if (fmt) sl.getCell(cell.v).numFmt = money;
    sl.getCell(cell.v).alignment = { horizontal: "right" };
  };
  const g = (k) => (e0 ? round2(e0[k]) : 0);
  const L = (col, row) => ({
    l: `${col}${row}`,
    v: `${String.fromCharCode(col.charCodeAt(0) + 1)}${row}`,
  });
  sl.getCell("A6").value = "Employee name";
  sl.getCell("B6").value = V(2, e0?.emp.name);
  sl.getCell("D6").value = "CTC / month";
  sl.getCell("E6").value = V(3, g("ctc"));
  sl.getCell("E6").numFmt = money;
  sl.getCell("A7").value = "Paid days";
  sl.getCell("B7").value = V(4, g("paidDays"));
  sl.getCell("D7").value = "Overtime hours";
  sl.getCell("E7").value = V(10, g("otHours"));
  const hdr = (c, t) => {
    const x = sl.getCell(c);
    x.value = t;
    Object.assign(x, head);
  };
  hdr("A9", "EARNINGS");
  hdr("B9", "Amount");
  hdr("D9", "DEDUCTIONS");
  hdr("E9", "Amount");
  const earn = [
    ["Basic", 6, "basic"],
    ["HRA", 7, "hra"],
    ["Conveyance", 8, "conveyance"],
    ["Special allowance", 9, "special"],
    ["Overtime", 11, "otAmount"],
    ["Night stay", 12, "nightStayAmt"],
    ["KPI incentive", 13, "kpi"],
  ];
  earn.forEach(([l, idx, k], i) => {
    sl.getCell(`A${10 + i}`).value = l;
    sl.getCell(`B${10 + i}`).value = V(idx, g(k));
    sl.getCell(`B${10 + i}`).numFmt = money;
  });
  sl.getCell("A17").value = "GROSS SALARY";
  sl.getCell("B17").value = V(14, g("gross"));
  sl.getCell("B17").numFmt = money;
  const ded = [
    ["Provident Fund (PF)", "Employee PF", "pf"],
    ["ESI", "Employee ESI", "esi"],
  ];
  ded.forEach(([l, h, k], i) => {
    sl.getCell(`D${10 + i}`).value = l;
    sl.getCell(`E${10 + i}`).value = Hh(h, g(k));
    sl.getCell(`E${10 + i}`).numFmt = money;
  });
  sl.getCell("D17").value = "TOTAL DEDUCTIONS";
  sl.getCell("E17").value = Hh("Total Deductions", g("deductions"));
  sl.getCell("E17").numFmt = money;
  sl.mergeCells("A19:B19");
  sl.getCell("A19").value = "NET PAYABLE";
  sl.getCell("E19").value = Hh("Net Pay", g("net"));
  sl.getCell("E19").numFmt = money;
  sl.getCell("D19").value = "NET PAYABLE";
  ["A17", "B17", "D17", "E17", "A19", "D19", "E19"].forEach((c) => {
    sl.getCell(c).font = { bold: true, size: c.endsWith("19") ? 13 : 11 };
  });
  ["A17", "B17", "D17", "E17"].forEach((c) => {
    sl.getCell(c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
  });
  sl.getCell("A21").value =
    "Earnings use VLOOKUP (search down by Employee ID). Deductions use HLOOKUP (search across by column heading).";
  sl.getCell("A21").font = { italic: true, color: { argb: "FF64748B" } };
  sl.getCell("D24").value = "Authorised Signatory";
  sl.getCell("D24").border = { top: { style: "thin" } };

  await save(wb, `Payroll_${mk}.xlsx`);
}

/* ------------------------------ Excel: monthly attendance sheet ------------------------------ */
export async function attendanceXlsx(state, mk) {
  const s = state.settings;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Attendance", {
    views: [{ state: "frozen", xSplit: 2, ySplit: 3 }],
  });
  const days = monthDays(mk);
  const brand = "FF" + hex(s.company.color);
  ws.getCell("A1").value = `${s.company.name} — Attendance ${monthLabel(mk)}`;
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: brand } };
  const H = [
    "Employee ID",
    "Name",
    ...days.map((d) => d.slice(8) + " " + dayName(d).slice(0, 2)),
    "Present",
    "Half day",
    "EL",
    "CL",
    "Absent",
    "Week off",
    "Holiday",
    "Late marks",
    "OT hours",
    "Paid days",
    "Punctuality %",
  ];
  ws.getRow(3).values = H;
  H.forEach((_, i) => {
    const c = ws.getCell(3, i + 1);
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: brand } };
    c.alignment = { horizontal: "center" };
  });
  ws.getColumn(2).width = 28;
  ws.getColumn(1).width = 12;
  const fills = {
    P: "FFD1FAE5",
    HD: "FFFEF3C7",
    EL: "FFE0F2FE",
    CL: "FFE0E7FF",
    A: "FFFEE2E2",
    WO: "FFE2E8F0",
    HOL: "FFF3E8FF",
  };
  state.employees
    .filter((e) => e.active !== false)
    .forEach((e, i) => {
      const sum = monthSummary(e, mk, s, state.attendance),
        n = 4 + i;
      ws.getRow(n).values = [
        e.id,
        e.name,
        ...sum.days.map((d) =>
          STATUS[d.code].short === "·" ? "" : STATUS[d.code].short,
        ),
        sum.counts.P,
        sum.counts.HD,
        sum.counts.EL,
        sum.counts.CL,
        sum.counts.A,
        sum.counts.WO,
        sum.counts.HOL,
        sum.late,
        sum.otHours,
        sum.paidDays,
        sum.punctuality,
      ];
      sum.days.forEach((d, k) => {
        const c = ws.getCell(n, 3 + k);
        c.alignment = { horizontal: "center" };
        if (fills[d.code])
          c.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: fills[d.code] },
          };
      });
    });
  // punch detail sheet
  const pd = wb.addWorksheet("Punch_Log");
  pd.columns = [
    { header: "Date", width: 12 },
    { header: "Employee ID", width: 12 },
    { header: "Name", width: 28 },
    { header: "Punch In", width: 12 },
    { header: "Punch Out", width: 12 },
    { header: "Hours", width: 9 },
    { header: "Overtime (h)", width: 12 },
    { header: "Late", width: 7 },
    { header: "Status", width: 10 },
  ];
  pd.getRow(1).font = { bold: true };
  state.employees.forEach((e) =>
    monthSummary(e, mk, s, state.attendance).days.forEach((d) => {
      if (d.inTime || d.manual)
        pd.addRow([
          d.date,
          e.id,
          e.name,
          timeLabel(d.inTime),
          timeLabel(d.outTime),
          round2(d.hours),
          d.otHours,
          d.late ? "Yes" : "",
          STATUS[d.code].label,
        ]);
    }),
  );
  await save(wb, `Attendance_${mk}.xlsx`);
}
