import { useEffect, useState, useCallback } from "react";
import { ExternalLink, KeyRound, RefreshCw } from "lucide-react";
import { useStore } from "../../lib/store.jsx";
import { api, apiOn } from "../../lib/api.js";
import { todayKey } from "../../lib/date.js";
import { Card, PageHeader, Pill } from "../../components/ui.jsx";

const CLS = {
  "Not started": "bg-slate-100 text-slate-600",
  "In process": "bg-sky-100 text-sky-700",
  Pending: "bg-amber-100 text-amber-700",
  Completed: "bg-emerald-100 text-emerald-700",
};
const tm = (iso) =>
  new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

export default function Locations() {
  const { state } = useStore();
  const [date, setDate] = useState(todayKey());
  const [emp, setEmp] = useState("");
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const staff = state.employees.filter((e) => e.active !== false);

  const load = useCallback(async () => {
    if (!apiOn)
      return setErr(
        "Server address not set. Add VITE_API_URL in the .env file.",
      );
    if (!localStorage.getItem("admin_key")) {
      const k = prompt("Enter the ADMIN_KEY you set in Render");
      if (!k) return;
      localStorage.setItem("admin_key", k);
    }
    setBusy(true);
    setErr("");
    try {
      setRows(
        await api(`/api/visits?date=${date}${emp ? "&emp=" + emp : ""}`, {
          admin: true,
        }),
      );
    } catch (e) {
      setErr(e.message);
      if (/key/i.test(e.message)) localStorage.removeItem("admin_key");
    }
    setBusy(false);
  }, [date, emp]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const groups = staff
    .map((e) => ({ e, v: rows.filter((r) => r.emp_id === e.id) }))
    .filter((g) => !emp || g.e.id === emp);

  return (
    <div>
      <PageHeader
        title="Live location · site visits"
        sub="Every visit an employee saves appears here with the place where it was saved. Refreshes every 30 seconds."
      >
        <input
          type="date"
          className="input w-44"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
        />
        <select
          className="input w-52"
          value={emp}
          onChange={(e) => setEmp(e.target.value)}
        >
          <option value="">All employees</option>
          {staff.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <button className="btn-ghost" onClick={load}>
          <RefreshCw size={15} className={busy ? "animate-spin" : ""} /> Refresh
        </button>
        <button
          className="btn-ghost"
          onClick={() => {
            localStorage.removeItem("admin_key");
            load();
          }}
        >
          <KeyRound size={15} /> Admin key
        </button>
      </PageHeader>
      {err && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {err} (the free server may take up to a minute to wake up. Press
          Refresh.)
        </div>
      )}
      <div className="space-y-5">
        {groups.map(({ e, v }) => (
          <Card
            key={e.id}
            title={`${e.name} · ${v.length} visit${v.length === 1 ? "" : "s"}${e.siteTarget ? ` of ${e.siteTarget}` : ""}`}
            pad={false}
          >
            {!v.length ? (
              <div className="p-5 text-sm text-slate-400">
                No visits saved on this date
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      {[
                        "#",
                        "Time",
                        "Customer",
                        "Complaint / service",
                        "Status",
                        "Location",
                      ].map((h) => (
                        <th key={h} className="th">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {v.map((r, i) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="td">{i + 1}</td>
                        <td className="td whitespace-nowrap">
                          {tm(r.updated_at)}
                        </td>
                        <td className="td font-medium">{r.client}</td>
                        <td className="td">{r.work}</td>
                        <td className="td">
                          <Pill cls={CLS[r.status]}>{r.status}</Pill>
                        </td>
                        <td className="td">
                          {r.lat != null ? (
                            <a
                              className="flex items-center gap-1 text-sm font-medium text-brand"
                              target="_blank"
                              rel="noreferrer"
                              href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                            >
                              Open map <ExternalLink size={13} />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">
                              No GPS
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
