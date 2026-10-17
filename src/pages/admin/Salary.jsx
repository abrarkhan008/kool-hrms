import { useMemo, useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  Files,
  SlidersHorizontal,
  Eye,
  Info,
} from "lucide-react";
import { useStore } from "../../lib/store.jsx";
import { calcAll, totals } from "../../lib/payroll.js";
import { monthKey, monthLabel, inr, fmtHours } from "../../lib/date.js";
import {
  Card,
  PageHeader,
  MonthPicker,
  Modal,
  Field,
  Num,
  Pill,
  Stat,
} from "../../components/ui.jsx";
import { GRADE_CLS } from "../../lib/performance.js";
import { Wallet, TrendingUp, Landmark, Hourglass } from "lucide-react";
import { slipData } from "../../lib/slip.js";

export default function Salary() {
  const { state, update } = useStore();
  const [mk, setMk] = useState(monthKey());
  const [editId, setEditId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const rows = useMemo(() => calcAll(mk, state), [mk, state]);
  const t = totals(rows);
  const partial = mk >= monthKey();

  const exp = async (kind) => {
    const x = await import("../../lib/exporters.js");
    if (kind === "xlsx") x.payrollXlsx(rows, state, mk);
    if (kind === "pdf") x.payrollPdf(rows, t, state.settings, mk);
    if (kind === "slips")
      x.slipPdf(rows, state.settings, `Salary_Slips_${mk}.pdf`);
  };
  const edit = rows.find((r) => r.emp.id === editId);
  const view = rows.find((r) => r.emp.id === viewId);

  const cols = [
    ["CTC", (r) => inr(r.ctc)],
    ["Paid days", (r) => `${r.paidDays}/${r.basis}`],
    ["Earned", (r) => inr(r.earned)],
    [
      "Overtime",
      (r) =>
        r.otAmount ? (
          <span title={fmtHours(r.otHours)}>{inr(r.otAmount)}</span>
        ) : (
          "—"
        ),
    ],
    ["Night stay", (r) => (r.nightStayAmt ? inr(r.nightStayAmt) : "—")],
    ["KPI", (r) => (r.kpi ? inr(r.kpi) : "—")],
    [
      "Other add.",
      (r) =>
        r.bike + r.bonus + r.other ? inr(r.bike + r.bonus + r.other) : "—",
    ],
    ["Gross", (r) => <b>{inr(r.gross)}</b>],
    ["PF", (r) => (r.pf ? inr(r.pf) : "—")],
    ["ESI", (r) => (r.esi ? inr(r.esi) : "—")],
    [
      "Other ded.",
      (r) => (r.advance + r.otherDed ? inr(r.advance + r.otherDed) : "—"),
    ],
    ["Net pay", (r) => <b className="text-brand">{inr(r.net)}</b>],
  ];

  return (
    <div>
      <PageHeader
        title="Salary"
        sub="Calculated automatically from attendance, overtime, KPI and your salary rules in Settings."
      >
        <MonthPicker value={mk} onChange={setMk} />
        <button className="btn-ghost" onClick={() => exp("xlsx")}>
          <FileSpreadsheet size={16} /> Excel
        </button>
        <button className="btn-ghost" onClick={() => exp("pdf")}>
          <FileText size={16} /> PDF
        </button>
        <button className="btn-primary" onClick={() => exp("slips")}>
          <Files size={16} /> All salary slips
        </button>
      </PageHeader>

      {partial && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info size={18} className="mt-0.5 shrink-0" /> {monthLabel(mk)} is not
          finished yet. Days that have not happened are not counted, so these
          figures are a preview until the month ends.
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Wallet} label="Total CTC" value={inr(t.ctc)} />
        <Stat
          icon={TrendingUp}
          tone="green"
          label="Gross salary"
          value={inr(t.gross)}
        />
        <Stat
          icon={Landmark}
          tone="amber"
          label="PF + ESI"
          value={inr(t.pf + t.esi)}
        />
        <Stat
          icon={Hourglass}
          tone="purple"
          label="Net payable"
          value={inr(t.net)}
        />
      </div>

      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Employee</th>
                {cols.map(([h]) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.emp.id} className="hover:bg-slate-50">
                  <td className="td">
                    <div className="font-medium">{r.emp.name}</div>
                    <div className="text-xs text-slate-400">
                      {r.emp.id}
                      {r.grade && (
                        <Pill cls={`ml-2 ${GRADE_CLS[r.grade]}`}>
                          {r.grade}
                        </Pill>
                      )}
                    </div>
                  </td>
                  {cols.map(([h, f]) => (
                    <td key={h} className="td">
                      {f(r)}
                    </td>
                  ))}
                  <td className="td text-right">
                    <button
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                      title="Salary slip"
                      onClick={() => setViewId(r.emp.id)}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                      title="Night stay, bonus, advance…"
                      onClick={() => setEditId(r.emp.id)}
                    >
                      <SlidersHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className="td">Totals</td>
                <td className="td">{inr(t.ctc)}</td>
                <td className="td" />
                <td className="td">{inr(t.earned)}</td>
                <td className="td">{inr(t.otAmount)}</td>
                <td className="td">{inr(t.nightStayAmt)}</td>
                <td className="td">{inr(t.kpi)}</td>
                <td className="td">{inr(t.bike + t.bonus + t.other)}</td>
                <td className="td">{inr(t.gross)}</td>
                <td className="td">{inr(t.pf)}</td>
                <td className="td">{inr(t.esi)}</td>
                <td className="td">{inr(t.advance + t.otherDed)}</td>
                <td className="td text-brand">{inr(t.net)}</td>
                <td className="td" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <ExtrasModal
        r={edit}
        mk={mk}
        onClose={() => setEditId(null)}
        update={update}
      />
      <SlipModal
        r={view}
        onClose={() => setViewId(null)}
        settings={state.settings}
      />
    </div>
  );
}

function ExtrasModal({ r, mk, onClose, update }) {
  const [f, setF] = useState({});
  const [k, setK] = useState("");
  if (!r) {
    if (k) setK("");
    return null;
  }
  if (k !== r.emp.id + mk) {
    setK(r.emp.id + mk);
    setF({ ...r.inputs });
  }
  const set = (key, v) => setF((x) => ({ ...x, [key]: v }));
  const save = () => {
    update((s) => {
      (s.payroll[mk] ||= {})[r.emp.id] = f;
      return s;
    });
    onClose();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`Extra pay & deductions · ${r.emp.name}`}
      wide
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
      <p className="mb-4 text-sm text-slate-500">
        Optional items for {monthLabel(mk)}. Leave empty if not applicable.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Night stay (number of nights)"
          hint="Each night = 1 day salary (change in Settings)"
        >
          <Num value={f.nightStays} onChange={(v) => set("nightStays", v)} />
        </Field>
        <Field label="Petrol allowance (₹)">
          <Num value={f.bike} onChange={(v) => set("bike", v)} />
        </Field>
        <Field label="Bonus (₹)">
          <Num value={f.bonus} onChange={(v) => set("bonus", v)} />
        </Field>
        <Field label="Other allowance (₹)">
          <Num value={f.other} onChange={(v) => set("other", v)} />
        </Field>
        <Field label="Loan (₹)">
          <Num value={f.advance} onChange={(v) => set("advance", v)} />
        </Field>
        <Field label="System fine (₹)">
          <Num value={f.otherDed} onChange={(v) => set("otherDed", v)} />
        </Field>
        {/* <Field label="Overtime hours override" hint={`Auto from attendance: ${r.otHours === Number(f.otHours) ? '' : ''}${fmtHours(r.otHours)}. Type a number to replace it.`}><Num value={f.otHours} onChange={(v) => set('otHours', v)} step="0.25" /></Field> */}
      </div>
    </Modal>
  );
}

export function SlipBody({ r, settings }) {
  const c = settings.company,
    d = slipData(r, settings),
    e = r.emp;
  const wm = c.logoRight || c.logoLeft || c.logo;
  const b = "border border-slate-700 px-2 py-1";
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
  return (
    <div className="relative overflow-x-auto border border-slate-700 text-sm">
      {wm && (
        <img
          src={wm}
          alt=""
          className="pointer-events-none absolute inset-0 m-auto w-1/2 opacity-[0.07]"
        />
      )}
      <div className="relative grid grid-cols-[1fr_2fr_1fr] items-center gap-2 border-b border-slate-700 p-2 text-center">
        <div>
          {c.logoLeft && (
            <img
              src={c.logoLeft}
              alt=""
              className="mx-auto max-h-16 object-contain"
            />
          )}
          <div className="text-xs font-bold text-brand">Authorized Dealer</div>
        </div>
        <div>
          <div className="text-base font-bold text-brand">{c.name}</div>
          <div className="text-[11px] text-slate-600">{c.address}</div>
        </div>
        <div>
          {c.logoRight && (
            <img
              src={c.logoRight}
              alt=""
              className="mx-auto max-h-16 object-contain"
            />
          )}
        </div>
      </div>
      <div className="relative border-b border-slate-700 py-1 text-center font-semibold">
        Payslip for the Month of {d.title}
      </div>
      <div className="relative grid sm:grid-cols-[2fr_1fr]">
        <table className="w-full">
          <tbody>
            {info.map(([k, v]) => (
              <tr key={k}>
                <td className={`${b} w-36 font-medium`}>{k}</td>
                <td className={b}>: {v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="grid place-items-center border-l border-slate-700 p-3 text-center">
          <div>
            <div className="text-slate-600">Employee Net Pay</div>
            <div className="text-2xl font-bold">{inr(r.net)}</div>
            <div className="mt-2 text-xs">
              Paid Days: {r.paidDays} | LOP Days: {d.lop}
            </div>
          </div>
        </div>
      </div>
      <table className="relative w-full">
        <thead>
          <tr>
            {["EARNINGS", "Actual", "Earned", "DEDUCTIONS", "AMOUNT"].map(
              (h) => (
                <th key={h} className={`${b} text-center`}>
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {d.lines.map((l, i) => (
            <tr key={i}>
              <td className={b}>{l.e?.[0]}</td>
              <td className={`${b} text-right`}>
                {l.e && l.e[1] != null ? inr(l.e[1]) : ""}
              </td>
              <td className={`${b} text-right`}>{l.e ? inr(l.e[2]) : ""}</td>
              <td className={`${b} ${l.d?.[2] ? "font-bold" : ""}`}>
                {l.d?.[0]}
              </td>
              <td className={`${b} text-right ${l.d?.[2] ? "font-bold" : ""}`}>
                {l.d ? inr(l.d[1]) : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="relative w-full">
        <tbody>
          {[
            ["Total Gross Earnings :", r.gross],
            ["Total Deductions", r.deductions],
            ["Net Payable", r.net],
          ].map(([k, v]) => (
            <tr key={k}>
              <td className={`${b} text-right`}>{k}</td>
              <td className={`${b} w-32 text-right font-bold`}>{inr(v)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} className={`${b} text-center font-bold`}>
              {d.words}
            </td>
          </tr>
          <tr>
            <td colSpan={2} className={`${b} text-center text-xs`}>
              Employer contribution (not deducted): PF {inr(r.pfEmployer)} · ESI{" "}
              {inr(r.esiEmployer)}
            </td>
          </tr>
          <tr>
            <td colSpan={2} className={`${b} text-center text-xs`}>
              This is computer generated slip, signature not required
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function SlipModal({ r, onClose, settings }) {
  if (!r) return null;
  const dl = async () => {
    const { slipPdf } = await import("../../lib/exporters.js");
    slipPdf(
      [r],
      settings,
      `Salary_Slip_${r.emp.name.replace(/\s+/g, "_")}_${r.mk}.pdf`,
    );
  };
  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={`Salary slip · ${r.emp.name} · ${monthLabel(r.mk)}`}
      footer={
        <button className="btn-primary" onClick={dl}>
          <FileText size={16} /> Download PDF
        </button>
      }
    >
      <SlipBody r={r} settings={settings} />
    </Modal>
  );
}
