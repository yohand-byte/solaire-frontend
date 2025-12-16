import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const API_PROXY_PREFIX = process.env.API_PROXY_PREFIX || "/api";
const API_PROXY_TARGET = (process.env.API_PROXY_TARGET || process.env.VITE_API_URL || "https://solaire-api-29459740400.europe-west1.run.app").replace(/\/+$/, "");
const DIST_PATH = path.join(__dirname, "dist");

// Proxy /api/* calls to the dedicated API service (Cloud Run).
if (API_PROXY_TARGET) {
  app.use(
    API_PROXY_PREFIX,
    createProxyMiddleware({
      target: API_PROXY_TARGET,
      changeOrigin: true,
      xfwd: true,
      pathRewrite: (path) => (path.startsWith(API_PROXY_PREFIX) ? path : `${API_PROXY_PREFIX}${path}`),
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
