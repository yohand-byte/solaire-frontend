import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";
import admin from "firebase-admin";

dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();
const firebaseAuth = admin.auth();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const API_PROXY_PREFIX = process.env.API_PROXY_PREFIX || "/api";
const API_PROXY_TARGET = (process.env.API_PROXY_TARGET || process.env.VITE_API_URL || "https://solaire-api-29459740400.europe-west1.run.app").replace(/\/+$/, "");
const DIST_PATH = path.join(__dirname, "dist");

const API_ALLOWED_ORIGINS = new Set([
  "https://solaire-frontend.web.app",
  "https://solaire-frontend.firebaseapp.com",
  "http://localhost:5173",
]);

const apiCors = (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !API_ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({ error: "origin_not_allowed" });
  }
  if (origin && API_ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Api-Token");
  }
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  return next();
};

app.use("/api", apiCors);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV === "production" ? "production" : "dev" });
});

app.post("/api/leads", express.json({ limit: "1mb" }), async (req, res) => {
  if (process.env.DISABLE_API_PROXY === "true") {
    return res.status(503).json({ message: "disabled" });
  }

  const authHeader = req.header("Authorization") || "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
  if (!tokenMatch) {
    return res.status(401).json({ error: "missing_token" });
  }

  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(tokenMatch[1]);
  } catch (_err) {
    return res.status(401).json({ error: "invalid_token" });
  }

  const apiToken = process.env.API_TOKEN;
  if (apiToken) {
    const providedToken = req.header("X-Api-Token");
    if (!providedToken || providedToken !== apiToken) {
      return res.status(401).json({ error: "invalid_api_token" });
    }
  }

  const { name, email, phone, source, utm } = req.body || {};
  const payload = {
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    uid: decoded.uid,
    name: name || "",
    email: email || "",
    phone: phone || "",
    source: source || "",
  };
  if (utm !== undefined) {
    payload.utm = utm;
  }

  try {
    const ref = await db.collection("leads").add(payload);
    return res.json({ ok: true, id: ref.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Proxy /api/* calls to the dedicated API service (Cloud Run).
if (API_PROXY_TARGET) {
  app.use(
    API_PROXY_PREFIX,
    createProxyMiddleware({
      target: API_PROXY_TARGET,
      changeOrigin: true,
      xfwd: true,
      pathRewrite: (path) => {
        // Strip the /api prefix so /api/leads -> /leads on the target service
        return path.replace(new RegExp(`^${API_PROXY_PREFIX}`), "") || "/";
      },
      logLevel: process.env.NODE_ENV === "production" ? "warn" : "info",
    }),
  );
}

app.get("/health", (_req, res) => res.status(200).send("ok"));
app.use(express.static(DIST_PATH));

// SPA fallback for non-API routes
app.get("*", (req, res, next) => {
  if (req.path.startsWith(API_PROXY_PREFIX)) return next();
  return res.sendFile(path.join(DIST_PATH, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Frontend running on port ${PORT}`);
  console.log(`Proxying ${API_PROXY_PREFIX} -> ${API_PROXY_TARGET || "disabled"}`);
});
