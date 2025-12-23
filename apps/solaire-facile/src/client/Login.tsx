import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
} from "firebase/auth";
import { auth } from "../firebase";
import { ThemeToggle } from "../theme";
import { useAuth } from "../auth/useAuth";

const STORAGE_KEY = "sf_client_email_for_signin";

export default function ClientLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleClientPostAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingLink, setProcessingLink] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"send" | "complete">("send");
  const runningRef = useRef(false);
  const navigatedRef = useRef(false);
  const emailFallbackRef = useRef<string | null>(null);
  const finalizingRef = useRef(false);
  const mountedRef = useRef(true);

  const actionCodeSettings = {
    url: "https://solaire-frontend.web.app/client/login",
    handleCodeInApp: true,
  };

  const safeSetInfo = (value: string | null) => {
    if (!mountedRef.current || navigatedRef.current) return;
    setInfo(value);
  };

  const safeSetError = (value: string | null) => {
    if (!mountedRef.current || navigatedRef.current) return;
    setError(value);
  };

  const safeSetLoading = (value: boolean) => {
    if (!mountedRef.current || navigatedRef.current) return;
    setLoading(value);
  };

  const safeSetProcessingLink = (value: boolean) => {
    if (!mountedRef.current || navigatedRef.current) return;
    setProcessingLink(value);
  };

  const safeSetMode = (value: "send" | "complete") => {
    if (!mountedRef.current || navigatedRef.current) return;
    setMode(value);
  };

  const resolveEmail = () =>
    email || emailFallbackRef.current || localStorage.getItem(STORAGE_KEY) || "";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || "";
    if (stored) setEmail(stored);
    emailFallbackRef.current = stored || null;

    if (isSignInWithEmailLink(auth, window.location.href)) {
      safeSetMode("complete");
      safeSetProcessingLink(true);
      safeSetInfo("Validation du lien de connexion en cours...");
    }
  }, []);

  useEffect(() => {
    const msg = searchParams.get("message");
    if (msg) safeSetInfo(msg);
  }, [searchParams]);
  const finalize = useCallback(
    async (mail: string) => {
      if (finalizingRef.current || navigatedRef.current) return;
      const effectiveMail = mail || emailFallbackRef.current || localStorage.getItem(STORAGE_KEY) || "";
      if (!effectiveMail) {
        safeSetProcessingLink(false);
        safeSetInfo("Saisis ton email pour finaliser la connexion.");
        return;
      }
      finalizingRef.current = true;
      safeSetLoading(true);
      safeSetError(null);
      try {
        const cred = await signInWithEmailLink(auth, effectiveMail, window.location.href);
        const signedInUser = cred.user;
        if (signedInUser) {
          await handleClientPostAuth(signedInUser, effectiveMail);
          if (!navigatedRef.current) {
            navigatedRef.current = true;
            navigate("/client/dashboard", { replace: true });
          }
        }
      } catch (err) {
        console.error(err);
        safeSetError("Lien invalide ou expiré. Merci de demander un nouveau lien.");
        safeSetMode("send");
      } finally {
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        finalizingRef.current = false;
        if (!navigatedRef.current) {
          safeSetProcessingLink(false);
          safeSetLoading(false);
        }
      }
    },
    [handleClientPostAuth, navigate]
  );

  useEffect(() => {
    if (mode !== "complete") return;
    if (!isSignInWithEmailLink(auth, window.location.href)) return;
    const mail = resolveEmail();
    if (mail) {
      finalize(mail);
    } else {
      safeSetProcessingLink(false);
      safeSetInfo("Saisis ton email pour finaliser la connexion.");
    }
  }, [mode, finalize]);

  const onSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    safeSetError(null);
    safeSetInfo(null);
    if (!email) {
      safeSetError("Merci de renseigner ton email professionnel.");
      return;
    }
    if (mode === "complete" && isSignInWithEmailLink(auth, window.location.href)) {
      await finalize(email);
      return;
    }
    safeSetLoading(true);
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      localStorage.setItem(STORAGE_KEY, email);
      safeSetMode("complete");
      safeSetInfo("Un lien de connexion vient de t’être envoyé par email.");
    } catch (err) {
      console.error(err);
      safeSetError("Impossible d'envoyer le lien. Vérifie l'email et réessaie.");
    } finally {
      safeSetProcessingLink(false);
      safeSetLoading(false);
    }
  };

  const onResend = async () => {
    if (loading || finalizingRef.current) return;
    const mail = resolveEmail();
    if (!mail) {
      safeSetError("Merci de renseigner ton email professionnel.");
      return;
    }
    safeSetLoading(true);
    safeSetError(null);
    safeSetInfo(null);
    try {
      await sendSignInLinkToEmail(auth, mail, actionCodeSettings);
      localStorage.setItem(STORAGE_KEY, mail);
      safeSetMode("complete");
      safeSetInfo("Un nouveau lien vient de t’être envoyé par email.");
    } catch (err) {
      console.error(err);
      safeSetError("Impossible d'envoyer le lien. Vérifie l'email et réessaie.");
    } finally {
      safeSetProcessingLink(false);
      safeSetLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div>
            <p className="eyebrow">Solaire Facile</p>
            <p className="title">Espace client</p>
            <p className="subtitle">
              Accède à ton tableau de bord avec un lien sécurisé.
            </p>
          </div>
          <div className="auth-actions">
            <ThemeToggle />
            <span className="badge info">Magic Link</span>
          </div>
        </div>

        {mode === "complete" && (
          <div className="alert success mt-2">
            Validation en cours. Le lien s’ouvrira automatiquement après confirmation.
          </div>
        )}

        {(processingLink || mode === "complete") && (
          <div className="pill info mb-2 mt-2">
            <span className="status-dot" />
            {processingLink
              ? "Validation du lien en cours..."
              : "Saisie de l'email pour finaliser"}
          </div>
        )}

        <form className="stack auth-form" onSubmit={onSubmit}>
          <div className="field">
            <label>Adresse email professionnelle</label>
            <div className="input-wrap">
              <span className="input-icon" aria-hidden />
              <input
                className="input with-icon"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@entreprise.com"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading
              ? mode === "complete"
                ? "Connexion..."
                : "Envoi en cours..."
              : mode === "complete"
                ? "Finaliser la connexion"
                : "Recevoir le lien"}
          </button>

          {mode === "complete" && (
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={onResend}
              disabled={loading}
            >
              Renvoyer le lien
            </button>
          )}
        </form>

        <div className="panel mt-2">
          <p className="section-heading">Étapes</p>
          <div className="stack tight mt-1">
            <span className="helper">1. Renseigne ton email professionnel.</span>
            <span className="helper">2. Ouvre le lien reçu par email.</span>
            <span className="helper">3. Accède à ton tableau de bord.</span>
          </div>
        </div>

        <div className="auth-security">
          Connexion chiffrée, aucun mot de passe requis. Assure-toi d’utiliser
          l’adresse email liée à ton entreprise.
        </div>

        {info && <div className="alert success">{info}</div>}
        {error && <div className="alert error">{error}</div>}

        <div className="auth-footer">
          <span>Support: assistance@solairefacile.fr</span>
          <span className="divider-dot">•</span>
          <span>Mode: {import.meta.env.MODE}</span>
        </div>
      </div>
    </div>
  );
}
