import { Plus, Trash2, Download } from "lucide-react";
import { useStore } from "../../lib/store.jsx";
import { todayKey } from "../../lib/date.js";
import { PageHeader, Card, Field, Num, Pill } from "../../components/ui.jsx";

const BEFORE = [
  ["capacity", "Material decided as per capacity / tonnage"],
  ["using", "Checked how much material they are using"],
  ["need", "Checked how much material they need"],
  ["foundation", "Checked the foundation"],
];
const AFTER = [
  ["hoReport", "H.O. report prepared with the customer"],
  ["sign", "Customer signature and seal obtained"],
  ["invoice", "Invoice prepared"],
  ["dc", "DC (Delivery Challan) prepared for material issue"],
];

const Check = ({ checked, onChange, label }) => (
  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm hover:bg-slate-50">
    <input
      type="checkbox"
      className="h-4 w-4 accent-[rgb(var(--brand))]"
      checked={!!checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className={checked ? "text-slate-400 line-through" : ""}>
      {label}
    </span>
  </label>
);

export default function Materials() {
  const { state, update } = useStore();
  const jobs = state.materialJobs || [];

  // change one job
  const edit = (id, fn) =>
    update((s) => {
      s.materialJobs = s.materialJobs || [];
      const j = s.materialJobs.find((x) => x.id === id);
      if (j) fn(j);
      return s;
    });

  const addJob = () =>
    update((s) => {
      s.materialJobs = s.materialJobs || [];
      s.materialJobs.unshift({
        id: Date.now().toString(36),
        date: todayKey(),
        customer: "",
        site: "",
        tonnage: "",
        items: [{ name: "", used: "", need: "" }],
        checks: {},
        foundationNote: "",
      });
      return s;
    });

  const delJob = (id) => {
    if (!confirm("Delete this job?")) return;
    update((s) => {
      s.materialJobs = (s.materialJobs || []).filter((x) => x.id !== id);
      return s;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Materials"
        sub="One card per job. Tick each step as you finish it."
      >
        <a
          className="btn-ghost"
          href="/Kool_Aircon_HVAC_Material_Stock_Checklist_A4.pdf"
          download
        >
          <Download size={16} /> Stock Checklist PDF
        </a>
        <button className="btn-primary" onClick={addJob}>
          <Plus size={16} /> New job
        </button>
      </PageHeader>

      {jobs.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">
            No jobs yet. Press "New job" to start.
          </p>
        </Card>
      )}

      {jobs.map((j) => {
        const total = BEFORE.length + AFTER.length;
        const done = [...BEFORE, ...AFTER].filter(([k]) => j.checks[k]).length;
        return (
          <Card
            key={j.id}
            title={j.customer || "New job"}
            action={
              <>
                <Pill
                  cls={
                    done === total
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }
                >
                  {done}/{total} done
                </Pill>
                <button
                  className="btn-danger px-2.5"
                  onClick={() => delJob(j.id)}
                >
                  <Trash2 size={15} />
                </button>
              </>
            }
          >
            {/* Job details */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Customer name">
                <input
                  className="input"
                  value={j.customer}
                  onChange={(e) =>
                    edit(j.id, (x) => (x.customer = e.target.value))
                  }
                />
              </Field>
              <Field label="Site / address">
                <input
                  className="input"
                  value={j.site}
                  onChange={(e) => edit(j.id, (x) => (x.site = e.target.value))}
                />
              </Field>
              <Field label="Capacity (tonnage)">
                <Num
                  step="0.5"
                  value={j.tonnage}
                  onChange={(v) => edit(j.id, (x) => (x.tonnage = v))}
                />
              </Field>
              <Field label="Date">
                <input
                  type="date"
                  className="input"
                  value={j.date}
                  onChange={(e) => edit(j.id, (x) => (x.date = e.target.value))}
                />
              </Field>
            </div>

            {/* Material list */}
            <div className="mt-5">
              <div className="label">Material list (used vs needed)</div>
              <div className="space-y-2">
                {j.items.map((it, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_90px_90px_auto] gap-2"
                  >
                    <input
                      className="input"
                      placeholder="Material name"
                      value={it.name}
                      onChange={(e) =>
                        edit(j.id, (x) => (x.items[i].name = e.target.value))
                      }
                    />
                    <input
                      className="input"
                      placeholder="Using"
                      inputMode="decimal"
                      value={it.used}
                      onChange={(e) =>
                        edit(j.id, (x) => (x.items[i].used = e.target.value))
                      }
                    />
                    <input
                      className="input"
                      placeholder="Need"
                      inputMode="decimal"
                      value={it.need}
                      onChange={(e) =>
                        edit(j.id, (x) => (x.items[i].need = e.target.value))
                      }
                    />
                    <button
                      className="btn-danger px-2.5"
                      onClick={() => edit(j.id, (x) => x.items.splice(i, 1))}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="btn-ghost mt-2"
                onClick={() =>
                  edit(j.id, (x) =>
                    x.items.push({ name: "", used: "", need: "" }),
                  )
                }
              >
                <Plus size={15} /> Add material
              </button>
            </div>

            {/* Before / After */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <div className="label">Before installation</div>
                <div className="space-y-2">
                  {BEFORE.map(([k, l]) => (
                    <Check
                      key={k}
                      label={l}
                      checked={j.checks[k]}
                      onChange={(v) => edit(j.id, (x) => (x.checks[k] = v))}
                    />
                  ))}
                  <input
                    className="input"
                    placeholder="Foundation note (optional)"
                    value={j.foundationNote}
                    onChange={(e) =>
                      edit(j.id, (x) => (x.foundationNote = e.target.value))
                    }
                  />
                </div>
              </div>
              <div>
                <div className="label">After completion of installation</div>
                <div className="space-y-2">
                  {AFTER.map(([k, l]) => (
                    <Check
                      key={k}
                      label={l}
                      checked={j.checks[k]}
                      onChange={(v) => edit(j.id, (x) => (x.checks[k] = v))}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
