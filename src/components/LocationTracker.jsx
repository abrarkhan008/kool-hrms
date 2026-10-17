import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { useStore } from "../lib/store.jsx";
import { punch } from "../lib/attendance.js";
import { todayKey } from "../lib/date.js";
import { nearestSite } from "../lib/geo.js";

export default function LocationTracker({ emp }) {
  const { state, update } = useStore();
  const ref = useRef(state);
  ref.current = state;
  const [info, setInfo] = useState({ s: "wait" });
  const [note, setNote] = useState("");
  const flags = useRef({ day: "", in: false, out: false, off: 0 });
  const lastSave = useRef(0);

  useEffect(() => {
    if (!navigator.geolocation) {
      setInfo({ s: "denied" });
      return;
    }
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        const st = ref.current;
        const sites = st.settings.sites || [];
        const geo = { autoIn: true, autoOut: true, ...(st.settings.geo || {}) };
        const lat = p.coords.latitude,
          lng = p.coords.longitude;
        const near = nearestSite(sites, lat, lng, p.coords.accuracy);
        const on = !!near?.inside;
        setInfo({
          s: on ? "on" : "off",
          site: near?.site.name,
          dist: near ? Math.round(near.dist) : null,
          n: sites.length,
        });

        const day = todayKey(),
          f = flags.current;
        if (f.day !== day)
          Object.assign(f, { day, in: false, out: false, off: 0 });
        const rec = st.attendance[day]?.[emp.id] || {};
        let auto = null;
        if (on) {
          f.off = 0;
          if (geo.autoIn && !rec.in && !f.in) {
            f.in = true;
            auto = "in";
          }
        } else if (sites.length) {
          f.off++;
          if (geo.autoOut && rec.in && !rec.out && !f.out && f.off >= 3) {
            f.out = true;
            auto = "out";
          }
        }

        if (auto || Date.now() - lastSave.current > 60000) {
          lastSave.current = Date.now();
          const r = auto ? punch(st.attendance, emp.id, auto) : null;
          update((s) => {
            (s.locations ||= {})[emp.id] = {
              lat,
              lng,
              time: new Date().toISOString(),
              on,
              site: near?.site.name || "",
              acc: Math.round(p.coords.accuracy),
            };
            if (r) (s.attendance[r.date] ||= {})[emp.id] = r.rec;
            return s;
          });
          if (r)
            setNote(
              auto === "in"
                ? `Auto punch-in: you reached ${near.site.name}.`
                : "Auto punch-out: you left the work location.",
            );
        }
      },
      () => setInfo({ s: "denied" }),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [emp.id]);

  const label =
    info.s === "wait"
      ? "Getting location…"
      : info.s === "denied"
        ? "Location blocked. Allow location in the browser."
        : !info.n
          ? "No work site set by admin yet"
          : info.s === "on"
            ? `On location · ${info.site}`
            : `Off location · ${info.dist} m from ${info.site}`;
  return (
    <div className="mt-3 flex flex-col items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${info.s === "on" ? "bg-emerald-500/40" : "bg-black/20"}`}
      >
        <MapPin size={13} /> {label}
      </span>
      {note && (
        <span className="rounded-lg bg-white/20 px-3 py-1 text-xs">{note}</span>
      )}
    </div>
  );
}
