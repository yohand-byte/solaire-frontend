import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../lib/firestore";
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { routeAfterLogin } from "../routing/afterLogin";

export default function ClientLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [isEmailLink, setIsEmailLink] = useState(false);

  // Si on arrive via le magic link
  useEffect(() => {
    const url = window.location.href;
    const link = isSignInWithEmailLink(auth, url);
    setIsEmailLink(link);
    if (link) {
      const storedEmail = window.localStorage.getItem("emailForSignIn") || "";
      if (!storedEmail) {
        setNeedsEmail(true);
      } else {
        setEmail(storedEmail);
        completeSignIn(storedEmail, url);
      }
    } else {
      setInfo("Un lien de connexion a été envoyé par email. Ouvre-le sur ce même appareil.");
    }
  }, [navigate]);

  const completeSignIn = async (emailToUse: string, link: string) => {
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithEmailLink(auth, emailToUse, link);
      window.localStorage.removeItem("emailForSignIn");
      window.history.replaceState({}, document.title, "/client/login");
      await routeAfterLogin(cred.user, navigate);
    } catch (err: any) {
      if (err?.code === "auth/invalid-email") {
        setError("Cet email ne correspond pas au lien. Utilise le même email que celui qui a reçu le message.");
      } else {
        setError(err?.message || "Lien invalide ou expiré.");
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (isEmailLink) {
      if (!email) {
        setError("Email requis pour valider le lien.");
        return;
      }
      await completeSignIn(email, window.location.href);
    } else {
      if (email) {
        window.localStorage.setItem("emailForSignIn", email);
        setInfo("Email enregistré pour ouvrir le lien sur cet appareil.");
      } else {
        setInfo("Aucun email saisi. Ouvrez simplement le lien reçu sur cet appareil.");
      }
    }
  };

  return (
    <div className="card" style={{ maxWidth: 440, margin: "0 auto", padding: 28 }}>
      <h2 style={{ marginBottom: 8 }}>Espace Installateur</h2>
      <p style={{ marginBottom: 16, color: "#9ca3af" }}>
        Connexion sans mot de passe. Lien sécurisé Firebase — aucun secret exposé.
      </p>
      <form onSubmit={onSubmit} className="form" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 600 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required={needsEmail}
            style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", color: "#111" }}
          />
        </div>
        {error && <div className="error" style={{ color: "#ef4444" }}>{error}</div>}
        {info && <div className="info" style={{ color: "#22c55e" }}>{info}</div>}
        <button
          className="btn-primary"
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: loading ? "#f59e0bcc" : "#f59e0b",
            color: "#0d1117",
            fontWeight: 700,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Traitement..." : isEmailLink ? "Valider le lien" : "Enregistrer mon email"}
        </button>
      </form>
      <p style={{ marginTop: 12, color: "#9ca3af", fontSize: 12 }}>
        Utilisez le lien reçu pour vous connecter. Gardez cet onglet ouvert, l’URL de connexion reste confidentielle.
      </p>
    </div>
  );
}
