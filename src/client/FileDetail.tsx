import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const API_BASE = "https://solaire-api.onrender.com";

type FileDetail = {
  id: string;
  reference?: string;
  ref?: string;
  clientId?: string;
  clientFinal?: string;
  pack?: string;
  statutGlobal?: string;
  status?: string;
  address?: string;
  power?: number;
  mairieStatus?: string;
  mairieDepositDate?: string;
  consuelStatus?: string;
  consuelVisitDate?: string;
  enedisStatus?: string;
  enedisPdL?: string;
  edfStatus?: string;
  edfContractNumber?: string;
  documents?: { name: string; url: string }[];
};

type EventItem = { id?: string; at: string; action: string };

export default function ClientFileDetail() {
  const { id } = useParams<{ id: string }>();
  const [file, setFile] = useState<FileDetail | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/files/${id}`);
        if (!res.ok) throw new Error(`API files/${id} ${res.status}`);
        const data = await res.json();
        if (active) setFile(data);

        const evRes = await fetch(`${API_BASE}/files/${id}/events`);
        if (evRes.ok) {
          const evJson = await evRes.json();
          if (active) setEvents(evJson);
        }
      } catch (e: any) {
        if (active) setError(e.message || "Erreur de chargement");
      } finally {
        if (active) setLoading(false);
      }
    };
    if (id) load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <div className="card">Chargement…</div>;
  if (error) return <div className="card error">Erreur: {error}</div>;
  if (!file) return <div className="card">Dossier introuvable</div>;

  const getDate = (v?: any) =>
    !v ? "—" : new Date(v?.toDate ? v.toDate() : v).toLocaleDateString();

  const statusRow = (label: string, val?: string, extra?: string) => (
    <li>
      <strong>{label} :</strong> {val || "—"} {extra ? `(${extra})` : ""}
    </li>
  );

  return (
    <div className="grid">
      <div className="card">
        <Link to="/client/dossiers" className="small">
          ← Retour aux dossiers
        </Link>
        <h3>{file.reference || file.ref || file.id}</h3>
        <div className="small">{file.address || "—"}</div>
        <div>Pack : {file.pack || "—"}</div>
        <div>
          Statut :{" "}
          <span className={`badge-status ${file.statutGlobal || file.status || "en_cours"}`}>
            {file.statutGlobal || file.status || "en_cours"}
          </span>
        </div>
        <div>Client final : {file.clientFinal || "—"}</div>
        <div>Puissance : {file.power || "—"} kWc</div>

        <h4>Suivi administratif</h4>
        <ul className="small">
          {statusRow("Mairie", file.mairieStatus, getDate(file.mairieDepositDate))}
          {statusRow("Consuel", file.consuelStatus, getDate(file.consuelVisitDate))}
          {statusRow("Enedis", file.enedisStatus, file.enedisPdL)}
          {statusRow("EDF OA", file.edfStatus, file.edfContractNumber)}
        </ul>
      </div>

      <div className="card">
        <h4>Documents</h4>
        <ul className="small">
          {(file.documents || []).map((d) => (
            <li key={d.name}>
              <a href={d.url} target="_blank" rel="noreferrer">
                {d.name}
              </a>
            </li>
          ))}
          {(file.documents || []).length === 0 && <li>Aucun document</li>}
        </ul>

        <h4>Timeline</h4>
        <ul className="small">
          {events.map((h) => (
            <li key={h.id || h.at}>
              {new Date(h.at).toLocaleString()} — {h.action}
            </li>
          ))}
          {events.length === 0 && <li>Aucun événement</li>}
        </ul>
      </div>
    </div>
  );
}
