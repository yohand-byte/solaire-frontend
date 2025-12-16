import { getIdTokenResult, User } from "firebase/auth";
import { NavigateFunction } from "react-router-dom";

export async function routeAfterLogin(user: User, navigate?: NavigateFunction) {
  const token = await getIdTokenResult(user, true);
  const role = token.claims.role as string | undefined;
  const go = navigate ? (path: string) => navigate(path, { replace: true }) : (path: string) => (window.location.href = path);
  if (role === "admin") return go("/admin/dashboard");
  if (role === "installer") return go("/client/dashboard");
  return go("/client/pending");
}
