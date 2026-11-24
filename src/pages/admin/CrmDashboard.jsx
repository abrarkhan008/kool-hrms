import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  Target,
} from "lucide-react";
import { useStore } from "../../lib/store.jsx";
import { Card, PageHeader, Stat } from "../../components/ui.jsx";
import { MODULES, today, isOverdue, renewalDue } from "../../lib/crm.js";

export default function CrmDashboard() {
  const { state } = useStore();
  const c = state.crm || {};
  const L = (k) => c[k] || [];
  const [q, setQ] = useState("");
  const [days, setDays] = useState(7);
  const name = (id) =>
    state.employees.find((e) => e.id === id)?.name || id || "";

  const overdue = Object.keys(MODULES).flatMap((k) =>
    L(k)
      .filter((r) => isOverdue(MODULES[k], r))
      .map((r) => ({ k, r })),
  );
  const renewals = L("amc").filter((r) => renewalDue(MODULES.amc, r));

  const pend = {};
  [...L("services"), ...L("projects")]
    .filter((r) => r.technician && r.status !== "Completed")
    .forEach((r) => {
      const t = (pend[name(r.technician)] ||= { s: 0, p: 0 });
      r.id.startsWith("SRV") ? t.s++ : t.p++;
    });

  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toLocaleDateString("en-CA");
  });
  const counts = dates.map(
    (d) => L("dailyWork").filter((r) => r.date === d).length,
  );
  const max = Math.max(1, ...counts);
  const todayWork = L("dailyWork").filter((r) => r.date === today());

  const results = q.trim()
    ? Object.keys(MODULES)
        .flatMap((k) =>
          L(k)
            .filter((r) =>
              Object.entries(r)
                .map(([kk, v]) =>
                  /^(technician|supervisor|employee|assignedTo)$/.test(kk)
                    ? name(v)
                    : v,
                )
                .join(" ")
                .toLowerCase()
                .includes(q.toLowerCase()),
            )
            .map((r) => ({ k, r })),
        )
        .slice(0, 25)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM Dashboard"
        sub="Projects, services, follow-ups and daily work in one place."
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat
          icon={Building2}
          label="Total projects"
          value={L("projects").length}
        />
        <Stat
          icon={Building2}
          tone="amber"
          label="Running projects"
          value={L("projects").filter((r) => r.status === "In Progress").length}
        />
        <Stat
          icon={Wrench}
          label="Total services"
          value={L("services").length}
        />
        <Stat
          icon={CheckCircle2}
          tone="green"
          label="Completed work"
          value={
            [...L("projects"), ...L("services")].filter(
              (r) => r.status === "Completed",
            ).length
          }
        />
        <Stat
          icon={CalendarClock}
          tone="purple"
          label="Overdue follow-ups"
          value={overdue.length}
        />
        <Stat
          icon={Target}
          label="Open enquiries"
          value={
            L("enquiries").filter(
              (r) => !["Converted", "Lost"].includes(r.status),
            ).length
          }
        />
      </div>

      <Card title="Search (customer, phone, project ID, technician)">
        <input
          className="input"
          placeholder="Type to search everything…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {results.map(({ k, r }) => (
          <Link
            key={k + r.id}
            to={`/crm/${k}`}
            className="mt-2 block rounded-lg bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100"
          >
            <b>{r.id}</b> · {MODULES[k].title} ·{" "}
            {r.name || r.customer || name(r.employee)}{" "}
            {r.phone ? "· " + r.phone : ""}
          </Link>
        ))}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Overdue alerts">
          {!overdue.length && !renewals.length && (
            <p className="text-sm text-slate-400">No overdue items 🎉</p>
          )}
          {overdue.map(({ k, r }) => (
            <Link
              key={k + r.id}
              to={`/crm/${k}`}
              className="mb-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <AlertTriangle size={15} /> {r.id} ·{" "}
              {r.name || r.customer || name(r.employee)} · due{" "}
              {r[MODULES[k].dateKey]}
            </Link>
          ))}
          {renewals.map((r) => (
            <Link
              key={r.id}
              to="/crm/amc"
              className="mb-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              <AlertTriangle size={15} /> AMC renewal: {r.customer} expires{" "}
              {r.expiry}
            </Link>
          ))}
        </Card>

        <Card title="Technician-wise pending work">
          {!Object.keys(pend).length && (
            <p className="text-sm text-slate-400">No pending work.</p>
          )}
          {Object.entries(pend).map(([n, t]) => (
            <div
              key={n}
              className="flex justify-between border-b border-slate-100 py-2 text-sm"
            >
              <b>{n}</b>
              <span>
                {t.s} services · {t.p} projects
              </span>
            </div>
          ))}
        </Card>
      </div>

      <Card title={`Who worked today (${todayWork.length})`}>
        {!todayWork.length && (
          <p className="text-sm text-slate-400">
            No daily work entries for today yet.
          </p>
        )}
        {todayWork.map((r) => (
          <div key={r.id} className="border-b border-slate-100 py-2 text-sm">
            <b>{name(r.employee)}</b> · {r.site} · {r.work}
          </div>
        ))}
      </Card>

      <Card title="Work entries graph">
        <div className="mb-3 flex gap-2">
          {[
            [7, "Weekly"],
            [30, "Monthly"],
          ].map(([n, l]) => (
            <button
              key={n}
              onClick={() => setDays(n)}
              className={`rounded-lg border px-3 py-1 text-sm ${days === n ? "border-brand bg-brand text-white" : "border-slate-200"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex h-40 items-end gap-1">
          {counts.map((n, i) => (
            <div
              key={i}
              className="flex h-full flex-1 flex-col items-center justify-end"
              title={`${dates[i]}: ${n}`}
            >
              <span className="text-[10px]">{n || ""}</span>
              <div
                className="w-full rounded-t bg-brand"
                style={{ height: `${(n / max) * 80}%`, minHeight: n ? 4 : 1 }}
              />
              {days === 7 && (
                <span className="text-[10px] text-slate-400">
                  {dates[i].slice(8)}
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
