import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
import AuthLayout from "../components/auth/AuthLayout";
import AuthCard from "../components/auth/AuthCard";
import AuthInput from "../components/auth/AuthInput";

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
  const formRef = useRef<HTMLFormElement | null>(null);

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
    } catch (e: any) {
      console.error(e);
      const msg =
        e?.code === "auth/invalid-api-key"
          ? "Clé API Firebase invalide. Vérifie la configuration."
          : e?.code === "auth/operation-not-allowed"
            ? "Méthode email/mot de passe désactivée dans Firebase Auth."
            : e?.code === "auth/wrong-password"
              ? "Email ou mot de passe incorrect."
              : e?.message ?? "Connexion impossible. Vérifie tes identifiants.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Console administrateur"
        subtitle="Gestion des dossiers en temps réel et supervision des installateurs."
        primaryLabel={loading ? "Connexion..." : "Se connecter"}
        primaryDisabled={loading}
        onPrimaryClick={() => formRef.current?.requestSubmit()}
        message={
          error
            ? { kind: "error", text: error }
            : info
              ? { kind: "success", text: info }
              : undefined
        }
      >
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <ThemeToggle />
          <span className="badge success">Accès sécurisé</span>
        </div>

        <form ref={formRef} className="stack" onSubmit={onSubmit}>
          <AuthInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder=" "
            disabled={loading}
          />

          <AuthInput
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder=" "
            disabled={loading}
          />

          <button type="submit" style={{ display: "none" }} aria-hidden tabIndex={-1}>
            Submit
          </button>
        </form>

        <p className="helper" style={{ marginTop: 12 }}>
          Seuls les comptes autorisés avec droit administrateur peuvent accéder
          à cette interface.
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
