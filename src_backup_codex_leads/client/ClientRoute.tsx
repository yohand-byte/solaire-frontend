import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const ClientRoute = ({ children }: { children: JSX.Element }) => {
  const { user, role, loading } = useAuth();

  if (loading) return null;

  if (!user || role !== "client") {
    return <Navigate to="/client/login" replace />;
  }

  return children;
}