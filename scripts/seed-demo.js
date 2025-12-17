import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, addDoc, doc, runTransaction, Timestamp, setDoc } from "firebase/firestore";

const config = {
  apiKey: process.env.SEED_FIREBASE_API_KEY,
  authDomain: process.env.SEED_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.SEED_FIREBASE_PROJECT_ID,
  storageBucket: process.env.SEED_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.SEED_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.SEED_FIREBASE_APP_ID,
};

if (Object.values(config).some((value) => !value)) {
  throw new Error("Missing Firebase config. Provide SEED_FIREBASE_* environment variables.");
}

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPass = process.env.SEED_ADMIN_PASSWORD;
const adminUid = process.env.SEED_ADMIN_UID;
const installEmail = process.env.SEED_INSTALLER_EMAIL;
const installateurUid = process.env.SEED_INSTALLER_UID;

if (!adminEmail || !adminPass || !adminUid || !installEmail || !installateurUid) {
  throw new Error("Missing required seed identities (SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD/SEED_ADMIN_UID/SEED_INSTALLER_EMAIL/SEED_INSTALLER_UID).");
}

async function seed() {
  await signInWithEmailAndPassword(auth, adminEmail, adminPass);
  await setDoc(doc(db, "users", installateurUid), {
    email: installEmail,
    role: "client",
    installerId: "INST123",
  });
  await setDoc(doc(db, "users", adminUid), {
    email: adminEmail,
    role: "admin",
    installerId: "ADMIN",
  });

  const leadData = [
    { name: "Alice Photon", email: "alice@test.com", phone: "0600000001", source: "landing", createdAt: Timestamp.now() },
    { name: "Bob Solaire", email: "bob@test.com", phone: "0600000002", source: "partenaire", createdAt: Timestamp.fromDate(new Date(Date.now() - 2 * 86400000)) },
    { name: "Charlie Watt", email: "charlie@test.com", phone: "0600000003", source: "landing", createdAt: Timestamp.fromDate(new Date(Date.now() - 5 * 86400000)) },
  ];
  let leads = 0;
  for (const lead of leadData) {
    await addDoc(collection(db, "leads"), lead);
    leads++;
  }

  const clients = [
    { name: "Installateur Alpha", email: "contact@alpha.com", phone: "0700000001", installerId: "INST123" },
    { name: "Installateur Beta", email: "contact@beta.com", phone: "0700000002", installerId: "INST123" },
  ];
  let clientsCreated = 0;
  for (const client of clients) {
    await addDoc(collection(db, "clients"), client);
    clientsCreated++;
  }

  const fileInputs = [
    { pack: "validation", statutGlobal: "en_cours", title: "Validation Maison", clientFinal: "Famille Durand", address: "12 rue du Soleil, 75000 Paris", power: 6, nextAction: "Appel client", nextActionDate: new Date() },
    { pack: "mise_en_service", statutGlobal: "en_attente", title: "Mise en service Site B", clientFinal: "SCI Lumière", address: "45 av. des Énergies, Lyon", power: 9, nextAction: "Relance Consuel", nextActionDate: new Date(Date.now() - 3 * 86400000) },
    { pack: "zero_stress", statutGlobal: "finalise", title: "Zéro Stress Villa C", clientFinal: "Mme Ray", address: "8 impasse Volt, Marseille", power: 12, nextAction: "Facture envoyée", nextActionDate: null },
  ];
  let files = 0;
  for (const input of fileInputs) {
    await runTransaction(db, async (tx) => {
      const year = new Date().getFullYear();
      const counterRef = doc(db, "counters", `files-${year}`);
      const counterSnap = await tx.get(counterRef);
      const seq = (counterSnap.exists() ? counterSnap.data().seq || 0 : 0) + 1;
      tx.set(counterRef, { seq }, { merge: true });
      const reference = `DOS-${year}-${String(seq).padStart(4, "0")}`;
      const fileRef = doc(collection(db, "files"));
      tx.set(fileRef, {
        reference,
        installerId: "INST123",
        pack: input.pack,
        statutGlobal: input.statutGlobal,
        title: input.title,
        clientFinal: input.clientFinal,
        address: input.address,
        power: input.power,
        nextAction: input.nextAction,
        nextActionDate: input.nextActionDate ? Timestamp.fromDate(new Date(input.nextActionDate)) : null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
    files++;
  }

  console.log(`Leads: ${leads}, Clients: ${clientsCreated}, Dossiers: ${files}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Erreur seed:", err);
  process.exit(1);
});
