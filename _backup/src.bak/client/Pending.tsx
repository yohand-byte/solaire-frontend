import React from 'react';

export default function Pending() {
  return (
    <div className="container" style={{ maxWidth: 520, margin: '60px auto' }}>
      <div className="card" style={{ padding: 24 }}>
        <h2>Compte en attente de validation</h2>
        <p className="small" style={{ marginTop: 8 }}>
          Votre compte installateur est en cours de validation par l’administrateur. Vous recevrez un email dès qu’il sera actif.
        </p>
      </div>
    </div>
  );
}
