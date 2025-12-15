import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCollection } from "../hooks/useCollection.tsx";
import { API_URL } from "../api/client";

const API_BASE = API_URL;
const API_TOKEN = "saftoken-123";

function formatDate(value: any) {
  if (!value) return "—";
  if (value.seconds) return new Date(value.seconds * 1000).toLocaleDateString("fr-FR");
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("fr-FR");
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: leads, loading, error } = useCollection("leads");
  const lead = useMemo(() => (leads || []).find((l) => l.id === id), [leads, id]);
  const [converting, setConverting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleConvert = async () => {
    if (!lead) return;
    setConverting(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/leads/${lead.id}/convert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Token": API_TOKEN,
        },
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || res.statusText);
      setMessage(`Dossier créé : ${body.reference || body.id || "OK"}`);
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (e: any) {
      setMessage(e?.message || "Erreur de conversion");
    } finally {
      setConverting(false);
    }
  };

  if (loading) return <div className="card">Chargement du lead…</div>;
  if (error) return <div className="card error">Erreur Firestore</div>;
  if (!lead) return <div className="card">Lead introuvable</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <button className="btn-link" onClick={() => navigate(-1)}>&larr; Retour</button>
          <h1 className="admin-page-title">Lead : {lead.name || lead.nom || "Sans nom"}</h1>
          <p className="admin-page-subtitle">{lead.email || "—"} • {lead.phone || lead.téléphone || "—"}</p>
        </div>
        <div className="pill">{lead.status || "nouveau"}</div>
      </div>

      {message && <div className="alert-info">{message}</div>}

      <div className="grid two-cols">
        <div className="card">
          <h3>Informations</h3>
          <ul className="data-list">
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
