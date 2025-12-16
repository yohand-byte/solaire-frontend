import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const ClientRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading, role } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/client/login" replace />;

  if (role !== "installer") return <Navigate to="/client/login" replace />;

  return children;
};
