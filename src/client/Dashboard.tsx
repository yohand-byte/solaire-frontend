import { Link, useNavigate } from "react-router-dom";
import { useCollection } from "../hooks/useCollection";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firestore";

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { data: files, loading } = useCollection("files");
  const f = files || [];

  if (loading) {
    return <div className="card">Chargement…</div>;
  }

  const stats = {
    total: f.length,
    enCours: f.filter((x: any) => x.statutGlobal === "en_cours").length,
    attente: f.filter((x: any) => ["en_attente", "incomplet"].includes(x.statutGlobal)).length,
    finalises: f.filter((x: any) => ["finalise", "clos"].includes(x.statutGlobal)).length,
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button className="btn-secondary" onClick={async () => { await signOut(auth); navigate("/client/login", { replace: true }); }}>
          Déconnexion
        </button>
      </div>
      <h3>Mon tableau de bord</h3>
      <div className="cards">
        <div className="metric">
          <h4>Total dossiers</h4>
          <div className="big">{stats.total}</div>
        </div>
        <div className="metric">
          <h4>En cours</h4>
          <div className="big">{stats.enCours}</div>
        </div>
        <div className="metric">
          <h4>En attente docs</h4>
          <div className="big">{stats.attente}</div>
        </div>
        <div className="metric">
          <h4>Finalisés</h4>
          <div className="big">{stats.finalises}</div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 20 }}>
        <h4 style={{ marginBottom: 12 }}>Mes dossiers</h4>
        {loading && <div>Chargement des dossiers…</div>}
        {!loading && !f.length && <div>Aucun dossier pour le moment.</div>}
        {!loading && f.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Pack</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {f.map((file: any) => (
                <tr key={file.id}>
                  <td>
                    <Link to={`/client/dossiers/${file.id}`}>
                      {file.reference || file.title || file.id}
                    </Link>
                  </td>
                  <td>{file.pack || file.status}</td>
                  <td>{file.statutGlobal || file.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
