import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClientLogin from "./client/Login";
import ClientDashboard from "./client/Dashboard";
import ClientProjectDetail from "./client/ProjectDetail";
import ClientFinish from "./client/Finish";
import AdminLogin from "./admin/Login";
import AdminDashboard from "./admin/Dashboard";
import ProjectDetail from "./admin/ProjectDetail";
import LeadDetail from "./admin/LeadDetail";
import { ClientRoute } from "./client/ClientRoute";
import { AdminRoute } from "./admin/AdminRoute";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Client (installateurs) - Magic Link */}
        <Route path="/client/login" element={<ClientLogin />} />
        <Route path="/client/finish" element={<ClientFinish />} />
        <Route
          path="/client/projects/:id"
          element={
            <ClientRoute>
              <ClientProjectDetail />
            </ClientRoute>
          }
        />
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
          path="/admin/projects/:id"
          element={
            <AdminRoute>
              <ProjectDetail />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/leads/:id"
          element={
            <AdminRoute>
              <LeadDetail />
            </AdminRoute>
          }
        />
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
