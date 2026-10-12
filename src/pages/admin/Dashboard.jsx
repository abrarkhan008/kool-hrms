import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Users, UserCheck, UserX, Clock, CalendarOff, Wallet } from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { dayInfo, STATUS } from '../../lib/attendance.js'
import { todayKey, monthKey, timeLabel, prettyDate, inr, monthLabel, toKey } from '../../lib/date.js'
import { calcAll, totals } from '../../lib/payroll.js'
import { Card, Stat, PageHeader, StatusBadge, Pill } from '../../components/ui.jsx'

export default function Dashboard() {
  const { state } = useStore()
  const staff = state.employees.filter((e) => e.active !== false)
  const today = todayKey()
  const rows = useMemo(() => staff.map((e) => ({ e, d: dayInfo(e, today, state.settings, state.attendance) })), [state])
  const present = rows.filter((r) => r.d.inTime).length
  const late = rows.filter((r) => r.d.late).length
  const onLeave = rows.filter((r) => ['EL', 'CL'].includes(r.d.code)).length
  const notIn = rows.filter((r) => !r.d.inTime && !['EL', 'CL', 'WO', 'HOL'].includes(r.d.code)).length
  const mk = monthKey()
  const pay = totals(calcAll(mk, state))

  // last 7 days bar chart
  const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return toKey(d) })
  const bars = last7.map((date) => ({ date, n: staff.filter((e) => dayInfo(e, date, state.settings, state.attendance).inTime).length }))
  const max = Math.max(1, staff.length)

  return (
    <div>
      <PageHeader title="Dashboard" sub={`${prettyDate(today)} · ${state.settings.company.name}`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat icon={Users} label="Total staff" value={staff.length} />
        <Stat icon={UserCheck} tone="green" label="Punched in today" value={present} />
        <Stat icon={Clock} tone="amber" label="Late today" value={late} />
        <Stat icon={UserX} tone="red" label="Not punched" value={notIn} />
        <Stat icon={CalendarOff} tone="purple" label="On leave" value={onLeave} />
        <Stat icon={Wallet} label="Net pay (this month)" value={inr(Math.round(pay.net))} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Today's attendance" className="xl:col-span-2" pad={false}
          action={<Link to="/attendance" className="text-sm font-medium text-brand">Open attendance →</Link>}>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0"><tr>{['Employee', 'Punch in', 'Punch out', 'Status'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ e, d }) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="td"><div className="font-medium">{e.name}</div><div className="text-xs text-slate-400">{e.id} · {e.designation}</div></td>
                    <td className="td">{timeLabel(d.inTime)} {d.late && <Pill cls="bg-red-100 text-red-600">Late</Pill>}</td>
                    <td className="td">{timeLabel(d.outTime)}</td>
                    <td className="td"><StatusBadge code={d.code} />{!d.code && <span className="text-xs text-slate-400"> waiting</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Last 7 days — staff present">
            <div className="flex items-end gap-2">
              {bars.map((b) => (
                <div key={b.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-slate-600">{b.n}</span>
                  <div className="flex h-32 w-full items-end"><div className="w-full rounded-t-md bg-brand/80" style={{ height: `${(b.n / max) * 100}%`, minHeight: 3 }} /></div>
                  <span className="text-[10px] text-slate-400">{new Date(b.date).toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title={`Payroll · ${monthLabel(mk)}`}>
            <dl className="space-y-2 text-sm">
              {[['Total CTC', pay.ctc], ['Earned salary', pay.earned], ['Overtime', pay.otAmount], ['Gross', pay.gross], ['PF + ESI', pay.pf + pay.esi]].map(([k, v]) => (
                <div key={k} className="flex justify-between"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{inr(v)}</dd></div>
              ))}
              <div className="flex justify-between border-t pt-2 text-base"><dt className="font-semibold">Net payable</dt><dd className="font-bold text-brand">{inr(pay.net)}</dd></div>
            </dl>
            <Link to="/salary" className="btn-primary mt-4 w-full">Open salary</Link>
          </Card>
        </div>
      </div>
    </div>
  )
}
