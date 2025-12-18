import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore, collection, query, where, getDocs, doc, getDoc,
  setDoc, runTransaction, Timestamp,
} from "firebase/firestore";
import { PACKS } from "../constants";
import * as shared from "../../../../packages/shared/src/firestore";
export type {
  Lead,
  Client,
  Dossier,
  DossierDocument,
  DossierTimelineEntry,
  DossierNote,
  DossierDocType,
  DossierStepStatus,
  User,
  CreditTransaction,
  FirestoreDate,
} from "../../../../packages/shared/src/firestore";

const env = import.meta.env;

function requireEnv(key: string) {
  const value = env?.[key];
  if (value) return value;
  throw new Error(`[firebase] missing required env ${key}`);
}

const firebaseConfig = {
  apiKey: requireEnv("VITE_FIREBASE_API_KEY"),
  authDomain: requireEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: requireEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: requireEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requireEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: requireEnv("VITE_FIREBASE_APP_ID"),
  measurementId: env?.VITE_FIREBASE_MEASUREMENT_ID || undefined,
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

// Shared Firestore helpers bound to this app's db
export const createLead = (data: Parameters<typeof shared.createLead>[1]) =>
  shared.createLead(db, data);
export const getLead = (id: string) => shared.getLead(db, id);
export const getLeads = (filters?: Parameters<typeof shared.getLeads>[1]) =>
  shared.getLeads(db, filters);
export const updateLead = (id: string, data: Parameters<typeof shared.updateLead>[2]) =>
  shared.updateLead(db, id, data);
export const deleteLead = (id: string) => shared.deleteLead(db, id);

export const createClient = (data: Parameters<typeof shared.createClient>[1]) =>
  shared.createClient(db, data);
export const getClient = (id: string) => shared.getClient(db, id);
export const getClients = (filters?: Parameters<typeof shared.getClients>[1]) =>
  shared.getClients(db, filters);
export const updateClient = (id: string, data: Parameters<typeof shared.updateClient>[2]) =>
  shared.updateClient(db, id, data);

export const getNextDossierRef = () => shared.getNextDossierRef(db);
export const createDossier = (data: Parameters<typeof shared.createDossier>[1]) =>
  shared.createDossier(db, data);
export const getDossier = (id: string) => shared.getDossier(db, id);
export const getDossiersByClient = (clientId: string) =>
  shared.getDossiersByClient(db, clientId);
export const getDossiers = (filters?: Parameters<typeof shared.getDossiers>[1]) =>
  shared.getDossiers(db, filters);
export const updateDossier = (id: string, data: Parameters<typeof shared.updateDossier>[2]) =>
  shared.updateDossier(db, id, data);
export const addDossierDocument = (
  dossierId: string,
  document: Parameters<typeof shared.addDossierDocument>[2]
) => shared.addDossierDocument(db, dossierId, document);
export const addDossierTimelineEntry = (
  dossierId: string,
  entry: Parameters<typeof shared.addDossierTimelineEntry>[2]
) => shared.addDossierTimelineEntry(db, dossierId, entry);

export const createUser = (uid: string, data: Parameters<typeof shared.createUser>[2]) =>
  shared.createUser(db, uid, data);
export const getUser = (uid: string) => shared.getUser(db, uid);
export const updateUser = (uid: string, data: Parameters<typeof shared.updateUser>[2]) =>
  shared.updateUser(db, uid, data);

export const addCredits = (clientId: string, amount: number, reason: string) =>
  shared.addCredits(db, clientId, amount, reason);
export const debitCredits = (
  clientId: string,
  amount: number,
  reason: string,
  dossierId?: string
) => shared.debitCredits(db, clientId, amount, reason, dossierId);
export const getCreditsHistory = (clientId: string) =>
  shared.getCreditsHistory(db, clientId);

export const convertLeadToClient = (
  leadId: string,
  pack: Parameters<typeof shared.convertLeadToClient>[2],
  initialCredits: number,
  installationData?: Parameters<typeof shared.convertLeadToClient>[4]
) => shared.convertLeadToClient(db, leadId, pack, initialCredits, installationData);

export const ensureUserDoc = (
  uid: string,
  data: Parameters<typeof shared.ensureUserDoc>[2]
) => shared.ensureUserDoc(db, uid, data);
