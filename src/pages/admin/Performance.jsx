import { useState } from "react";
import { Wand2 } from "lucide-react";
import { useStore } from "../../lib/store.jsx";
import { TEMPLATES, score, GRADE_CLS } from "../../lib/performance.js";
import { monthSummary } from "../../lib/attendance.js";
import { monthKey, monthLabel } from "../../lib/date.js";
import { calcSalary } from "../../lib/payroll.js";
import { Card, PageHeader, MonthPicker, Pill } from "../../components/ui.jsx";
import { DEPARTMENTS } from "../../lib/defaults.js";

export default function Performance() {
  const { state, update } = useStore();
  const [mk, setMk] = useState(monthKey());
  const staff = state.employees.filter((e) => e.active !== false);
  const slabs = state.settings.salary.kpiSlabs;

  const setScore = (empId, key, v, max) =>
    update((s) => {
      const rec = ((s.performance[mk] ||= {})[empId] ||= {
        scores: {},
        remarks: "",
      });
      rec.scores[key] = v === "" ? "" : Math.min(max, Math.max(0, Number(v)));
      return s;
    });
  const setRemarks = (empId, v) =>
    update((s) => {
      const rec = ((s.performance[mk] ||= {})[empId] ||= {
        scores: {},
        remarks: "",
      });
      rec.remarks = v;
      return s;
    });
  const setPct = (empId, v) =>
    update((s) => {
      const rec = ((s.performance[mk] ||= {})[empId] ||= {
        scores: {},
        remarks: "",
      });
      rec.pct = v === "" ? "" : Math.max(0, Number(v));
      return s;
    });

  // fill the "Attendance" column automatically from punch data (on-time days / working days)
  const autoAttendance = () =>
    update((s) => {
      for (const e of s.employees.filter((x) => x.active !== false)) {
        const sum = monthSummary(e, mk, s.settings, s.attendance);
        const tpl = TEMPLATES[e.dept] || TEMPLATES.General;
        const att = tpl.find(([k]) => k === "attendance");
        if (!att) continue;
        const onTimeDays =
          sum.counts.P +
          sum.counts.HD * 0.5 -
          Math.min(sum.late, sum.counts.P + sum.counts.HD) * 0.5;
        const ratio = sum.workingDays
          ? Math.max(
              0,
              Math.min(
                1,
                (onTimeDays + sum.counts.EL + sum.counts.CL) / sum.workingDays,
              ),
            )
          : 0;
        const rec = ((s.performance[mk] ||= {})[e.id] ||= {
          scores: {},
          remarks: "",
        });
        rec.scores.attendance = Math.round(att[2] * ratio);
      }
      return s;
    });

  return (
    <div>
      <PageHeader
        title="Performance / KPI"
        sub="Score each employee out of 100. Grade and KPI incentive flow into the salary automatically."
      >
        <MonthPicker value={mk} onChange={setMk} />
        <button className="btn-ghost" onClick={autoAttendance}>
          <Wand2 size={16} /> Auto-fill attendance score
        </button>
      </PageHeader>
      <div className="mb-5 flex flex-wrap gap-2 text-xs">
        <Pill cls="bg-emerald-100 text-emerald-700">
          85+ Excellent → {slabs.Excellent}% incentive
        </Pill>
        <Pill cls="bg-sky-100 text-sky-700">70–84 Good → {slabs.Good}%</Pill>
        <Pill cls="bg-amber-100 text-amber-700">
          50–69 Average → {slabs.Average}%
        </Pill>
        <Pill cls="bg-red-100 text-red-700">Below 50 Poor → {slabs.Poor}%</Pill>
      </div>

      <div className="space-y-6">
        {DEPARTMENTS.map((dept) => {
          const list = staff.filter((e) => e.dept === dept);
          if (!list.length) return null;
          const tpl = TEMPLATES[dept];
          return (
            <Card
              key={dept}
              title={`${dept} team · ${monthLabel(mk)}`}
              pad={false}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th">Employee</th>
                      {tpl.map(([k, l, max]) => (
                        <th
                          key={k}
                          className="th max-w-[120px] whitespace-normal text-center leading-tight"
                        >
                          {l} <span className="text-brand">({max})</span>
                        </th>
                      ))}
                      <th className="th text-center">Total</th>
                      <th className="th">Grade</th>
                      <th className="th text-center">Incentive %</th>
                      <th className="th">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.map((e) => {
                      const rec = state.performance[mk]?.[e.id];
                      const sc = score(e, rec);
                      return (
                        <tr key={e.id}>
                          <td className="td">
                            <div className="font-medium">{e.name}</div>
                            <div className="text-xs text-slate-400">
                              {e.designation}
                            </div>
                          </td>
                          {tpl.map(([k, , max]) => (
                            <td key={k} className="px-2 py-1.5">
                              <input
                                type="number"
                                min="0"
                                max={max}
                                className="input w-16 px-2 text-center"
                                value={rec?.scores?.[k] ?? ""}
                                onChange={(ev) =>
                                  setScore(e.id, k, ev.target.value, max)
                                }
                              />
                            </td>
                          ))}
                          <td className="td text-center text-base font-bold">
                            {sc.filled ? sc.total : "—"}
                          </td>
                          <td className="td">
                            {sc.grade && (
                              <Pill cls={GRADE_CLS[sc.grade]}>{sc.grade}</Pill>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min="0"
                              className="input w-16 px-2 text-center"
                              placeholder="auto"
                              value={rec?.pct ?? ""}
                              onChange={(ev) => setPct(e.id, ev.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              className="input min-w-[160px]"
                              value={rec?.remarks || ""}
                              onChange={(ev) =>
                                setRemarks(e.id, ev.target.value)
                              }
                              placeholder="Remarks"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
