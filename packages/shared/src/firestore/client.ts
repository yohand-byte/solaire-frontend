import {
  FieldValue,
  Firestore,
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import type {
  Client,
  CreditTransaction,
  Dossier,
  DossierDocument,
  DossierTimelineEntry,
  Lead,
  User,
} from "./types";

const withTimestamps = <T extends Record<string, unknown>>(data: T) => ({
  ...data,
  created_at: serverTimestamp(),
  updated_at: serverTimestamp(),
});

export async function createLead(db: Firestore, data: Omit<Lead, "id" | "created_at" | "updated_at" | "notes"> & { notes?: Lead["notes"] }) {
  const ref = await addDoc(collection(db, "leads"), {
    ...data,
    notes: data.notes ?? [],
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

export async function getLead(db: Firestore, id: string) {
  const snap = await getDoc(doc(db, "leads", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Lead) : null;
}

export async function getLeads(db: Firestore, filters?: { status?: string }) {
  const constraints = [];
  if (filters?.status) constraints.push(where("status", "==", filters.status));
  const snap = await getDocs(query(collection(db, "leads"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lead));
}

export async function updateLead(db: Firestore, id: string, data: Partial<Lead>) {
  await updateDoc(doc(db, "leads", id), { ...data, updated_at: serverTimestamp() });
}

export async function deleteLead(db: Firestore, id: string) {
  await deleteDoc(doc(db, "leads", id));
}

export async function createClient(db: Firestore, data: Omit<Client, "id" | "created_at" | "updated_at">) {
  const ref = await addDoc(collection(db, "clients"), withTimestamps(data));
  return ref.id;
}

export async function getClient(db: Firestore, id: string) {
  const snap = await getDoc(doc(db, "clients", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Client) : null;
}

export async function getClients(db: Firestore, filters?: { status?: string }) {
  const constraints = [];
  if (filters?.status) constraints.push(where("status", "==", filters.status));
  const snap = await getDocs(query(collection(db, "clients"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client));
}

export async function updateClient(db: Firestore, id: string, data: Partial<Client>) {
  await updateDoc(doc(db, "clients", id), { ...data, updated_at: serverTimestamp() });
}

export async function getNextDossierRef(db: Firestore) {
  const counterRef = doc(db, "counters", "dossiers");
  const year = new Date().getFullYear();
  const ref = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? (snap.data().current as number) ?? 0 : 0;
    const next = current + 1;
    tx.set(counterRef, { current: next }, { merge: true });
    return `DOS-${year}-${String(next).padStart(4, "0")}`;
  });
  return ref;
}

export async function createDossier(db: Firestore, data: Omit<Dossier, "id" | "ref" | "created_at" | "updated_at">) {
  const refValue = await getNextDossierRef(db);
  const ref = doc(collection(db, "dossiers"));
  await setDoc(ref, {
    ...data,
    ref: refValue,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return { id: ref.id, ref: refValue };
}

export async function getDossier(db: Firestore, id: string) {
  const snap = await getDoc(doc(db, "dossiers", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Dossier) : null;
}

export async function getDossiersByClient(db: Firestore, clientId: string) {
  const snap = await getDocs(query(collection(db, "dossiers"), where("client_id", "==", clientId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Dossier));
}

export async function getDossiers(db: Firestore, filters?: { status?: string }) {
  const constraints = [];
  if (filters?.status) constraints.push(where("status", "==", filters.status));
  const snap = await getDocs(query(collection(db, "dossiers"), ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Dossier));
}

export async function updateDossier(db: Firestore, id: string, data: Partial<Dossier>) {
  await updateDoc(doc(db, "dossiers", id), { ...data, updated_at: serverTimestamp() });
}

export async function addDossierDocument(db: Firestore, dossierId: string, document: DossierDocument) {
  await updateDoc(doc(db, "dossiers", dossierId), {
    documents: arrayUnion({ ...document, uploaded_at: document.uploaded_at ?? serverTimestamp() as FieldValue }),
    updated_at: serverTimestamp(),
  });
}

export async function addDossierTimelineEntry(db: Firestore, dossierId: string, entry: DossierTimelineEntry) {
  await updateDoc(doc(db, "dossiers", dossierId), {
    timeline: arrayUnion({ ...entry, date: entry.date ?? (serverTimestamp() as FieldValue) }),
    updated_at: serverTimestamp(),
  });
}

export async function createUser(db: Firestore, uid: string, data: Omit<User, "id" | "created_at" | "last_login">) {
  await setDoc(doc(db, "users", uid), {
    ...data,
    created_at: serverTimestamp(),
    last_login: serverTimestamp(),
  });
}

export async function getUser(db: Firestore, uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as User) : null;
}

export async function updateUser(db: Firestore, uid: string, data: Partial<User>) {
  await updateDoc(doc(db, "users", uid), { ...data, updated_at: serverTimestamp() });
}

export async function addCredits(db: Firestore, clientId: string, amount: number, reason: string) {
  const clientRef = doc(db, "clients", clientId);
  const transactions = collection(db, "credits_transactions");

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(clientRef);
    if (!snap.exists()) throw new Error("Client introuvable");
    const credits = (snap.data().credits as number) || 0;
    const balance_after = credits + amount;
    tx.update(clientRef, { credits: balance_after, updated_at: serverTimestamp() });
    const transactionRef = doc(transactions);
    tx.set(transactionRef, {
      id: transactionRef.id,
      client_id: clientId,
      type: "credit",
      amount,
      reason,
      balance_after,
      created_at: serverTimestamp(),
    } satisfies CreditTransaction);
  });
}

export async function debitCredits(
  db: Firestore,
  clientId: string,
  amount: number,
  reason: string,
  dossierId?: string
) {
  if (amount <= 0) throw new Error("Montant invalide");
  const clientRef = doc(db, "clients", clientId);
  const transactions = collection(db, "credits_transactions");

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(clientRef);
    if (!snap.exists()) throw new Error("Client introuvable");
    const credits = (snap.data().credits as number) || 0;
    if (credits < amount) throw new Error("Crédits insuffisants");
    const balance_after = credits - amount;
    tx.update(clientRef, { credits: balance_after, updated_at: serverTimestamp() });
    const transactionRef = doc(transactions);
    tx.set(transactionRef, {
      id: transactionRef.id,
      client_id: clientId,
      type: "debit",
      amount,
      reason,
      dossier_id: dossierId,
      balance_after,
      created_at: serverTimestamp(),
    } satisfies CreditTransaction);
  });
}

export async function getCreditsHistory(db: Firestore, clientId: string) {
  const snap = await getDocs(
    query(collection(db, "credits_transactions"), where("client_id", "==", clientId), orderBy("created_at", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CreditTransaction));
}

export async function ensureUserDoc(
  db: Firestore,
  uid: string,
  data: { role: User["role"]; client_id?: string | null; email?: string | null; name?: string | null; permissions?: string[] }
) {
  const ref = doc(db, "users", uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists() ? snap.data() : {};
    tx.set(
      ref,
      {
        id: uid,
        role: data.role,
        client_id: data.client_id ?? (existing as any).client_id ?? null,
        email: data.email ?? (existing as any).email ?? null,
        name: data.name ?? (existing as any).name ?? null,
        permissions: data.permissions ?? (existing as any).permissions ?? [],
        created_at: (existing as any).created_at ?? serverTimestamp(),
        updated_at: serverTimestamp(),
        last_login: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function findClientIdByEmail(db: Firestore, email: string | null | undefined) {
  if (!email) return null;
  const snap = await getDocs(
    query(collection(db, "clients"), where("email", "==", email), limit(1))
  );
  const docSnap = snap.docs[0];
  if (!docSnap) {
    console.warn("[findClientIdByEmail] no client found for email", email);
  }
  return docSnap ? docSnap.id : null;
}
