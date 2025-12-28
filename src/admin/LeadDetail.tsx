import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "https://solaire-api-828508661560.europe-west1.run.app"
).replace(/\/+$/, "");
const API_TOKEN = "saftoken-123";

const fetchJson = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "X-Api-Token": API_TOKEN,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

function formatDate(value: any) {
  if (!value) return "—";
  if (value.seconds) return new Date(value.seconds * 1000).toLocaleDateString("fr-FR");
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR");
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchJson("/api/leads?limit=200")
      .then((res) => {
        const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
        const found = items.find((l: any) => l.id === id);
        if (mounted) setLead(found || null);
      })
      .catch((err: any) => {
        if (mounted) setError(err?.message || "Erreur API");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleConvert = async () => {
    if (!lead) return;
    setConverting(true);
    setMessage(null);
    try {
      const body = await fetchJson(`/api/leads/${lead.id}/convert`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setMessage(`Installateur créé : ${body.installerId || "OK"}`);
      setTimeout(() => navigate("/admin/dashboard"), 1200);
    } catch (e: any) {
      setMessage(e?.message || "Erreur de conversion");
    } finally {
      setConverting(false);
    }
  };

  if (loading) return <div className="card">Chargement du lead…</div>;
  if (error) return <div className="card error">Erreur API</div>;
  if (!lead) return <div className="card">Lead introuvable</div>;

  const contact = lead.contact || {};
  const contactName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || lead.name || lead.nom || "—";

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <button className="btn-link" onClick={() => navigate(-1)}>&larr; Retour</button>
          <h1 className="admin-page-title">Lead : {contactName}</h1>
          <p className="admin-page-subtitle">
            {lead.company || lead.companyName || "—"} • {contact.email || lead.email || "—"} • {contact.phone || lead.phone || lead.téléphone || "—"}
          </p>
        </div>
        <div className="pill">{lead.status || "nouveau"}</div>
      </div>

      {message && <div className="alert-info">{message}</div>}

      <div className="grid two-cols">
        <div className="card">
          <h3>Informations</h3>
          <ul className="data-list">
            <li><span>Entreprise</span><strong>{lead.company || lead.companyName || "—"}</strong></li>
            <li><span>Contact</span><strong>{contactName}</strong></li>
            <li><span>Source</span><strong>{lead.source || "—"}</strong></li>
            <li><span>Adresse</span><strong>{lead.address || lead.adresse || "—"}</strong></li>
            <li><span>Créé le</span><strong>{formatDate(lead.createdAt)}</strong></li>
            <li><span>Mis à jour</span><strong>{formatDate(lead.updatedAt)}</strong></li>
          </ul>
          {lead.needs && lead.needs.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="small">Besoins</div>
              <div className="tags">
                {lead.needs.map((n: string) => <span key={n} className="pill">{n}</span>)}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Actions</h3>
          <p className="small">Convertir ce lead en dossier.</p>
          <button className="btn-primary" disabled={converting} onClick={handleConvert}>
            {converting ? "Conversion..." : "Convertir en dossier"}
          </button>
        </div>
      </div>
    </div>
  );
}
