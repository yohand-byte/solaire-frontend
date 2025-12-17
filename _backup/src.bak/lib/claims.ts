import { auth } from "./firestore";
import { getIdTokenResult } from "firebase/auth";
import type { NavigateFunction } from "react-router-dom";

export async function getClaims() {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await getIdTokenResult(user, true);
  return token.claims as Record<string, any>;
}

export async function requireApprovedClaims(navigate?: NavigateFunction) {
  const claims = await getClaims();
  if (!claims || !claims.role || !claims.installerId) {
    if (navigate) navigate("/client/pending", { replace: true });
    return null;
  }
  return claims;
}
