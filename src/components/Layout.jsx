import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarCheck, CalendarDays, Wallet, Trophy, Search, Settings as Cog, LogOut, Menu, X } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import Logo from './Logo.jsx'

const NAV = [
  ['/', 'Dashboard', LayoutDashboard], ['/employees', 'Employees', Users], ['/attendance', 'Attendance', CalendarCheck],
  ['/leaves', 'Leaves & Holidays', CalendarDays], ['/salary', 'Salary', Wallet], ['/performance', 'Performance / KPI', Trophy],
  ['/lookup', 'Lookup (VLOOKUP)', Search], ['/settings', 'Settings', Cog],
]

export default function Layout({ children }) {
  const { session, logout } = useStore()
  const [open, setOpen] = useState(false)
  const admin = session.role === 'admin'

  const SideContent = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-200">
      <div className="border-b border-white/10 px-4 py-5"><Logo light /></div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-brand text-white' : 'text-slate-300 hover:bg-white/10'}`}>
            <Icon size={18} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 px-3 text-xs text-slate-400">Signed in as <b className="text-slate-200">{session.name}</b></div>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/10"><LogOut size={18} /> Logout</button>
      </div>
    </div>
  )

  if (!admin) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-8">
          <Logo />
          <button onClick={logout} className="btn-ghost"><LogOut size={16} /> Logout</button>
        </header>
        <main className="mx-auto max-w-5xl p-4 sm:p-8">{children}</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{SideContent}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">{SideContent}</aside>
        </div>
      )}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Logo size={32} />
        <button onClick={() => setOpen(!open)} className="btn-ghost px-2.5">{open ? <X size={18} /> : <Menu size={18} />}</button>
      </header>
      <main className="p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  )
}
