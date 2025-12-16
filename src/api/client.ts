import axios from "axios";

export const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

const deriveWsUrl = () => {
  const explicit = (import.meta.env.VITE_API_WS_URL ?? "").replace(/\/+$/, "");
  if (explicit) return explicit;
  if (!API_URL) return "";
  if (API_URL.startsWith("https://")) return `wss://${API_URL.slice("https://".length)}`;
  if (API_URL.startsWith("http://")) return `ws://${API_URL.slice("http://".length)}`;
  return API_URL;
};

export const API_WS_URL = deriveWsUrl();

if (!API_URL) {
  throw new Error("VITE_API_URL manquante (doit pointer vers le service Cloud Run solaire-api)");
}

if (!API_WS_URL) {
  throw new Error("VITE_API_WS_URL manquante ou dérivation impossible");
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("firebaseToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.url && config.url.includes("/api/admin/")) {
    const adminKey = sessionStorage.getItem("ADMIN_API_KEY") || "";
    if (adminKey) {
      config.headers["X-ADMIN-KEY"] = adminKey;
    }
  }
  return config;
});
