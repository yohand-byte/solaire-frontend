const API = "https://solaire-api-828508661560.europe-west1.run.app/api";
const TOKEN = "saftoken-123";

const headers = {
  "X-Api-Token": TOKEN,
  "Content-Type": "application/json"
};

async function fetchAPI(endpoint, options = {}) {
  const res = await fetch(`${API}${endpoint}`, { ...options, headers });
  return res.json();
}

async function deleteAll(collection) {
  const data = await fetchAPI(`/${collection}?limit=100`);
  const items = data.items || [];
  for (const item of items) {
    await fetch(`${API}/${collection}/${item.id}`, { method: "DELETE", headers });
  }
  return items.length;
}

async function main() {
  console.log("🧹 NETTOYAGE COMPLET...\n");

  // Supprimer dans l'ordre (projets d'abord car dépendants)
  let count = await deleteAll("documents");
  console.log(`   ✓ ${count} documents supprimés`);
  
  count = await deleteAll("projects");
  console.log(`   ✓ ${count} projets supprimés`);
  
  count = await deleteAll("installers");
  console.log(`   ✓ ${count} installateurs supprimés`);
  
  count = await deleteAll("leads");
  console.log(`   ✓ ${count} leads supprimés`);

  // ═══════════════════════════════════════════════════════════
  // LEADS (5)
  // ═══════════════════════════════════════════════════════════
  console.log("\n📝 CRÉATION DES LEADS...\n");
  
  const leads = [
    { company: "SOLAR PROVENCE", contact: { firstName: "Marc", lastName: "Dupont", email: "marc.dupont@solarprovence.fr", phone: "0601234567" }, pack: "PRO", source: "website", status: "new", notes: "Intéressé par pack Pro, rappeler lundi" },
    { company: "ECO ENERGIE SUD", contact: { firstName: "Sophie", lastName: "Martin", email: "sophie.martin@ecoenergie.fr", phone: "0612345678" }, pack: "SERENITE", source: "salon", status: "contacted", notes: "Rencontré au salon ENR Montpellier" },
    { company: "VOLTAIC OUEST", contact: { firstName: "Pierre", lastName: "Leroy", email: "pierre.leroy@voltaic-ouest.fr", phone: "0623456789" }, pack: "ESSENTIEL", source: "recommandation", status: "qualified", notes: "Recommandé par Bretagne Solar" },
    { company: "GREEN INSTALL 44", contact: { firstName: "Julie", lastName: "Bernard", email: "julie.bernard@greeninstall44.fr", phone: "0634567890" }, pack: "PRO", source: "google", status: "new", notes: "Demande via formulaire web" },
    { company: "PHOTON ENERGY", contact: { firstName: "Thomas", lastName: "Petit", email: "thomas.petit@photon-energy.fr", phone: "0645678901" }, pack: "SERENITE", source: "linkedin", status: "contacted", notes: "Contact LinkedIn, très motivé" },
  ];

  for (const lead of leads) {
    await fetchAPI("/leads", { method: "POST", body: JSON.stringify(lead) });
    console.log(`   ✓ Lead: ${lead.company}`);
  }

  // ═══════════════════════════════════════════════════════════
  // INSTALLATEURS (5)
  // ═══════════════════════════════════════════════════════════
  console.log("\n👷 CRÉATION DES INSTALLATEURS...\n");

  const installateurs = [
    { company: "SOLEIL DU SUD", siret: "12345678901234", contact: { firstName: "Jean", lastName: "Rousseau", email: "jean.rousseau@soleildusud.fr", phone: "0611111111" }, address: { street: "15 avenue du Prado", city: "Marseille", postalCode: "13008" }, subscription: { plan: "pro", dossiersIncluded: 15, startDate: "2024-01-15" }, status: "active" },
    { company: "BRETAGNE SOLAR", siret: "23456789012345", contact: { firstName: "Marie", lastName: "Le Gall", email: "marie.legall@bretagne-solar.fr", phone: "0622222222" }, address: { street: "8 rue de la Mer", city: "Rennes", postalCode: "35000" }, subscription: { plan: "serenite", dossiersIncluded: 30, startDate: "2024-03-01" }, status: "active" },
    { company: "ALPES ENERGIE", siret: "34567890123456", contact: { firstName: "Luc", lastName: "Montagne", email: "luc.montagne@alpes-energie.fr", phone: "0633333333" }, address: { street: "22 route des Cimes", city: "Grenoble", postalCode: "38000" }, subscription: { plan: "essentiel", dossiersIncluded: 5, startDate: "2024-06-01" }, status: "active" },
    { company: "NORMANDIE VERTE", siret: "45678901234567", contact: { firstName: "Claire", lastName: "Dubois", email: "claire.dubois@normandie-verte.fr", phone: "0644444444" }, address: { street: "5 place du Vieux Marché", city: "Rouen", postalCode: "76000" }, subscription: { plan: "pro", dossiersIncluded: 15, startDate: "2024-02-20" }, status: "active" },
    { company: "BORDEAUX SOLAIRE", siret: "56789012345678", contact: { firstName: "Antoine", lastName: "Vigne", email: "antoine.vigne@bordeaux-solaire.fr", phone: "0655555555" }, address: { street: "33 cours Victor Hugo", city: "Bordeaux", postalCode: "33000" }, subscription: { plan: "serenite", dossiersIncluded: 30, startDate: "2024-04-10" }, status: "active" },
  ];

  const installerIds = [];
  for (const inst of installateurs) {
    const res = await fetchAPI("/installers", { method: "POST", body: JSON.stringify(inst) });
    installerIds.push(res.id);
    console.log(`   ✓ Installateur: ${inst.company} (${res.id})`);
  }

  // ═══════════════════════════════════════════════════════════
  // PROJETS (5 par installateur = 25 total)
  // ═══════════════════════════════════════════════════════════
  console.log("\n📁 CRÉATION DES PROJETS (5 par installateur)...\n");

  const clients = [
    // Clients pour SOLEIL DU SUD (Marseille)
    [
      { firstName: "Paul", lastName: "Martin", city: "Aix-en-Provence", postalCode: "13100", street: "10 rue des Oliviers" },
      { firstName: "Émilie", lastName: "Fabre", city: "Aubagne", postalCode: "13400", street: "25 avenue de la Libération" },
      { firstName: "Jacques", lastName: "Roux", city: "Martigues", postalCode: "13500", street: "3 quai des Pêcheurs" },
      { firstName: "Nathalie", lastName: "Boyer", city: "Salon-de-Provence", postalCode: "13300", street: "17 boulevard Nostradamus" },
      { firstName: "Frédéric", lastName: "Girard", city: "Istres", postalCode: "13800", street: "42 rue de la République" },
    ],
    // Clients pour BRETAGNE SOLAR (Rennes)
    [
      { firstName: "Isabelle", lastName: "Kermarec", city: "Quimper", postalCode: "29000", street: "12 rue de Brest" },
      { firstName: "Yannick", lastName: "Le Bihan", city: "Vannes", postalCode: "56000", street: "8 place des Lices" },
      { firstName: "Gwenaëlle", lastName: "Morvan", city: "Lorient", postalCode: "56100", street: "31 rue du Port" },
      { firstName: "Erwan", lastName: "Tanguy", city: "Saint-Brieuc", postalCode: "22000", street: "5 rue Saint-Guillaume" },
      { firstName: "Solène", lastName: "Jaouen", city: "Brest", postalCode: "29200", street: "22 rue de Siam" },
    ],
    // Clients pour ALPES ENERGIE (Grenoble)
    [
      { firstName: "Michel", lastName: "Blanc", city: "Annecy", postalCode: "74000", street: "6 chemin des Fins" },
      { firstName: "Catherine", lastName: "Perrin", city: "Chambéry", postalCode: "73000", street: "14 place Saint-Léger" },
      { firstName: "Olivier", lastName: "Morel", city: "Valence", postalCode: "26000", street: "9 avenue Victor Hugo" },
      { firstName: "Sandrine", lastName: "Faure", city: "Gap", postalCode: "05000", street: "28 rue Carnot" },
      { firstName: "Thierry", lastName: "Reynaud", city: "Voiron", postalCode: "38500", street: "11 rue de la République" },
    ],
    // Clients pour NORMANDIE VERTE (Rouen)
    [
      { firstName: "Christine", lastName: "Lefevre", city: "Le Havre", postalCode: "76600", street: "18 avenue Foch" },
      { firstName: "Philippe", lastName: "Simon", city: "Caen", postalCode: "14000", street: "7 rue Saint-Pierre" },
      { firstName: "Véronique", lastName: "Laurent", city: "Évreux", postalCode: "27000", street: "33 rue de la Harpe" },
      { firstName: "Didier", lastName: "Michel", city: "Dieppe", postalCode: "76200", street: "2 quai Henri IV" },
      { firstName: "Martine", lastName: "Garnier", city: "Cherbourg", postalCode: "50100", street: "15 rue du Val de Saire" },
    ],
    // Clients pour BORDEAUX SOLAIRE (Bordeaux)
    [
      { firstName: "François", lastName: "Moreau", city: "Bordeaux", postalCode: "33000", street: "7 place des Chartrons" },
      { firstName: "Hélène", lastName: "Dupuy", city: "Arcachon", postalCode: "33120", street: "45 boulevard de la Plage" },
      { firstName: "Bruno", lastName: "Laporte", city: "Agen", postalCode: "47000", street: "12 rue des Cornières" },
      { firstName: "Sylvie", lastName: "Dumas", city: "Périgueux", postalCode: "24000", street: "8 place Francheville" },
      { firstName: "Alain", lastName: "Castex", city: "Pau", postalCode: "64000", street: "21 rue du Maréchal Joffre" },
    ],
  ];

  // Workflow progressions différentes
  const workflows = [
    { dp: { currentStep: "draft" }, consuel: { currentStep: "pending" }, enedis: { currentStep: "pending" }, edfOa: { currentStep: "pending" }, progress: 5 },
    { dp: { currentStep: "sent" }, consuel: { currentStep: "pending" }, enedis: { currentStep: "pending" }, edfOa: { currentStep: "pending" }, progress: 10 },
    { dp: { currentStep: "receipt" }, consuel: { currentStep: "preparing" }, enedis: { currentStep: "pending" }, edfOa: { currentStep: "pending" }, progress: 15 },
    { dp: { currentStep: "approved" }, consuel: { currentStep: "submitted" }, enedis: { currentStep: "pending" }, edfOa: { currentStep: "pending" }, progress: 25 },
    { dp: { currentStep: "approved" }, consuel: { currentStep: "waiting" }, enedis: { currentStep: "request_sent" }, edfOa: { currentStep: "pending" }, progress: 35 },
    { dp: { currentStep: "approved" }, consuel: { currentStep: "visit_scheduled" }, enedis: { currentStep: "request_sent" }, edfOa: { currentStep: "pending" }, progress: 40 },
    { dp: { currentStep: "approved" }, consuel: { currentStep: "visit_done" }, enedis: { currentStep: "request_approved" }, edfOa: { currentStep: "account_created" }, progress: 50 },
    { dp: { currentStep: "approved" }, consuel: { currentStep: "attestation_approved" }, enedis: { currentStep: "mes_scheduled" }, edfOa: { currentStep: "bta_received" }, progress: 60 },
    { dp: { currentStep: "approved" }, consuel: { currentStep: "attestation_approved" }, enedis: { currentStep: "mes_done" }, edfOa: { currentStep: "s21_sent" }, progress: 75 },
    { dp: { currentStep: "approved" }, consuel: { currentStep: "attestation_approved" }, enedis: { currentStep: "mes_done" }, edfOa: { currentStep: "contract_signed" }, progress: 100 },
  ];

  const packs = ["ESSENTIEL", "PRO", "SERENITE"];
  const packPrices = { ESSENTIEL: 169, PRO: 269, SERENITE: 449 };
  const panelBrands = ["Longi", "Jinko", "Trina", "SunPower", "REC"];
  const inverterBrands = ["Enphase", "Huawei", "SolarEdge", "Fronius", "SMA"];
  const roofTypes = ["tuile", "ardoise", "bac_acier", "tuile_mecanique"];

  let projectCount = 0;
  for (let i = 0; i < 5; i++) {
    const installerId = installerIds[i];
    const installerClients = clients[i];
    
    for (let j = 0; j < 5; j++) {
      const client = installerClients[j];
      const workflowIndex = (i + j) % 10; // Varier les progressions
      const wf = workflows[workflowIndex];
      const pack = packs[(i + j) % 3];
      const power = [3, 6, 9, 12][j % 4];
      
      const project = {
        installerId,
        beneficiary: {
          firstName: client.firstName,
          lastName: client.lastName,
          email: `${client.firstName.toLowerCase()}.${client.lastName.toLowerCase()}@email.com`,
          phone: `06${String(70 + projectCount).padStart(2, "0")}${String(projectCount).padStart(2, "0")}${String(projectCount).padStart(2, "0")}${String(projectCount).padStart(2, "0")}`,
          type: "particulier",
          address: { street: client.street, city: client.city, postalCode: client.postalCode }
        },
        installation: {
          power,
          panelsCount: power * 2.67 | 0,
          panelsBrand: panelBrands[j % 5],
          inverterBrand: inverterBrands[j % 5],
          roofType: roofTypes[j % 4],
          raccordementType: j % 2 === 0 ? "surplus" : "revente_totale",
          type: "residentiel"
        },
        pack,
        packPrice: packPrices[pack],
        workflow: { dp: wf.dp, consuel: wf.consuel, enedis: wf.enedis, edfOa: wf.edfOa },
        progress: wf.progress,
        status: wf.progress === 100 ? "completed" : "in_progress"
      };

      await fetchAPI("/projects", { method: "POST", body: JSON.stringify(project) });
      projectCount++;
    }
    console.log(`   ✓ 5 projets pour ${installateurs[i].company}`);
  }

  console.log("\n" + "═".repeat(50));
  console.log("✅ SEED TERMINÉ !");
  console.log("═".repeat(50));
  console.log(`   📝 5 Leads`);
  console.log(`   👷 5 Installateurs`);
  console.log(`   📁 25 Projets (5 par installateur)`);
  console.log(`   📊 Progressions variées: 5% → 100%`);
  console.log("═".repeat(50));
}

main().catch(console.error);
