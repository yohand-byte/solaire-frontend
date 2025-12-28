const admin = require("firebase-admin");

// Init Firebase Admin
const serviceAccount = require("./secrets/firebase-service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

async function cleanAndSeed() {
  console.log("🧹 Nettoyage des collections...");

  // 1. Supprimer toutes les données existantes
  const collections = ["leads", "installers", "projects", "documents"];
  for (const col of collections) {
    const snap = await db.collection(col).get();
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`   ✓ ${col}: ${snap.size} supprimés`);
  }

  // Reset counter
  await db.collection("counters").doc("projects").set({ value: 0 });
  console.log("   ✓ Counter reset");

  // 2. Créer 5 Leads
  console.log("\n📝 Création des leads...");
  const leads = [
    { company: "SOLAR PROVENCE", contact: { firstName: "Marc", lastName: "Dupont", email: "marc@solarprovence.fr", phone: "0601020304" }, pack: "PRO", source: "website", status: "new", score: 75 },
    { company: "ECO ENERGIE SUD", contact: { firstName: "Sophie", lastName: "Martin", email: "sophie@ecoenergie.fr", phone: "0602030405" }, pack: "SERENITE", source: "salon", status: "contacted", score: 85 },
    { company: "VOLTAIC OUEST", contact: { firstName: "Pierre", lastName: "Leroy", email: "pierre@voltaic.fr", phone: "0603040506" }, pack: "ESSENTIEL", source: "recommandation", status: "qualified", score: 90 },
    { company: "GREEN INSTALL", contact: { firstName: "Julie", lastName: "Bernard", email: "julie@greeninstall.fr", phone: "0604050607" }, pack: "PRO", source: "google", status: "new", score: 65 },
    { company: "PHOTON ENERGY", contact: { firstName: "Thomas", lastName: "Petit", email: "thomas@photon.fr", phone: "0605060708" }, pack: "SERENITE", source: "website", status: "new", score: 80 },
  ];

  for (const lead of leads) {
    await db.collection("leads").add({
      ...lead,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  console.log(`   ✓ ${leads.length} leads créés`);

  // 3. Créer 5 Installateurs
  console.log("\n👷 Création des installateurs...");
  const installers = [
    { company: "SOLEIL DU SUD", siret: "12345678901234", contact: { firstName: "Jean", lastName: "Rousseau", email: "jean@soleildusud.fr", phone: "0611111111" }, address: { street: "15 avenue du Soleil", city: "Marseille", postalCode: "13001" }, subscription: { plan: "pro", dossiersIncluded: 15 }, status: "active" },
    { company: "BRETAGNE SOLAR", siret: "23456789012345", contact: { firstName: "Marie", lastName: "Le Gall", email: "marie@bretagne-solar.fr", phone: "0622222222" }, address: { street: "8 rue de la Mer", city: "Rennes", postalCode: "35000" }, subscription: { plan: "serenite", dossiersIncluded: 30 }, status: "active" },
    { company: "ALPES ENERGIE", siret: "34567890123456", contact: { firstName: "Luc", lastName: "Montagne", email: "luc@alpes-energie.fr", phone: "0633333333" }, address: { street: "22 route des Cimes", city: "Grenoble", postalCode: "38000" }, subscription: { plan: "essentiel", dossiersIncluded: 5 }, status: "active" },
    { company: "NORMANDIE VERTE", siret: "45678901234567", contact: { firstName: "Claire", lastName: "Dubois", email: "claire@normandie-verte.fr", phone: "0644444444" }, address: { street: "5 place du Marché", city: "Rouen", postalCode: "76000" }, subscription: { plan: "pro", dossiersIncluded: 15 }, status: "active" },
    { company: "BORDEAUX SOLAIRE", siret: "56789012345678", contact: { firstName: "Antoine", lastName: "Vigne", email: "antoine@bordeaux-solaire.fr", phone: "0655555555" }, address: { street: "33 cours Victor Hugo", city: "Bordeaux", postalCode: "33000" }, subscription: { plan: "serenite", dossiersIncluded: 30 }, status: "active" },
  ];

  const installerIds = [];
  for (const inst of installers) {
    const ref = await db.collection("installers").add({
      ...inst,
      stats: { totalDossiers: 1, dossiersEnCours: 1, dossiersFinalises: 0 },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    installerIds.push(ref.id);
  }
  console.log(`   ✓ ${installers.length} installateurs créés`);

  // 4. Créer 5 Projets (1 par installateur)
  console.log("\n📁 Création des projets...");
  const projects = [
    { 
      beneficiary: { firstName: "Paul", lastName: "Martin", email: "paul.martin@email.com", phone: "0671111111", address: { street: "10 rue des Oliviers", city: "Aix-en-Provence", postalCode: "13100" } },
      installation: { power: 6, panelsCount: 16, panelsBrand: "Longi", inverterBrand: "Enphase", roofType: "tuile", raccordementType: "surplus" },
      pack: "PRO", packPrice: 269,
      workflow: { dp: { currentStep: "sent" }, consuel: { currentStep: "pending" }, enedis: { currentStep: "pending" }, edfOa: { currentStep: "pending" } },
      progress: 10
    },
    { 
      beneficiary: { firstName: "Isabelle", lastName: "Kermarec", email: "isabelle.k@email.com", phone: "0672222222", address: { street: "25 rue de Brest", city: "Quimper", postalCode: "29000" } },
      installation: { power: 9, panelsCount: 24, panelsBrand: "Jinko", inverterBrand: "Huawei", roofType: "ardoise", raccordementType: "surplus" },
      pack: "SERENITE", packPrice: 449,
      workflow: { dp: { currentStep: "approved" }, consuel: { currentStep: "waiting" }, enedis: { currentStep: "pending" }, edfOa: { currentStep: "pending" } },
      progress: 35
    },
    { 
      beneficiary: { firstName: "Michel", lastName: "Blanc", email: "michel.blanc@email.com", phone: "0673333333", address: { street: "3 chemin des Neiges", city: "Annecy", postalCode: "74000" } },
      installation: { power: 3, panelsCount: 8, panelsBrand: "SunPower", inverterBrand: "SolarEdge", roofType: "tuile", raccordementType: "surplus" },
      pack: "ESSENTIEL", packPrice: 169,
      workflow: { dp: { currentStep: "approved" }, consuel: { currentStep: "attestation_approved" }, enedis: { currentStep: "mes_scheduled" }, edfOa: { currentStep: "pending" } },
      progress: 60
    },
    { 
      beneficiary: { firstName: "Christine", lastName: "Lefevre", email: "christine.l@email.com", phone: "0674444444", address: { street: "18 avenue Flaubert", city: "Le Havre", postalCode: "76600" } },
      installation: { power: 6, panelsCount: 16, panelsBrand: "Trina", inverterBrand: "Fronius", roofType: "bac_acier", raccordementType: "revente_totale" },
      pack: "PRO", packPrice: 269,
      workflow: { dp: { currentStep: "approved" }, consuel: { currentStep: "attestation_approved" }, enedis: { currentStep: "mes_done" }, edfOa: { currentStep: "s21_sent" } },
      progress: 75
    },
    { 
      beneficiary: { firstName: "François", lastName: "Moreau", email: "francois.m@email.com", phone: "0675555555", address: { street: "7 place des Chartrons", city: "Bordeaux", postalCode: "33000" } },
      installation: { power: 12, panelsCount: 32, panelsBrand: "REC", inverterBrand: "SMA", roofType: "tuile", raccordementType: "revente_totale" },
      pack: "SERENITE", packPrice: 449,
      workflow: { dp: { currentStep: "approved" }, consuel: { currentStep: "attestation_approved" }, enedis: { currentStep: "mes_done" }, edfOa: { currentStep: "contract_signed" } },
      progress: 100
    },
  ];

  for (let i = 0; i < projects.length; i++) {
    const proj = projects[i];
    const ref = `DOS-2025-${String(i + 1).padStart(4, "0")}`;
    await db.collection("projects").add({
      ...proj,
      reference: ref,
      installerId: installerIds[i],
      status: proj.progress === 100 ? "completed" : "in_progress",
      totalPrice: proj.packPrice,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  // Update counter
  await db.collection("counters").doc("projects").set({ value: 5 });
  console.log(`   ✓ ${projects.length} projets créés`);

  console.log("\n✅ Seed terminé !");
  console.log("   - 5 Leads");
  console.log("   - 5 Installateurs");
  console.log("   - 5 Projets (1 par installateur)");
  console.log("   - Progress: 10%, 35%, 60%, 75%, 100%");
  
  process.exit(0);
}

cleanAndSeed().catch((err) => {
  console.error("❌ Erreur:", err);
  process.exit(1);
});
