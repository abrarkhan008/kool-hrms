import { useStore } from '../lib/store.jsx'
import { Building2 } from 'lucide-react'

export default function Logo({ size = 40, showName = true, light = false }) {
  const { company } = useStore().state.settings
  return (
    <div className="flex items-center gap-3">
      {company.logo
        ? <img src={company.logo} alt="logo" style={{ height: size, maxWidth: size * 3 }} className="rounded-lg object-contain" />
        : <div style={{ height: size, width: size }} className="grid place-items-center rounded-xl bg-brand text-white"><Building2 size={size * 0.55} /></div>}
      {showName && (
        <div className="leading-tight">
          <div className={`font-bold ${light ? 'text-white' : 'text-slate-900'}`}>{company.name}</div>
          <div className={`text-[11px] ${light ? 'text-white/70' : 'text-slate-500'}`}>{company.appName}</div>
        </div>
      )}
    </div>
  )
}
