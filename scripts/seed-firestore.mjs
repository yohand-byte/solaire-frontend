import admin from "firebase-admin";

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("Missing GOOGLE_APPLICATION_CREDENTIALS. Point it to a service account JSON.");
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();

const now = admin.firestore.Timestamp.now();
const daysAgo = (d) => admin.firestore.Timestamp.fromDate(new Date(Date.now() - d * 24 * 60 * 60 * 1000));
const hoursFromNow = (h) => admin.firestore.Timestamp.fromDate(new Date(Date.now() + h * 60 * 60 * 1000));

const leads = [
  { name: "Jean Martin", email: "jean.martin@test.com", phone: "0600000001", status: "gagne", createdAt: daysAgo(2) },
  { name: "Sophie Durand", email: "sophie.durand@test.com", phone: "0600000002", status: "perdu", createdAt: daysAgo(10) },
  { name: "Karim Benali", email: "karim.benali@test.com", phone: "0600000003", status: "nouveau", createdAt: daysAgo(1) },
];

const files = [
  {
    reference: "DOS-2025-0001",
    title: "Dossier yohan dubois",
    clientFinal: "yohan dubois",
    pack: "essentiel",
    statutGlobal: "en_cours",
    nextAction: "Appel client",
    nextActionDate: hoursFromNow(3),
    updatedAt: now,
    createdAt: daysAgo(12),
  },
  {
    reference: "DOS-2025-0002",
    title: "Dossier installateur",
    clientFinal: "installateur",
    pack: "pro",
    statutGlobal: "finalise",
    nextAction: null,
    nextActionDate: null,
    updatedAt: daysAgo(1),
    createdAt: daysAgo(20),
  },
  {
    reference: "DOS-2025-0003",
    title: "Dossier bureau-etudes",
    clientFinal: "TEST20000",
    pack: "serenite",
    statutGlobal: "en_attente",
    nextAction: "Relance BE",
    nextActionDate: daysAgo(1),
    updatedAt: daysAgo(8),
    createdAt: daysAgo(30),
  },
  {
    reference: "DOS-2025-0004",
    title: "Dossier TEST YO",
    clientFinal: "DISTRILEC",
    pack: "carte",
    statutGlobal: "bloque",
    nextAction: "Pièces manquantes",
    nextActionDate: daysAgo(2),
    updatedAt: daysAgo(9),
    createdAt: daysAgo(40),
  },
];

async function main() {
  const leadsCol = db.collection("leads");
  const filesCol = db.collection("files");

  for (const l of leads) {
    await leadsCol.add(l);
  }
  for (const f of files) {
    await filesCol.add(f);
  }

  console.log("Seed OK: leads/files inserted.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
