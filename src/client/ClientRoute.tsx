import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";

export const ClientRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();

  if (loading || profileLoading) return null;
  if (!user) return <Navigate to="/client/login" replace />;

  if (profile?.role && profile.role !== "installer") {
    return <Navigate to="/login" replace />;
  }

  if (profile?.status !== "approved" && profile?.status !== "active") {
    return <div className="page-loader">Compte en attente de validation.</div>;
  }

  if (profile?.status === "approved" && profile?.onboarded !== true) {
    return <Navigate to="/client/onboarding" replace />;
  }

  return children;
};
