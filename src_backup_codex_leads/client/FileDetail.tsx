import { useParams } from "react-router-dom";
import { useDocument } from "../hooks/useDocument";

export default function ClientFileDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: file, loading } = useDocument("files", id || "");

  if (loading) return <div>Chargement…</div>;
  if (!file) return <div>Dossier introuvable</div>;

  return (
    <div className="grid">
      <div className="card">
        <h3>{file.reference || file.ref || file.id}</h3>
        <div className="small">{file.address || "—"}</div>
        <div>Pack : {file.pack || "—"}</div>
        <div>
          Statut :{' '}
          <span className={`badge-status ${file.statutGlobal || file.status}`}>
            {file.statutGlobal || file.status}
          </span>
        </div>
        <div>Client final : {file.clientFinal || "—"}</div>
        <div>Puissance : {file.power || "—"} kWc</div>

        <h4>Suivi administratif</h4>
        <ul className="small">
          <li>
            Mairie : {file.mairieStatus || "—"} ({file.mairieDepositDate || "—"})
          </li>
          <li>
            Consuel : {file.consuelStatus || "—"} ({file.consuelVisitDate || "—"})
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
          {file.nextAction || "—"}{' '}
          {file.nextActionDate
            ? `(${new Date(
                file.nextActionDate.toDate ? file.nextActionDate.toDate() : file.nextActionDate
              ).toLocaleDateString()})`
            : ''}
        </div>
      </div>

      <div className="card">
        <h4>Documents</h4>
        <ul className="small">
          {(file.documents || []).map((d: any) => (
            <li key={d.name}>
              <a href={d.url} target="_blank" rel="noreferrer">
                {d.name}
              </a>
            </li>
          ))}
        </ul>

        <h4>Historique</h4>
        <ul className="small">
          {(file.history || []).map((h: any) => (
            <li key={h.at}>{new Date(h.at).toLocaleString()} — {h.action}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
