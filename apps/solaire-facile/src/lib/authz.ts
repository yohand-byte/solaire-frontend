type AnyClaims = Record<string, any>;

export function isAdminFromClaims(
  token: { claims?: AnyClaims } | null | undefined,
  uid: string,
  whitelist: string[] = [],
): boolean {
  const claims: AnyClaims = (token?.claims ?? {}) as AnyClaims;

  const claimAdmin =
    Boolean(claims.admin) ||
    String(claims.role ?? "").toLowerCase() === "admin" ||
    String(claims.type ?? "").toLowerCase() === "admin";

  const wl = (whitelist ?? []).map((s) => String(s).trim()).filter(Boolean);
  const wlAdmin = wl.includes(uid);

  return claimAdmin || wlAdmin;
}
