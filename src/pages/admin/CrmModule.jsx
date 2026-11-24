import { useState } from "react";
import { Plus, Pencil, Trash2, FileText, ArrowRightCircle } from "lucide-react";
import { useStore } from "../../lib/store.jsx";
import { Card, PageHeader, Modal } from "../../components/ui.jsx";
import {
  MODULES,
  newId,
  isOverdue,
  renewalDue,
  today,
  makeReport,
} from "../../lib/crm.js";

export default function CrmModule({ mod }) {
  const m = MODULES[mod];
  const { state, update } = useStore();
  const list = state.crm?.[mod] || [];
  const emps = state.employees.filter((e) => e.active !== false);
  const empName = (id) =>
    state.employees.find((e) => e.id === id)?.name || id || "";
  const empFieldKeys = Object.values(MODULES).flatMap((mm) =>
    mm.fields.filter((x) => x.emp).map((x) => x.k),
  );
  const staffNames = [
    ...new Set(
      [
        ...emps.map((e) => e.name),
        ...Object.values(state.crm || {})
          .flat()
          .flatMap((r) => empFieldKeys.map((k) => empName(r[k]))),
      ].filter(Boolean),
    ),
  ];
  const [q, setQ] = useState("");
  const [st, setSt] = useState("");
  const [f, setF] = useState(null);
  const statusOpts = m.fields.find((x) => x.k === m.statusKey)?.opts || [];

  const text = (r) =>
    Object.entries(r)
      .map(([k, v]) => (m.fields.find((x) => x.k === k)?.emp ? empName(v) : v))
      .join(" ")
      .toLowerCase();
  const shown = list.filter(
    (r) => (!st || r[m.statusKey] === st) && text(r).includes(q.toLowerCase()),
  );

  const save = () => {
    const first = m.fields[0];
    if (!f[first.k]) return alert("Please fill: " + first.l);
    update((s) => {
      const a = ((s.crm ||= {})[mod] ||= []);
      if (f.id) a[a.findIndex((x) => x.id === f.id)] = f;
      else a.push({ ...f, id: newId(a, m.prefix), created: today() });
      return s;
    });
    setF(null);
  };
  const del = (r) => {
    if (!confirm("Delete " + r.id + "?")) return;
    update((s) => {
      s.crm[mod] = s.crm[mod].filter((x) => x.id !== r.id);
      return s;
    });
  };
  const convert = (r) =>
    update((s) => {
      const c = (s.crm ||= {});
      const add = (k, o) => {
        const a = (c[k] ||= []);
        a.push({ ...o, id: newId(a, MODULES[k].prefix), created: today() });
      };
      const me = c[mod].find((x) => x.id === r.id);
      if (mod === "enquiries") {
        add("customers", { name: r.name, phone: r.phone });
        me.status = "Converted";
      }
      if (mod === "quotations") {
        add("projects", {
          name: "Project - " + r.name,
          customer: r.name,
          phone: r.phone,
          amount: r.amount,
          status: "Planned",
          handover: "Pending",
          materials: r.details,
        });
        me.status = "Approved";
      }
      return s;
    });

  const label = (k) => m.fields.find((x) => x.k === k)?.l || m.computed[k][0];
  const cell = (r, k) => {
    if (m.computed?.[k]) return m.computed[k][1](r);
    const x = m.fields.find((y) => y.k === k);
    if (x?.emp) return empName(r[k]);
    if (k === m.statusKey)
      return (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
          {r[k]}
        </span>
      );
    return r[k] ?? "";
  };

  const input = (x) => {
    const v = f[x.k] ?? "";
    const on = (e) => setF({ ...f, [x.k]: e.target.value });
    if (x.opts)
      return (
        <select className="input" value={v} onChange={on}>
          <option value="">-- select --</option>
          {x.opts.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      );
    if (x.emp)
      return (
        <input
          className="input"
          list="staff-names"
          placeholder="Pick a name or type a new one"
          value={empName(v)}
          onChange={on}
        />
      );
    if (x.type === "textarea")
      return <textarea rows={3} className="input" value={v} onChange={on} />;
    return (
      <input
        className="input"
        type={x.type || "text"}
        list={x.cust ? "custs" : undefined}
        value={v}
        onChange={on}
      />
    );
  };

  const canConvert = (r) =>
    (mod === "enquiries" && r.status !== "Converted") ||
    (mod === "quotations" && r.status !== "Approved");

  return (
    <div>
      <PageHeader
        title={m.title}
        sub="Add, search and follow up. Red = overdue."
      >
        <button
          className="btn-primary"
          onClick={() =>
            setF(m.fields.some((x) => x.k === "date") ? { date: today() } : {})
          }
        >
          <Plus size={16} /> Add new
        </button>
      </PageHeader>
      <datalist id="staff-names">
        {staffNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <datalist id="custs">
        {(state.crm?.customers || []).map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search name, phone, ID, technician…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {m.statusKey && (
          <select
            className="input max-w-[200px]"
            value={st}
            onChange={(e) => setSt(e.target.value)}
          >
            <option value="">All status</option>
            {statusOpts.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        )}
      </div>
      <Card pad={false}>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">ID</th>
                {m.cols.map((k) => (
                  <th key={k} className="th">
                    {label(k)}
                  </th>
                ))}
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((r) => {
                const od = isOverdue(m, r);
                return (
                  <tr
                    key={r.id}
                    className={
                      od ? "bg-red-50 text-red-700" : "hover:bg-slate-50"
                    }
                  >
                    <td className="td font-medium">
                      {r.id}
                      {od && (
                        <span className="ml-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] text-white">
                          OVERDUE
                        </span>
                      )}
                      {renewalDue(m, r) && (
                        <span className="ml-2 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] text-white">
                          RENEWAL DUE
                        </span>
                      )}
                    </td>
                    {m.cols.map((k) => (
                      <td key={k} className="td">
                        {cell(r, k)}
                      </td>
                    ))}
                    <td className="td whitespace-nowrap text-right">
                      {canConvert(r) && (
                        <button
                          className="rounded p-1.5 text-brand hover:bg-brand-soft"
                          title={
                            mod === "enquiries"
                              ? "Convert to customer"
                              : "Make project"
                          }
                          onClick={() => convert(r)}
                        >
                          <ArrowRightCircle size={16} />
                        </button>
                      )}
                      {m.report && (
                        <button
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                          title={m.report}
                          onClick={() =>
                            makeReport(m, r, state.settings.company, empName)
                          }
                        >
                          <FileText size={16} />
                        </button>
                      )}
                      <button
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                        onClick={() => setF({ ...r })}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="rounded p-1.5 text-red-500 hover:bg-red-50"
                        onClick={() => del(r)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!shown.length && (
                <tr>
                  <td className="td text-slate-400" colSpan={m.cols.length + 2}>
                    Nothing here yet. Press “Add new”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      {f && (
        <Modal
          open
          wide
          onClose={() => setF(null)}
          title={(f.id ? "Edit " + f.id : "New") + " · " + m.title}
          footer={
            <>
              <button className="btn-ghost" onClick={() => setF(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={save}>
                Save
              </button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {m.fields.map((x) => (
              <label
                key={x.k}
                className={x.type === "textarea" ? "sm:col-span-2" : ""}
              >
                <div className="label">{x.l}</div>
                {input(x)}
              </label>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
