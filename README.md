# Staff Attendance & Payroll (React + Vite + Tailwind)

A website for punch in / punch out, leaves, overtime, salary, KPI and Excel / PDF downloads.
No backend needed. All data is saved inside the browser (localStorage).

## Logins (demo)
| Who | Username / ID | Password / PIN |
|---|---|---|
| Admin | `admin` | `admin123` (change it in Settings) |
| Employee | `KAC001` ... `KAC026` | `1234` (admin can reset, employee can change) |

## Run on your computer
1. Install Node.js LTS from https://nodejs.org (one time).
2. Open this folder in VS Code. Open the terminal (Terminal > New Terminal).
3. `npm install`   (one time, wait 1-2 minutes)
4. `npm run dev`   then open the link shown, usually http://localhost:5173

## Build for production
`npm run build` makes a `dist` folder. Vercel / Netlify do this for you automatically.

## Folder map
- `src/pages/admin/*`   admin screens (Dashboard, Employees, Attendance, Leaves, Salary, KPI, Lookup, Settings)
- `src/pages/employee/Punch.jsx`   employee punch in / out screen
- `src/lib/attendance.js`   rules: present, late, half day, leave, week off, holiday, overtime
- `src/lib/payroll.js`      salary maths: earned, OT, night stay, KPI, PF, ESI, net
- `src/lib/performance.js`  KPI score sheets and grades (from your tracker Excel files)
- `src/lib/exporters.js`    Excel (with live formulas, VLOOKUP, HLOOKUP) and PDF downloads
- `src/lib/store.jsx`       where data is saved. Replace this one file later to use a real database.
- `src/lib/defaults.js`     default settings and demo employees

## Important
Data lives in the browser of the device being used, so every phone / computer has its own data.
For one shared office computer or tablet this works well. For many phones sharing one database you need a
backend (Supabase or Firebase). That is the next step, and only `store.jsx` needs to change.
Use Settings > Download backup regularly.
