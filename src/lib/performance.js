// Scoring templates copied from your Technician_Performance_Tracker sheets (each totals 100).
export const TEMPLATES = {
  Service: [
    ['jobs', 'Jobs Assigned vs Completed', 20], ['quality', 'Quality of Work', 20], ['customers', 'Handling Customers', 20],
    ['ot', 'OT Hours', 20], ['safety', 'Safety & Discipline', 10], ['attendance', 'Attendance, Punctuality, Reporting & Behaviour', 10],
  ],
  'Sales & Marketing': [
    ['visits', 'Client Visits', 15], ['quotes', 'Quotation Submissions', 15], ['orders', 'Orders Converted', 20], ['revenue', 'Revenue Converted', 20],
    ['followup', 'Follow-up Discipline', 10], ['crm', 'CRM Reporting Accuracy', 10], ['attendance', 'Attendance, Punctuality, Reporting & Behaviour', 10],
  ],
  'Back End': [
    ['tasks', 'Task Completion on Time', 20], ['docs', 'Documentation', 20], ['coord', 'Coordination with Teams', 20],
    ['initiative', 'Initiative & Reliability', 20], ['attendance', 'Attendance, Punctuality, Reporting & Behaviour', 20],
  ],
  General: [
    ['attendance', 'Attendance', 20], ['output', 'Work Output', 30], ['quality', 'Quality', 20], ['behaviour', 'Behaviour', 15], ['reporting', 'Reporting', 15],
  ],
}
export const templateFor = (emp) => TEMPLATES[emp.dept] || TEMPLATES.General

export function grade(total) {
  if (total >= 85) return 'Excellent'
  if (total >= 70) return 'Good'
  if (total >= 50) return 'Average'
  return 'Poor'
}
export const GRADE_CLS = {
  Excellent: 'bg-emerald-100 text-emerald-700', Good: 'bg-sky-100 text-sky-700',
  Average: 'bg-amber-100 text-amber-700', Poor: 'bg-red-100 text-red-700',
}

export function score(emp, rec) {
  const tpl = templateFor(emp)
  const scores = rec?.scores || {}
  const total = tpl.reduce((s, [k, , max]) => s + Math.min(max, Math.max(0, Number(scores[k]) || 0)), 0)
  const filled = tpl.some(([k]) => scores[k] !== undefined && scores[k] !== '')
  return { total, grade: filled ? grade(total) : '', filled }
}
