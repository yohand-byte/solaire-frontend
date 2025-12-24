const sampleRow = {
  title: "Dossier test",
  status: "EN COURS",
  installerId: "8G2xjQ4WHCvawxGlselN2OCK7KT72",
  lastUpdate: "18 déc., 15:04",
};

export default function AdminDashboard() {
  return (
    <div className="app-shell stack">
      <div className="row">
        <div>
          <h1 className="title">Console administrateur</h1>
          <p className="subtitle">Pilotage des dossiers et synchronisation instantanée côté installateurs.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="badge info">Mode sombre</span>
          <span className="badge success">Temps réel</span>
        </div>
      </div>

      <div className="card-grid">
        <div className="card stack">
          <div className="row">
            <div>
              <p className="section-sub">Dossiers actifs</p>
              <div className="kpi-value">1</div>
              <p className="kpi-label">Total</p>
            </div>
            <span className="badge success">Prêt</span>
          </div>
        </div>
        <div className="card stack">
          <p className="section-sub">En cours</p>
          <div className="kpi-value">1</div>
          <span className="badge info">Production</span>
        </div>
        <div className="card stack">
          <p className="section-sub">En attente</p>
          <div className="kpi-value">0</div>
          <span className="badge warning">Analyse</span>
        </div>
      </div>

      <div className="card stack">
        <div className="row">
          <div>
            <h3 className="section-heading">Suivi des dossiers</h3>
            <p className="section-sub">Toutes les fiches installateurs et leurs statuts</p>
          </div>
          <span className="badge success">Accès global</span>
        </div>

        <div className="panel stack" style={{ padding: 16 }}>
          <div className="row" style={{ alignItems: "flex-start" }}>
            <div className="stack">
              <h4 style={{ margin: 0 }}>{sampleRow.title}</h4>
              <p className="section-sub">ID : mnhYCmWr7545evrEU7iv</p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <span className="badge info">{sampleRow.status}</span>
              <span className="badge">{sampleRow.installerId}</span>
            </div>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <p className="section-sub">Dernière mise à jour {sampleRow.lastUpdate}</p>
            <div className="row" style={{ gap: 8 }}>
              {["En attente", "En cours", "Validé", "Refusé", "Terminé"].map((label) => (
                <button key={label} className="btn btn-ghost btn-small">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
