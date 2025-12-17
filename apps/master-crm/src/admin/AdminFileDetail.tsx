import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDocument } from "../hooks/useDocument";

const toDate = (value: any) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  return new Date(value);
};

const formatDate = (value: any) => {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleDateString();
};

const statusClass = (status = "") => {
  const normalized = status.toLowerCase();
  if (normalized === "en_cours") return "badge-status info";
  if (normalized === "en_attente" || normalized === "incomplet") return "badge-status warning";
  if (normalized === "finalise" || normalized === "clos") return "badge-status success";
  if (normalized === "bloque") return "badge-status warning";
  return "badge-status";
};

const packClass = (pack = "") => `badge-pack badge-pack-${pack.replace(/[^a-z0-9]/gi, "_")}`;

export default function AdminFileDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: file, loading } = useDocument("files", id || "");

  const backlog = useMemo(() => {
    const actions = [];
    if (file?.nextAction) {
      actions.push({ label: "Next action", value: file.nextAction, date: formatDate(file.nextActionDate) });
    }
    if (file?.notes) {
      actions.push({ label: "Notes", value: file.notes });
    }
    return actions;
  }, [file]);

  if (loading) return <div className="card">Chargement du dossier…</div>;
  if (!file) return <div className="card">Dossier introuvable</div>;

  const adminFollow = [
    { label: "Mairie", status: file.mairieStatus, meta: formatDate(file.mairieDepositDate) },
    { label: "Consuel", status: file.consuelStatus, meta: formatDate(file.consuelVisitDate) },
    { label: "Enedis", status: file.enedisStatus, meta: file.enedisPdL || "PDL non renseigné" },
    { label: "EDF OA", status: file.edfStatus, meta: file.edfContractNumber || "N° non renseigné" },
  ];

  return (
    <div className="dashboard">
      <div className="header" style={{ marginBottom: 24, gap: 12 }}>
        <button className="btn-secondary" onClick={() => navigate("/dashboard")}>
          ← Retour
        </button>
        <div>
          <div className="small">Dossier</div>
          <h2 style={{ margin: 2 }}>{file.reference || file.title}</h2>
          <div className="small">{file.clientFinal || "—"} · {file.address || "Adresse non renseignée"}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span className={packClass(file.pack || file.status)}>{file.pack || file.status || "Autre"}</span>
          <span className={statusClass(file.statutGlobal || file.status)}>{file.statutGlobal || file.status || "Statut inconnu"}</span>
        </div>
      </div>

      <div className="grid" style={{ gap: 16 }}>
        <div className="card" style={{ flex: 2 }}>
          <div className="info-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div>
              <div className="mini-label">Puissance</div>
              <div className="mini-value">{file.power ? `${file.power} kWc` : "—"}</div>
            </div>
            <div>
              <div className="mini-label">Installateur</div>
              <div className="mini-value">{file.installerId || "—"}</div>
            </div>
            <div>
              <div className="mini-label">Créé le</div>
              <div className="mini-value">{formatDate(file.createdAt)}</div>
            </div>
            <div>
              <div className="mini-label">Dernière MAJ</div>
              <div className="mini-value">{formatDate(file.updatedAt)}</div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <h4>Suivi administratif</h4>
            <ul className="admin-follow">
              {adminFollow.map((item) => (
                <li key={item.label}>
                  <strong>{item.label} :</strong> {item.status || "—"} <span>{item.meta}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h4>Prochaine action</h4>
          <div className="small">{file.nextAction || "Pas d’action planifiée."}</div>
          {file.nextActionDate && <div style={{ marginTop: 8 }}>{formatDate(file.nextActionDate)}</div>}
          <div style={{ marginTop: 16 }}>
            <h4>Actions complémentaires</h4>
            {backlog.length === 0 && <div className="small">Aucune donnée supplémentaire.</div>}
            {backlog.length > 0 && (
              <ul className="timeline">
                {backlog.map((entry) => (
                  <li key={entry.label}>
                    <strong>{entry.label}</strong>
                    <span>{entry.value}</span>
                    {entry.date && <small>{entry.date}</small>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 24, gap: 16 }}>
        <div className="card" style={{ flex: 1 }}>
          <h4>Documents</h4>
          {file.documents?.length ? (
            <ul className="timeline">
              {file.documents.map((doc: any) => (
                <li key={doc.url || doc.name}>
                  <div className="doc-card">
                    <div className="doc-meta">
                      <div className="doc-pill">PDF</div>
                      <div className="doc-texts">
                        <div className="doc-name">{doc.name || "Document"}</div>
                        {doc.uploadedAt && <small>{formatDate(doc.uploadedAt)}</small>}
                        {doc.url && (
                          <a href={doc.url} target="_blank" rel="noreferrer" className="doc-open">
                            Ouvrir dans un nouvel onglet ↗
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="doc-preview-wrapper">
                      {doc.url ? (
                        <object
                          data={doc.url}
                          type="application/pdf"
                          className="doc-preview"
                          aria-label={`Aperçu ${doc.name || "document"}`}
                        >
                          Aperçu indisponible
                        </object>
                      ) : (
                        <div className="doc-preview fallback">Aperçu indisponible</div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="small">Aucun document enregistré.</div>
          )}
        </div>
        <div className="card" style={{ flex: 1 }}>
          <h4>Historique</h4>
          {file.history?.length ? (
            <ul className="timeline">
              {file.history.map((event: any) => (
                <li key={event.at}>{event.action || "—"}</li>
              ))}
            </ul>
          ) : (
            <div className="small">Historique non structuré.</div>
          )}
        </div>
      </div>
    </div>
  );
}
