import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useCollection";

export default function ClientDashboard() {
  const { user, role, installerId, loading } = useAuth();
  const { data: files, loading: filesLoading } = useCollection("files");

  if (loading || filesLoading) return <div>Chargement…</div>;
  if (!user || role !== "client" || !installerId) {
    return <div>Accès refusé</div>;
  }

  const all = files || [];
  const f = all.filter((x: any) => x.installerId === installerId);

  const stats = {
    total: f.length,
    enCours: f.filter((x: any) => x.statutGlobal === "en_cours").length,
    attente: f.filter((x: any) =>
      ["en_attente", "incomplet"].includes(x.statutGlobal)
    ).length,
    finalises: f.filter((x: any) =>
      ["finalise", "clos"].includes(x.statutGlobal)
    ).length,
  };

  return (
    <div className="card">
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
    </div>
  );
}