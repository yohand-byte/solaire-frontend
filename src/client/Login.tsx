import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../lib/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { routeAfterLogin } from "../routing/afterLogin";

export default function ClientLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await routeAfterLogin(cred.user, navigate);
    } catch (err: any) {
      console.error("Erreur login client:", err);
      setError(err?.message || "Connexion impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Solaire Admin – Espace Installateur</h2>
      <form onSubmit={onSubmit} className="form">
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="field">
          <label>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Connexion..." : "Connexion"}
        </button>
      </form>
    </div>
  );
}
