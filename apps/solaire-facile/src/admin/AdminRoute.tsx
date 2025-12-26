import React from "react";
import { Navigate } from "react-router-dom";

export function AdminRoute({ children }: { children: React.ReactElement }) {
  const isAdmin = true;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return children;
}
