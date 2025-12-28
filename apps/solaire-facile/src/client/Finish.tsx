import React from "react";
import { useNavigate } from "react-router-dom";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { auth } from "../lib/firestore";
import ThemeToggle from "../components/ThemeToggle";
import LiveBadge from "../components/LiveBadge";

const API_BASE = "https://solaire-api-828508661560.europe-west1.run.app";
const API_TOKEN = "saftoken-123";
const EMAIL_KEY = "sf_client_email";

const fetchJson = async (endpoint: string) => {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "X-Api-Token": API_TOKEN },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || `Erreur API (${res.status})`);
  }
  return body;
};

export default function ClientFinish() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [info, setInfo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const link = React.useMemo(() => window.location.href, []);
  const isValidLink = React.useMemo(() => isSignInWithEmailLink(auth, link), [link]);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(EMAIL_KEY) || "";
      if (saved) setEmail(saved);
    } catch {}
  }, []);

  const finalize = async (inputEmail: string) => {
    setLoading(true);
    setError(null);
    setInfo("Validation du lien…");
    try {
      const normalized = inputEmail.trim().toLowerCase();
      await signInWithEmailLink(auth, normalized, link);

      const data = await fetchJson("/api/installers?limit=200");
      const installers = data.items || [];
      const match = installers.find((installer: any) =>
        (installer.contact?.email || "").toLowerCase() === normalized
      );

      if (!match) {
        setError("Email introuvable. Contactez Solaire Facile.");
        setInfo(null);
        return;
      }

      try {
        localStorage.setItem("installerId", match.id);
        localStorage.setItem("installerEmail", match.contact?.email || normalized);
        localStorage.removeItem(EMAIL_KEY);
      } catch {}

      navigate("/client", { replace: true });
    } catch (e: any) {
      setError(e?.message ?? "Impossible de valider le lien.");
      setInfo(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!isValidLink) return;
    const saved = email.trim();
    if (!saved) return;
    finalize(saved);
  }, [isValidLink, email]);

  return (
    <div className="page">
      <div className="topbar">
        <div className="brand">
          <div className="logo">SF</div>
          <div>
            <div className="brand-title">Solaire Facile</div>
            <div className="brand-sub">Finalisation du lien</div>
          </div>
        </div>
        <div className="top-actions">
          <LiveBadge />
          <ThemeToggle />
        </div>
      </div>

      <div className="layout" style={{ gridTemplateColumns: "1fr" }}>
        <main className="main">
          <div className="card" style={{ maxWidth: 560, margin: "18px auto" }}>
            <div className="card-head">
              <div>
                <div className="card-title">Valider le lien de connexion</div>
                <div className="card-sub">Saisissez l’email utilisé si nécessaire.</div>
              </div>
            </div>

            {!isValidLink ? (
              <div className="empty-block" style={{ borderStyle: "solid" }}>
                Lien invalide ou expiré.
              </div>
            ) : (
              <>
                <div className="filters" style={{ marginTop: 0 }}>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>

                {info ? <div className="empty-block" style={{ borderStyle: "solid" }}>{info}</div> : null}
                {error ? <div className="empty-block" style={{ borderStyle: "solid" }}>{error}</div> : null}

                <div className="panel-foot">
                  <button
                    className="btn btn-pill"
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      const e = email.trim();
                      if (!e) {
                        setError("Email requis.");
                        return;
                      }
                      await finalize(e);
                    }}
                  >
                    {loading ? "Validation…" : "Valider le lien"}
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
