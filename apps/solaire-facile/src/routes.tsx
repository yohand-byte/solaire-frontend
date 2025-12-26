import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClientLogin from "./client/Login";
import ClientDashboard from "./client/Dashboard";
import AdminLogin from "./admin/Login";
import AdminDashboard from "./admin/Dashboard";
import { ClientRoute } from "./client/ClientRoute";
import { AdminRoute } from "./admin/AdminRoute";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Client (installateurs) - Magic Link */}
        <Route path="/client/login" element={<ClientLogin />} />
        <Route
          path="/client/*"
          element={
            <ClientRoute>
              <ClientDashboard />
            </ClientRoute>
          }
        />

        {/* Admin Solaire Facile - Email/Password */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        {/* Redirections par défaut */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
