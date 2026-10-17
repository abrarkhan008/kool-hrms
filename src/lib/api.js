const BASE = import.meta.env.VITE_API_URL || "https://kool-server.onrender.com";
export const apiOn = !!BASE;

export async function api(path, { method = "GET", body, admin } = {}) {
  const h = { "Content-Type": "application/json" };
  if (admin) h["x-admin-key"] = localStorage.getItem("admin_key") || "";
  else if (localStorage.getItem("emp_token"))
    h.Authorization = "Bearer " + localStorage.getItem("emp_token");
  const r = await fetch(BASE + path, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok)
    throw new Error(
      (await r.json().catch(() => ({}))).error || "Server error " + r.status,
    );
  return r.json();
}
