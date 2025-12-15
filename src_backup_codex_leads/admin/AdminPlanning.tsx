import React from "react";

export default function AdminPlanning() {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <div className="admin-page-title">Planning (Admin) — à venir</div>
          <div className="admin-page-subtitle">Cette page présentera le planning détaillé des actions.</div>
        </div>
      </div>
      <div className="planning-grid">
        <div className="card">
          <h4>Colonne 1</h4>
          <p>Placeholder planning.</p>
        </div>
        <div className="card">
          <h4>Colonne 2</h4>
          <p>Placeholder planning.</p>
        </div>
      </div>
    </div>
  );
}
