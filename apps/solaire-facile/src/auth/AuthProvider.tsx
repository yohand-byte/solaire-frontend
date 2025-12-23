import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../firebase";
import { ensureUserDoc, findClientIdByEmail } from "../lib/firestore";

type HandleResult = {
  ok: true;
  nonProvisioned?: boolean;
  skipped?: boolean;
};

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  handleClientPostAuth: (user: User, fallbackEmail?: string | null) => Promise<HandleResult>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const handledRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const unsub = onAuthStateChanged(auth, (next) => {
      if (!mountedRef.current) return;
      setUser(next);
      setReady(true);
    });
    return () => {
      mountedRef.current = false;
      unsub();
    };
  }, []);

  const handleClientPostAuth = useCallback(
    async (authUser: User, fallbackEmail?: string | null): Promise<HandleResult> => {
      const uid = authUser.uid;
      if (handledRef.current.has(uid)) {
        return { ok: true, skipped: true };
      }
      try {
        if (sessionStorage.getItem(`handled:${uid}`) === "1") {
          handledRef.current.add(uid);
          return { ok: true, skipped: true };
        }
      } catch {
        // ignore
      }

      const effectiveEmail = authUser.email ?? fallbackEmail ?? null;
      let clientId = uid;
      if (effectiveEmail) {
        const found = await findClientIdByEmail(effectiveEmail);
        if (found) clientId = found;
      }

      const nonProvisioned = !effectiveEmail || clientId === uid;
      await ensureUserDoc({
        role: "client",
        client_id: clientId,
        email: effectiveEmail,
        name: authUser.displayName ?? effectiveEmail ?? null,
      });

      handledRef.current.add(uid);
      try {
        sessionStorage.setItem(`handled:${uid}`, "1");
      } catch {
        // ignore
      }

      return { ok: true, nonProvisioned };
    },
    []
  );

  const value = useMemo(
    () => ({ user, ready, handleClientPostAuth }),
    [user, ready, handleClientPostAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
