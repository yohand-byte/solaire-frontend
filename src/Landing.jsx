import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-hero">
        <div>
          <p className="pill soft">Solaire Facile</p>
          <h1>Admin & Portail Client réunis</h1>
          <p className="hero-sub">Suivi dossiers, consuel, enedis et documents en temps réel.</p>
          <div className="cta-row">
            <Link className="btn-primary" to="/client/login">Espace client</Link>
            <Link className="btn-secondary" to="/login">Espace admin</Link>
          </div>
        </div>
      </header>
      <section className="landing-cards">
        <div className="card">
          <h3>Suivi temps réel</h3>
          <p>Accès direct au tableau de bord client pour consulter l'avancement.</p>
        </div>
        <div className="card">
          <h3>Documents centralisés</h3>
          <p>DP, Consuel, Enedis : tout au même endroit, partage sécurisée.</p>
        </div>
        <div className="card">
          <h3>Support dédié</h3>
          <p>Chat en direct et notifications par email intégrées.</p>
        </div>
      </section>
    </div>
  );
}
