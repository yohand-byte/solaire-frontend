import { useCollection } from "../hooks/useCollection";
import { PACKS } from "../constants";
import { Link } from "react-router-dom";

export default function ClientFiles() {
  const { data: files, loading } = useCollection("files");

  if (loading) {
    return <div className="card">Chargement…</div>;
  }

  return (
    <div className="card">
      <h3>Mes dossiers</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Réf</th>
            <th>Client final</th>
            <th>Pack</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {(files || []).map((f: any) => (
            <tr key={f.id}>
              <td>
                <Link to={`/client/dossiers/${f.id}`}>
                  {f.reference || f.ref || f.id}
                </Link>
              </td>
              <td>{f.clientFinal || "—"}</td>
              <td>{PACKS.find((p) => p.value === f.pack)?.label || f.pack}</td>
              <td>
                <span className={`badge-status ${f.statutGlobal || f.status}`}>
                  {f.statutGlobal || f.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
