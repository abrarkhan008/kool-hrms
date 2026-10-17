import { fromKey, toKey } from "./date.js";
import { isWeekOff, holidayOn } from "./attendance.js";

// working days between from and to (week offs and holidays are skipped)
export function leaveDates(l, settings) {
  const out = [];
  const d = fromKey(l.from);
  for (let n = 0; n < 62 && toKey(d) <= l.to; n++) {
    const k = toKey(d);
    if (!isWeekOff(settings, k) && !holidayOn(settings, k)) out.push(k);
    d.setDate(d.getDate() + 1);
  }
  return out;
}
