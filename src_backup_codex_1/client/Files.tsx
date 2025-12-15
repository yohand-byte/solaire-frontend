import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useCollection";
import { PACKS } from "../constants";

export default function ClientFiles() {
  const { user, role, installerId, loading } = useAuth();
  const { data: files, loading: filesLoading } = useCollection("files");

  if (loading || filesLoading) return <div>Chargement…</div>;
  if (!user || role !== "client" || !installerId) {
    return <div>Accès refusé</div>;
  }

  const list = (files || []).filter((f: any) => f.installerId === installerId);

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
          {list.map((f: any) => (
            <tr key={f.id}>
              <td>
                <Link to={`/client/dossiers/${f.id}`}>
                  {f.reference || f.ref || f.id}
                </Link>
              </td>
              <td>{f.clientFinal || "—"}</td>
              <td>
                {PACKS.find((p) => p.value === f.pack)?.label || f.pack}
              </td>
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