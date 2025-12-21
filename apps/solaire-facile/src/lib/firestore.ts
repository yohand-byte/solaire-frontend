import type { User } from "firebase/auth";
import { db } from "../firebase";
import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from "firebase/firestore";

const DEBUG = import.meta.env.VITE_DEBUG_FIREBASE === "true";

/**
 * Safe wrapper: n'explose jamais l'app si rules refusent.
 */
export async function ensureUserDocSafe(user: User | null) {
  if (!user) return;

  const payload = {
    uid: user.uid,
    email: user.email ?? null,
    name: user.displayName ?? null,
    updated_at: serverTimestamp(),
  };

  try {
    await setDoc(
      doc(db, "users", user.uid),
      {
        created_at: serverTimestamp(),
        ...payload,
      },
      { merge: true },
    );
    if (DEBUG) console.info("[ensureUserDocSafe] ok", user.uid);
    return "ok";
  } catch (err: any) {
    const code = err?.code || "";
    if (code === "permission-denied") {
      if (DEBUG) console.warn("[ensureUserDocSafe] denied", user.uid);
      return "denied";
    }
    if (DEBUG) console.warn("[ensureUserDocSafe] error", code || err);
    return "error";
  }
}

/**
 * Compat: certains écrans importent ensureUserDoc(...) depuis ../lib/firestore
 * => on expose un alias.
 */
export async function ensureUserDoc(user: User | null) {
  return ensureUserDocSafe(user);
}

/**
 * Trouve un clientId à partir de l'email (si rules le permettent).
 * Retourne null si introuvable ou permission-denied.
 */
export async function findClientIdByEmail(email: string): Promise<string | null> {
  const e = (email || "").trim().toLowerCase();
  if (!e) return null;

  try {
    const col = collection(db, "clients");
    const q = query(col, where("email", "==", e), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].id;
  } catch (err: any) {
    if (DEBUG) console.warn("[findClientIdByEmail] error", err?.code || err);
    return null;
  }
}
