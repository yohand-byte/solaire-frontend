const admin = require("firebase-admin");

const serviceAccount = require("./api/firebase-service-account.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
  console.log("=== MIGRATION SOLAIRE FACILE ===\n");
  
  // 1. Migrer clients → installers
  console.log("1. Migration clients → installers...");
  const clientsSnap = await db.collection("clients").get();
  let installerCount = 0;
  
  for (const doc of clientsSnap.docs) {
    const client = doc.data();
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    // Vérifier si déjà migré
    const existingInstaller = await db.collection("installers").doc(doc.id).get();
    if (existingInstaller.exists && existingInstaller.data().company) {
      console.log(`  - Skip ${doc.id} (déjà migré)`);
      continue;
    }
    
    const installerData = {
      company: client.company || client.name || "",
      legalName: client.company || client.name || "",
      siret: client.siret || "",
      contact: {
        firstName: client.name?.split(' ')[0] || "",
        lastName: client.name?.split(' ').slice(1).join(' ') || "",
        email: client.email || "",
        phone: client.phone || ""
      },
      address: {
        street: client.address || "",
        city: "",
        postalCode: "",
        country: "FR"
      },
      subscription: {
        plan: (client.pack || client.packCode || "essentiel").toLowerCase(),
        startDate: client.createdAt || now,
        endDate: null,
        dossiersIncluded: 10,
        dossiersUsed: 0,
        customPricing: client.packPrice || null
      },
      stats: {
        totalDossiers: 0,
        dossiersEnCours: 0,
        dossiersFinalises: 0,
        lastActivityAt: now
      },
      status: client.status === "actif" ? "active" : (client.status || "active"),
      source: "migration",
      referredBy: null,
      _migratedFrom: "clients",
      _oldId: doc.id,
      createdAt: client.createdAt || now,
      updatedAt: now
    };
    
    await db.collection("installers").doc(doc.id).set(installerData);
    installerCount++;
    console.log(`  ✓ ${client.company || client.name || doc.id}`);
  }
  console.log(`  → ${installerCount} installateurs migrés\n`);
  
  // 2. Migrer files → projects
  console.log("2. Migration files → projects...");
  const filesSnap = await db.collection("files").get();
  let projectCount = 0;
  
  for (const doc of filesSnap.docs) {
    const file = doc.data();
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    // Vérifier si déjà migré
    const existingProject = await db.collection("projects").doc(doc.id).get();
    if (existingProject.exists) {
      console.log(`  - Skip ${doc.id} (déjà migré)`);
      continue;
    }
    
    // Parser clientFinal
    const clientFinalParts = (file.clientFinal || "").split(' ');
    
    const projectData = {
      reference: file.reference || `DOS-2025-${String(projectCount + 1).padStart(4, '0')}`,
      installerId: file.clientId || null,
      
      beneficiary: {
        type: "particulier",
        firstName: clientFinalParts[0] || "",
        lastName: clientFinalParts.slice(1).join(' ') || "",
        email: file.clientEmail || "",
        phone: "",
        address: {
          street: file.address || "",
          city: "",
          postalCode: ""
        }
      },
      
      installation: {
        type: "residentiel",
        power: parseFloat(file.power) || 0,
        panelsCount: 0,
        panelsBrand: "",
        inverterBrand: "",
        roofType: "",
        orientation: "",
        pdl: file.enedisPdL || "",
        consuelNumber: null
      },
      
      pack: (file.pack || file.packCode || "ESSENTIEL").toUpperCase(),
      packPrice: file.packPrice || file.price || 169,
      customServices: [],
      totalPrice: file.packPrice || file.price || 169,
      
      workflow: {
        dp: { 
          status: mapStatus(file.mairieStatus || file.dpStatus), 
          startedAt: file.mairieDepositDate ? new Date(file.mairieDepositDate) : null,
          completedAt: null, 
          blockedReason: null, 
          documents: [] 
        },
        consuel: { 
          status: mapStatus(file.consuelStatus), 
          startedAt: null,
          completedAt: null, 
          scheduledDate: file.consuelVisitDate || null,
          blockedReason: null, 
          documents: [] 
        },
        enedis: { 
          status: mapStatus(file.enedisStatus), 
          startedAt: null,
          completedAt: null, 
          raccordementType: null, 
          documents: [] 
        },
        edfOa: { 
          status: mapStatus(file.edfStatus), 
          startedAt: null,
          completedAt: null, 
          contractNumber: file.edfContractNumber || null, 
          documents: [] 
        }
      },
      
      status: mapProjectStatus(file.status),
      progress: 0,
      notes: file.notes || "",
      
      _migratedFrom: "files",
      _oldId: doc.id,
      createdAt: file.createdAt || now,
      updatedAt: now,
      completedAt: null
    };
    
    // Calculer progress
    const steps = ['dp', 'consuel', 'enedis', 'edfOa'];
    const completed = steps.filter(s => projectData.workflow[s].status === 'completed').length;
    projectData.progress = Math.round((completed / steps.length) * 100);
    
    await db.collection("projects").doc(doc.id).set(projectData);
    projectCount++;
    console.log(`  ✓ ${file.reference || doc.id}`);
  }
  console.log(`  → ${projectCount} projets migrés\n`);
  
  // 3. Mettre à jour les stats des installateurs
  console.log("3. Mise à jour stats installateurs...");
  const installersSnap = await db.collection("installers").get();
  
  for (const doc of installersSnap.docs) {
    const projectsSnap = await db.collection("projects").where("installerId", "==", doc.id).get();
    const projects = projectsSnap.docs.map(d => d.data());
    
    await db.collection("installers").doc(doc.id).update({
      "stats.totalDossiers": projects.length,
      "stats.dossiersEnCours": projects.filter(p => p.status === "in_progress").length,
      "stats.dossiersFinalises": projects.filter(p => p.status === "completed").length
    });
    console.log(`  ✓ ${doc.id}: ${projects.length} projets`);
  }
  
  console.log("\n=== MIGRATION TERMINÉE ===");
}

function mapStatus(oldStatus) {
  const mapping = {
    'a_faire': 'pending',
    'en_cours': 'in_progress',
    'depose': 'in_progress',
    'valide': 'completed',
    'finalise': 'completed',
    'bloque': 'blocked',
    'etude': 'in_progress'
  };
  return mapping[oldStatus] || 'pending';
}

function mapProjectStatus(oldStatus) {
  const mapping = {
    'en_cours': 'in_progress',
    'finalise': 'completed',
    'bloque': 'blocked',
    'annule': 'cancelled'
  };
  return mapping[oldStatus] || 'in_progress';
}

migrate().then(() => process.exit(0)).catch(err => {
  console.error("Erreur:", err);
  process.exit(1);
});
