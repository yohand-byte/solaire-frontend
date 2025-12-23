import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getIdTokenResult,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import { ThemeToggle } from "../theme";
import { ensureUserDoc } from "../lib/firestore";
import { useAuth } from "../auth/useAuth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const checkingRef = useRef(false);
  const lastUidRef = useRef<string | null>(null);
  const signedOutRef = useRef(false);
  const { user, ready } = useAuth();
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
    if (!ready || !user) return;
    if (checkingRef.current) return;
    if (lastUidRef.current === user.uid) return;
    checkingRef.current = true;
    lastUidRef.current = user.uid;
    const run = async () => {
      try {
        const token = await getIdTokenResult(user);
        const isAdmin =
          Boolean((token.claims as any).admin) || whitelist.includes(user.uid);
        if (isAdmin) {
          await ensureUserDoc({
            role: "admin",
            email: user.email ?? null,
            name: user.displayName ?? user.email ?? null,
          });
          navigate("/admin/dashboard", { replace: true });
        } else if (!signedOutRef.current) {
          signedOutRef.current = true;
          await signOut(auth);
        }
      } catch (err) {
        console.error(err);
      } finally {
        checkingRef.current = false;
      }
    };
    void run();
  }, [ready, user, navigate, whitelist]);

  const onSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    signedOutRef.current = false;
    lastUidRef.current = null;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await getIdTokenResult(cred.user);
      const isAdmin =
        Boolean((token.claims as any).admin) || whitelist.includes(cred.user.uid);
      if (!isAdmin) {
        if (!signedOutRef.current) {
          signedOutRef.current = true;
          await signOut(auth);
        }
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
        <div className="auth-header">
          <div>
            <p className="eyebrow">Solaire Facile</p>
            <p className="title">Console administrateur</p>
            <p className="subtitle">
              Gestion des dossiers en temps réel et supervision des installateurs.
            </p>
          </div>
          <div className="auth-actions">
            <ThemeToggle />
            <span className="badge success">Accès sécurisé</span>
          </div>
        </div>

        <form className="stack auth-form" onSubmit={onSubmit}>
          <div className="field">
            <label>Email</label>
            <div className="input-wrap">
              <span className="input-icon" aria-hidden />
              <input
                className="input with-icon"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@solairefacile.fr"
                disabled={loading}
              />
            </div>
          </div>

          <div className="field">
            <label>Mot de passe</label>
            <div className="input-wrap">
              <span className="input-icon" aria-hidden />
              <input
                className="input with-icon"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="********"
                disabled={loading}
              />
            </div>
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="auth-security">
          Authentification stricte réservée aux administrateurs autorisés. Les
          actions sont journalisées pour conformité et sécurité.
        </div>

        {info && <div className="alert success">{info}</div>}
        {error && <div className="alert error">{error}</div>}

        <div className="auth-footer">
          <span>Console interne</span>
          <span className="divider-dot">•</span>
          <span>Mode: {import.meta.env.MODE}</span>
        </div>
      </div>
    </div>
  );
}
