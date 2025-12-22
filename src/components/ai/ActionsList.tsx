import type { AiAction } from "./types";

type Props = {
  actions: AiAction[];
  onApprove?: (id: string) => Promise<void>;
  approvingId?: string | null;
};

const statusLabel = (status: string) => {
  if (status === "approved") return "Approuvée";
  if (status === "rejected") return "Rejetée";
  if (status === "done") return "Terminée";
  return "En attente";
};

export default function ActionsList({ actions, onApprove, approvingId }: Props) {
  if (!actions?.length) {
    return <div className="small">Aucune action IA pour le moment.</div>;
  }
  return (
    <ul className="timeline">
      {actions.map((action) => (
        <li key={action.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{action.title}</div>
              <div className="small">{action.description}</div>
              <div className="small" style={{ marginTop: 4 }}>
                Échéance : {action.dueAt || "—"} · Priorité : {action.priority}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <span className="badge" style={{ textTransform: "capitalize" }}>
                {statusLabel(action.status)}
              </span>
              {onApprove && action.status === "pending" && (
                <button
                  className="btn-secondary"
                  disabled={approvingId === action.id}
                  onClick={() => onApprove(action.id)}
                >
                  {approvingId === action.id ? "Validation..." : "Approuver"}
                </button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
