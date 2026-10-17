import { useState } from "react";
import { useStore } from "../lib/store.jsx";
import { api } from "../lib/api.js";
import { todayKey, prettyDate } from "../lib/date.js";
import { Card, Modal, Field, Pill } from "./ui.jsx";

const CLS = {
  Pending: "bg-amber-100 text-amber-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};

export default function LeaveRequest({ emp }) {
  const { state, update } = useStore();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState({
    type: "CL",
    from: todayKey(),
    to: todayKey(),
    reason: "",
  });
  const mine = (state.leaveReq || []).filter((l) => l.empId === emp.id);

  const send = async () => {
    setErr("");
    if (f.to < f.from) return setErr("End date is before the start date");
    if (!f.reason.trim()) return setErr("Please write a reason");
    try {
      await api("/api/leave", {
        method: "POST",
        body: { ...f, empName: emp.name },
      });
      const list = await api("/api/myleaves");
      update((s) => {
        s.leaveReq = list;
        return s;
      });
      setOpen(false);
      setF({ ...f, reason: "" });
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <Card
      title="My leave requests"
      pad={false}
      action={
        <button className="btn-primary" onClick={() => setOpen(true)}>
          Request leave
        </button>
      }
    >
      {!mine.length ? (
        <div className="p-5 text-sm text-slate-400">No leave requests yet</div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {mine.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
            >
              <span>
                <b>{l.type === "CL" ? "Casual" : "Emergency"} leave</b> ·{" "}
                {prettyDate(l.from)} to {prettyDate(l.to)}
                <span className="block text-xs text-slate-500">{l.reason}</span>
              </span>
              <Pill cls={CLS[l.status]}>{l.status}</Pill>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Request leave"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={send}>
              Send to admin
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Leave type">
            <select
              className="input"
              value={f.type}
              onChange={(e) => setF({ ...f, type: e.target.value })}
            >
              <option value="CL">Casual leave (CL)</option>
              <option value="EL">Emergency leave (EL)</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <input
                type="date"
                className="input"
                value={f.from}
                onChange={(e) =>
                  setF({
                    ...f,
                    from: e.target.value,
                    to: e.target.value > f.to ? e.target.value : f.to,
                  })
                }
              />
            </Field>
            <Field label="To">
              <input
                type="date"
                className="input"
                value={f.to}
                onChange={(e) => setF({ ...f, to: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Reason">
            <textarea
              rows={2}
              className="input"
              value={f.reason}
              onChange={(e) => setF({ ...f, reason: e.target.value })}
            />
          </Field>
          {err && <div className="text-sm text-red-600">{err}</div>}
        </div>
      </Modal>
    </Card>
  );
}
