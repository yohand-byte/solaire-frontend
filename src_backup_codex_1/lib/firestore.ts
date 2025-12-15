import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore, collection, query, where, getDocs, doc, getDoc,
  setDoc, runTransaction, Timestamp,
} from "firebase/firestore";
import { PACKS } from "../constants";

const firebaseConfig = {
  apiKey: "AIzaSyBc1cYCEqFVXvB2YdxHTxhVlPqtTbfVVLM",
  authDomain: "solaire-frontend.firebaseapp.com",
  projectId: "solaire-frontend",
  storageBucket: "solaire-frontend.firebasestorage.app",
  messagingSenderId: "29459740400",
  appId: "1:29459740400:web:2fa88c891fece254c8f435",
};

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
