import { Navigate } from "react-router-dom";

// Placeholder guard: remplace avec la vraie logique d'auth magic link
export function ClientRoute({ children }: { children: React.ReactElement }) {
  const isAuth = Boolean(localStorage.getItem("installerId"));
  if (!isAuth) return <Navigate to="/client/login" replace />;
  return children;
}
