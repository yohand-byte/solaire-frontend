import { useState } from "react";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { useAuth } from "../hooks/useAuth";
import { db } from "../lib/firestore";

export default function FixInstallerIds() {
  const { user, claims, loading } = useAuth();
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string>("");

  if (loading) return null;
  if (!user || claims?.role !== "admin") return <div className="card">Accès admin requis</div>;

  const fix = async () => {
    setRunning(true);
    setStatus("Migration en cours...");
    let updated = 0;
    try {
      const snap = await getDocs(collection(db, "clients"));
      for (const docSnap of snap.docs) {
        await updateDoc(doc(db, "clients", docSnap.id), { installerId: "INST123" });
        updated += 1;
      }
      setStatus(`Migration terminée : ${updated} document${updated > 1 ? "s" : ""} mis à jour.`);
    } catch (err: any) {
      setStatus(`Erreur migration : ${err.message || err}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="card">
      <h3>Corriger les installerId</h3>
      <p className="small">Force l'installerId sur "INST123" dans tous les clients Firestore.</p>
      <button className="btn-primary" disabled={running} onClick={fix}>
        {running ? "Correction en cours..." : "Corriger maintenant"}
      </button>
      {status && <div style={{ marginTop: 10 }}>{status}</div>}
    </div>
  );
}
