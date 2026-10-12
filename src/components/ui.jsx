import { X } from 'lucide-react'
import { STATUS } from '../lib/attendance.js'

export const Card = ({ title, action, children, className = '', pad = true }) => (
  <div className={`card ${className}`}>
    {(title || action) && (
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <div className="flex flex-wrap items-center gap-2">{action}</div>
      </div>
    )}
    <div className={pad ? 'p-5' : ''}>{children}</div>
  </div>
)

export const Stat = ({ icon: Icon, label, value, sub, tone = 'brand' }) => {
  const tones = { brand: 'bg-brand-soft text-brand', green: 'bg-emerald-50 text-emerald-600', red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-600', purple: 'bg-purple-50 text-purple-600' }
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={`grid h-11 w-11 place-items-center rounded-xl ${tones[tone]}`}>{Icon && <Icon size={22} />}</div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="break-words text-lg font-bold leading-tight text-slate-900">{value}</div>
        {sub && <div className="text-xs text-slate-400">{sub}</div>}
      </div>
    </div>
  )
}

export const Field = ({ label, hint, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="label">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
  </label>
)

export const Modal = ({ open, onClose, title, children, wide, footer }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onMouseDown={onClose}>
      <div className={`max-h-[92vh] w-full overflow-auto rounded-2xl bg-white shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-3">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export const StatusBadge = ({ code, title }) => {
  const s = STATUS[code] || STATUS['']
  return <span title={title || s.label} className={`inline-flex min-w-[2rem] justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.short}</span>
}

export const Pill = ({ children, cls = 'bg-slate-100 text-slate-600' }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>
)

export const PageHeader = ({ title, sub, children }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
      {sub && <p className="text-sm text-slate-500">{sub}</p>}
    </div>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
)

export const Table = ({ head, children, empty }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse">
      <thead><tr>{head.map((h, i) => <th key={i} className="th">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
    {empty}
  </div>
)

export const MonthPicker = ({ value, onChange }) => (
  <input type="month" className="input w-44" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />
)

export const Num = ({ value, onChange, ...p }) => (
  <input type="number" className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} {...p} />
)

export const Toggle = ({ checked, onChange, label }) => (
  <label className="flex cursor-pointer items-center gap-2 text-sm">
    <button type="button" onClick={() => onChange(!checked)} className={`relative h-5 w-9 rounded-full transition ${checked ? 'bg-brand' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
    {label}
  </label>
)
