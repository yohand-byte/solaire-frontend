const admin = require("firebase-admin");
const serviceAccount = require("./api/firebase-service-account.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function cleanup() {
  console.log("=== PHASE 1 : NETTOYAGE ===\n");

  // 1. Garder seulement les 5 derniers leads
  console.log("1. Nettoyage leads (garder 5 derniers)...");
  const leadsSnap = await db.collection("leads").orderBy("createdAt", "desc").get();
  const allLeads = leadsSnap.docs;
  console.log(`   Total leads: ${allLeads.length}`);
  
  const toKeep = allLeads.slice(0, 5);
  const toDelete = allLeads.slice(5);
  
  for (const doc of toDelete) {
    await db.collection("leads").doc(doc.id).delete();
    console.log(`   ✗ Supprimé: ${doc.id}`);
  }
  console.log(`   → ${toKeep.length} leads conservés, ${toDelete.length} supprimés\n`);

  // 2. Normaliser les leads restants (ancienne structure → nouvelle)
  console.log("2. Normalisation structure leads...");
  for (const doc of toKeep) {
    const lead = doc.data();
    
    // Si ancienne structure (name, email, phone au lieu de contact)
    if (lead.name && !lead.contact) {
      const nameParts = (lead.name || "").split(" ");
      const updates = {
        contact: {
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          email: lead.email || "",
          phone: lead.phone || ""
        },
        status: lead.status === "converti" ? "converted" : (lead.status || "new"),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await db.collection("leads").doc(doc.id).update(updates);
      console.log(`   ✓ Normalisé: ${lead.company || lead.name}`);
    } else {
      console.log(`   - OK: ${lead.company || "?"}`);
    }
  }

  // 3. Recalculer stats installateurs
  console.log("\n3. Recalcul stats installateurs...");
  const installersSnap = await db.collection("installers").get();
  
  for (const doc of installersSnap.docs) {
    const installer = doc.data();
    const projectsSnap = await db.collection("projects").where("installerId", "==", doc.id).get();
    const projects = projectsSnap.docs.map(d => d.data());
    
    const stats = {
      totalDossiers: projects.length,
      dossiersEnCours: projects.filter(p => p.status === "in_progress").length,
      dossiersFinalises: projects.filter(p => p.status === "completed").length,
      lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection("installers").doc(doc.id).update({ stats });
    console.log(`   ✓ ${installer.company || doc.id}: ${stats.totalDossiers} dossiers`);
  }

  // 4. Nettoyer noms inappropriés dans projets
  console.log("\n4. Nettoyage noms inappropriés...");
  const projectsSnap = await db.collection("projects").get();
  const badWords = ["race", "merde", "putain", "con"];
  
  for (const doc of projectsSnap.docs) {
    const project = doc.data();
    const firstName = (project.beneficiary?.firstName || "").toLowerCase();
    const lastName = (project.beneficiary?.lastName || "").toLowerCase();
    
    if (badWords.some(w => firstName.includes(w) || lastName.includes(w))) {
      await db.collection("projects").doc(doc.id).update({
        "beneficiary.firstName": "Client",
        "beneficiary.lastName": "Test",
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`   ✓ Nettoyé: ${project.reference}`);
    }
  }

  console.log("\n=== NETTOYAGE TERMINÉ ===");
}

cleanup().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
