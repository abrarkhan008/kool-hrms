import { useMemo, useState } from 'react'
import { FileSpreadsheet, FileText, Files, SlidersHorizontal, Eye, Info } from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { calcAll, totals } from '../../lib/payroll.js'
import { monthKey, monthLabel, inr, fmtHours } from '../../lib/date.js'
import { Card, PageHeader, MonthPicker, Modal, Field, Num, Pill, Stat } from '../../components/ui.jsx'
import { GRADE_CLS } from '../../lib/performance.js'
import { Wallet, TrendingUp, Landmark, Hourglass } from 'lucide-react'

export default function Salary() {
  const { state, update } = useStore()
  const [mk, setMk] = useState(monthKey())
  const [editId, setEditId] = useState(null)
  const [viewId, setViewId] = useState(null)
  const rows = useMemo(() => calcAll(mk, state), [mk, state])
  const t = totals(rows)
  const partial = mk >= monthKey()

  const exp = async (kind) => {
    const x = await import('../../lib/exporters.js')
    if (kind === 'xlsx') x.payrollXlsx(rows, state, mk)
    if (kind === 'pdf') x.payrollPdf(rows, t, state.settings, mk)
    if (kind === 'slips') x.slipPdf(rows, state.settings, `Salary_Slips_${mk}.pdf`)
  }
  const edit = rows.find((r) => r.emp.id === editId)
  const view = rows.find((r) => r.emp.id === viewId)

  const cols = [
    ['CTC', (r) => inr(r.ctc)], ['Paid days', (r) => `${r.paidDays}/${r.basis}`], ['Earned', (r) => inr(r.earned)],
    ['Overtime', (r) => (r.otAmount ? <span title={fmtHours(r.otHours)}>{inr(r.otAmount)}</span> : '—')],
    ['Night stay', (r) => (r.nightStayAmt ? inr(r.nightStayAmt) : '—')], ['KPI', (r) => (r.kpi ? inr(r.kpi) : '—')],
    ['Other add.', (r) => (r.bike + r.bonus + r.other ? inr(r.bike + r.bonus + r.other) : '—')],
    ['Gross', (r) => <b>{inr(r.gross)}</b>], ['PF', (r) => (r.pf ? inr(r.pf) : '—')], ['ESI', (r) => (r.esi ? inr(r.esi) : '—')],
    ['Other ded.', (r) => (r.advance + r.otherDed ? inr(r.advance + r.otherDed) : '—')],
    ['Net pay', (r) => <b className="text-brand">{inr(r.net)}</b>],
  ]

  return (
    <div>
      <PageHeader title="Salary" sub="Calculated automatically from attendance, overtime, KPI and your salary rules in Settings.">
        <MonthPicker value={mk} onChange={setMk} />
        <button className="btn-ghost" onClick={() => exp('xlsx')}><FileSpreadsheet size={16} /> Excel</button>
        <button className="btn-ghost" onClick={() => exp('pdf')}><FileText size={16} /> PDF</button>
        <button className="btn-primary" onClick={() => exp('slips')}><Files size={16} /> All salary slips</button>
      </PageHeader>

      {partial && <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"><Info size={18} className="mt-0.5 shrink-0" /> {monthLabel(mk)} is not finished yet. Days that have not happened are not counted, so these figures are a preview until the month ends.</div>}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Wallet} label="Total CTC" value={inr(t.ctc)} />
        <Stat icon={TrendingUp} tone="green" label="Gross salary" value={inr(t.gross)} />
        <Stat icon={Landmark} tone="amber" label="PF + ESI" value={inr(t.pf + t.esi)} />
        <Stat icon={Hourglass} tone="purple" label="Net payable" value={inr(t.net)} />
      </div>

      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="th">Employee</th>{cols.map(([h]) => <th key={h} className="th">{h}</th>)}<th className="th" /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.emp.id} className="hover:bg-slate-50">
                  <td className="td"><div className="font-medium">{r.emp.name}</div><div className="text-xs text-slate-400">{r.emp.id}{r.grade && <Pill cls={`ml-2 ${GRADE_CLS[r.grade]}`}>{r.grade}</Pill>}</div></td>
                  {cols.map(([h, f]) => <td key={h} className="td">{f(r)}</td>)}
                  <td className="td text-right">
                    <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Salary slip" onClick={() => setViewId(r.emp.id)}><Eye size={16} /></button>
                    <button className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Night stay, bonus, advance…" onClick={() => setEditId(r.emp.id)}><SlidersHorizontal size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className="td">Totals</td><td className="td">{inr(t.ctc)}</td><td className="td" /><td className="td">{inr(t.earned)}</td><td className="td">{inr(t.otAmount)}</td><td className="td">{inr(t.nightStayAmt)}</td><td className="td">{inr(t.kpi)}</td>
                <td className="td">{inr(t.bike + t.bonus + t.other)}</td><td className="td">{inr(t.gross)}</td><td className="td">{inr(t.pf)}</td><td className="td">{inr(t.esi)}</td><td className="td">{inr(t.advance + t.otherDed)}</td><td className="td text-brand">{inr(t.net)}</td><td className="td" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <ExtrasModal r={edit} mk={mk} onClose={() => setEditId(null)} update={update} />
      <SlipModal r={view} onClose={() => setViewId(null)} settings={state.settings} />
    </div>
  )
}

function ExtrasModal({ r, mk, onClose, update }) {
  const [f, setF] = useState({})
  const [k, setK] = useState('')
  if (!r) { if (k) setK(''); return null }
  if (k !== r.emp.id + mk) { setK(r.emp.id + mk); setF({ ...r.inputs }) }
  const set = (key, v) => setF((x) => ({ ...x, [key]: v }))
  const save = () => { update((s) => { ((s.payroll[mk] ||= {})[r.emp.id] = f); return s }); onClose() }
  return (
    <Modal open onClose={onClose} title={`Extra pay & deductions · ${r.emp.name}`} wide
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save}>Save</button></>}>
      <p className="mb-4 text-sm text-slate-500">Optional items for {monthLabel(mk)}. Leave empty if not applicable.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Night stay (number of nights)" hint="Each night = 1 day salary (change in Settings)"><Num value={f.nightStays} onChange={(v) => set('nightStays', v)} /></Field>
        <Field label="Bike / petrol reimbursement (₹)"><Num value={f.bike} onChange={(v) => set('bike', v)} /></Field>
        <Field label="Bonus (₹)"><Num value={f.bonus} onChange={(v) => set('bonus', v)} /></Field>
        <Field label="Other allowance (₹)"><Num value={f.other} onChange={(v) => set('other', v)} /></Field>
        <Field label="Salary advance / loan instalment (₹)"><Num value={f.advance} onChange={(v) => set('advance', v)} /></Field>
        <Field label="Other deduction (₹)"><Num value={f.otherDed} onChange={(v) => set('otherDed', v)} /></Field>
        <Field label="Overtime hours override" hint={`Auto from attendance: ${r.otHours === Number(f.otHours) ? '' : ''}${fmtHours(r.otHours)}. Type a number to replace it.`}><Num value={f.otHours} onChange={(v) => set('otHours', v)} step="0.25" /></Field>
      </div>
    </Modal>
  )
}

export function SlipBody({ r, settings }) {
  const row = (a, b, bold) => <div className={`flex justify-between py-1 text-sm ${bold ? 'border-t border-slate-200 pt-2 font-semibold' : ''}`}><span>{a}</span><span>{b}</span></div>
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <div className="mb-1 text-xs font-bold uppercase tracking-wide text-emerald-600">Earnings</div>
        {row(`Basic (${settings.salary.basicPct}%)`, inr(r.basic))}
        {row(`HRA (${settings.salary.hraPct}%)`, inr(r.hra))}
        {row(`Conveyance (${settings.salary.conveyancePct}%)`, inr(r.conveyance))}
        {row('Special allowance', inr(r.special))}
        {row('Earned salary', inr(r.earned), true)}
        {row(`Overtime (${fmtHours(r.otHours)})`, inr(r.otAmount))}
        {row(`Night stay (${r.nightStays})`, inr(r.nightStayAmt))}
        {row(`KPI incentive ${r.grade ? `(${r.grade} ${r.kpiPct}%)` : ''}`, inr(r.kpi))}
        {row('Bike reimbursement', inr(r.bike))}{row('Bonus', inr(r.bonus))}{row('Other allowance', inr(r.other))}
        {row('Gross salary', inr(r.gross), true)}
      </div>
      <div>
        <div className="mb-1 text-xs font-bold uppercase tracking-wide text-red-600">Deductions</div>
        {row(`PF (${settings.salary.pfPct}%)`, inr(r.pf))}{row(`ESI (${settings.salary.esiPct}%)`, inr(r.esi))}
        {row('Salary advance / loan', inr(r.advance))}{row('Other deduction', inr(r.otherDed))}
        {row('Total deductions', inr(r.deductions), true)}
        <div className="mt-4 rounded-xl bg-brand-soft p-4 text-center"><div className="text-xs text-slate-500">Net payable</div><div className="text-2xl font-bold text-brand">{inr(r.net)}</div></div>
        <div className="mt-4 text-xs text-slate-500">CTC {inr(r.ctc)} · per day {inr(r.perDay)} · paid days {r.paidDays}/{r.basis} · late marks {r.late} · punctuality {r.punctuality}%</div>
      </div>
    </div>
  )
}

function SlipModal({ r, onClose, settings }) {
  if (!r) return null
  const dl = async () => { const { slipPdf } = await import('../../lib/exporters.js'); slipPdf([r], settings, `Salary_Slip_${r.emp.name.replace(/\s+/g, '_')}_${r.mk}.pdf`) }
  return (
    <Modal open onClose={onClose} wide title={`Salary slip · ${r.emp.name} · ${monthLabel(r.mk)}`} footer={<button className="btn-primary" onClick={dl}><FileText size={16} /> Download PDF</button>}>
      <SlipBody r={r} settings={settings} />
    </Modal>
  )
}
