import { useState, useMemo } from "react";
import { FileText, Files, Landmark, Pencil } from "lucide-react";
import { useStore } from "../../lib/store.jsx";
import { monthKey, monthLabel, inr, dayName } from "../../lib/date.js";
import {
  Card,
  PageHeader,
  MonthPicker,
  Modal,
  Field,
  Num,
} from "../../components/ui.jsx";
import { bikeAll, periodKey, periodLabel } from "../../lib/bike.js";

export default function Bike() {
  const { state, update } = useStore();
  const [mk, setMk] = useState(monthKey());
  const [half, setHalf] = useState(new Date().getDate() <= 15 ? "1" : "2");
  const [slipId, setSlipId] = useState(null);
  const rows = useMemo(() => bikeAll(state, mk, half), [state, mk, half]);
  const pk = periodKey(mk, half);
  const slip = rows.find((r) => r.emp.id === slipId);
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);

  // save one starting / ending reading
  const setReading = (empId, date, field, value) =>
    update((s) => {
      const day = ((s.bike ||= {})[date] ||= {});
      const r = { ...(day[empId] || {}) };
      if (value === "") delete r[field];
      else r[field] = Number(value);
      if (Object.keys(r).length) day[empId] = r;
      else delete day[empId];
      return s;
    });

  // save km override / rate / maintenance / advance / note
  const setExtra = (empId, field, value) =>
    update((s) => {
      const x = ((s.bikeExtra ||= {})[pk] ||= {});
      const r = { ...(x[empId] || {}) };
      if (value === "" || value == null) delete r[field];
      else r[field] = value;
      x[empId] = r;
      return s;
    });

  const pdf = async (kind, list) => {
    const x = await import("../../lib/exportsBike.js");
    if (kind === "slips")
      x.bikeSlipPdf(list, state.settings, `Bike_Slips_${pk}.pdf`);
    if (kind === "bank") x.bikeBankPdf(rows, state.settings, mk, half);
  };

  const inline = (r, field, label) => (
    <input
      type="number"
      className="input w-24"
      placeholder="0"
      title={label}
      key={r.emp.id + field + r[field]}
      defaultValue={r[field] || ""}
      onBlur={(ev) =>
        ev.target.value !== String(r[field] || "") &&
        setExtra(
          r.emp.id,
          field,
          ev.target.value === "" ? "" : Number(ev.target.value),
        )
      }
    />
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bike reading"
        sub="Open an employee (pencil) to type the starting / ending reading of each day. KM × rate + maintenance − advance = bike payable."
      >
        <MonthPicker value={mk} onChange={setMk} />
        <div className="flex rounded-lg bg-slate-200/70 p-1 text-sm">
          {[
            ["1", "1st – 15th"],
            ["2", "16th – end"],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setHalf(k)}
              className={`rounded-md px-3 py-1.5 font-medium ${half === k ? "bg-white text-brand shadow-sm" : "text-slate-500"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          className="btn-ghost"
          onClick={() =>
            pdf(
              "slips",
              rows.filter((r) => r.km || r.maint),
            )
          }
        >
          <Files size={16} /> All bike slips
        </button>
        <button className="btn-primary" onClick={() => pdf("bank")}>
          <Landmark size={16} /> Bank letter
        </button>
      </PageHeader>

      <Card
        pad={false}
        title={`${monthLabel(mk)} · ${periodLabel(mk, half)} · rate ₹${state.settings.salary.bikeRate ?? 3}/km`}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {[
                  "Employee",
                  "Total KM",
                  "Rate",
                  "Bike amount",
                  "Maintenance ₹",
                  "Advance ₹",
                  "Net payable",
                  "",
                ].map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.emp.id} className="hover:bg-slate-50">
                  <td className="td">
                    <div className="font-medium">{r.emp.name}</div>
                    <div className="text-xs text-slate-400">{r.emp.id}</div>
                  </td>
                  <td className="td">{r.km ? r.km.toFixed(1) : "—"}</td>
                  <td className="td">₹{r.rate}</td>
                  <td className="td">{r.amount ? inr(r.amount) : "—"}</td>
                  <td className="td">
                    {inline(r, "maint", "Bike maintenance allowance")}
                  </td>
                  <td className="td">
                    {inline(r, "advance", "Advance / deduction")}
                  </td>
                  <td className="td font-bold text-brand">{inr(r.total)}</td>
                  <td className="td whitespace-nowrap text-right">
                    <button
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                      title="Edit readings & slip"
                      onClick={() => setSlipId(r.emp.id)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                      title="Download bike slip"
                      onClick={() => pdf("slips", [r])}
                    >
                      <FileText size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-semibold">
                <td className="td">Total</td>
                <td className="td">{sum("km").toFixed(1)}</td>
                <td className="td" />
                <td className="td">{inr(sum("amount"))}</td>
                <td className="td">{inr(sum("maint"))}</td>
                <td className="td">{inr(sum("advance"))}</td>
                <td className="td text-brand">{inr(sum("total"))}</td>
                <td className="td" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Modal
        open={!!slip}
        onClose={() => setSlipId(null)}
        wide
        title={
          slip ? `Bike slip · ${slip.emp.name} · ${periodLabel(mk, half)}` : ""
        }
        footer={
          slip && (
            <>
              <button className="btn-ghost" onClick={() => setSlipId(null)}>
                Close
              </button>
              <button
                className="btn-primary"
                onClick={() => pdf("slips", [slip])}
              >
                <FileText size={16} /> Download PDF
              </button>
            </>
          )
        }
      >
        {slip && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Total KM"
                hint={`Empty = automatic (${slip.autoKm.toFixed(1)} km from readings)`}
              >
                <Num
                  value={slip.extra.km}
                  step="0.1"
                  onChange={(v) => setExtra(slip.emp.id, "km", v)}
                />
              </Field>
              <Field label="Rate per KM (₹)" hint="Empty = rate from Settings">
                <Num
                  value={slip.extra.rate}
                  step="0.25"
                  onChange={(v) => setExtra(slip.emp.id, "rate", v)}
                />
              </Field>
              <Field label="Bike maintenance allowance (₹)">
                <Num
                  value={slip.extra.maint}
                  onChange={(v) => setExtra(slip.emp.id, "maint", v)}
                />
              </Field>
              <Field label="Advance / deduction (₹)">
                <Num
                  value={slip.extra.advance}
                  onChange={(v) => setExtra(slip.emp.id, "advance", v)}
                />
              </Field>
              <Field
                label="Note (printed on the slip)"
                className="sm:col-span-2"
              >
                <input
                  className="input"
                  value={slip.extra.note || ""}
                  onChange={(e) =>
                    setExtra(slip.emp.id, "note", e.target.value)
                  }
                />
              </Field>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-center text-sm">
              {slip.km} km × ₹{slip.rate} = <b>{inr(slip.amount)}</b> +
              maintenance {inr(slip.maint)} − advance {inr(slip.advance)} ={" "}
              <b className="text-brand">{inr(slip.total)}</b>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full">
                <thead>
                  <tr>
                    {[
                      "Date",
                      "Day",
                      "Starting reading",
                      "Ending reading",
                      "KM",
                    ].map((h) => (
                      <th key={h} className="th">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slip.rows.map((d) => (
                    <tr key={d.date}>
                      <td className="td whitespace-nowrap">
                        {d.date.split("-").reverse().join("-")}
                      </td>
                      <td className="td">{dayName(d.date).slice(0, 3)}</td>
                      {["s", "e"].map((f) => (
                        <td key={f} className="px-2 py-1">
                          <input
                            type="number"
                            step="0.1"
                            className="input w-32"
                            key={d.date + f + d[f]}
                            defaultValue={d[f]}
                            onBlur={(ev) =>
                              ev.target.value !== String(d[f]) &&
                              setReading(
                                slip.emp.id,
                                d.date,
                                f,
                                ev.target.value,
                              )
                            }
                          />
                        </td>
                      ))}
                      <td className="td font-medium">{d.km || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400">
              Readings save when you click outside the box.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
