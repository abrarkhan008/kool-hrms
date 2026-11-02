import { useState } from "react";

const HOURS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const MINS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

// value / onChange use 24-hour "HH:MM" (same as before). The screen shows AM / PM.
export default function TimeAmPm({ value, onChange }) {
  const start = () => {
    if (!value) return { h: "", m: "00", ap: "AM" };
    const [h24, mi] = value.split(":").map(Number);
    return {
      h: String(h24 % 12 || 12),
      m: String(mi).padStart(2, "0"),
      ap: h24 >= 12 ? "PM" : "AM",
    };
  };
  const [t, setT] = useState(start);
  const change = (patch) => {
    const n = { ...t, ...patch };
    setT(n);
    if (n.h === "") return onChange("");
    let h = Number(n.h) % 12;
    if (n.ap === "PM") h += 12;
    onChange(`${String(h).padStart(2, "0")}:${n.m}`);
  };
  return (
    <div className="flex items-center gap-1">
      <select
        className="input w-[68px] px-2"
        value={t.h}
        onChange={(e) => change({ h: e.target.value })}
      >
        <option value="">--</option>
        {HOURS.map((h) => (
          <option key={h}>{h}</option>
        ))}
      </select>
      :
      <select
        className="input w-[68px] px-2"
        value={t.m}
        onChange={(e) => change({ m: e.target.value })}
      >
        {MINS.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
      <select
        className="input w-[72px] px-2"
        value={t.ap}
        onChange={(e) => change({ ap: e.target.value })}
      >
        <option>AM</option>
        <option>PM</option>
      </select>
    </div>
  );
}
