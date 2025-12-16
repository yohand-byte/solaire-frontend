import { useEffect, useState } from "react";
import { auth } from "../lib/firestore";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";

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
        const token = await getIdTokenResult(u, true);
        const c = token.claims;
        setClaims(c);
        setRole((c.role as string) || null);
      } catch (err) {
        setClaims(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return { user, claims, role, loading };
}
