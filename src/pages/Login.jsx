import { useState } from "react";
import { ShieldCheck, UserRound, Fingerprint } from "lucide-react";
import { useStore } from "../lib/store.jsx";
import { checkAdmin, checkPin } from "../lib/auth.js";
import Logo from "../components/Logo.jsx";
import { Field } from "../components/ui.jsx";
import { api, apiOn } from "../lib/api.js";

export default function Login() {
  const { state, login, update } = useStore();
  const [tab, setTab] = useState("employee");
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const c = state.settings.company;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    if (tab === "admin") {
      if (await checkAdmin(state.settings, u || "admin", p))
        login({ role: "admin", name: "Administrator" });
      else setErr("Wrong username or password");
    } else {
      const emp = state.employees.find(
        (x) =>
          x.id.toLowerCase() === u.trim().toLowerCase() && x.active !== false,
      );
      let ok = false,
        name = emp?.name,
        empId = emp?.id;
      if (emp && (await checkPin(emp, p))) ok = true;
      if (apiOn) {
        try {
          const r = await api("/api/login", {
            method: "POST",
            body: { id: u.trim(), pin: p },
          });
          localStorage.setItem("emp_token", r.token);
          update((s) => {
            s.employees = [
              ...s.employees.filter((e) => e.id !== r.employee.id),
              {
                ...(s.employees.find((e) => e.id === r.employee.id) || {}),
                ...r.employee,
              },
            ];
            s.settings = {
              ...s.settings,
              ...r.settings,
              admin: s.settings.admin,
            };
            return s;
          });
          ok = true;
          name = r.employee.name;
          empId = r.employee.id;
        } catch {
          /* use the local result */
        }
      }
      if (ok) login({ role: "employee", name, empId });
      else setErr("Wrong Employee ID or PIN");
    }
    setBusy(false);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-black/10" />
        <div className="relative">
          <Logo light size={48} />
        </div>
        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight">{c.appName}</h1>
          <p className="mt-3 max-w-md text-lg text-white/80">{c.tagline}</p>
          <ul className="mt-8 space-y-3 text-white/90">
            {[
              "Punch in / punch out with live date & time",
              "Leaves, holidays, week-offs & overtime",
              "Automatic salary, PF, ESI & KPI",
              "Download Excel & PDF salary slips",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <Fingerprint size={18} /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-sm text-white/60">
          © {new Date().getFullYear()} {c.name}
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="mb-6 text-sm text-slate-500">Sign in to continue</p>

          <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            {[
              ["employee", "Employee", UserRound],
              ["admin", "Admin", ShieldCheck],
            ].map(([k, l, Icon]) => (
              <button
                type="button"
                key={k}
                onClick={() => {
                  setTab(k);
                  setErr("");
                  setU("");
                  setP("");
                }}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition ${tab === k ? "bg-white text-brand shadow-sm" : "text-slate-500"}`}
              >
                <Icon size={16} /> {l}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <Field label={tab === "admin" ? "Username" : "Employee ID"}>
              <input
                className="input"
                value={u}
                onChange={(e) => setU(e.target.value)}
                placeholder={tab === "admin" ? "admin" : "e.g. KAC006"}
                autoFocus
              />
            </Field>
            <Field label={tab === "admin" ? "Password" : "4-digit PIN"}>
              <input
                className="input"
                type="password"
                value={p}
                onChange={(e) => setP(e.target.value)}
                placeholder="••••"
              />
            </Field>
            {err && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {err}
              </div>
            )}
            <button className="btn-primary w-full py-2.5" disabled={busy}>
              {tab === "admin" ? "Admin sign in" : "Sign in to punch"}
            </button>
          </div>

          {!state.settings.admin.passHash && (
            <p className="mt-6 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">
              Demo: Admin <b>admin / admin123</b> &nbsp;·&nbsp; Employee{" "}
              <b>KAC001 / 1234</b>
              <br />
              (this hint disappears after you change the admin password in
              Settings)
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
