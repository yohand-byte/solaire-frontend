import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

type NormStatus = "EN_ATTENTE" | "EN_COURS" | "VALIDE" | "REFUSE" | "TERMINE" | "UNKNOWN";

function stripAccents(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function canon(input: any): string {
  const s = stripAccents(String(input ?? "")).trim().toLowerCase();
  return s.replace(/[^a-z0-9]+/g, "").replace(/^_+|_+$/g, "");
}

function normalizeStatus(d: any): NormStatus {
  const raw =
    d?.status ??
    d?.statut ??
    d?.state ??
    d?.step ??
    d?.phase ??
    d?.status_label ??
    d?.statusLabel ??
    d?.statusText ??
    d?.label ??
    "";

  const v = canon(raw);

  const map: Record<Exclude<NormStatus, "UNKNOWN">, string[]> = {
    EN_ATTENTE: ["en_attente", "attente", "pending", "to_do", "todo", "new", "nouveau"],
    EN_COURS: ["en_cours", "cours", "in_progress", "progress", "working", "processing", "open"],
    VALIDE: ["valide", "approved", "accept", "accepted", "ok", "validated", "validation_ok"],
    REFUSE: ["refuse", "refus", "rejected", "deny", "denied", "ko", "canceled", "cancelled"],
    TERMINE: ["termine", "fini", "complete", "completed", "closed", "archive", "archived", "done", "final"],
  };

  for (const key of Object.keys(map) as Exclude<NormStatus, "UNKNOWN">[]) {
    if (map[key].some((t) => v === t || v.includes(t))) return key;
  }
  return "UNKNOWN";
}

export default function ClientDashboard() {
  const [uid, setUid] = useState<string | null>(null);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const DEBUG = import.meta.env.VITE_DEBUG_CLIENT === "true";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUid(null);
        setDossiers([]);
        setError("Non authentifié");
        setLoading(false);
        return;
      }
      setUid(user.uid);
      setError(null);
      setLoading(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;

    let unsub: (() => void) | null = null;
    let cancelled = false;

    const subscribeField = (field: string, onEmpty: () => void) => {
      const colRef = collection(db, "dossiers");
      const q = query(colRef, where(field, "==", uid));
      unsub = onSnapshot(
        q,
        (snap) => {
          if (cancelled) return;
          const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          if (DEBUG) console.log("[CLIENT_DASHBOARD] snap field", field, "size", snap.size, "ids", items.map((i) => i.id));
          if (snap.empty) {
            onEmpty();
            return;
          }
          setDossiers(items);
          setLoading(false);
          setError(null);
        },
        (err) => {
          if (DEBUG) console.error("[CLIENT_DASHBOARD] snap error", field, err?.code, err?.message);
          setError(err?.message ?? "Erreur de chargement");
          setLoading(false);
        },
      );
    };

    const fallback2 = () => subscribeField("client_id", () => setDossiers([]));
    const fallback1 = () => subscribeField("installerId", fallback2);
    subscribeField("ownerUid", fallback1);

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [uid, DEBUG]);

  const visibleRows = useMemo(() => {
    return dossiers;
  }, [dossiers]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Tableau de bord installateur</h2>
      <p>Suivi en temps réel de vos dossiers.</p>

      {loading && <p>Chargement des dossiers…</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
      {!loading && !error && visibleRows.length === 0 && <p>Aucun dossier.</p>}

      <div className="stack" style={{ gap: 12 }}>
        {visibleRows.map((row) => {
          const rowId = row.id ?? row.installerId ?? row.client_id ?? row.ownerUid ?? "(sans id)";
          const rowTitle = row.title ?? "(sans titre)";
          const rowStatus = row.status ?? row.statut ?? "INCONNU";
          return (
            <div key={rowId} className="card stack" style={{ padding: 12 }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div className="stack">
                  <h4 style={{ margin: 0 }}>{rowTitle}</h4>
                  <p className="section-sub">ID : {rowId}</p>
                </div>
                <span className="badge info">{rowStatus}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
