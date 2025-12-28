const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();

// ═══════════════════════════════════════════════════════════
// FIREBASE INIT
// ═══════════════════════════════════════════════════════════
const serviceAccount = process.env.FIREBASE_CONFIG_B64
  ? JSON.parse(Buffer.from(process.env.FIREBASE_CONFIG_B64, "base64").toString())
  : process.env.FIREBASE_CONFIG
  ? JSON.parse(process.env.FIREBASE_CONFIG)
  : require("./firebase-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// ═══════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://yohand-byte.github.io",
    "https://solaire-frontend.web.app",
    "https://solaire-admin.web.app",
    "https://solaire-frontend-828508661560.europe-west1.run.app"
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-Api-Token", "X-ADMIN-KEY", "Authorization"]
}));
app.use(express.json());

// Auth middleware
const requireApiToken = (req, res, next) => {
  const token = req.headers["x-api-token"];
  if (token === process.env.API_TOKEN || token === "saftoken-123") return next();
  res.status(401).json({ error: "unauthorized" });
};

const requireAdminKey = (req, res, next) => {
  const key = req.headers["x-admin-key"];
  if (key === process.env.ADMIN_KEY || key === "admin-secret-key") return next();
  res.status(401).json({ error: "admin_required" });
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
const generateReference = async (prefix = "DOS") => {
  const year = new Date().getFullYear();
  const counterRef = db.collection("counters").doc("projects");
  
  return await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let currentNumber = 1;
    
    if (counterDoc.exists) {
      const data = counterDoc.data();
      if (data.year === year) {
        currentNumber = (data.lastNumber || 0) + 1;
      }
    }
    
    transaction.set(counterRef, { year, lastNumber: currentNumber });
    return `${prefix}-${year}-${String(currentNumber).padStart(4, "0")}`;
  });
};

const calculateProgress = (workflow) => {
  if (!workflow) return 0;
  const steps = ['dp', 'consuel', 'enedis', 'edfOa'];
  const completed = steps.filter(s => workflow[s]?.status === 'completed').length;
  return Math.round((completed / steps.length) * 100);
};

const logActivity = async (data) => {
  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.collection("activities").add({
    ...data,
    createdAt: now
  });
};

// ═══════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════
app.get("/health", (req, res) => res.json({ ok: true, version: "2.0.0" }));

// ═══════════════════════════════════════════════════════════
// INSTALLERS (nouvelle collection)
// ═══════════════════════════════════════════════════════════
app.get(["/installers", "/api/installers"], requireApiToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;
    
    let query = db.collection("installers").orderBy("createdAt", "desc");
    if (status) query = query.where("status", "==", status);
    
    const snap = await query.offset(offset).limit(limit).get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    res.json({ ok: true, items, total: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(["/installers/:id", "/api/installers/:id"], requireApiToken, async (req, res) => {
  try {
    const doc = await db.collection("installers").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "installer_not_found" });
    res.json({ ok: true, installer: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/installers", "/api/installers"], requireApiToken, async (req, res) => {
  try {
    const { company, legalName, siret, contact, address, subscription, status, source, referredBy } = req.body || {};
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const installerData = {
      company: company || "",
      legalName: legalName || company || "",
      siret: siret || "",
      contact: {
        firstName: contact?.firstName || "",
        lastName: contact?.lastName || "",
        email: contact?.email || "",
        phone: contact?.phone || ""
      },
      address: {
        street: address?.street || "",
        city: address?.city || "",
        postalCode: address?.postalCode || "",
        country: address?.country || "FR"
      },
      subscription: {
        plan: subscription?.plan || "essentiel",
        startDate: now,
        endDate: null,
        dossiersIncluded: subscription?.dossiersIncluded || 5,
        dossiersUsed: 0,
        customPricing: subscription?.customPricing || null
      },
      stats: {
        totalDossiers: 0,
        dossiersEnCours: 0,
        dossiersFinalises: 0,
        lastActivityAt: now
      },
      status: status || "active",
      source: source || "manual",
      referredBy: referredBy || null,
      createdAt: now,
      updatedAt: now
    };
    
    const ref = await db.collection("installers").add(installerData);
    
    await logActivity({
      installerId: ref.id,
      type: "installer_created",
      description: `Nouvel installateur: ${company}`
    });
    
    res.json({ ok: true, id: ref.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch(["/installers/:id", "/api/installers/:id"], requireApiToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const allowedFields = ['company', 'legalName', 'siret', 'contact', 'address', 'subscription', 'status', 'notes'];
    const updateData = { updatedAt: now };
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }
    
    await db.collection("installers").doc(id).update(updateData);
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(["/installers/:id/projects", "/api/installers/:id/projects"], requireApiToken, async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const status = req.query.status;
    
    let query = db.collection("projects").where("installerId", "==", id).orderBy("createdAt", "desc");
    if (status) query = query.where("status", "==", status);
    
    const snap = await query.limit(limit).get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    res.json({ ok: true, items, total: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(["/installers/:id/stats", "/api/installers/:id/stats"], requireApiToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [installerDoc, projectsSnap] = await Promise.all([
      db.collection("installers").doc(id).get(),
      db.collection("projects").where("installerId", "==", id).get()
    ]);
    
    if (!installerDoc.exists) return res.status(404).json({ error: "installer_not_found" });
    
    const projects = projectsSnap.docs.map(d => d.data());
    const stats = {
      totalDossiers: projects.length,
      dossiersEnCours: projects.filter(p => p.status === "in_progress").length,
      dossiersFinalises: projects.filter(p => p.status === "completed").length,
      dossiersBloqués: projects.filter(p => p.status === "blocked").length,
      revenueTotal: projects.reduce((sum, p) => sum + (parseFloat(p.packPrice) || 0), 0)
    };
    
    res.json({ ok: true, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// PROJECTS (ex-files/dossiers)
// ═══════════════════════════════════════════════════════════
app.get(["/projects", "/api/projects"], requireApiToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;
    const installerId = req.query.installerId;
    
    let query = db.collection("projects").orderBy("createdAt", "desc");
    if (status) query = query.where("status", "==", status);
    if (installerId) query = query.where("installerId", "==", installerId);
    
    const snap = await query.offset(offset).limit(limit).get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    res.json({ ok: true, items, total: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(["/projects/:id", "/api/projects/:id"], requireApiToken, async (req, res) => {
  try {
    const doc = await db.collection("projects").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "project_not_found" });
    res.json({ ok: true, project: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/projects", "/api/projects"], requireApiToken, async (req, res) => {
  try {
    const { installerId, beneficiary, installation, pack, packPrice, customServices, notes } = req.body || {};
    const now = admin.firestore.FieldValue.serverTimestamp();
    const reference = await generateReference("DOS");
    
    // Vérifier que l'installateur existe
    if (installerId) {
      const installerDoc = await db.collection("installers").doc(installerId).get();
      if (!installerDoc.exists) return res.status(400).json({ error: "installer_not_found" });
    }
    
    const projectData = {
      reference,
      installerId: installerId || null,
      
      beneficiary: {
        type: beneficiary?.type || "particulier",
        firstName: beneficiary?.firstName || "",
        lastName: beneficiary?.lastName || "",
        email: beneficiary?.email || "",
        phone: beneficiary?.phone || "",
        address: {
          street: beneficiary?.address?.street || "",
          city: beneficiary?.address?.city || "",
          postalCode: beneficiary?.address?.postalCode || ""
        }
      },
      
      installation: {
        type: installation?.type || "residentiel",
        power: installation?.power || 0,
        panelsCount: installation?.panelsCount || 0,
        panelPower: installation?.panelPower || 0,
        panelsBrand: installation?.panelsBrand || "",
        inverterBrand: installation?.inverterBrand || "",
        roofType: installation?.roofType || "",
        raccordementType: installation?.raccordementType || "",
        orientation: installation?.orientation || "",
        pdl: installation?.pdl || "",
        consuelNumber: installation?.consuelNumber || null
      },
      
      pack: pack || "ESSENTIEL",
      packPrice: packPrice || 169,
      customServices: customServices || [],
      totalPrice: packPrice || 169,
      
      workflow: {
        dp: { status: "pending", startedAt: null, completedAt: null, blockedReason: null, documents: [] },
        consuel: { status: "pending", startedAt: null, completedAt: null, scheduledDate: null, blockedReason: null, documents: [] },
        enedis: { status: "pending", startedAt: null, completedAt: null, raccordementType: null, documents: [] },
        edfOa: { status: "pending", startedAt: null, completedAt: null, contractNumber: null, documents: [] }
      },
      
      status: "in_progress",
      progress: 0,
      notes: notes || "",
      
      createdAt: now,
      updatedAt: now,
      completedAt: null
    };
    
    const ref = await db.collection("projects").add(projectData);
    
    // Mettre à jour les stats de l'installateur
    if (installerId) {
      await db.collection("installers").doc(installerId).update({
        "stats.totalDossiers": admin.firestore.FieldValue.increment(1),
        "stats.dossiersEnCours": admin.firestore.FieldValue.increment(1),
        "stats.lastActivityAt": now,
        "subscription.dossiersUsed": admin.firestore.FieldValue.increment(1),
        updatedAt: now
      });
    }
    
    await logActivity({
      projectId: ref.id,
      installerId,
      type: "project_created",
      description: `Nouveau projet: ${reference}`
    });
    
    res.json({ ok: true, id: ref.id, reference });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch(["/projects/:id", "/api/projects/:id"], requireApiToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const allowedFields = ['beneficiary', 'installation', 'pack', 'packPrice', 'customServices', 'totalPrice', 'status', 'notes'];
    const updateData = { updatedAt: now };
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }
    
    // Recalculer le progress si workflow modifié
    if (updates.workflow) {
      updateData.workflow = updates.workflow;
      updateData.progress = calculateProgress(updates.workflow);
    }
    
    // Si status passe à completed
    if (updates.status === "completed") {
      updateData.completedAt = now;
      
      // Mettre à jour stats installateur
      const projectDoc = await db.collection("projects").doc(id).get();
      if (projectDoc.exists) {
        const project = projectDoc.data();
        if (project.installerId) {
          await db.collection("installers").doc(project.installerId).update({
            "stats.dossiersEnCours": admin.firestore.FieldValue.increment(-1),
            "stats.dossiersFinalises": admin.firestore.FieldValue.increment(1),
            "stats.lastActivityAt": now
          });
        }
      }
    }
    
    await db.collection("projects").doc(id).update(updateData);
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mise à jour d'une étape du workflow
app.patch(["/projects/:id/workflow/:stage", "/api/projects/:id/workflow/:stage"], requireApiToken, async (req, res) => {
  try {
    const { id, stage } = req.params;
    const { step, notes, visitDate, mesDate, btaNumber, contractNumber } = req.body || {};
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const WORKFLOW_STEPS = {
      dp: ["pending", "draft", "sent", "receipt", "instruction", "approved", "rejected"],
      consuel: ["pending", "preparing", "submitted", "waiting", "visit_scheduled", "visit_done", "attestation_approved", "attestation_rejected"],
      enedis: ["pending", "request_sent", "request_approved", "mes_scheduled", "mes_done"],
      edfOa: ["pending", "account_created", "bta_received", "s21_sent", "s21_signed", "contract_received", "contract_signed"]
    };
    
    const FINAL_SUCCESS = { dp: "approved", consuel: "attestation_approved", enedis: "mes_done", edfOa: "contract_signed" };
    
    if (!WORKFLOW_STEPS[stage]) {
      return res.status(400).json({ error: "invalid_stage", valid: Object.keys(WORKFLOW_STEPS) });
    }
    
    if (step && !WORKFLOW_STEPS[stage].includes(step)) {
      return res.status(400).json({ error: "invalid_step", valid: WORKFLOW_STEPS[stage] });
    }
    
    const projectDoc = await db.collection("projects").doc(id).get();
    if (!projectDoc.exists) return res.status(404).json({ error: "project_not_found" });
    
    const project = projectDoc.data();
    const workflow = project.workflow || {};
    
    if (!workflow[stage]) {
      workflow[stage] = { currentStep: "pending", history: [], documents: [] };
    }
    
    const prevStep = workflow[stage].currentStep || "pending";
    const newStep = step || prevStep;
    
    workflow[stage].currentStep = newStep;
    workflow[stage].updatedAt = now;
    
    if (step && step !== prevStep) {
      workflow[stage].history = workflow[stage].history || [];
      workflow[stage].history.push({ from: prevStep, to: step, at: new Date().toISOString(), notes: notes || null });
    }
    
    if (stage === 'consuel' && visitDate) workflow[stage].visitDate = visitDate;
    if (stage === 'enedis' && mesDate) workflow[stage].mesDate = mesDate;
    if (stage === 'edfOa' && btaNumber) workflow[stage].btaNumber = btaNumber;
    if (stage === 'edfOa' && contractNumber) workflow[stage].contractNumber = contractNumber;
    if (notes) workflow[stage].notes = notes;
    
    if (newStep === "pending") {
      workflow[stage] = { currentStep: "pending", history: workflow[stage].history || [], documents: workflow[stage].documents || [] };
    }
    
    let completedStages = 0;
    Object.keys(FINAL_SUCCESS).forEach(s => {
      if (workflow[s]?.currentStep === FINAL_SUCCESS[s]) completedStages++;
    });
    const progress = Math.round((completedStages / 4) * 100);
    
    let projectStatus = "in_progress";
    if (progress === 100) projectStatus = "completed";
    else if (Object.values(workflow).some(w => w.currentStep?.includes("rejected"))) projectStatus = "blocked";
    
    await db.collection("projects").doc(id).update({ workflow, progress, status: projectStatus, updatedAt: now });
    
    if (project.installerId) {
      const projectsSnap = await db.collection("projects").where("installerId", "==", project.installerId).get();
      const projects = projectsSnap.docs.map(d => d.data());
      await db.collection("installers").doc(project.installerId).update({
        "stats.totalDossiers": projects.length,
        "stats.dossiersEnCours": projects.filter(p => p.status === "in_progress").length,
        "stats.dossiersFinalises": projects.filter(p => p.status === "completed").length,
        "stats.lastActivityAt": now
      });
    }
    
    res.json({ ok: true, stage, step: newStep, progress, status: projectStatus });
  } catch (err) {
    console.error("Workflow error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════════════════
app.get(["/projects/:id/documents", "/api/projects/:id/documents"], requireApiToken, async (req, res) => {
  try {
    const { id } = req.params;
    const snap = await db.collection("documents").where("projectId", "==", id).orderBy("uploadedAt", "desc").get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/projects/:id/documents", "/api/projects/:id/documents"], requireApiToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, size, url, category, uploadedBy } = req.body || {};
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const docData = {
      projectId: id,
      name: name || "document",
      type: type || "application/pdf",
      size: size || 0,
      url: url || "",
      category: category || "autre",
      uploadedBy: uploadedBy || "admin",
      uploadedAt: now
    };
    
    const ref = await db.collection("documents").add(docData);
    
    await logActivity({
      projectId: id,
      type: "document_uploaded",
      description: `Document ajouté: ${name}`
    });
    
    res.json({ ok: true, id: ref.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete(["/projects/:id/documents/:docId", "/api/projects/:id/documents/:docId"], requireApiToken, async (req, res) => {
  try {
    const { docId } = req.params;
    await db.collection("documents").doc(docId).delete();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// LEADS (enrichi)
// ═══════════════════════════════════════════════════════════
app.get(["/leads", "/api/leads"], requireApiToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;
    
    let query = db.collection("leads").orderBy("createdAt", "desc");
    if (status) query = query.where("status", "==", status);
    
    const snap = await query.offset(offset).limit(limit).get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    res.json({ ok: true, items, total: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/leads", "/api/leads"], async (req, res) => {
  try {
    const { company, contact, source, pack, estimatedVolume, notes } = req.body || {};
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    // Support ancien format (name, email, phone direct)
    const contactData = contact || {
      firstName: req.body.name?.split(' ')[0] || "",
      lastName: req.body.name?.split(' ').slice(1).join(' ') || "",
      email: req.body.email || "",
      phone: req.body.phone || ""
    };
    
    const leadData = {
      company: company || req.body.company || "",
      contact: {
        firstName: contactData.firstName || "",
        lastName: contactData.lastName || "",
        email: contactData.email || "",
        phone: contactData.phone || ""
      },
      source: source || req.body.source || "landing",
      pack: pack || req.body.pack || req.body.packCode || "",
      packPrice: req.body.packPrice || null,
      estimatedVolume: estimatedVolume || "",
      status: "new",
      score: 50,
      lostReason: null,
      convertedAt: null,
      installerId: null,
      nextFollowUp: null,
      notes: notes || "",
      createdAt: now,
      updatedAt: now
    };
    
    const ref = await db.collection("leads").add(leadData);
    res.json({ ok: true, id: ref.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch(["/leads/:id", "/api/leads/:id"], requireApiToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const allowedFields = ['company', 'contact', 'source', 'pack', 'estimatedVolume', 'status', 'score', 'lostReason', 'nextFollowUp', 'notes'];
    const updateData = { updatedAt: now };
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }
    
    await db.collection("leads").doc(id).update(updateData);
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/leads/:id/convert", "/api/leads/:id/convert"], requireApiToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { subscription } = req.body || {};
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const leadDoc = await db.collection("leads").doc(id).get();
    if (!leadDoc.exists) return res.status(404).json({ error: "lead_not_found" });
    
    const lead = leadDoc.data();
    if (lead.installerId) return res.status(409).json({ error: "lead_already_converted" });
    
    // Créer l'installateur
    const installerData = {
      company: lead.company || "",
      legalName: lead.company || "",
      siret: "",
      contact: lead.contact || {},
      address: { street: "", city: "", postalCode: "", country: "FR" },
      subscription: {
        plan: subscription?.plan || lead.pack?.toLowerCase() || "essentiel",
        startDate: now,
        endDate: null,
        dossiersIncluded: subscription?.dossiersIncluded || 5,
        dossiersUsed: 0,
        customPricing: null
      },
      stats: {
        totalDossiers: 0,
        dossiersEnCours: 0,
        dossiersFinalises: 0,
        lastActivityAt: now
      },
      status: "active",
      source: lead.source || "landing",
      referredBy: null,
      createdAt: now,
      updatedAt: now
    };
    
    const installerRef = await db.collection("installers").add(installerData);
    
    // Mettre à jour le lead
    const previousStatus = lead.status || "new";
    await db.collection("leads").doc(id).update({
      status: "converted",
      statusBeforeConversion: previousStatus,
      installerId: installerRef.id,
      convertedAt: now,
      updatedAt: now
    });
    
    await logActivity({
      leadId: id,
      installerId: installerRef.id,
      type: "lead_converted",
      description: `Lead converti: ${lead.company}`
    });
    
    res.json({ ok: true, installerId: installerRef.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/leads/:id/undo-convert", "/api/leads/:id/undo-convert"], requireApiToken, async (req, res) => {
  try {
    const { id } = req.params;
    const now = admin.firestore.FieldValue.serverTimestamp();

    const leadDoc = await db.collection("leads").doc(id).get();
    if (!leadDoc.exists) return res.status(404).json({ error: "lead_not_found" });

    const lead = leadDoc.data();
    if (!lead.installerId) return res.status(409).json({ error: "lead_not_converted" });

    const projectsSnap = await db.collection("projects")
      .where("installerId", "==", lead.installerId)
      .limit(1)
      .get();
    if (!projectsSnap.empty) {
      return res.status(409).json({ error: "installer_has_projects" });
    }

    await db.collection("installers").doc(lead.installerId).delete();

    const nextStatus = lead.statusBeforeConversion || "new";
    await db.collection("leads").doc(id).update({
      status: nextStatus,
      statusBeforeConversion: admin.firestore.FieldValue.delete(),
      installerId: null,
      convertedAt: null,
      updatedAt: now
    });

    await logActivity({
      leadId: id,
      type: "lead_unconverted",
      description: `Conversion annulee: ${lead.company || id}`
    });

    res.json({ ok: true, status: nextStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// ACTIVITIES
// ═══════════════════════════════════════════════════════════
app.get(["/activities", "/api/activities"], requireApiToken, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const snap = await db.collection("activities").orderBy("createdAt", "desc").limit(limit).get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(["/projects/:id/activities", "/api/projects/:id/activities"], requireApiToken, async (req, res) => {
  try {
    const { id } = req.params;
    const snap = await db.collection("activities").where("projectId", "==", id).orderBy("createdAt", "desc").get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ ok: true, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// DASHBOARD / STATS
// ═══════════════════════════════════════════════════════════
app.get(["/stats", "/api/stats"], requireApiToken, async (req, res) => {
  try {
    const [leadsSnap, installersSnap, projectsSnap] = await Promise.all([
      db.collection("leads").count().get(),
      db.collection("installers").count().get(),
      db.collection("projects").count().get()
    ]);
    
    res.json({
      ok: true,
      leads: { total: leadsSnap.data().count },
      installers: { total: installersSnap.data().count },
      projects: { total: projectsSnap.data().count }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(["/dashboard", "/api/dashboard"], requireApiToken, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const [leadsSnap, installersSnap, projectsSnap, projectsThisMonthSnap] = await Promise.all([
      db.collection("leads").where("status", "==", "new").get(),
      db.collection("installers").where("status", "==", "active").get(),
      db.collection("projects").get(),
      db.collection("projects").where("createdAt", ">=", startOfMonth).get()
    ]);
    
    const projects = projectsSnap.docs.map(d => d.data());
    const projectsThisMonth = projectsThisMonthSnap.docs.map(d => d.data());
    
    // Pipeline stats
    const pipeline = {
      dp: projects.filter(p => p.workflow?.dp?.status === "in_progress").length,
      consuel: projects.filter(p => p.workflow?.consuel?.status === "in_progress").length,
      enedis: projects.filter(p => p.workflow?.enedis?.status === "in_progress").length,
      edfOa: projects.filter(p => p.workflow?.edfOa?.status === "in_progress").length,
      completed: projects.filter(p => p.status === "completed").length
    };
    
    // Revenue
    const revenueThisMonth = projectsThisMonth.reduce((sum, p) => sum + (parseFloat(p.packPrice) || 0), 0);
    
    res.json({
      ok: true,
      kpis: {
        newLeads: leadsSnap.size,
        activeInstallers: installersSnap.size,
        totalProjects: projects.length,
        projectsInProgress: projects.filter(p => p.status === "in_progress").length,
        projectsBlocked: projects.filter(p => p.status === "blocked").length,
        revenueThisMonth
      },
      pipeline,
      recentProjects: projects.slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY (anciennes routes)
// ═══════════════════════════════════════════════════════════
// Rediriger /clients vers /installers
app.get(["/clients", "/api/clients"], requireApiToken, async (req, res) => {
  // Retourner les installers pour compatibilité
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const snap = await db.collection("installers").orderBy("createdAt", "desc").limit(limit).get();
  const items = snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: data.contact?.firstName + " " + data.contact?.lastName,
      company: data.company,
      email: data.contact?.email,
      phone: data.contact?.phone,
      pack: data.subscription?.plan?.toUpperCase(),
      status: data.status,
      createdAt: data.createdAt
    };
  });
  res.json({ ok: true, items, total: items.length });
});

// Rediriger /files vers /projects
app.get(["/files", "/api/files"], requireApiToken, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const snap = await db.collection("projects").orderBy("createdAt", "desc").limit(limit).get();
  const items = snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      reference: data.reference,
      clientId: data.installerId,
      clientFinal: `${data.beneficiary?.firstName || ""} ${data.beneficiary?.lastName || ""}`.trim(),
      clientEmail: data.beneficiary?.email,
      title: `Dossier ${data.beneficiary?.lastName || data.reference}`,
      pack: data.pack,
      packPrice: data.packPrice,
      status: data.status,
      address: data.beneficiary?.address?.street,
      power: data.installation?.power,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  });
  res.json({ ok: true, items, total: items.length });
});

// ═══════════════════════════════════════════════════════════
// GET workflow config
app.get(["/workflow-config", "/api/workflow-config"], (req, res) => {
  res.json({
    dp: {
      label: "DP Mairie",
      steps: [
        { code: "pending", label: "Non démarré" },
        { code: "draft", label: "En préparation" },
        { code: "sent", label: "Dossier envoyé" },
        { code: "receipt", label: "Récépissé reçu" },
        { code: "instruction", label: "En instruction" },
        { code: "approved", label: "Validé", final: true, success: true },
        { code: "rejected", label: "Refusé", final: true, success: false }
      ]
    },
    consuel: {
      label: "Consuel",
      steps: [
        { code: "pending", label: "Non démarré" },
        { code: "preparing", label: "Préparation dossier" },
        { code: "submitted", label: "Déposé" },
        { code: "waiting", label: "En attente retour" },
        { code: "visit_scheduled", label: "Visite programmée" },
        { code: "visit_done", label: "Visite effectuée" },
        { code: "attestation_approved", label: "Attestation visée", final: true, success: true },
        { code: "attestation_rejected", label: "Attestation non visée", final: true, success: false }
      ]
    },
    enedis: {
      label: "Enedis",
      steps: [
        { code: "pending", label: "Non démarré" },
        { code: "request_sent", label: "Demande de raccordement envoyée" },
        { code: "request_approved", label: "Demande de raccordement validée" },
        { code: "mes_scheduled", label: "MES programmée" },
        { code: "mes_done", label: "MES effectuée", final: true, success: true }
      ]
    },
    edfOa: {
      label: "EDF OA",
      steps: [
        { code: "pending", label: "Non démarré" },
        { code: "account_created", label: "Compte producteur créé" },
        { code: "bta_received", label: "Numéro BTA reçu" },
        { code: "s21_sent", label: "Attestation S21 envoyée" },
        { code: "s21_signed", label: "Contrat S21 rempli et signé" },
        { code: "contract_received", label: "Contrat EDF OA reçu" },
        { code: "contract_signed", label: "Contrat EDF OA signé", final: true, success: true }
      ]
    }
  });
});

// GET workflow config
app.get(["/workflow-config", "/api/workflow-config"], (req, res) => {
  res.json({
    dp: {
      label: "DP Mairie",
      steps: [
        { code: "pending", label: "Non démarré" },
        { code: "draft", label: "En préparation" },
        { code: "sent", label: "Dossier envoyé" },
        { code: "receipt", label: "Récépissé reçu" },
        { code: "instruction", label: "En instruction" },
        { code: "approved", label: "Validé", final: true, success: true },
        { code: "rejected", label: "Refusé", final: true, success: false }
      ]
    },
    consuel: {
      label: "Consuel",
      steps: [
        { code: "pending", label: "Non démarré" },
        { code: "preparing", label: "Préparation dossier" },
        { code: "submitted", label: "Déposé" },
        { code: "waiting", label: "En attente retour" },
        { code: "visit_scheduled", label: "Visite programmée" },
        { code: "visit_done", label: "Visite effectuée" },
        { code: "attestation_approved", label: "Attestation visée", final: true, success: true },
        { code: "attestation_rejected", label: "Attestation non visée", final: true, success: false }
      ]
    },
    enedis: {
      label: "Enedis",
      steps: [
        { code: "pending", label: "Non démarré" },
        { code: "request_sent", label: "Demande raccordement envoyée" },
        { code: "request_approved", label: "Demande raccordement validée" },
        { code: "mes_scheduled", label: "MES programmée" },
        { code: "mes_done", label: "MES effectuée", final: true, success: true }
      ]
    },
    edfOa: {
      label: "EDF OA",
      steps: [
        { code: "pending", label: "Non démarré" },
        { code: "account_created", label: "Compte producteur créé" },
        { code: "bta_received", label: "Numéro BTA reçu" },
        { code: "s21_sent", label: "Attestation S21 envoyée" },
        { code: "s21_signed", label: "Contrat S21 signé" },
        { code: "contract_received", label: "Contrat EDF OA reçu" },
        { code: "contract_signed", label: "Contrat EDF OA signé", final: true, success: true }
      ]
    }
  });
});

// ═══════════════════════════════════════════════════════════
// DOCUMENTS & UPLOAD
// ═══════════════════════════════════════════════════════════

const { Storage } = require('@google-cloud/storage');
const Busboy = require('busboy');
const path = require('path');

const storage = new Storage();
const BUCKET_NAME = 'solaire-facile-documents';


// ═══════════════════════════════════════════════════════════
// DOCUMENTS & UPLOAD
// ═══════════════════════════════════════════════════════════

// Upload document
app.post(["/documents/upload", "/api/documents/upload"], requireApiToken, (req, res) => {
  const busboy = Busboy({ headers: req.headers });
  const uploads = [];
  
  let projectId = '';
  let stage = '';
  let category = 'autre';
  
  busboy.on('field', (name, val) => {
    if (name === 'projectId') projectId = val;
    if (name === 'stage') stage = val;
    if (name === 'category') category = val;
  });
  
  busboy.on('file', (name, file, info) => {
    const { filename, mimeType } = info;
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    
    if (!allowedTypes.includes(mimeType)) {
      file.resume();
      return;
    }
    
    const ext = path.extname(filename);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
    const stagePath = stage || 'misc';
    const filePath = `documents/${projectId || 'general'}/${stagePath}/${uniqueName}`;
    
    const bucket = storage.bucket(BUCKET_NAME);
    const blob = bucket.file(filePath);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: mimeType,
      metadata: { metadata: { originalName: filename, category, projectId, stage } }
    });
    
    const chunks = [];
    file.on('data', (chunk) => chunks.push(chunk));
    file.on('end', () => {
      const buffer = Buffer.concat(chunks);
      blobStream.end(buffer);
    });
    
    uploads.push(new Promise((resolve, reject) => {
      blobStream.on('error', reject);
      blobStream.on('finish', async () => {
        await blob.makePublic();
        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filePath}`;
        resolve({
          filename,
          uniqueName,
          filePath,
          mimeType,
          size: chunks.reduce((acc, c) => acc + c.length, 0),
          url: publicUrl,
          category,
          projectId,
          stage
        });
      });
    }));
  });
  
  busboy.on('finish', async () => {
    try {
      const results = await Promise.all(uploads);
      const now = admin.firestore.FieldValue.serverTimestamp();
      
      const docs = [];
      for (const file of results) {
        const docRef = await db.collection('documents').add({
          ...file,
          createdAt: now,
          updatedAt: now
        });
        docs.push({ id: docRef.id, ...file });
      }
      
      res.json({ ok: true, documents: docs });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message });
    }
  });
  
  req.pipe(busboy);
});

// List documents (with projectId and stage filters)
app.get(["/documents", "/api/documents"], requireApiToken, async (req, res) => {
  try {
    const { projectId, stage, category, limit = 100 } = req.query;
    let query = db.collection('documents').orderBy('createdAt', 'desc');
    
    if (projectId) query = query.where('projectId', '==', projectId);
    if (stage) query = query.where('stage', '==', stage);
    if (category && category !== 'all') query = query.where('category', '==', category);
    
    const snap = await query.limit(parseInt(limit)).get();
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ ok: true, items, total: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete document
app.delete(["/documents/:id", "/api/documents/:id"], requireApiToken, async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection('documents').doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) return res.status(404).json({ error: 'not_found' });
    
    const data = doc.data();
    
    if (data.filePath) {
      try {
        await storage.bucket(BUCKET_NAME).file(data.filePath).delete();
      } catch (e) {
        console.warn('Storage delete failed:', e.message);
      }
    }
    
    await docRef.delete();
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════
// SERVER START
// ═══════════════════════════════════════════════════════════

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`API v2.0 running on port ${PORT}`);
});

// Save document metadata (après upload Firebase Storage direct)
app.post(["/documents/metadata", "/api/documents/metadata"], requireApiToken, async (req, res) => {
  try {
    const { filename, url, filePath, mimeType, size, projectId, stage, category } = req.body;
    
    if (!url || !projectId || !stage) {
      return res.status(400).json({ error: "missing_fields", required: ["url", "projectId", "stage"] });
    }
    
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const docRef = await db.collection('documents').add({
      filename: filename || 'document',
      url,
      filePath: filePath || '',
      mimeType: mimeType || 'application/octet-stream',
      size: size || 0,
      projectId,
      stage,
      category: category || stage,
      createdAt: now,
      updatedAt: now
    });
    
    res.json({ ok: true, id: docRef.id });
  } catch (err) {
    console.error('Metadata save error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete project
app.delete(["/projects/:id", "/api/projects/:id"], requireApiToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('projects').doc(id).delete();
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete installer
app.delete(["/installers/:id", "/api/installers/:id"], requireApiToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('installers').doc(id).delete();
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete lead
app.delete(["/leads/:id", "/api/leads/:id"], requireApiToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('leads').doc(id).delete();
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
