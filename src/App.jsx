import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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

  // Apply brand colour + website title from Settings
  useEffect(() => {
    const c = rgb(/^#[0-9a-f]{6}$/i.test(color) ? color : "#0e7490");
    const r = document.documentElement.style;
    r.setProperty("--brand", c.join(" "));
    r.setProperty("--brand-dark", darken(c, 0.8).join(" "));
    r.setProperty("--brand-soft", soften(c).join(" "));
    document.title = `${name} · ${appName}`;
  }, [color, appName, name]);

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
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/work" element={<Work />} />
        <Route path="/locations" element={<Locations />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
