import { useState } from "react";
import { Plus, Pencil, Trash2, Search, KeyRound } from "lucide-react";
import { useStore } from "../../lib/store.jsx";
import { DEPARTMENTS } from "../../lib/defaults.js";
import { sha256 } from "../../lib/auth.js";
import { inr } from "../../lib/date.js";
import {
  Card,
  PageHeader,
  Modal,
  Field,
  Num,
  Table,
  Pill,
  Toggle,
} from "../../components/ui.jsx";

const blank = (n) => ({
  id: `KAC${String(n).padStart(3, "0")}`,
  name: "",
  designation: "",
  dept: "Service",
  mobile: "",
  doj: new Date().toISOString().slice(0, 10),
  ctc: 15000,
  pf: true,
  esi: true,
  bankName: "",
  acNo: "",
  uan: "",
  siteTarget: "",
  active: true,
  pin: "1234",
});

export default function Employees() {
  const { state, update } = useStore();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [err, setErr] = useState("");

  const list = state.employees.filter((e) =>
    (e.name + e.id + e.designation).toLowerCase().includes(q.toLowerCase()),
  );
  const nextNo =
    Math.max(
      0,
      ...state.employees.map((e) => parseInt(e.id.replace(/\D/g, "")) || 0),
    ) + 1;

  const save = async () => {
    setErr("");
    if (!edit.name.trim() || !edit.id.trim())
      return setErr("ID and name are required");
    if (
      isNew &&
      state.employees.some((e) => e.id.toLowerCase() === edit.id.toLowerCase())
    )
      return setErr("This Employee ID already exists");
    const e = { ...edit, id: edit.id.trim().toUpperCase() };
    if (e.newPin) {
      if (!/^\d{4}$/.test(e.newPin)) return setErr("PIN must be 4 digits");
      e.pinHash = await sha256(e.newPin);
      delete e.pin;
    }
    delete e.newPin;
    update((s) => {
      if (isNew) s.employees.push(e);
      else s.employees = s.employees.map((x) => (x.id === e.id ? e : x));
      return s;
    });
    setEdit(null);
  };
  const remove = (e) => {
    if (
      !confirm(
        `Delete ${e.name}? Their old attendance stays in the data but they will disappear from lists. (Tip: mark as Inactive instead.)`,
      )
    )
      return;
    update((s) => {
      s.employees = s.employees.filter((x) => x.id !== e.id);
      return s;
    });
  };
  const set = (k, v) => setEdit((x) => ({ ...x, [k]: v }));
  const onPhoto = (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 300 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      setEdit((x) => ({
        ...x,
        photos: [...(x.photos || []), c.toDataURL("image/jpeg", 0.65)].slice(
          0,
          2,
        ),
      }));
      URL.revokeObjectURL(url);
    };
    img.src = url;
    ev.target.value = "";
  };

  return (
    <div>
      <PageHeader
        title="Employees"
        sub={`${state.employees.length} employees · set CTC, PF / ESI and login PIN here`}
      >
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-2.5 text-slate-400"
          />
          <input
            className="input w-56 pl-9"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setIsNew(true);
            setEdit(blank(nextNo));
            setErr("");
          }}
        >
          <Plus size={16} /> Add employee
        </button>
      </PageHeader>
      <Card pad={false}>
        <Table
          head={[
            "ID",
            "Name",
            "Designation",
            "Department",
            "Mobile",
            "Joined",
            "CTC / month",
            "PF",
            "ESI",
            "Status",
            "",
          ]}
        >
          {list.map((e) => (
            <tr key={e.id} className="hover:bg-slate-50">
              <td className="td font-mono text-xs">{e.id}</td>
              <td className="td font-medium">{e.name}</td>
              <td className="td text-slate-500">{e.designation}</td>
              <td className="td">{e.dept}</td>
              <td className="td">{e.mobile || "—"}</td>
              <td className="td">{e.doj}</td>
              <td className="td font-medium">{inr(e.ctc)}</td>
              <td className="td">
                {e.pf ? (
                  <Pill cls="bg-emerald-100 text-emerald-700">Yes</Pill>
                ) : (
                  <Pill>No</Pill>
                )}
              </td>
              <td className="td">
                {e.esi ? (
                  <Pill cls="bg-emerald-100 text-emerald-700">Yes</Pill>
                ) : (
                  <Pill>No</Pill>
                )}
              </td>
              <td className="td">
                {e.active !== false ? (
                  <Pill cls="bg-emerald-100 text-emerald-700">Active</Pill>
                ) : (
                  <Pill>Inactive</Pill>
                )}
              </td>
              <td className="td text-right">
                <button
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                  onClick={() => {
                    setIsNew(false);
                    setEdit({ ...e });
                    setErr("");
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="rounded p-1.5 text-red-500 hover:bg-red-50"
                  onClick={() => remove(e)}
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </Table>
        {!list.length && (
          <div className="p-10 text-center text-sm text-slate-400">
            No employees found
          </div>
        )}
      </Card>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        wide
        title={isNew ? "Add employee" : `Edit ${edit?.name}`}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setEdit(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={save}>
              Save
            </button>
          </>
        }
      >
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employee ID (used to login)">
              <input
                className="input"
                disabled={!isNew}
                value={edit.id}
                onChange={(e) => set("id", e.target.value)}
              />
            </Field>
            <Field label="Full name">
              <input
                className="input"
                value={edit.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
            <Field label="Designation">
              <input
                className="input"
                value={edit.designation}
                onChange={(e) => set("designation", e.target.value)}
              />
            </Field>
            <Field label="Department (decides KPI form)">
              <select
                className="input"
                value={edit.dept}
                onChange={(e) => set("dept", e.target.value)}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Mobile">
              <input
                className="input"
                value={edit.mobile}
                onChange={(e) => set("mobile", e.target.value)}
              />
            </Field>
            <Field label="Joining date">
              <input
                type="date"
                className="input"
                value={edit.doj}
                onChange={(e) => set("doj", e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <div className="label">
                Photos (up to 2, shown on the employee's page)
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {(edit.photos || []).map((p, i) => (
                  <div key={i} className="relative">
                    <img
                      src={p}
                      alt=""
                      className="h-20 w-20 rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      className="absolute -right-2 -top-2 rounded-full bg-red-500 px-1.5 text-xs text-white"
                      onClick={() =>
                        set(
                          "photos",
                          edit.photos.filter((_, n) => n !== i),
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
                {(edit.photos || []).length < 2 && (
                  <input
                    type="file"
                    accept="image/*"
                    className="text-sm"
                    onChange={onPhoto}
                  />
                )}
              </div>
            </div>
            <Field label="Bank name">
              <input
                className="input"
                value={edit.bankName || ""}
                onChange={(e) => set("bankName", e.target.value)}
              />
            </Field>
            <Field label="Bank A/C number">
              <input
                className="input"
                value={edit.acNo || ""}
                onChange={(e) => set("acNo", e.target.value)}
              />
            </Field>
            <Field label="UAN number">
              <input
                className="input"
                value={edit.uan || ""}
                onChange={(e) => set("uan", e.target.value)}
              />
            </Field>
            <Field label="Sites to visit per day (target)">
              <Num
                value={edit.siteTarget}
                onChange={(v) => set("siteTarget", v)}
              />
            </Field>
            <Field label="CTC per month (₹)">
              <Num value={edit.ctc} onChange={(v) => set("ctc", v)} />
            </Field>
            <Field
              label={
                isNew
                  ? "Login PIN (4 digits)"
                  : "Reset PIN (leave empty to keep)"
              }
            >
              <div className="relative">
                <KeyRound
                  size={14}
                  className="absolute left-3 top-3 text-slate-400"
                />
                <input
                  className="input pl-9"
                  maxLength={4}
                  placeholder={isNew ? "1234" : "••••"}
                  value={edit.newPin ?? (isNew ? edit.pin : "")}
                  onChange={(e) =>
                    set(isNew ? "pin" : "newPin", e.target.value)
                  }
                />
              </div>
            </Field>
            <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
              <Toggle
                checked={edit.pf}
                onChange={(v) => set("pf", v)}
                label="PF applicable"
              />
              <Toggle
                checked={edit.esi}
                onChange={(v) => set("esi", v)}
                label="ESI applicable"
              />
              <Toggle
                checked={edit.active !== false}
                onChange={(v) => set("active", v)}
                label="Active"
              />
            </div>
            {err && (
              <div className="text-sm text-red-600 sm:col-span-2">{err}</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
