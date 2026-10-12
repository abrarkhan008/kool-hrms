import { dayInfo, STATUS } from '../lib/attendance.js'
import { fromKey, timeLabel, todayKey } from '../lib/date.js'

const COLORS = {
  P: 'bg-emerald-50 border-emerald-200', HD: 'bg-amber-50 border-amber-200', EL: 'bg-sky-50 border-sky-200',
  CL: 'bg-indigo-50 border-indigo-200', A: 'bg-red-50 border-red-200', WO: 'bg-slate-100 border-slate-200',
  HOL: 'bg-purple-50 border-purple-200', '': 'bg-white border-slate-100',
}

export function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
      {['P', 'HD', 'EL', 'CL', 'A', 'WO', 'HOL'].map((k) => (
        <span key={k} className="flex items-center gap-1.5"><span className={`inline-block h-3 w-3 rounded border ${COLORS[k]}`} />{STATUS[k].label}</span>
      ))}
    </div>
  )
}

export default function MonthCalendar({ emp, mk, state, onDayClick }) {
  const first = fromKey(mk + '-01')
  const lead = first.getDay()
  const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => `${mk}-${String(i + 1).padStart(2, '0')}`)]
  const today = todayKey()

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />
          const d = dayInfo(emp, date, state.settings, state.attendance)
          return (
            <button key={date} type="button" onClick={() => onDayClick?.(date, d)} disabled={!onDayClick}
              className={`flex min-h-[64px] flex-col rounded-lg border p-1.5 text-left transition sm:min-h-[78px] ${COLORS[d.code]} ${date === today ? 'ring-2 ring-brand' : ''} ${onDayClick ? 'hover:shadow-md' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{Number(date.slice(8))}</span>
                {d.code && <span className="text-[10px] font-bold text-slate-600">{STATUS[d.code].short}</span>}
              </div>
              {d.holiday && <div className="mt-0.5 truncate text-[10px] text-purple-600">{d.holiday}</div>}
              {d.inTime && (
                <div className="mt-auto hidden text-[10px] leading-tight text-slate-500 sm:block">
                  {timeLabel(d.inTime)}{d.late && <span className="ml-1 font-semibold text-red-500">late</span>}
                  <br />{d.outTime ? timeLabel(d.outTime) : 'no punch-out'}
                  {d.otHours > 0 && <span className="block font-semibold text-brand">OT {d.otHours.toFixed(1)}h</span>}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
