import admin from "firebase-admin";
import { readFileSync } from "node:fs";

const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || new URL("./secrets/firebase-admin.json", import.meta.url).pathname;
const sa = JSON.parse(readFileSync(saPath, "utf8"));

if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });
}
const db = admin.firestore();

const dossierId = process.env.DOSSIER_ID;
if (!dossierId) throw new Error("Missing DOSSIER_ID");

console.log("WATCHING_DOSSIER", dossierId, "PROJECT", sa.project_id);

const unsub = db.collection("dossiers").doc(dossierId).onSnapshot(
  (doc) => {
    if (!doc.exists) {
      console.log("DOC_MISSING");
      return;
    }
    const data = doc.data() || {};
    console.log("LIVE_UPDATE", {
      id: doc.id,
      status: data.status,
      updated_at: data.updated_at?._seconds ?? data.updated_at,
      title: data.title,
      client_id: data.client_id,
    });
  },
  (err) => {
    console.error("WATCH_ERROR", err?.code, err?.message);
    process.exit(1);
  }
);

setInterval(() => {}, 1 << 30);
