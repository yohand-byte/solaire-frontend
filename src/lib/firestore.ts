import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore, collection, query, where, getDocs, doc, getDoc,
  setDoc, runTransaction, Timestamp,
} from "firebase/firestore";
import { PACKS } from "../constants";

const env = import.meta.env;

const fallbackConfig = {
  apiKey: "AIzaSyBdQP61dhT8it9_Ua-U8u-xgh40DLnfNbg",
  authDomain: "solaire-admin.firebaseapp.com",
  projectId: "solaire-admin",
  storageBucket: "solaire-admin.firebasestorage.app",
  messagingSenderId: "294963767896",
  appId: "1:294963767896:web:a2f6590fba1de9a0d2782d",
};

function requireEnv(key: string, fallback?: string) {
  const value = env[key];
  if (value) return value;
  if (fallback) {
    console.warn(`[firebase] missing ${key}, using fallback`);
    return fallback;
  }
  throw new Error(`[firebase] missing required env ${key}`);
}

const firebaseConfig = {
  apiKey: requireEnv("VITE_FIREBASE_API_KEY", fallbackConfig.apiKey),
  authDomain: requireEnv("VITE_FIREBASE_AUTH_DOMAIN", fallbackConfig.authDomain),
  projectId: requireEnv("VITE_FIREBASE_PROJECT_ID", fallbackConfig.projectId),
  storageBucket: requireEnv("VITE_FIREBASE_STORAGE_BUCKET", fallbackConfig.storageBucket),
  messagingSenderId: requireEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", fallbackConfig.messagingSenderId),
  appId: requireEnv("VITE_FIREBASE_APP_ID", fallbackConfig.appId),
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

console.log("[firebase-config]", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
});

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function fetchUserClaims(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Génère la réf DOS-YYYY-NNNN et crée un dossier en transaction côté client.
 * Nécessite les règles Firestore : seuls les admins peuvent écrire sur "files".
 */
export async function createFileSafeClient(input: any) {
  const year = new Date().getFullYear();
  const counterRef = doc(db, "counters", `files-${year}`);
  const filesCol = collection(db, "files");

  const res = await runTransaction(db, async (tx) => {
    // incrément du compteur
    const snap = await tx.get(counterRef);
    const seq = snap.exists() ? (snap.data().seq || 0) + 1 : 1;
    tx.set(counterRef, { seq }, { merge: true });
    const reference = `DOS-${year}-${String(seq).padStart(4, "0")}`;

    // contrôle pack
    if (!PACKS.map((p) => p.value).includes(input.pack)) {
      throw new Error("Pack invalide");
    }

    const docRef = doc(filesCol);
    tx.set(docRef, {
      reference,
      installerId: "INST123",
      pack: input.pack,
      statutGlobal: input.statutGlobal || input.status || "en_cours",
      status: input.status || "en_cours",
      title: input.title || input.name || "Dossier",
      price: input.price || null,
      address: input.address || "",
      power: input.power || null,
      nextAction: input.nextAction || null,
      nextActionDate: input.nextActionDate
        ? Timestamp.fromDate(new Date(input.nextActionDate))
        : null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return { id: docRef.id, reference };
  });
  return res;
}

export async function adminSignIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() { return signOut(auth); }
