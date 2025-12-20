import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import { ThemeToggle } from "../theme";
import { ensureUserDoc, findClientIdByEmail } from "../lib/firestore";
import AuthLayout from "../components/auth/AuthLayout";
import AuthCard from "../components/auth/AuthCard";
import AuthInput from "../components/auth/AuthInput";

const STORAGE_KEY = "sf_client_email_for_signin";
const DEV_BYPASS_PROVISION = import.meta.env?.VITE_BYPASS_CLIENT_PROVISION === "true";

export default function ClientLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingLink, setProcessingLink] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"send" | "complete">("send");

  const redirectUrl = useMemo(() => `${window.location.origin}/client/login`, []);

  const denyUnprovisioned = useCallback(
    async (msg: string) => {
      setInfo(msg);
      setError(null);
      setProcessingLink(false);
      setMode("send");
      try {
        await signOut(auth);
      } catch {}
    },
    []
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      const isMagicLink = isSignInWithEmailLink(auth, window.location.href);

      // Quand on arrive via le lien, c'est finalize() qui gère.
      if (isMagicLink) return;

      if (user) {
        const clientId = (await findClientIdByEmail(user.email)) ?? user.uid;

        // IMPORTANT: si pas provisionné, on ne va pas au dashboard (sinon boucle)
        if (!clientId || clientId === user.uid) {
          if (DEV_BYPASS_PROVISION) {
            setInfo("Provisionnement bypass (dev). Redirection...");
          } else {
            await denyUnprovisioned(
              "Compte client non provisionné. Contacte le support pour lier ton compte."
            );
            return;
          }
        }

        const resolvedClientId = clientId && clientId !== user.uid ? clientId : user.uid;

        await ensureUserDoc({
          role: "client",
          client_id: resolvedClientId,
          email: user.email ?? email,
          name: user.displayName ?? user.email ?? email,
        });

        navigate("/client/dashboard", { replace: true });
      }
    });

    return () => unsub();
  }, [navigate, email, denyUnprovisioned]);

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

        const clientId = (await findClientIdByEmail(user.email)) ?? user.uid;

        // IMPORTANT: si pas provisionné, on STOP ici (sinon boucle)
        if (!clientId || clientId === user.uid) {
          if (DEV_BYPASS_PROVISION) {
            setInfo("Provisionnement bypass (dev). Redirection...");
          } else {
            localStorage.removeItem(STORAGE_KEY);
            await denyUnprovisioned(
              "Compte client non provisionné. Contacte le support pour lier ton compte."
            );
            return;
          }
        }

        const resolvedClientId = clientId && clientId !== user.uid ? clientId : user.uid;

        await ensureUserDoc({
          role: "client",
          client_id: resolvedClientId,
          email: user.email ?? mail,
          name: user.displayName ?? user.email ?? mail,
        });

        localStorage.removeItem(STORAGE_KEY);
        navigate("/client/dashboard", { replace: true });
      } catch (err) {
        console.error(err);
        setError("Lien invalide ou expiré. Merci de demander un nouveau lien.");
        setMode("send");
      } finally {
        setProcessingLink(false);
        setLoading(false);
      }
    },
    [navigate, denyUnprovisioned]
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
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.code === "auth/invalid-api-key"
          ? "Clé API Firebase invalide. Vérifie la configuration."
          : err?.code === "auth/operation-not-allowed"
            ? "Méthode email/passwordless désactivée dans Firebase Auth."
            : err?.message ?? "Impossible d'envoyer le lien. Vérifie l'email et réessaie.";
      setError(`${msg}${err?.code ? ` (${err.code})` : ""}`);
    } finally {
      setProcessingLink(false);
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Espace installateur" subtitle="Accède à ton tableau de bord avec un lien sécurisé.">
      <AuthCard>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span className="pill info">Magic Link</span>
          <ThemeToggle />
        </div>

        {(processingLink || mode === "complete") && (
          <div className="pill info mb-2">
            <span className="status-dot" />
            {processingLink ? "Validation du lien en cours..." : "Saisie de l'email pour finaliser"}
          </div>
        )}

        <form className="stack" onSubmit={onSubmit}>
          <AuthInput
            label="Adresse email professionnelle"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@entreprise.com"
            required
            disabled={loading}
          />

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
          Vérifie ton email puis clique sur “Ouvrir dans l'application” pour être connecté automatiquement.
        </p>

        {info && <div className="alert success">{info}</div>}
        {error && <div className="alert error">{error}</div>}
      </AuthCard>
    </AuthLayout>
  );
}
