import { isSignInWithEmailLink } from "firebase/auth";
import { auth } from "../../firebase";

const shouldShow = import.meta.env.VITE_DEBUG_FIREBASE === "true";

function truncate(val: string | null | undefined, max = 40) {
  if (!val) return "";
  return val.length > max ? `${val.slice(0, max)}…` : val;
}

export default function FirebaseDebugPanel() {
  if (!shouldShow) return null;
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const href = typeof window !== "undefined" ? window.location.href : "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY ?? "";
  const apiKeyPrefix = apiKey.slice(0, 6);
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "";
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "";

  const oobCode = params.get("oobCode");
  const mode = params.get("mode");
  const qpApiKey = params.get("apiKey");
  const continueUrl = params.get("continueUrl");

  const isLink = isSignInWithEmailLink(auth, href || "");

  return (
    <div
      style={{
        marginTop: 16,
        padding: 12,
        borderRadius: 8,
        border: "1px dashed #94a3b8",
        background: "rgba(148,163,184,0.08)",
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      <strong>Firebase Debug</strong>
      <div>href: {href}</div>
      <div>origin: {origin}</div>
      <div>authDomain: {authDomain}</div>
      <div>projectId: {projectId}</div>
      <div>apiKeyPrefix: {apiKeyPrefix}</div>
      <div>oobCode: {Boolean(oobCode)} {truncate(oobCode)}</div>
      <div>mode: {Boolean(mode)} {truncate(mode)}</div>
      <div>apiKey(qp): {Boolean(qpApiKey)} {truncate(qpApiKey)}</div>
      <div>continueUrl: {Boolean(continueUrl)} {truncate(continueUrl)}</div>
      <div>isSignInWithEmailLink: {String(isLink)}</div>
    </div>
  );
}
