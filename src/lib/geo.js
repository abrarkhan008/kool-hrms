export const getPosition = () =>
  new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("no gps"));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      rej,
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });

export function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000,
    rad = (x) => (x * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) *
      Math.cos(rad(lat2)) *
      Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function nearestSite(sites, lat, lng, acc = 0) {
  let best = null;
  for (const s of sites) {
    const d = distanceM(lat, lng, Number(s.lat), Number(s.lng));
    if (!best || d < best.dist) best = { site: s, dist: d };
  }
  if (best)
    best.inside =
      best.dist <= (Number(best.site.radius) || 150) + Math.min(acc || 0, 100);
  return best;
}
