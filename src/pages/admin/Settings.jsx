import { useRef, useState } from 'react'
import { Upload, Trash2, Download, RotateCcw, Sparkles, ShieldCheck } from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { WEEKDAYS } from '../../lib/defaults.js'
import { sha256, checkAdmin } from '../../lib/auth.js'
import { monthKey, addMonths, monthDays, todayKey, toKey } from '../../lib/date.js'
import { Card, PageHeader, Field, Num, Toggle } from '../../components/ui.jsx'

const COLORS = ['#0e7490', '#2563eb', '#7c3aed', '#be123c', '#15803d', '#c2410c', '#0f172a']

export default function Settings() {
  const { state, update, resetAll, replaceAll } = useStore()
  const S = state.settings
  const fileRef = useRef(), restoreRef = useRef()
  const [pw, setPw] = useState({ old: '', n1: '', n2: '', user: S.admin.username || 'admin' })
  const [pwMsg, setPwMsg] = useState(null)
  const [note, setNote] = useState('')

  const set = (section, key, val) => update((s) => { s.settings[section][key] = val; return s })
  const setSlab = (k, v) => update((s) => { s.settings.salary.kpiSlabs[k] = v; return s })
  const special = Math.max(0, 100 - S.salary.basicPct - S.salary.hraPct - S.salary.conveyancePct)

  const onLogo = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    const img = new Image(); const url = URL.createObjectURL(f)
    img.onload = () => {
      const max = 300, k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      set('company', 'logo', c.toDataURL('image/png')); URL.revokeObjectURL(url)
    }
    img.src = url
  }

  const changePw = async () => {
    setPwMsg(null)
    if (!(await checkAdmin(S, S.admin.username || 'admin', pw.old))) return setPwMsg({ ok: false, t: 'Current password is wrong' })
    if (pw.n1.length < 6) return setPwMsg({ ok: false, t: 'New password must be at least 6 characters' })
    if (pw.n1 !== pw.n2) return setPwMsg({ ok: false, t: 'New passwords do not match' })
    const h = await sha256(pw.n1)
    update((s) => { s.settings.admin = { username: pw.user.trim() || 'admin', passHash: h }; return s })
    setPw({ ...pw, old: '', n1: '', n2: '' }); setPwMsg({ ok: true, t: 'Password changed. Use it next time you sign in.' })
  }

  const backup = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }))
    a.download = `hrms-backup-${todayKey()}.json`; a.click()
  }
  const restore = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = () => { try { const d = JSON.parse(r.result); if (!d.employees || !d.settings) throw 0; if (confirm('Replace ALL current data with this backup?')) { replaceAll(d); location.reload() } } catch { alert('This is not a valid backup file') } }
    r.readAsText(f)
  }

  // Fills realistic punch data so you can demo the salary / attendance screens to a client
  const demoAttendance = () => {
    if (!confirm('Fill demo punch data for last month and this month? (Existing records on those days are replaced)')) return
    update((s) => {
      const t = s.settings.timing, today = todayKey()
      const rnd = (a, b) => a + Math.random() * (b - a)
      const mins = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
      for (const mk of [addMonths(monthKey(), -1), monthKey()]) for (const date of monthDays(mk)) {
        if (date >= today) continue
        const dow = new Date(date).getDay()
        for (const e of s.employees.filter((x) => x.active !== false)) {
          const day = (s.attendance[date] ||= {}); delete day[e.id]
          if (t.weekOffs.includes(dow) || s.settings.holidays.some((h) => h.date === date)) continue
          const r = Math.random()
          if (r < 0.03) { day[e.id] = { status: Math.random() < 0.5 ? 'CL' : 'EL' }; continue }
          if (r < 0.06) continue // absent, no information
          const [y, m, d] = date.split('-').map(Number)
          const inM = Math.round(rnd(mins(t.loginTime) - 15, mins(t.graceTime) + 25))
          const outM = Math.round(Math.random() < 0.35 ? rnd(mins(t.otStart) + 5, mins(t.otStart) + 150) : rnd(mins(t.logoutTime), mins(t.otStart) - 2))
          day[e.id] = { in: new Date(y, m - 1, d, 0, inM).toISOString(), out: new Date(y, m - 1, d, 0, outM).toISOString() }
        }
      }
      return s
    })
    setNote('Demo attendance added.')
  }

  const Section = ({ title, children, sub }) => <Card title={title}>{sub && <p className="-mt-1 mb-4 text-sm text-slate-500">{sub}</p>}{children}</Card>
  const grid = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" sub="Everything on this page is saved instantly. Change the name, logo, timings and salary rules here." />

      <Section title="Website & branding">
        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          <div>
            <div className="label">Company logo</div>
            <div className="grid h-32 place-items-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
              {S.company.logo ? <img src={S.company.logo} className="max-h-28 max-w-[170px] object-contain" alt="" /> : <span className="text-xs text-slate-400">No logo yet</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogo} />
            <div className="mt-2 flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => fileRef.current.click()}><Upload size={15} /> Upload</button>
              {S.company.logo && <button className="btn-danger px-2.5" onClick={() => set('company', 'logo', '')}><Trash2 size={15} /></button>}
            </div>
          </div>
          <div className={grid}>
            <Field label="Company name"><input className="input" value={S.company.name} onChange={(e) => set('company', 'name', e.target.value)} /></Field>
            <Field label="Website / app name"><input className="input" value={S.company.appName} onChange={(e) => set('company', 'appName', e.target.value)} /></Field>
            <Field label="Tagline (login page)"><input className="input" value={S.company.tagline} onChange={(e) => set('company', 'tagline', e.target.value)} /></Field>
            <Field label="Address (shown on salary slips)" className="sm:col-span-2 lg:col-span-3"><input className="input" value={S.company.address} onChange={(e) => set('company', 'address', e.target.value)} /></Field>
            <Field label="Brand colour" className="sm:col-span-2 lg:col-span-3">
              <div className="flex flex-wrap items-center gap-2">
                {COLORS.map((c) => <button key={c} onClick={() => set('company', 'color', c)} style={{ background: c }} className={`h-8 w-8 rounded-full ring-offset-2 ${S.company.color === c ? 'ring-2 ring-slate-900' : ''}`} />)}
                <input type="color" value={S.company.color} onChange={(e) => set('company', 'color', e.target.value)} className="h-8 w-10 cursor-pointer rounded" />
              </div>
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Office timing" sub="Login 9:30 AM with grace till 10:00 AM, logout from 7:00 PM, overtime after 7:30 PM — change anything below.">
        <div className={grid}>
          <Field label="Office login time"><input type="time" className="input" value={S.timing.loginTime} onChange={(e) => set('timing', 'loginTime', e.target.value)} /></Field>
          <Field label="Late after (grace time)" hint="Punch in after this = Late"><input type="time" className="input" value={S.timing.graceTime} onChange={(e) => set('timing', 'graceTime', e.target.value)} /></Field>
          <Field label="Office logout time"><input type="time" className="input" value={S.timing.logoutTime} onChange={(e) => set('timing', 'logoutTime', e.target.value)} /></Field>
          <Field label="Overtime starts after" hint="Working past this time counts as overtime"><input type="time" className="input" value={S.timing.otStart} onChange={(e) => set('timing', 'otStart', e.target.value)} /></Field>
          <Field label="Minimum overtime (minutes)" hint="Smaller overtime is ignored"><Num value={S.timing.minOtMinutes} onChange={(v) => set('timing', 'minOtMinutes', v)} /></Field>
          <Field label="Half day if worked less than (hours)"><Num step="0.5" value={S.timing.halfDayHours} onChange={(v) => set('timing', 'halfDayHours', v)} /></Field>
          <Field label="Duty hours per day" hint="Used for the per-hour overtime rate"><Num value={S.timing.dutyHours} onChange={(v) => set('timing', 'dutyHours', v)} /></Field>
          <Field label="Week off days" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d, i) => { const on = S.timing.weekOffs.includes(i); return (
                <button key={d} onClick={() => set('timing', 'weekOffs', on ? S.timing.weekOffs.filter((x) => x !== i) : [...S.timing.weekOffs, i])}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${on ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white'}`}>{d}</button>) })}
            </div>
          </Field>
          <div className="flex items-end pb-1"><Toggle checked={S.timing.otEnabled} onChange={(v) => set('timing', 'otEnabled', v)} label="Calculate overtime" /></div>
        </div>
      </Section>

      <Section title="Leave policy">
        <div className={grid}>
          <Field label="Earned Leave (EL) per year"><Num value={S.leave.elPerYear} onChange={(v) => set('leave', 'elPerYear', v)} /></Field>
          <Field label="Casual Leave (CL) per year"><Num value={S.leave.clPerYear} onChange={(v) => set('leave', 'clPerYear', v)} /></Field>
        </div>
      </Section>

      <Section title="Salary structure" sub="Percentages of the monthly CTC. Special allowance is whatever is left. These come from your Sheet2 (50 / 30 / 5 / 15).">
        <div className={grid}>
          <Field label="Basic %"><Num value={S.salary.basicPct} onChange={(v) => set('salary', 'basicPct', v)} /></Field>
          <Field label="HRA %"><Num value={S.salary.hraPct} onChange={(v) => set('salary', 'hraPct', v)} /></Field>
          <Field label="Conveyance allowance %"><Num value={S.salary.conveyancePct} onChange={(v) => set('salary', 'conveyancePct', v)} /></Field>
          <Field label="Special allowance % (automatic)"><input className="input bg-slate-50" readOnly value={special} /></Field>
          <Field label="Days for per-day salary" hint="CTC ÷ this number = one day salary">
            <select className="input" value={S.salary.daysBasis} onChange={(e) => set('salary', 'daysBasis', e.target.value)}><option value="fixed30">Always 30 days</option><option value="calendar">Actual days in the month</option></select>
          </Field>
          <Field label="Overtime rate multiplier" hint="1 = normal hourly rate. Your sheet pays 0.5"><Num step="0.25" value={S.salary.otMultiplier} onChange={(v) => set('salary', 'otMultiplier', v)} /></Field>
          <Field label="Night stay = how many days salary"><Num step="0.5" value={S.salary.nightStayDays} onChange={(v) => set('salary', 'nightStayDays', v)} /></Field>
        </div>
        {special === 0 && S.salary.basicPct + S.salary.hraPct + S.salary.conveyancePct > 100 && <p className="mt-3 text-sm text-red-600">Basic + HRA + Conveyance is above 100%.</p>}
      </Section>

      <Section title="PF & ESI">
        <div className={grid}>
          <Field label="Employee PF %" hint="On earned Basic"><Num step="0.25" value={S.salary.pfPct} onChange={(v) => set('salary', 'pfPct', v)} /></Field>
          <Field label="Employee ESI %" hint="On earned salary + overtime"><Num step="0.05" value={S.salary.esiPct} onChange={(v) => set('salary', 'esiPct', v)} /></Field>
          <Field label="ESI applies only if CTC is up to (₹)"><Num value={S.salary.esiCeiling} onChange={(v) => set('salary', 'esiCeiling', v)} /></Field>
          <div className="flex items-end pb-2"><Toggle checked={S.salary.pfCeilingOn} onChange={(v) => set('salary', 'pfCeilingOn', v)} label="Limit PF to a wage ceiling" /></div>
          {S.salary.pfCeilingOn && <Field label="PF wage ceiling (₹)"><Num value={S.salary.pfCeiling} onChange={(v) => set('salary', 'pfCeiling', v)} /></Field>}
        </div>
        <p className="mt-3 text-xs text-slate-500">PF / ESI can be switched on or off for each person in the Employees page.</p>
      </Section>

      <Section title="KPI incentive" sub="Extra pay (as % of earned salary) based on the performance grade scored in the KPI page.">
        <div className="mb-4"><Toggle checked={S.salary.kpiEnabled} onChange={(v) => set('salary', 'kpiEnabled', v)} label="Add KPI incentive to salary" /></div>
        <div className="grid gap-4 sm:grid-cols-4">
          {Object.keys(S.salary.kpiSlabs).map((g) => <Field key={g} label={`${g} → %`}><Num step="0.5" value={S.salary.kpiSlabs[g]} onChange={(v) => setSlab(g, v)} /></Field>)}
        </div>
      </Section>

      <Section title="Admin password">
        <div className="grid max-w-xl gap-4 sm:grid-cols-2">
          <Field label="Admin username"><input className="input" value={pw.user} onChange={(e) => setPw({ ...pw, user: e.target.value })} /></Field>
          <Field label="Current password"><input type="password" className="input" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} /></Field>
          <Field label="New password"><input type="password" className="input" value={pw.n1} onChange={(e) => setPw({ ...pw, n1: e.target.value })} /></Field>
          <Field label="Repeat new password"><input type="password" className="input" value={pw.n2} onChange={(e) => setPw({ ...pw, n2: e.target.value })} /></Field>
        </div>
        <div className="mt-4 flex items-center gap-3"><button className="btn-primary" onClick={changePw}><ShieldCheck size={16} /> Change password</button>{pwMsg && <span className={`text-sm ${pwMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{pwMsg.t}</span>}</div>
      </Section>

      <Section title="Data & backup" sub="Without a backend, data is stored in this browser only. Download a backup regularly.">
        <div className="flex flex-wrap gap-3">
          <button className="btn-ghost" onClick={backup}><Download size={16} /> Download backup</button>
          <input ref={restoreRef} type="file" accept=".json" hidden onChange={restore} />
          <button className="btn-ghost" onClick={() => restoreRef.current.click()}><Upload size={16} /> Restore backup</button>
          <button className="btn-ghost" onClick={demoAttendance}><Sparkles size={16} /> Fill demo attendance</button>
          <button className="btn-danger" onClick={() => { if (confirm('Delete ALL data and start with an empty system?')) { resetAll(false); location.reload() } }}><Trash2 size={16} /> Clear everything</button>
          <button className="btn-danger" onClick={() => { if (confirm('Reset to the demo employees from your salary sheet?')) { resetAll(true); location.reload() } }}><RotateCcw size={16} /> Reset to demo data</button>
        </div>
        {note && <p className="mt-3 text-sm text-emerald-600">{note}</p>}
      </Section>
    </div>
  )
}
