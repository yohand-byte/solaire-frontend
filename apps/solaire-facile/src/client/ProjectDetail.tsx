import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const API_BASE = "https://solaire-api-828508661560.europe-west1.run.app";
const API_TOKEN = "saftoken-123";

const STAGES = ["dp", "consuel", "enedis", "edfOa"];
const STAGE_LABELS: Record<string, string> = {
  dp: "DP Mairie",
  consuel: "Consuel",
  enedis: "Enedis",
  edfOa: "EDF OA",
};

const fetchJson = async (endpoint: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "X-Api-Token": API_TOKEN,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || `Erreur API (${res.status})`);
  }
  return body;
};

const formatDate = (value: any) => {
  if (!value) return "-";
  const date = value?._seconds ? new Date(value._seconds * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR");
};

const getStageStatus = (workflowConfig: any, stage: string, currentStep?: string) => {
  if (!currentStep || currentStep === "pending") return "pending";
  const steps = workflowConfig?.[stage]?.steps || [];
  const step = steps.find((item: any) => item.code === currentStep);
  if (step?.final) return step.success ? "success" : "rejected";
  return "in_progress";
};

const getStageProgress = (workflowConfig: any, stage: string, currentStep?: string) => {
  const steps = workflowConfig?.[stage]?.steps || [];
  if (!steps.length) return 0;
  const index = steps.findIndex((step: any) => step.code === currentStep);
  if (index <= 0) return 0;
  if (steps.length === 1) return 0;
  return index / (steps.length - 1);
};

const getProjectProgress = (workflowConfig: any, workflow: any) => {
  if (!workflowConfig || !workflow) return 0;
  const total = STAGES.reduce((acc, stage) => {
    const current = workflow?.[stage]?.currentStep || workflow?.[stage]?.status || "pending";
    return acc + getStageProgress(workflowConfig, stage, current);
  }, 0);
  return Math.round((total / STAGES.length) * 100);
};

export default function ProjectDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const installerId = localStorage.getItem("installerId");
  const [project, setProject] = useState<any>(null);
  const [workflowConfig, setWorkflowConfig] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    if (!id) return;
    const data = await fetchJson(`/api/projects/${id}`);
    setProject(data.project || data);
  }, [id]);

  const loadWorkflowConfig = useCallback(async () => {
    const data = await fetchJson("/api/workflow-config");
    setWorkflowConfig(data);
  }, []);

  const loadDocuments = useCallback(async () => {
    if (!id) return;
    const data = await fetchJson(`/api/documents?projectId=${id}`);
    setDocuments(data.items || []);
  }, [id]);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([loadProject(), loadWorkflowConfig(), loadDocuments()]);
      } catch (err: any) {
        if (active) setError(err?.message || "Erreur de chargement");
      } finally {
        if (active) setLoading(false);
      }
    };
    bootstrap();
    return () => {
      active = false;
    };
  }, [loadProject, loadWorkflowConfig, loadDocuments]);

  const documentsByStage = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    STAGES.forEach((stage) => {
      grouped[stage] = [];
    });
    documents.forEach((doc) => {
      if (doc.stage && grouped[doc.stage]) {
        grouped[doc.stage].push(doc);
      }
    });
    return grouped;
  }, [documents]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        Chargement...
      </div>
    );
  }

  if (!project || !installerId || project.installerId !== installerId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        Acces refuse.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-gray-500">{project.reference}</p>
            <h1 className="text-2xl font-bold text-gray-900">
              {project.beneficiary?.firstName} {project.beneficiary?.lastName}
            </h1>
            <p className="text-sm text-gray-500">
              {project.beneficiary?.email || "-"} - {project.beneficiary?.phone || "-"}
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
            {project.status || "in_progress"}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Progression globale</span>
            <span className="font-semibold text-gray-900">
              {project.progress ? project.progress : getProjectProgress(workflowConfig, project.workflow)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(0, project.progress ? project.progress : getProjectProgress(workflowConfig, project.workflow))
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Beneficiaire</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <div>{project.beneficiary?.address?.street || "-"}</div>
              <div>
                {project.beneficiary?.address?.postalCode || "-"} {project.beneficiary?.address?.city || ""}
              </div>
              <div>{project.beneficiary?.phone || "-"}</div>
              <div>{project.beneficiary?.email || "-"}</div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Installation</h2>
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
              <div>
                <div className="text-xs uppercase text-gray-400">Puissance</div>
                <div className="font-semibold text-gray-900">{project.installation?.power || 0} kWc</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Panneaux</div>
                <div className="font-semibold text-gray-900">{project.installation?.panelsCount || 0}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Marque panneaux</div>
                <div className="font-semibold text-gray-900">{project.installation?.panelsBrand || "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Onduleur</div>
                <div className="font-semibold text-gray-900">{project.installation?.inverterBrand || "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Toiture</div>
                <div className="font-semibold text-gray-900">{project.installation?.roofType || "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Raccordement</div>
                <div className="font-semibold text-gray-900">{project.installation?.raccordementType || "-"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Etapes du workflow</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STAGES.map((stage) => {
              const current = project.workflow?.[stage]?.currentStep || project.workflow?.[stage]?.status || "pending";
              const status = getStageStatus(workflowConfig, stage, current);
              const stepLabel = workflowConfig?.[stage]?.steps?.find((s: any) => s.code === current)?.label || current;
              return (
                <div key={stage} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{STAGE_LABELS[stage]}</div>
                      <div className="text-xs text-gray-500">{stepLabel}</div>
                    </div>
                    <span
                      className={[
                        "text-xs font-semibold px-2.5 py-1 rounded-full",
                        status === "success" && "bg-emerald-100 text-emerald-700",
                        status === "rejected" && "bg-red-100 text-red-700",
                        status === "in_progress" && "bg-amber-100 text-amber-700",
                        status === "pending" && "bg-gray-100 text-gray-500",
                      ].filter(Boolean).join(" ")}
                    >
                      {status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {STAGES.map((stage) => (
            <div key={stage} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{STAGE_LABELS[stage]}</h3>
                  <p className="text-sm text-gray-500">
                    Etape actuelle:{" "}
                    {workflowConfig?.[stage]?.steps?.find(
                      (s: any) =>
                        s.code ===
                        (project.workflow?.[stage]?.currentStep || project.workflow?.[stage]?.status || "pending")
                    )?.label || "Non demarre"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(workflowConfig?.[stage]?.steps || []).map((step: any) => {
                  const current = project.workflow?.[stage]?.currentStep || project.workflow?.[stage]?.status || "pending";
                  const isCurrent = step.code === current;
                  const isFinal = step.final;
                  const isSuccess = Boolean(step.success);
                  return (
                    <span
                      key={step.code}
                      className={[
                        "text-xs font-semibold px-3 py-1 rounded-full border",
                        isCurrent && "bg-amber-100 text-amber-700 border-amber-200",
                        !isCurrent && isFinal && isSuccess && "bg-emerald-100 text-emerald-700 border-emerald-200",
                        !isCurrent && isFinal && !isSuccess && "bg-red-100 text-red-700 border-red-200",
                        !isCurrent && !isFinal && "bg-gray-100 text-gray-500 border-gray-200",
                      ].filter(Boolean).join(" ")}
                    >
                      {step.label}
                    </span>
                  );
                })}
              </div>

              {documentsByStage[stage]?.length ? (
                <div className="space-y-3">
                  {documentsByStage[stage].map((doc: any) => {
                    const docUrl = doc.url || doc.downloadUrl;
                    const mimeType = doc.mimeType || doc.type || "";
                    const isPdf = mimeType.includes("pdf") || (docUrl || "").toLowerCase().includes(".pdf");
                    const isImage = mimeType.startsWith("image/") || (docUrl || "").match(/\.(png|jpe?g|gif|webp)$/i);
                    return (
                      <div key={doc.id} className="border border-gray-100 rounded-xl p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">{doc.filename || doc.name || "Document"}</div>
                            <div className="text-xs text-gray-500">{formatDate(doc.createdAt)}</div>
                          </div>
                          {docUrl && (
                            <a href={docUrl} target="_blank" rel="noreferrer" className="text-xs text-amber-600 font-semibold">
                              Ouvrir
                            </a>
                          )}
                        </div>
                        {docUrl && isPdf && (
                          <object data={docUrl} type="application/pdf" className="w-full h-64 rounded-lg border">
                            Apercu indisponible
                          </object>
                        )}
                        {docUrl && !isPdf && isImage && (
                          <img src={docUrl} alt={doc.filename || "Document"} className="w-full rounded-lg border" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-400">Aucun document.</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
