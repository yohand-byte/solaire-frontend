import type { AiRisk } from "./types";

type Props = {
  risks: AiRisk[];
};

const severityColor = (severity: string) => {
  if (severity === "high") return "#b71c1c";
  if (severity === "medium") return "#e67e22";
  return "#2e7d32";
};

export default function RisksList({ risks }: Props) {
  if (!risks?.length) {
    return <div className="small">Aucun risque détecté.</div>;
  }
  return (
    <ul className="timeline">
      {risks.map((risk, idx) => (
        <li key={`${risk.label}-${idx}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <strong>{risk.label}</strong>
            <span
              className="badge"
              style={{
                background: severityColor(risk.severity),
                color: "#fff",
                textTransform: "capitalize",
              }}
            >
              {risk.severity}
            </span>
          </div>
          <div className="small" style={{ marginTop: 4 }}>{risk.evidence || "Pas de justification fournie."}</div>
        </li>
      ))}
    </ul>
  );
}
