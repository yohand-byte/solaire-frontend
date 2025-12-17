import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function Onboarding() {
  const { user } = useAuth();
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [cgu, setCgu] = useState(false);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cgu || !password) return setStatus('Merci de valider les CGU et de définir un mot de passe.');
    setLoading(true);
    setStatus(null);
    try {
      await apiClient.post('/installers/activate', { company, phone, password });
      setStatus('Compte activé, vous pouvez accéder au tableau de bord.');
      window.location.href = '/client/dashboard';
    } catch (err: any) {
      setStatus(err?.response?.data?.error || 'Erreur pendant l’activation');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="page-loader">Session requise</div>;

  return (
    <div className="container" style={{ maxWidth: 520, margin: '40px auto' }}>
      <div className="card" style={{ padding: 24 }}>
        <h2>Activation de votre compte installateur</h2>
        <p className="small" style={{ marginBottom: 16 }}>Complétez ces infos pour accéder à votre tableau de bord.</p>
        <form onSubmit={submit} className="form-grid">
          <label>Entreprise
            <input value={company} onChange={(e) => setCompany(e.target.value)} required placeholder="Société" />
          </label>
          <label>Téléphone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="06..." />
          </label>
          <label>Mot de passe
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={cgu} onChange={(e) => setCgu(e.target.checked)} />
            J’accepte les CGU
          </label>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Activation...' : 'Activer mon compte'}
          </button>
        </form>
        {status && <div className="small" style={{ marginTop: 12 }}>{status}</div>}
      </div>
    </div>
  );
}
