import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
} from "firebase/auth";
import { auth } from "../firebase";
import { ThemeToggle } from "../theme";
import { ensureUserDoc, findClientIdByEmail } from "../lib/firestore";

const STORAGE_KEY = "sf_client_email_for_signin";

export default function ClientLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingLink, setProcessingLink] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"send" | "complete">("send");

  const redirectUrl = useMemo(
    () => `${window.location.origin}/client/login`,
    []
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      const isMagicLink = isSignInWithEmailLink(auth, window.location.href);
      if (user && !isMagicLink) {
        const clientId = (await findClientIdByEmail(user.email)) ?? user.uid;
        if (!clientId || clientId === user.uid) {
          setInfo("Compte client non provisionné. Contacte le support pour lier ton compte.");
        }
        await ensureUserDoc({
          role: "client",
          client_id: clientId,
          email: user.email ?? email,
          name: user.displayName ?? user.email ?? email,
        });
        navigate("/client/dashboard", { replace: true });
      }
    });
    return () => unsub();
  }, [navigate, email]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || "";
    if (stored) setEmail(stored);

    if (isSignInWithEmailLink(auth, window.location.href)) {
      setMode("complete");
      setProcessingLink(true);
      setInfo("Validation du lien de connexion en cours...");
    }
  }, []);

  useEffect(() => {
    const msg = searchParams.get("message");
    if (msg) setInfo(msg);
  }, [searchParams]);

  const finalize = useCallback(
    async (mail: string) => {
      setLoading(true);
      setError(null);
      try {
        const cred = await signInWithEmailLink(auth, mail, window.location.href);
        const user = cred.user;
        if (user) {
          const clientId = (await findClientIdByEmail(user.email)) ?? user.uid;
          if (!clientId || clientId === user.uid) {
            setInfo("Compte client non provisionné. Contacte le support pour lier ton compte.");
          }
          await ensureUserDoc({
            role: "client",
            client_id: clientId,
            email: user.email ?? mail,
            name: user.displayName ?? user.email ?? mail,
          });
        }
        localStorage.removeItem(STORAGE_KEY);
        navigate("/client/dashboard", { replace: true });
      } catch (err) {
        console.error(err);
        setError(
          "Lien invalide ou expiré. Merci de demander un nouveau lien."
        );
        setMode("send");
      } finally {
        setProcessingLink(false);
        setLoading(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (mode !== "complete") return;
    if (!isSignInWithEmailLink(auth, window.location.href)) return;
    const mail = email || localStorage.getItem(STORAGE_KEY) || "";
    if (mail) {
      finalize(mail);
    } else {
      setProcessingLink(false);
      setInfo("Saisis ton email pour finaliser la connexion.");
    }
  }, [mode, email, finalize]);

  const onSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Merci de renseigner ton email professionnel.");
      return;
    }
    if (mode === "complete" && isSignInWithEmailLink(auth, window.location.href)) {
      await finalize(email);
      return;
    }
    setLoading(true);
    try {
      await sendSignInLinkToEmail(auth, email, {
        url: redirectUrl,
        handleCodeInApp: true,
      });
      localStorage.setItem(STORAGE_KEY, email);
      setMode("complete");
      setInfo("Un lien de connexion vient de t’être envoyé par email.");
    } catch (err) {
      console.error(err);
      setError("Impossible d'envoyer le lien. Vérifie l'email et réessaie.");
    } finally {
      setProcessingLink(false);
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="row mb-2">
          <div className="hero-content">
            <p className="title">Espace installateur</p>
            <p className="subtitle">
              Accède à ton tableau de bord avec un lien sécurisé.
            </p>
          </div>
          <div className="cta-row">
            <ThemeToggle />
            <span className="badge info">Magic Link</span>
          </div>
        </div>

        {(processingLink || mode === "complete") && (
          <div className="pill info mb-2">
            <span className="status-dot" />
            {processingLink
              ? "Validation du lien en cours..."
              : "Saisie de l'email pour finaliser"}
          </div>
        )}

        <form className="stack" onSubmit={onSubmit}>
          <div className="field">
            <label>Adresse email professionnelle</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@entreprise.com"
              required
              disabled={loading}
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading
              ? mode === "complete"
                ? "Connexion..."
                : "Envoi en cours..."
              : mode === "complete"
                ? "Finaliser la connexion"
                : "Recevoir le lien"}
          </button>
        </form>

        <p className="helper mt-2">
          Vérifie ton email puis clique sur “Ouvrir dans l'application” pour être
          connecté automatiquement.
        </p>

        {info && <div className="alert success">{info}</div>}
        {error && <div className="alert error">{error}</div>}
      </div>
    </div>
  );
}
