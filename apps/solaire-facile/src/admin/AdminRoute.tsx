import { Navigate } from "react-router-dom";

// Placeholder guard: remplace avec la vraie logique d'auth admin
export function AdminRoute({ children }: { children: React.ReactElement }) {
  const isAdmin = false; // TODO: inject real auth state
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return children;
}
