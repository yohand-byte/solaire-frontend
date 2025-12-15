import { useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useDocument } from "../hooks/useDocument";

export default function ClientFileDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role, installerId, loading: authLoading } = useAuth();
  const { data: file, loading } = useDocument("files", id || "");

  if (authLoading || loading) return <div>Chargement…</div>;
  if (!user || role !== "client" || !installerId) return <div>Accès refusé</div>;
  if (!file || file.installerId !== installerId) return <div>Non autorisé</div>;

  const formatDate = (d: any) => {
    if (!d) return "—";
    if (d.toDate) return d.toDate().toLocaleDateString();
    return new Date(d).toLocaleDateString();
  };

  return (
    <div className="grid">
      <div className="card">
        <h3>{file.reference || file.ref || file.id}</h3>

        <div className="small">{file.address || "—"}</div>
        <div>Pack : {file.pack || "—"}</div>

        <div>
          Statut :
          <span className={`badge-status ${file.statutGlobal || file.status}`}>
            {file.statutGlobal || file.status}
          </span>
        </div>

        <div>Client final : {file.clientFinal || file.ClientFinal || "—"}</div>
        <div>Puissance : {file.power || "—"} kWc</div>

        <h4>Suivi administratif</h4>
        <ul className="small">
          <li>
            Mairie : {file.mairieStatus || "—"}{" "}
            ({formatDate(file.mairieDepositDate)})
          </li>
          <li>
            Consuel : {file.consuelStatus || "—"}{" "}
            ({formatDate(file.consuelVisitDate)})
          </li>
          <li>
            Enedis : {file.enedisStatus || "—"} ({file.enedisPdL || "—"})
          </li>
          <li>
            EDF OA : {file.edfStatus || "—"} ({file.edfContractNumber || "—"})
          </li>
        </ul>

        <h4>Prochaine action</h4>
        <div>
          {file.nextAction || "Aucune"}{" "}
          {file.nextActionDate ? `(${formatDate(file.nextActionDate)})` : ""}
        </div>
      </div>

      <div className="card">
        <h4>Documents</h4>
        <ul className="small">
          {(file.documents || []).map((d: any, i: number) => (
            <li key={i}>
              <a href={d.url} target="_blank" rel="noreferrer">
                {d.name}
              </a>
            </li>
          ))}
        </ul>

        <h4>Historique</h4>
        <ul className="small">
          {(file.history || []).map((h: any, i: number) => (
            <li key={i}>
              {formatDate(h.at)} — {h.action}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}