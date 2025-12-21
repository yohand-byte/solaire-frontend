import type { IdTokenResult } from "firebase/auth";

export function isAdminFromClaims(token: IdTokenResult, uid: string, whitelist: string[] = []): boolean {
  const claims = token.claims as Record<string, any>;
  const byClaim = claims?.admin === true || claims?.role === "admin";
  const byWhitelist = uid ? whitelist.includes(uid) : false;
  return Boolean(byClaim || byWhitelist);
}

export default isAdminFromClaims;
