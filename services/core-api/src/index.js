import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import fs from "fs";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

const resolveProjectId = () => {
  const direct =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.PROJECT_ID ||
    "";
  if (direct) return direct;

  const raw = process.env.FIREBASE_CONFIG || "";
  if (!raw) return "";

  try {
    const trimmed = raw.trim();
    const json =
      trimmed.startsWith("{")
        ? JSON.parse(trimmed)
        : JSON.parse(fs.readFileSync(trimmed, "utf8"));
    return json?.projectId || json?.project_id || "";
  } catch (err) {
    console.error("[core-api] failed to parse FIREBASE_CONFIG", { err: err.message });
    return "";
  }
};

if (!admin.apps.length) {
  const projectId = resolveProjectId();
  if (!projectId) {
    console.error("[core-api] missing projectId for Firebase Admin");
  } else {
    console.log("[core-api] firebase-admin projectId", projectId);
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  }
}

function bearer(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

async function auth(req, res, next) {
  try {
    const token = bearer(req);
    if (!token) return res.status(401).json({ error: "missing_bearer" });
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

function requireAdmin(req, res, next) {
  const role = req.user?.role;
  if (role === "admin" || role === "operator") return next();
  return res.status(403).json({ error: "forbidden" });
}

function requireInstaller(req, res, next) {
  const role = req.user?.role;
  if (role === "installer") return next();
  return res.status(403).json({ error: "forbidden" });
}

function getDb() {
  if (!admin.apps.length) {
    throw new Error("firebase_admin_not_initialized");
  }
  return admin.firestore();
}

function normalizeEmail(value) {
  if (!value) return "";
  return String(value).trim().toLowerCase();
}


app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/me", auth, (req, res) => {
  const { uid, email, role, installerId } = req.user || {};
  res.json({ uid, email, role, installerId });
});

// Admin-only: set claims (role + installerId) on a user (used after inviting via Magic Link)
app.post("/api/admin/set-claims", auth, requireAdmin, async (req, res) => {
  const { uid, role, installerId } = req.body || {};
  if (!uid || !role) return res.status(400).json({ error: "missing_uid_or_role" });

  const allowed = ["admin", "operator", "installer"];
  if (!allowed.includes(role)) return res.status(400).json({ error: "invalid_role" });

  const claims = { role };
  if (role === "installer") {
    if (!installerId) return res.status(400).json({ error: "missing_installerId" });
    claims.installerId = installerId;
  }

  await admin.auth().setCustomUserClaims(uid, claims);
  res.json({ ok: true, uid, claims });
});

// Installer-only: example write via API (recommended instead of broad Firestore writes)
app.post("/api/installer/ping", auth, requireInstaller, async (req, res) => {
  res.json({ ok: true, installerId: req.user?.installerId || null });
});


// Admin-only: approve a lead, create/merge client, link lead
app.post("/api/leads/:id/approve", auth, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const leadId = req.params.id;
    if (!leadId) return res.status(400).json({ error: "missing_lead_id" });

    const leadRef = db.collection("leads").doc(leadId);
    const leadSnap = await leadRef.get();
    if (!leadSnap.exists) return res.status(404).json({ error: "lead_not_found" });

    const lead = leadSnap.data() || {};
    const email = normalizeEmail(lead.email || req.body?.email || "");
    const name = lead.name || req.body?.name || null;
    const phone = lead.phone || req.body?.phone || null;
    const source = lead.source || req.body?.source || null;

    const clientRef = lead.clientId
      ? db.collection("clients").doc(lead.clientId)
      : db.collection("clients").doc();
    const clientId = clientRef.id;

    await clientRef.set(
      {
        email: email || null,
        name,
        phone,
        source,
        lead_id: leadId,
        status: "active",
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await leadRef.set(
      {
        status: "approved",
        clientId,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    res.json({ ok: true, leadId, clientId });
  } catch (err) {
    console.error("[api] approve lead failed", err);
    res.status(500).json({ error: "approve_failed" });
  }
});

// Admin-only: lookup client by email
app.get("/api/clients", auth, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const email = normalizeEmail(req.query?.email);
    if (!email) return res.status(400).json({ error: "missing_email" });

    const snap = await db.collection("clients").where("email", "==", email).limit(1).get();
    const doc = snap.docs[0];
    if (!doc) return res.status(404).json({ error: "client_not_found" });

    res.json({ ok: true, clientId: doc.id, client: doc.data() });
  } catch (err) {
    console.error("[api] lookup client failed", err);
    res.status(500).json({ error: "lookup_failed" });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`core-api listening on ${port}`));
