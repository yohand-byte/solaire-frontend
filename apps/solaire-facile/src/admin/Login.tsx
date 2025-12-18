import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import { ThemeToggle } from "../theme";
import { ensureUserDoc } from "../lib/firestore";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const whitelist = useMemo(() => {
    const raw = import.meta.env?.VITE_ADMIN_UIDS as string | undefined;
    return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  }, []);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "forbidden") {
      setError("Accès refusé : droits administrateur requis.");
    }
  }, [searchParams]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const token = await getIdTokenResult(user, true);
        const isAdmin =
          Boolean((token.claims as any).admin) || whitelist.includes(user.uid);
        if (isAdmin) {
          await ensureUserDoc({
            role: "admin",
            email: user.email ?? email,
            name: user.displayName ?? user.email ?? email,
          });
          navigate("/admin/dashboard", { replace: true });
        } else {
          await signOut(auth);
        }
      } catch (err) {
        console.error(err);
      }
    });
    return () => unsub();
  }, [navigate, whitelist]);

  const onSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await getIdTokenResult(cred.user, true);
      const isAdmin =
        Boolean((token.claims as any).admin) || whitelist.includes(cred.user.uid);
      if (!isAdmin) {
        await signOut(auth);
        setError("Accès refusé : vous n'êtes pas autorisé.");
        return;
      }
      await ensureUserDoc({
        role: "admin",
        email: cred.user.email ?? email,
        name: cred.user.displayName ?? cred.user.email ?? email,
      });
      setInfo("Connexion réussie, redirection...");
      navigate("/admin/dashboard", { replace: true });
    } catch (e) {
      console.error(e);
      setError("Connexion impossible. Vérifie tes identifiants.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="row mb-2">
          <div className="hero-content">
            <p className="title">Console administrateur</p>
            <p className="subtitle">
              Gestion des dossiers en temps réel et supervision des installateurs.
            </p>
          </div>
          <div className="cta-row">
            <ThemeToggle />
            <span className="badge success">Accès sécurisé</span>
          </div>
        </div>

        <form className="stack" onSubmit={onSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@solairefacile.fr"
              disabled={loading}
            />
          </div>

          <div className="field">
            <label>Mot de passe</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="********"
              disabled={loading}
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="helper" style={{ marginTop: 12 }}>
          Seuls les comptes autorisés avec droit administrateur peuvent accéder
          à cette interface.
        </p>

        {info && <div className="alert success">{info}</div>}
        {error && <div className="alert error">{error}</div>}
      </div>
    </div>
  );
}
