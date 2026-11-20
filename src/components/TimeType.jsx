import { useState } from "react";

// returns 24-hour "HH:MM", "" for empty, or null if it can't be understood
export function parseTime(txt, ap) {
  const s = txt.trim().toLowerCase().replace(/\./g, ":");
  if (!s) return "";
  const m = s.match(/^(\d{1,2}):?(\d{2})?\s*([ap])?m?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const mi = Number(m[2] || 0);
  if (mi > 59 || h > 23) return null;
  if (h <= 12) {
    const mark = m[3] ? (m[3] === "p" ? "PM" : "AM") : ap;
    h = (h % 12) + (mark === "PM" ? 12 : 0);
  }
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

const show = (v) => {
  if (!v) return "";
  const [h, m] = v.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export default function TimeType({ value, onChange, ap = "AM" }) {
  const [txt, setTxt] = useState(show(value));
  const [bad, setBad] = useState(false);
  const done = () => {
    const v = parseTime(txt, ap);
    if (v === null) return setBad(true);
    setBad(false);
    setTxt(show(v));
    if (v !== (value || "")) onChange(v);
  };
  return (
    <input
      className={`input w-28 text-center ${bad ? "border-red-400" : ""}`}
      placeholder={ap === "AM" ? "9:30 AM" : "7:00 PM"}
      value={txt}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={done}
      onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
    />
  );
}