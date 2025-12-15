import React from "react";

export default function OperatorBoard() {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-title">Mode Opérateur / Téléprospection — à venir</div>
          <div className="admin-page-subtitle">Vue simplifiée pour les appels et relances.</div>
        </div>
      </div>
      <div className="grid-operator">
        <div className="card">
          <h4>Leads à appeler</h4>
          <p>Placeholder opérateur.</p>
        </div>
        <div className="card">
          <h4>Script d’appel</h4>
          <p>Placeholder opérateur.</p>
        </div>
        <div className="card">
          <h4>Notes</h4>
          <p>Placeholder opérateur.</p>
        </div>
      </div>
    </div>
  );
}
