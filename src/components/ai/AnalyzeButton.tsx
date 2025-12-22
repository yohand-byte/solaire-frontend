import { useState } from "react";
import { callAiSummarizeDossier } from "../../lib/firebase/functions";

type Props = {
  dossierId: string;
  onCompleted?: () => void;
};

export default function AnalyzeButton({ dossierId, onCompleted }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    if (!dossierId) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await callAiSummarizeDossier({ dossierId });
      const data = res.data as any;
      if (!data?.ok) {
        if (data?.disabled) {
          setError("Assistant IA désactivé (flag OFF).");
          return;
        }
        throw new Error("Analyse indisponible");
      }
      setMessage("Analyse lancée. Les recommandations se mettront à jour automatiquement.");
      if (onCompleted) onCompleted();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'analyse IA.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button className="btn-primary" disabled={loading || !dossierId} onClick={runAnalysis}>
        {loading ? "Analyse en cours..." : "Analyser le dossier"}
      </button>
      {message && <span className="small" style={{ color: "#155724" }}>{message}</span>}
      {error && <span className="small" style={{ color: "#b71c1c" }}>{error}</span>}
    </div>
  );
}
