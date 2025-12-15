import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, fetchUserClaims } from "../lib/firestore";

export type UserRole = "admin" | "client" | null;

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [installerId, setInstallerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setRole(null);
        setInstallerId(null);
        setLoading(false);
        return;
      }

      setUser(u);
      try {
        const claims = await fetchUserClaims(u.uid);
        setRole((claims && (claims as any).role) || null);
        setInstallerId((claims && (claims as any).installerId) || null);
      } catch (e) {
        console.error("fetchUserClaims error:", e);
        setRole(null);
        setInstallerId(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return { user, role, installerId, loading, logout };
}