import { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../lib/firestore";
import { routeAfterLogin } from "../routing/afterLogin";

export default function LoginAdmin() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: any) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pw);
      await routeAfterLogin(cred.user);
    } catch (er: any) {
      setErr(er.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card narrow">
      <h3>Connexion Admin</h3>
      <form onSubmit={submit} className="two-cols">
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Mot de passe" value={pw} onChange={(e) => setPw(e.target.value)} />
        {err && <div className="small" style={{ color: "red" }}>{err}</div>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
