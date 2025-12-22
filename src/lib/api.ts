import { auth } from "./firestore";

export const baseURL = import.meta.env.VITE_API_URL || "";
export const useProxy = import.meta.env.VITE_USE_CLOUDRUN_PROXY !== "false";

type ApiFetchOptions = {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
};

const normalizedBaseURL = baseURL.replace(/\/+$/, "");

const buildUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedBaseURL ? `${normalizedBaseURL}${normalizedPath}` : normalizedPath;
};

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const headers: Record<string, string> = { ...(options.headers || {}) };
  const apiToken = import.meta.env.VITE_API_TOKEN;
  if (apiToken) headers["X-Api-Token"] = apiToken;

  let body = options.body;
  if (body !== undefined && body !== null && typeof body === "object" && !(body instanceof FormData)) {
    const hasContentType = Object.keys(headers).some(
      (key) => key.toLowerCase() === "content-type"
    );
    if (!hasContentType) headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  const user = auth.currentUser;
  if (user) {
    const idToken = await user.getIdToken();
    headers.Authorization = `Bearer ${idToken}`;
  }

  try {
    const res = await fetch(buildUrl(path), {
      method: options.method || "GET",
      headers,
      body,
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`${res.status} ${text || res.statusText}`);
    }
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
