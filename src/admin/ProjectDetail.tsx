import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "https://solaire-api-828508661560.europe-west1.run.app"
).replace(/\/+$/, "");
const API_TOKEN = "saftoken-123";

const fetchJson = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "X-Api-Token": API_TOKEN,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const toDate = (value: any) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds || value._seconds) return new Date((value.seconds || value._seconds) * 1000);
  return new Date(value);
};

const formatDate = (value: any) => {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR");
};

const workflowStages = ["dp", "consuel", "enedis", "edfOa"] as const;

const workflowStatus = (stageData: any, config: any) => {
  const stepCode = String(stageData?.currentStep || "pending").toLowerCase();
  if (!stepCode || stepCode === "pending") return "pending";
  const step = config?.steps?.find((item: any) => item.code === stepCode);
  if (step?.final) return step.success ? "success" : "rejected";
  if (stepCode.includes("rejected")) return "rejected";
  if (["approved", "attestation_approved", "mes_done", "contract_signed"].includes(stepCode)) {
    return "success";
  }
  return "in_progress";
};

const workflowColors: Record<string, { background: string; color: string }> = {
  pending: { background: "#e2e8f0", color: "#475569" },
  in_progress: { background: "#fde68a", color: "#92400e" },
  success: { background: "#dcfce7", color: "#166534" },
  rejected: { background: "#fee2e2", color: "#991b1b" },
};

const stageLabel = (key: string) => {
  if (key === "dp") return "DP Mairie";
  if (key === "consuel") return "Consuel";
  if (key === "enedis") return "Enedis";
  if (key === "edfOa") return "EDF OA";
  return key;
};

const docPreview = (doc: any) => {
  if (!doc?.url) return <div className="doc-preview fallback">Aperçu indisponible</div>;
  const url = String(doc.url);
  const mime = doc.mimeType || "";
  const isPdf = mime === "application/pdf" || url.toLowerCase().endsWith(".pdf");
  const isImage = mime.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(url);

  if (isImage) {
    return <img src={url} alt={doc.filename || "document"} className="doc-preview" />;
  }
  if (isPdf) {
    return (
      <object data={url} type="application/pdf" className="doc-preview" aria-label={`Aperçu ${doc.filename || "document"}`}>
        Aperçu indisponible
      </object>
    );
  }
  return <div className="doc-preview fallback">Aperçu indisponible</div>;
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [workflowConfig, setWorkflowConfig] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [updatingStage, setUpdatingStage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState("dp");
  const [uploadCategory, setUploadCategory] = useState("autre");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [docsStageFilter, setDocsStageFilter] = useState("all");

  const loadProject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [projectRes, workflowRes] = await Promise.all([
        fetchJson(`/api/projects/${id}`),
        fetchJson("/api/workflow-config"),
      ]);
      setProject(projectRes?.project || projectRes);
      setWorkflowConfig(workflowRes?.config || workflowRes);
    } catch (err: any) {
      setError(err?.message || "Erreur API");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadDocuments = useCallback(async () => {
    if (!id) return;
    setDocsLoading(true);
    try {
      const params = new URLSearchParams({ projectId: id, limit: "200" });
      const docsRes = await fetchJson(`/api/documents?${params.toString()}`);
      const items = Array.isArray(docsRes?.items) ? docsRes.items : Array.isArray(docsRes) ? docsRes : [];
      setDocuments(items);
    } catch (err: any) {
      setMessage(err?.message || "Erreur chargement documents");
    } finally {
      setDocsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProject();
    loadDocuments();
  }, [loadProject, loadDocuments]);

  const handleWorkflowChange = async (stage: string, step: string) => {
    if (!id) return;
    setUpdatingStage(stage);
    setMessage(null);
    try {
      await fetchJson(`/api/projects/${id}/workflow/${stage}`, {
        method: "PATCH",
        body: JSON.stringify({ step }),
      });
      await loadProject();
    } catch (err: any) {
      setMessage(err?.message || "Erreur mise à jour workflow");
    } finally {
      setUpdatingStage(null);
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !selectedFiles?.length) return;
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      Array.from(selectedFiles).forEach((file) => {
        formData.append("file", file);
      });
      formData.append("projectId", id);
      formData.append("stage", uploadStage);
      formData.append("category", uploadCategory);

      const res = await fetch(`${API_BASE}/api/documents/upload`, {
        method: "POST",
        headers: { "X-Api-Token": API_TOKEN },
        body: formData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || res.statusText);
      setSelectedFiles(null);
      await loadDocuments();
    } catch (err: any) {
      setMessage(err?.message || "Erreur upload document");
    } finally {
      setUploading(false);
    }
  };

  const beneficiary = project?.beneficiary || {};
  const address = beneficiary.address || {};
  const installation = project?.installation || {};
  const beneficiaryName = [beneficiary.firstName, beneficiary.lastName].filter(Boolean).join(" ");
  const addressLine = [address.street, address.postalCode, address.city].filter(Boolean).join(" ");
  const progressValue = Math.round(project?.progress || 0);

  const filteredDocs = useMemo(() => {
    if (docsStageFilter === "all") return documents;
    return documents.filter((doc) => (doc.stage || "") === docsStageFilter);
  }, [documents, docsStageFilter]);

  if (loading) return <div className="card">Chargement du dossier…</div>;
  if (error) return <div className="card">Erreur API : {error}</div>;
  if (!project) return <div className="card">Dossier introuvable</div>;

  return (
    <div className="dashboard">
      <div className="header" style={{ marginBottom: 24, gap: 12 }}>
        <button className="btn-secondary" onClick={() => navigate("/admin/dashboard")}>
          ← Retour
        </button>
        <div>
          <div className="small">Dossier</div>
          <h2 style={{ margin: 2 }}>{project.reference || project.id}</h2>
          <div className="small">{beneficiaryName || beneficiary.email || "—"} · {addressLine || "Adresse non renseignée"}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 140 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{progressValue}%</div>
          <div style={{ background: "#e2e8f0", borderRadius: 999, height: 6, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min(100, progressValue)}%`,
                height: "100%",
                background: progressValue >= 100 ? "#16a34a" : "#f59e0b",
              }}
            />
          </div>
        </div>
      </div>

      {message && <div className="alert-info">{message}</div>}

      <div className="grid" style={{ gap: 16 }}>
        <div className="card" style={{ flex: 2 }}>
          <h4>Informations bénéficiaire</h4>
          <div className="info-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div>
              <div className="mini-label">Nom</div>
              <div className="mini-value">{beneficiaryName || "—"}</div>
            </div>
            <div>
              <div className="mini-label">Email</div>
              <div className="mini-value">{beneficiary.email || "—"}</div>
            </div>
            <div>
              <div className="mini-label">Téléphone</div>
              <div className="mini-value">{beneficiary.phone || "—"}</div>
            </div>
            <div>
              <div className="mini-label">Adresse</div>
              <div className="mini-value">{addressLine || "—"}</div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <h4>Installation</h4>
            <div className="info-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div>
                <div className="mini-label">Puissance</div>
                <div className="mini-value">{installation.power ? `${installation.power} kWc` : "—"}</div>
              </div>
              <div>
                <div className="mini-label">Panneaux</div>
                <div className="mini-value">{installation.panelsCount || "—"}</div>
              </div>
              <div>
                <div className="mini-label">Marque panneaux</div>
                <div className="mini-value">{installation.panelsBrand || "—"}</div>
              </div>
              <div>
                <div className="mini-label">Onduleur</div>
                <div className="mini-value">{installation.inverterBrand || "—"}</div>
              </div>
              <div>
                <div className="mini-label">Type toiture</div>
                <div className="mini-value">{installation.roofType || "—"}</div>
              </div>
              <div>
                <div className="mini-label">Raccordement</div>
                <div className="mini-value">{installation.raccordementType || "—"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h4>Pack</h4>
          <div className="small">{project.pack || "—"}</div>
          <div style={{ marginTop: 8, fontWeight: 700 }}>{project.packPrice ? `${project.packPrice} €/mois` : "—"}</div>
          <div style={{ marginTop: 16 }}>
            <h4>Dates</h4>
            <div className="small">Créé le : {formatDate(project.createdAt)}</div>
            <div className="small">MAJ : {formatDate(project.updatedAt)}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h4>Workflow</h4>
        <div className="grid" style={{ gap: 12, marginTop: 12 }}>
          {workflowStages.map((stageKey) => {
            const stageConfig = workflowConfig?.[stageKey];
            const stageData = project.workflow?.[stageKey] || {};
            const state = workflowStatus(stageData, stageConfig);
            const colors = workflowColors[state] || workflowColors.pending;
            return (
              <div key={stageKey} className="card" style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <strong>{stageConfig?.label || stageLabel(stageKey)}</strong>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 700,
                      background: colors.background,
                      color: colors.color,
                    }}
                  >
                    {stageData.currentStep || "pending"}
                  </span>
                </div>
                <div style={{ marginTop: 12 }}>
                  <select
                    value={stageData.currentStep || "pending"}
                    onChange={(e) => handleWorkflowChange(stageKey, e.target.value)}
                    disabled={updatingStage === stageKey}
                    style={{ width: "100%" }}
                  >
                    {(stageConfig?.steps || []).map((step: any) => (
                      <option key={step.code} value={step.code}>
                        {step.label}
                      </option>
                    ))}
                  </select>
                </div>
                {stageData.visitDate && (
                  <div className="small" style={{ marginTop: 8 }}>
                    Visite : {formatDate(stageData.visitDate)}
                  </div>
                )}
                {stageData.mesDate && (
                  <div className="small" style={{ marginTop: 8 }}>
                    MES : {formatDate(stageData.mesDate)}
                  </div>
                )}
                {stageData.btaNumber && (
                  <div className="small" style={{ marginTop: 8 }}>
                    BTA : {stageData.btaNumber}
                  </div>
                )}
                {stageData.contractNumber && (
                  <div className="small" style={{ marginTop: 8 }}>
                    Contrat : {stageData.contractNumber}
                  </div>
                )}
                {Array.isArray(stageData.history) && stageData.history.length > 0 && (
                  <ul className="timeline" style={{ marginTop: 12 }}>
                    {stageData.history.slice(-3).map((entry: any, index: number) => (
                      <li key={`${stageKey}-${index}`}>
                        <strong>{entry.to || entry.step || "—"}</strong>
                        {entry.notes && <span>{entry.notes}</span>}
                        {entry.at && <small>{formatDate(entry.at)}</small>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid" style={{ marginTop: 24, gap: 16 }}>
        <div className="card" style={{ flex: 1 }}>
          <h4>Documents</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <select value={docsStageFilter} onChange={(e) => setDocsStageFilter(e.target.value)}>
              <option value="all">Tous les stages</option>
              {workflowStages.map((stage) => (
                <option key={stage} value={stage}>
                  {workflowConfig?.[stage]?.label || stageLabel(stage)}
                </option>
              ))}
            </select>
          </div>
          {docsLoading && <div className="small">Chargement des documents…</div>}
          {!docsLoading && filteredDocs.length === 0 && <div className="small">Aucun document enregistré.</div>}
          {!docsLoading && filteredDocs.length > 0 && (
            <ul className="timeline">
              {filteredDocs.map((doc: any) => (
                <li key={doc.id || doc.url}>
                  <div className="doc-card">
                    <div className="doc-meta">
                      <div className="doc-pill">{(doc.category || "doc").slice(0, 3).toUpperCase()}</div>
                      <div className="doc-texts">
                        <div className="doc-name">{doc.filename || doc.uniqueName || "Document"}</div>
                        <small>{formatDate(doc.createdAt || doc.uploadedAt)}</small>
                        {doc.stage && <small>Stage : {workflowConfig?.[doc.stage]?.label || stageLabel(doc.stage)}</small>}
                        {doc.url && (
                          <a href={doc.url} target="_blank" rel="noreferrer" className="doc-open">
                            Ouvrir dans un nouvel onglet ↗
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="doc-preview-wrapper">{docPreview(doc)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h4>Ajouter un document</h4>
          <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
            <select value={uploadStage} onChange={(e) => setUploadStage(e.target.value)}>
              {workflowStages.map((stage) => (
                <option key={stage} value={stage}>
                  {workflowConfig?.[stage]?.label || stageLabel(stage)}
                </option>
              ))}
            </select>
            <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
              <option value="autre">Autre</option>
              <option value="dp">DP</option>
              <option value="consuel">Consuel</option>
              <option value="enedis">Enedis</option>
              <option value="edfOa">EDF OA</option>
            </select>
            <input
              type="file"
              accept="application/pdf,image/*"
              multiple
              onChange={(e) => setSelectedFiles(e.target.files)}
            />
            <button className="btn-primary" type="submit" disabled={uploading || !selectedFiles?.length}>
              {uploading ? "Upload..." : "Uploader"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
