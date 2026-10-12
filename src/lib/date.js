// Small date helpers. Dates are stored as "YYYY-MM-DD" text (local time).
export const pad = (n) => String(n).padStart(2, '0')
export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }
export const todayKey = () => toKey(new Date())
export const monthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
export const daysInMonth = (mk) => { const [y, m] = mk.split('-').map(Number); return new Date(y, m, 0).getDate() }
export const monthDays = (mk) => Array.from({ length: daysInMonth(mk) }, (_, i) => `${mk}-${pad(i + 1)}`)
export const addMonths = (mk, n) => { const [y, m] = mk.split('-').map(Number); return monthKey(new Date(y, m - 1 + n, 1)) }
export const monthLabel = (mk) => fromKey(mk + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
export const dayName = (k) => fromKey(k).toLocaleDateString('en-IN', { weekday: 'short' })
export const prettyDate = (k) => fromKey(k).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
export const timeLabel = (iso) => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'
export const minutesOf = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
export const minutesOfIso = (iso) => { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes() }
export const fmtHours = (h) => { if (!h) return '0h 00m'; const t = Math.round(h * 60); return `${Math.floor(t / 60)}h ${pad(t % 60)}m` }
export const inr = (n) => '₹' + (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100
export const weekdayIndex = (k) => fromKey(k).getDay() // 0 = Sunday
