import { useMemo, useState } from 'react'
import { useStore } from '../../lib/store.jsx'
import { calcAll } from '../../lib/payroll.js'
import { monthKey, addMonths, monthLabel, inr } from '../../lib/date.js'
import { Card, PageHeader, Field, MonthPicker } from '../../components/ui.jsx'

// The same columns as the Excel payroll sheet, so VLOOKUP column numbers match
export const PAY_COLUMNS = [
  ['id', 'Employee ID'], ['name', 'Name'], ['ctc', 'CTC'], ['paidDays', 'Paid Days'], ['earned', 'Earned Salary'], ['basic', 'Basic'], ['hra', 'HRA'],
  ['conveyance', 'Conveyance'], ['special', 'Special Allowance'], ['otHours', 'OT Hours'], ['otAmount', 'OT Amount'], ['nightStayAmt', 'Night Stay'],
  ['kpi', 'KPI Incentive'], ['gross', 'Gross Salary'], ['pf', 'Employee PF'], ['esi', 'Employee ESI'], ['deductions', 'Total Deductions'], ['net', 'Net Pay'],
]
const val = (r, k) => (k === 'id' ? r.emp.id : k === 'name' ? r.emp.name : r[k])
const money = (k) => !['id', 'name', 'paidDays', 'otHours'].includes(k)

export default function Lookup() {
  const { state } = useStore()
  const [mk, setMk] = useState(monthKey())
  const rows = useMemo(() => calcAll(mk, state), [mk, state])
  const [id, setId] = useState(state.employees[0]?.id || '')
  const [col, setCol] = useState('net')
  const [metric, setMetric] = useState('net')

  const emp = state.employees.find((e) => e.id === id)
  const found = rows.find((r) => r.emp.id === id)
  const colIdx = PAY_COLUMNS.findIndex(([k]) => k === col) + 1
  const out = found ? val(found, col) : null

  // HLOOKUP: look for a column HEADER across the top row, then go down to the employee's row
  const months = Array.from({ length: 6 }, (_, i) => addMonths(monthKey(), i - 5))
  const hdata = useMemo(() => months.map((m) => calcAll(m, state).find((r) => r.emp.id === id)), [state, id])
  const rowIdx = rows.findIndex((r) => r.emp.id === id) + 2 // +1 for the header row, +1 because Excel counts from 1
  const hOut = found ? val(found, metric) : null
  const fmt = (k, v) => (v === null || v === undefined ? 'Not found' : money(k) ? inr(v) : v)

  return (
    <div>
      <PageHeader title="Lookup" sub="Find any employee's salary figure instantly — the same idea as Excel VLOOKUP and HLOOKUP. The Excel download also contains real VLOOKUP / HLOOKUP formulas." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="VLOOKUP — find by Employee ID (vertical)">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Month"><MonthPicker value={mk} onChange={setMk} /></Field>
            <Field label="Employee ID (lookup value)"><select className="input" value={id} onChange={(e) => setId(e.target.value)}>{state.employees.map((e) => <option key={e.id} value={e.id}>{e.id} · {e.name}</option>)}</select></Field>
            <Field label="Column to return"><select className="input" value={col} onChange={(e) => setCol(e.target.value)}>{PAY_COLUMNS.map(([k, l], i) => <option key={k} value={k}>{i + 1}. {l}</option>)}</select></Field>
          </div>
          <div className="mt-4 rounded-xl bg-brand-soft p-4 text-center"><div className="text-xs text-slate-500">{emp?.name} · {PAY_COLUMNS.find(([k]) => k === col)[1]}</div><div className="text-3xl font-bold text-brand">{fmt(col, out)}</div></div>
          <code className="mt-3 block rounded-lg bg-slate-900 p-3 text-xs text-emerald-300">=VLOOKUP("{id}", Payroll!$B$5:$S$200, {colIdx}, FALSE)</code>
          <p className="mt-2 text-xs text-slate-500">Reads: look for “{id}” in the first column, then return the value from column number {colIdx}. FALSE = exact match.</p>
        </Card>

        <Card title="HLOOKUP — find by column heading (horizontal)">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Column heading (lookup value)"><select className="input" value={metric} onChange={(e) => setMetric(e.target.value)}>{PAY_COLUMNS.slice(2).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Employee (row number is found with MATCH)"><select className="input" value={id} onChange={(e) => setId(e.target.value)}>{state.employees.map((e) => <option key={e.id} value={e.id}>{e.id} · {e.name}</option>)}</select></Field>
          </div>
          <div className="mt-4 rounded-xl bg-brand-soft p-4 text-center"><div className="text-xs text-slate-500">{emp?.name} · {monthLabel(mk)}</div><div className="text-3xl font-bold text-brand">{fmt(metric, hOut)}</div></div>
          <code className="mt-3 block break-all rounded-lg bg-slate-900 p-3 text-xs text-emerald-300">=HLOOKUP("{PAY_COLUMNS.find(([k]) => k === metric)[1]}", Payroll!$A$4:$S$200, MATCH("{id}", Payroll!$B$4:$B$200, 0), FALSE)</code>
          <p className="mt-2 text-xs text-slate-500">Reads: look for the heading in the top row, then come down to the row of this employee (row {rowIdx - 1} of the table).</p>
          <div className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Last 6 months — {emp?.name}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs"><thead><tr><th className="th">Item</th>{months.map((m) => <th key={m} className="th">{m}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {PAY_COLUMNS.slice(2).map(([k, l]) => (
                  <tr key={k} className={k === metric ? 'bg-brand-soft' : ''}><td className="td py-1.5 font-medium">{l}</td>{hdata.map((r, i) => <td key={i} className="td py-1.5">{r ? fmt(k, val(r, k)) : '—'}</td>)}</tr>
                ))}
              </tbody></table>
          </div>
        </Card>
      </div>
    </div>
  )
}
