import { monthKey } from './date.js'

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const DEFAULT_SETTINGS = {
  company: {
    name: 'KOOL AIRCON',
    appName: 'Staff Attendance & Payroll',
    tagline: 'Air Conditioning Sales & Service',
    address: "Shop No.1, 1st Floor, 'C' Block, Rifah Complex, New Sayaji Rao Road, Mysore-570001",
    logo: '',
    color: '#0e7490',
  },
  timing: {
    loginTime: '09:30',   // office starts
    graceTime: '10:00',   // after this = LATE
    logoutTime: '19:00',  // earliest normal logout
    otStart: '19:30',     // overtime counts only after this time
    minOtMinutes: 30,     // ignore OT smaller than this
    halfDayHours: 4.5,    // worked less than this = Half day
    dutyHours: 9,         // used for the per-hour rate (as in your sheet)
    weekOffs: [0],        // 0 = Sunday
    otEnabled: true,
  },
  leave: { elPerYear: 12, clPerYear: 12 },
  salary: {
    basicPct: 50, hraPct: 30, conveyancePct: 5, // Special allowance = the remaining %
    daysBasis: 'fixed30',           // 'fixed30' or 'calendar'
    otMultiplier: 0.5,              // your sheet pays 0.5 x per-hour rate
    pfPct: 12, pfCeilingOn: false, pfCeiling: 15000,
    esiPct: 0.75, esiCeiling: 21000,
    nightStayDays: 1,               // one night stay = 1 day salary
    kpiEnabled: true,
    kpiSlabs: { Excellent: 10, Good: 5, Average: 0, Poor: 0 }, // % of earned salary
  },
  holidays: [], // { date: 'YYYY-MM-DD', name }
  admin: { username: 'admin', passHash: '' }, // empty = default password admin123
}

const NAMES = [
  ['MUHAMMED HUZAIF KHAN', 'AC Technician', 'Service', 19000], ['MOHAMMED SHARIFF AMEER', 'Manager', 'General', 25000],
  ['SREENIVASA RAO', 'Accounts Manager', 'Back End', 17000], ['THYAGARAJ T G', 'Sales & Operation Head', 'Sales & Marketing', 18000],
  ['TASLEEMA BANU', 'Back End Team', 'Back End', 20000], ['IRFAN SHARIFF', 'Sr AC Technician', 'Service', 35000],
  ['AZHAR MOHAMMED KHAN', 'Sales & Marketing', 'Sales & Marketing', 15000], ['SABA', 'Back End Team', 'Back End', 12760],
  ['JAWADUR REHMAN', 'AC Technician', 'Service', 15000], ['AFZAN BAIG', 'AC Technician', 'Service', 22000],
  ['KUMAR', 'Project Engineer', 'Sales & Marketing', 20000], ['ABDUL JABBAR', 'AC Technician', 'Service', 15000],
  ['ADNAN AHMED', 'AC Technician', 'Service', 20000], ['MAVIYA KHAN', 'Trainee', 'Service', 15000],
  ['MOHAMMED SHAHID', 'Trainee', 'Service', 15000], ['MOHAMMED ASIM RASHAD', 'Supervisor', 'Service', 20000],
  ['MOHAMMED FARAZ', 'AC Technician', 'Service', 19000], ['SYED AZHARUDDIN', 'AC Technician', 'Service', 15000],
  ['GOVINDA', 'Sr AC Technician', 'Service', 25000], ['NAYAZ', 'AC Technician', 'Service', 16000],
  ['MOHAMMED BILAL', 'Trainee', 'Service', 13000], ['SYED SADATH AHMED KHADRI', 'AC Technician', 'Service', 24000],
  ['RIYAN', 'AC Technician', 'Service', 12000], ['RAIYAN BAIG', 'AC Technician', 'Service', 18000],
  ['MOHAMMED HASSAIN', 'Trainee', 'Service', 15000], ['SAMUEL SARGUNAM', 'HR & Operation Manager', 'Back End', 30000],
]

// Demo staff taken from your salary sheet. Delete or edit them in the Employees page.
export const DEMO_EMPLOYEES = NAMES.map(([name, designation, dept, ctc], i) => ({
  id: `KAC${String(i + 1).padStart(3, '0')}`,
  name, designation, dept, ctc,
  mobile: '', doj: '2025-04-01',
  pf: ctc > 15000 || i % 3 === 0, esi: ctc <= 21000,
  active: true, pin: '1234',
}))

export const DEPARTMENTS = ['Service', 'Sales & Marketing', 'Back End', 'General']

export const EMPTY_STATE = (withDemo = true) => ({
  version: 1,
  settings: DEFAULT_SETTINGS,
  employees: withDemo ? DEMO_EMPLOYEES : [],
  attendance: {},   // attendance[date][empId] = { in, out, status }
  payroll: {},      // payroll[month][empId] = { nightStays, bike, bonus, other, advance, otherDed }
  performance: {},  // performance[month][empId] = { scores:{}, remarks }
  lastMonth: monthKey(),
})
