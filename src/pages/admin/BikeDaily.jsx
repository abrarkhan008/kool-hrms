import { useState } from "react";
import { useStore } from "../../lib/store.jsx";
import { Card, PageHeader, MonthPicker } from "../../components/ui.jsx";
import { monthKey, dayName, inr } from "../../lib/date.js";
import { bikeCalc, periodLabel } from "../../lib/bike.js";

export default function BikeDaily() {
  const { state, update } = useStore();
  const emps = state.employees.filter((e) => e.active !== false);
  const [mk, setMk] = useState(monthKey());
  const [half, setHalf] = useState(new Date().getDate() <= 15 ? "1" : "2");
  const [id, setId] = useState(emps[0]?.id);
  const emp = emps.find((e) => e.id === id) || emps[0];
  if (!emp) return <p className="p-4">Add employees first.</p>;

  const b = bikeCalc(state, emp, mk, half);
  const pk = `${mk}-${half}`;

  const setRead = (i, key, v) =>
    update((s) => {
      const put = (date, k, val) => {
        const day = ((s.bike ||= {})[date] ||= {});
        day[emp.id] = {
          ...(day[emp.id] || {}),
          [k]: val === "" ? "" : Number(val),
        };
      };
      put(b.rows[i].date, key, v);
      const nx = b.rows[i + 1];
      if (key === "e" && v !== "" && nx && (nx.s === "" || nx.s == null))
        put(nx.date, "s", v);
      return s;
    });
  const setExtra = (k, v) =>
    update((s) => {
      const x = ((s.bikeExtra ||= {})[pk] ||= {});
      x[emp.id] = { ...(x[emp.id] || {}), [k]: v === "" ? "" : Number(v) };
      return s;
    });

  const box =
    "w-28 rounded border border-slate-200 px-2 py-1 text-right focus:border-brand focus:outline-none";

  return (
    <div>
      <PageHeader
        title="Bike daily readings"
        sub="Type the starting and ending reading. KM is calculated automatically. Next day's starting reading fills itself."
      >
        <MonthPicker value={mk} onChange={setMk} />
        <select
          className="input max-w-[220px]"
          value={emp.id}
          onChange={(e) => setId(e.target.value)}
        >
          {emps.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select
          className="input max-w-[220px]"
          value={half}
          onChange={(e) => setHalf(e.target.value)}
        >
          <option value="1">1st half (1–15)</option>
          <option value="2">2nd half (16–end)</option>
        </select>
      </PageHeader>
      <p className="mb-3 text-sm text-slate-500">{periodLabel(mk, half)}</p>
      <Card pad={false}>
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Date</th>
                <th className="th">Day</th>
                <th className="th">Starting reading</th>
                <th className="th">Ending reading</th>
                <th className="th">KM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {b.rows.map((x, i) => (
                <tr key={x.date}>
                  <td className="td">
                    {x.date.split("-").reverse().join("-")}
                  </td>
                  <td className="td">{dayName(x.date).slice(0, 3)}</td>
                  <td className="td">
                    <input
                      key={emp.id + x.date + "s" + x.s}
                      type="number"
                      step="0.1"
                      className={box}
                      defaultValue={x.s}
                      onBlur={(e) =>
                        e.target.value !== String(x.s) &&
                        setRead(i, "s", e.target.value)
                      }
                    />
                  </td>
                  <td className="td">
                    <input
                      key={emp.id + x.date + "e" + x.e}
                      type="number"
                      step="0.1"
                      className={box}
                      defaultValue={x.e}
                      onBlur={(e) =>
                        e.target.value !== String(x.e) &&
                        setRead(i, "e", e.target.value)
                      }
                    />
                  </td>
                  <td className="td font-bold">{x.km || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="mt-5" />
      <Card title="Total">
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <div className="label">Total KM (auto)</div>
            <div className="text-xl font-bold">{b.autoKm}</div>
          </div>
          <label>
            <div className="label">Rate per KM (₹)</div>
            <input
              key={pk + emp.id + "r"}
              className="input"
              type="number"
              defaultValue={b.extra.rate ?? ""}
              placeholder={String(b.rate)}
              onBlur={(e) => setExtra("rate", e.target.value)}
            />
          </label>
          <label>
            <div className="label">Maintenance (₹)</div>
            <input
              key={pk + emp.id + "m"}
              className="input"
              type="number"
              defaultValue={b.extra.maint ?? ""}
              onBlur={(e) => setExtra("maint", e.target.value)}
            />
          </label>
          <label>
            <div className="label">Advance / deduction (₹)</div>
            <input
              key={pk + emp.id + "a"}
              className="input"
              type="number"
              defaultValue={b.extra.advance ?? ""}
              onBlur={(e) => setExtra("advance", e.target.value)}
            />
          </label>
        </div>
        <p className="mt-4 text-lg">
          Bike amount: <b>{inr(b.amount)}</b> · Net payable:{" "}
          <b className="text-brand">{inr(b.total)}</b>
        </p>
      </Card>
    </div>
  );
}
