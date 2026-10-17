import { useStore } from "../lib/store.jsx";
import { api } from "../lib/api.js";
import { prettyDate } from "../lib/date.js";
import { leaveDates } from "../lib/leaveReq.js";
import { Card, Pill } from "./ui.jsx";

const CLS = {
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};

export default function LeaveRequests() {
  const { state, update } = useStore();
  const list = [...(state.leaveReq || [])].sort(
    (a, b) =>
      (a.status === "Pending" ? 0 : 1) - (b.status === "Pending" ? 0 : 1),
  );
  const pending = list.filter((l) => l.status === "Pending").length;

  const decide = async (l, status) => {
    if (!localStorage.getItem("admin_key")) {
      const k = prompt("Enter the ADMIN_KEY you set in Render");
      if (!k) return;
      localStorage.setItem("admin_key", k);
    }
    try {
      await api(`/api/leave/${l.id}`, {
        method: "POST",
        admin: true,
        body: { status },
      });
      update((s) => {
        s.leaveReq = (s.leaveReq || []).map((x) =>
          x.id === l.id ? { ...x, status } : x,
        );
        if (status === "Approved")
          for (const d of leaveDates(l, s.settings))
            ((s.attendance[d] ||= {})[l.empId] ||= {}).status = l.type;
        return s;
      });
    } catch (e) {
      alert(e.message);
      localStorage.removeItem("admin_key");
    }
  };

  return (
    <Card
      title={`Leave requests${pending ? ` · ${pending} waiting` : ""}`}
      pad={false}
    >
      {!list.length ? (
        <div className="p-5 text-sm text-slate-400">No leave requests</div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {list.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
            >
              <span>
                <b>{l.empName}</b> · {l.type === "CL" ? "Casual" : "Emergency"}{" "}
                · {prettyDate(l.from)} to {prettyDate(l.to)}
                <span className="block text-xs text-slate-500">{l.reason}</span>
              </span>
              {l.status === "Pending" ? (
                <span className="flex gap-2">
                  <button
                    className="btn-primary"
                    onClick={() => decide(l, "Approved")}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => decide(l, "Rejected")}
                  >
                    Reject
                  </button>
                </span>
              ) : (
                <Pill cls={CLS[l.status]}>{l.status}</Pill>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
