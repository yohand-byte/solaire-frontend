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

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`core-api listening on ${port}`));
