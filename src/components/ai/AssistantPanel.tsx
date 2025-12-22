import { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firestore";
import { FEATURE_AI_ASSISTANT } from "../../lib/flags";
import { callAiNextBestActions } from "../../lib/firebase/functions";
import AnalyzeButton from "./AnalyzeButton";
import ActionsList from "./ActionsList";
import RisksList from "./RisksList";
import type { AiAction, AiSummary } from "./types";

type Props = {
  dossierId: string;
};

const toDateString = (value?: any) => {
  if (!value) return "";
  if (typeof value.toDate === "function") return value.toDate().toLocaleString();
  if (value.seconds) return new Date(value.seconds * 1000).toLocaleString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
};

export default function AssistantPanel({ dossierId }: Props) {
  const [summaries, setSummaries] = useState<AiSummary[]>([]);
  const [actions, setActions] = useState<AiAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!FEATURE_AI_ASSISTANT || !dossierId) return;
    const q = query(
      collection(db, "ai_summaries"),
      where("dossierId", "==", dossierId),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items: AiSummary[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setSummaries(items);
    });
    return () => unsub();
  }, [dossierId]);

  useEffect(() => {
    if (!FEATURE_AI_ASSISTANT || !dossierId) return;
    const q = query(
      collection(db, "ai_actions"),
      where("dossierId", "==", dossierId),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items: AiAction[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setActions(items);
    });
    return () => unsub();
  }, [dossierId]);

  const latestSummary = useMemo(() => summaries[0], [summaries]);

  const pendingActions = useMemo(() => {
    const sorted = [...actions];
    sorted.sort((a, b) => {
      const aScore = a.status === "pending" ? 0 : 1;
      const bScore = b.status === "pending" ? 0 : 1;
      return aScore - bScore;
    });
    return sorted;
  }, [actions]);

  const approveAction = async (actionId: string) => {
    if (!actionId) return;
    setApprovingId(actionId);
    setError(null);
    setLoading(true);
    try {
      const res = await callAiNextBestActions({
        dossierId,
        actionUpdate: { actionId, status: "approved" },
      });
      const data = res.data as any;
      if (!data?.ok) {
        if (data?.disabled) throw new Error("Assistant IA désactivé (flag OFF)");
        throw new Error("Mise à jour refusée");
      }
    } catch (err: any) {
      setError(err?.message || "Impossible d'approuver cette action.");
    } finally {
      setLoading(false);
      setApprovingId(null);
    }
  };

  if (!FEATURE_AI_ASSISTANT) return null;
  if (!dossierId) return null;

  return (
    <div className="card" style={{ flex: 1, minWidth: 320 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <div className="pill soft">Assistant IA</div>
          <h4 style={{ margin: "6px 0" }}>Synthèse & actions</h4>
          <div className="small">Fonctionne uniquement si le flag est activé.</div>
        </div>
        <AnalyzeButton dossierId={dossierId} />
      </div>

      {latestSummary ? (
        <div style={{ marginTop: 12 }}>
          <div className="small" style={{ color: "#6b7280" }}>
            Dernière analyse : {toDateString(latestSummary.createdAt)} · Confiance :{" "}
            {Math.round((latestSummary.confidence || 0) * 100)}%
          </div>
          <p style={{ marginTop: 8 }}>{latestSummary.summary || "Résumé indisponible."}</p>
        </div>
      ) : (
        <div className="small" style={{ marginTop: 12 }}>
          Aucune synthèse IA disponible pour ce dossier.
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <h5 style={{ margin: "12px 0 6px" }}>Risques</h5>
        <RisksList risks={latestSummary?.risks || []} />
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <h5 style={{ margin: "12px 0 6px" }}>Actions suggérées</h5>
          <button
            className="btn-secondary"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                const res = await callAiNextBestActions({ dossierId });
                const data = res.data as any;
                if (!data?.ok && data?.disabled) {
                  setError("Assistant IA désactivé (flag OFF).");
                }
              } catch (err: any) {
                setError(err?.message || "Recalcul des actions impossible.");
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Calcul..." : "Proposer des actions"}
          </button>
        </div>
        <ActionsList actions={pendingActions} onApprove={approveAction} approvingId={approvingId} />
      </div>

      {error && <div className="small" style={{ color: "#b71c1c", marginTop: 8 }}>{error}</div>}
      <div className="small" style={{ marginTop: 8, color: "#6b7280" }}>
        Piloté par `VITE_FEATURE_AI_ASSISTANT` et `FEATURE_AI_ASSISTANT`.
      </div>
    </div>
  );
}
