import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useStore } from "./lib/store.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";
import Employees from "./pages/admin/Employees.jsx";
import Attendance from "./pages/admin/Attendance.jsx";
import Leaves from "./pages/admin/Leaves.jsx";
import Salary from "./pages/admin/Salary.jsx";
import Performance from "./pages/admin/Performance.jsx";
import Lookup from "./pages/admin/Lookup.jsx";
import Settings from "./pages/admin/Settings.jsx";
import Punch from "./pages/employee/Punch.jsx";
import Work from "./pages/admin/Work.jsx";
import Locations from "./pages/admin/Locations.jsx";
import Bike from "./pages/admin/Bike.jsx";
import Materials from "./pages/admin/Materials.jsx";
import CrmModule from "./pages/admin/CrmModule.jsx";
import CrmDashboard from "./pages/admin/CrmDashboard.jsx";
// import BikeDaily from "./pages/admin/BikeDaily.jsx";
import { MODULES } from "./lib/crm.js";
// "#0e7490" -> "14 116 144"
const rgb = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const darken = (c, f) => c.map((v) => Math.round(v * f));
const soften = (c) => c.map((v) => Math.round(v + (255 - v) * 0.92));

export default function App() {
  const { state, session } = useStore();
  const { color, appName, name } = state.settings.company;
  const loc = useLocation();
  const nav = useNavigate();
  const [startPage] = useState(() => localStorage.getItem("last_page"));
  const isAdmin = session && session.role !== "employee";

  // Apply brand colour + website title from Settings
  useEffect(() => {
    const c = rgb(/^#[0-9a-f]{6}$/i.test(color) ? color : "#0e7490");
    const r = document.documentElement.style;
    r.setProperty("--brand", c.join(" "));
    r.setProperty("--brand-dark", darken(c, 0.8).join(" "));
    r.setProperty("--brand-soft", soften(c).join(" "));
    document.title = `${name} · ${appName}`;
  }, [color, appName, name]);

  // open the page you were on last time
  useEffect(() => {
    if (isAdmin && startPage && startPage !== "/" && loc.pathname === "/")
      nav(startPage, { replace: true });
    // eslint-disable-next-line
  }, []);

  // remember the page you are on
  useEffect(() => {
    if (isAdmin) localStorage.setItem("last_page", loc.pathname);
  }, [loc.pathname, isAdmin]);

  if (!session) return <Login />;

  if (session.role === "employee") {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <Layout>
              <Punch />
            </Layout>
          }
        />
      </Routes>
    );
  }
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/leaves" element={<Leaves />} />
        <Route path="/salary" element={<Salary />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/lookup" element={<Lookup />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/bike" element={<Bike />} />
        {/* <Route path="/bike-daily" element={<BikeDaily />} /> */}
        <Route path="/work" element={<Work />} />
        <Route path="/locations" element={<Locations />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/crm" element={<CrmDashboard />} />
        {Object.keys(MODULES).map((k) => (
          <Route
            key={k}
            path={`/crm/${k}`}
            element={<CrmModule key={k} mod={k} />}
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
