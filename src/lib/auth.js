// Simple front-end only login (no backend). Passwords are stored as SHA-256 hashes.
export async function sha256(text) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return 'plain:' + text // very old browsers / non-secure pages
  }
}
export const DEFAULT_ADMIN_PASSWORD = 'admin123'

export async function checkAdmin(settings, username, password) {
  const a = settings.admin
  if (username.trim().toLowerCase() !== (a.username || 'admin').toLowerCase()) return false
  const hash = await sha256(password)
  if (!a.passHash) return password === DEFAULT_ADMIN_PASSWORD
  return hash === a.passHash
}
export async function checkPin(emp, pin) {
  if (!emp) return false
  if (emp.pinHash) return (await sha256(pin)) === emp.pinHash
  return pin === (emp.pin || '1234')
}
