import { useState } from "react";
import { KeyRound } from "lucide-react";
import { useStore } from "../lib/store.jsx";
import { sha256 } from "../lib/auth.js";
import { Card, Field } from "./ui.jsx";

export default function EmployeeLogins() {
  const { state, update } = useStore();
  const [sel, setSel] = useState(state.employees[0]?.id || "");
  const [newId, setNewId] = useState("");
  const [newPin, setNewPin] = useState("");
  const [msg, setMsg] = useState(null);

  const save = async () => {
    setMsg(null);
    const oldId = sel;
    const id = newId.trim() || oldId;
    if (
      id.toLowerCase() !== oldId.toLowerCase() &&
      state.employees.some((e) => e.id.toLowerCase() === id.toLowerCase())
    )
      return setMsg({ ok: false, t: "This Employee ID is already used" });
    if (newPin && !/^\d{4}$/.test(newPin))
      return setMsg({ ok: false, t: "PIN must be 4 digits" });
    const h = newPin ? await sha256(newPin) : null;
    update((s) => {
      const e = s.employees.find((x) => x.id === oldId);
      if (!e) return s;
      if (h) {
        e.pinHash = h;
        delete e.pin;
      }
      if (id !== oldId) {
        e.id = id;
        for (const d of Object.values(s.attendance))
          if (d[oldId]) {
            d[id] = d[oldId];
            delete d[oldId];
          }
        for (const k of ["payroll", "performance"])
          for (const m of Object.values(s[k] || {}))
            if (m[oldId]) {
              m[id] = m[oldId];
              delete m[oldId];
            }
      }
      return s;
    });
    setSel(id);
    setNewId("");
    setNewPin("");
    setMsg({
      ok: true,
      t: `Updated. Give the employee: ID ${id}${newPin ? " and PIN " + newPin : ""}. Now press Save at the top.`,
    });
  };

  return (
    <Card title="Employee ID & PIN">
      <div className="grid max-w-xl gap-4 sm:grid-cols-3">
        <Field label="Employee">
          <select
            className="input"
            value={sel}
            onChange={(e) => setSel(e.target.value)}
          >
            {state.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.id})
              </option>
            ))}
          </select>
        </Field>
        <Field label="New Employee ID" hint="Empty = keep same">
          <input
            className="input"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
          />
        </Field>
        <Field label="New 4-digit PIN" hint="Empty = keep same">
          <input
            className="input"
            maxLength={4}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
          />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="btn-primary" onClick={save}>
          <KeyRound size={16} /> Update login
        </button>
        {msg && (
          <span
            className={`text-sm ${msg.ok ? "text-emerald-600" : "text-red-600"}`}
          >
            {msg.t}
          </span>
        )}
      </div>
    </Card>
  );
}
