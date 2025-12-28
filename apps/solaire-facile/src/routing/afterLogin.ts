import type { NavigateFunction } from "react-router-dom";

export function afterLogin(navigate: NavigateFunction, role?: string | null, installerId?: string | null) {
  const go = (to: string) => navigate(to, { replace: true });
  if (role === "admin") return go("/admin");
  if (role === "installer" && installerId) return go("/client");
  return go("/client/pending");
}
