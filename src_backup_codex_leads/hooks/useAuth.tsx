import { useEffect, useState } from "react";
import { auth, fetchUserClaims } from "../lib/firestore";
import { onAuthStateChanged } from "firebase/auth";

const ADMIN_UID = "yrpmKIwuSydzH8nWMahRlWZictb2";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [claims, setClaims] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setClaims(null);
        setRole(null);
        setLoading(false);
        return;
      }
      try {
        const data = await fetchUserClaims(u.uid);
        if (u.uid === ADMIN_UID) {
          const adminClaims = { role: "admin", installerId: "ADMIN", ...(data || {}) };
          setClaims(adminClaims);
          setRole("admin");
        } else if (data) {
          setClaims(data);
          setRole(data.role || "client");
        } else {
          setClaims({ role: "client" });
          setRole("client");
        }
      } catch (err) {
        setClaims({ role: "client" });
        setRole("client");
      } finally {
        console.log("[useAuth] user=", u?.uid, u?.email);
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return { user, claims, role, loading };
}
