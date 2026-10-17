import { useEffect, useRef } from "react";
import { useStore } from "../lib/store.jsx";
import { api, apiOn } from "../lib/api.js";
import { todayKey, monthKey, addMonths } from "../lib/date.js";
import { leaveDates } from "../lib/leaveReq.js";

export default function SyncAgent() {
  const { state, session, update } = useStore();
  const st = useRef(state);
  st.current = state;
  const up = useRef(update);
  up.current = update;
  const role = session?.role,
    empId = session?.empId;

  useEffect(() => {
    if (!apiOn || !role) return;
    const run = async () => {
      try {
        if (role === "employee") {
          const today = todayKey();
          const rec = st.current.attendance[today]?.[empId];
          if (rec?.in)
            await api("/api/punch", {
              method: "POST",
              body: { date: today, in: rec.in, out: rec.out || "" },
            });
          const me = await api("/api/me");
          const leaves = await api("/api/myleaves");
          const notes = await api("/api/notices");
          up.current((s) => {
            s.employees = s.employees.map((e) =>
              e.id === empId ? { ...e, ...me.employee } : e,
            );
            s.settings = {
              ...s.settings,
              ...(me.settings || {}),
              admin: s.settings.admin,
            };
            s.leaveReq = leaves;
            s.notices = notes;
            for (const l of leaves.filter((x) => x.status === "Approved"))
              for (const d of leaveDates(l, s.settings)) {
                const r = ((s.attendance[d] ||= {})[empId] ||= {});
                if (!r.status && !r.in) r.status = l.type;
              }
            return s;
          });
        } else {
          if (!localStorage.getItem("admin_key")) return;
          const mk = monthKey();
          const rows = [
            ...(await api(`/api/punches?month=${mk}`, { admin: true })),
            ...(await api(`/api/punches?month=${addMonths(mk, -1)}`, {
              admin: true,
            })),
          ];
          const leaves = await api("/api/leaves", { admin: true });
          up.current((s) => {
            rows.forEach((r) => {
              const rec = ((s.attendance[r.date] ||= {})[r.emp_id] ||= {});
              if (r.data.in && !rec.in) rec.in = r.data.in;
              if (r.data.out && !rec.out) rec.out = r.data.out;
            });
            s.leaveReq = leaves;
            return s;
          });
        }
      } catch {
        /* server asleep or offline: try again in 30 seconds */
      }
    };
    run();
    const t = setInterval(run, 30000);
    return () => clearInterval(t);
  }, [role, empId]);

  return null;
}
