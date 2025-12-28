import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendSignInLinkToEmail } from "firebase/auth";
import { auth } from "../lib/firestore";

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

export default function ClientLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (localStorage.getItem("installerId")) {
      navigate("/client", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const data = await fetchJson("/api/installers?limit=200");
      const installers = data.items || [];
      const normalized = email.trim().toLowerCase();
      const match = installers.find((installer: any) =>
        (installer.contact?.email || "").toLowerCase() === normalized
      );
      if (!match) {
        setMessage("Email introuvable. Contactez Solaire Facile.");
        return;
      }
      const actionCodeSettings = {
        url: `${window.location.origin}/client/finish`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, normalized, actionCodeSettings);
      localStorage.setItem(EMAIL_KEY, normalized);
      setMessage("Lien envoye. Verifiez votre email.");
    } catch (err: any) {
      setMessage(err?.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-sm p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connexion installateur</h1>
          <p className="text-sm text-gray-500">Recevez votre acces par email.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200"
              placeholder="prenom@installateur.fr"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-xl bg-amber-500 text-white font-semibold py-2 text-sm shadow-sm disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Envoyer le lien"}
          </button>
        </form>

        {message && (
          <div className="text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
