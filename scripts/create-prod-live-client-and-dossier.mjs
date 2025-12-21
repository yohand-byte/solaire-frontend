import admin from "firebase-admin";
import { readFileSync } from "node:fs";

const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || new URL("./secrets/firebase-admin.json", import.meta.url).pathname;
const sa = JSON.parse(readFileSync(saPath, "utf8"));

if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });
}

const auth = admin.auth();
const db = admin.firestore();

const ts = Date.now();
const email = `live.client+${ts}@example.com`;
const password = "Test1234!Test1234!";

let userRecord;
try {
  userRecord = await auth.createUser({ email, password });
} catch (err) {
  if (err?.code === "auth/email-already-exists") {
    userRecord = await auth.getUserByEmail(email);
  } else {
    throw err;
  }
}

const uid = userRecord.uid;

await db.collection("clients").doc(uid).set(
  {
    uid,
    email,
    name: `Live Client ${ts}`,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  },
  { merge: true },
);

const dossierId = `LIVE_SYNC_${ts}`;

await db.collection("dossiers").doc(dossierId).set({
  title: "LIVE SYNC CLIENT",
  status: "EN_ATTENTE",
  ownerUid: uid,
  installerId: uid,
  client_id: uid,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updated_at: admin.firestore.FieldValue.serverTimestamp(),
});

console.log("CLIENT_EMAIL", email);
console.log("CLIENT_PASSWORD", password);
console.log("CLIENT_UID", uid);
console.log("DOSSIER_ID", dossierId);
