import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Upload } from "lucide-react";

const API_BASE = "https://solaire-api-828508661560.europe-west1.run.app";
const API_TOKEN = "saftoken-123";

const WORKFLOW_STAGES = ["dp", "consuel", "enedis", "edfOa"];

const stageFallbackLabels: Record<string, string> = {
  dp: "DP Mairie",
  consuel: "Consuel",
  enedis: "Enedis",
  edfOa: "EDF OA",
};

const stageShortLabels: Record<string, string> = {
  dp: "DP",
  consuel: "CONS",
  enedis: "ENED",
  edfOa: "OA",
};

const stageStatusLabels: Record<string, string> = {
  pending: "Non demarre",
  in_progress: "En cours",
  success: "Valide",
  rejected: "Refuse",
};

const stageStatusClasses: Record<string, string> = {
  pending: "bg-gray-100 text-gray-500",
  in_progress: "bg-amber-100 text-amber-700",
  success: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const formatDate = (value: any) => {
  if (!value) return "-";
  const date = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR");
};

const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "X-Api-Token": API_TOKEN,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.error || body?.message || `Erreur API (${res.status})`;
    throw new Error(message);
  }
  return body;
};

const getStageStatus = (workflowConfig: any, stage: string, currentStep?: string) => {
  if (!currentStep || currentStep === "pending") return "pending";
  const stageConfig = workflowConfig?.[stage];
  const step = stageConfig?.steps?.find((item: any) => item.code === currentStep);
  if (step?.final) {
    return step.success ? "success" : "rejected";
  }
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
  const total = WORKFLOW_STAGES.reduce((acc, stage) => {
    const current = workflow?.[stage]?.currentStep || workflow?.[stage]?.status || "pending";
    return acc + getStageProgress(workflowConfig, stage, current);
  }, 0);
  return Math.round((total / WORKFLOW_STAGES.length) * 100);
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [workflowConfig, setWorkflowConfig] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState("all");
  const [uploadStage, setUploadStage] = useState("dp");
  const [uploadCategory, setUploadCategory] = useState("administratif");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savingStage, setSavingStage] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);

  const loadProject = useCallback(async () => {
    if (!id) return;
    const data = await apiFetch(`/api/projects/${id}`);
    setProject(data.project || data);
  }, [id]);

  const loadWorkflowConfig = useCallback(async () => {
    const data = await apiFetch("/api/workflow-config");
    setWorkflowConfig(data);
  }, []);

  const loadDocuments = useCallback(async () => {
    if (!id) return;
    const params = new URLSearchParams({ projectId: id });
    if (stageFilter !== "all") params.set("stage", stageFilter);
    const data = await apiFetch(`/api/documents?${params.toString()}`);
    setDocuments(Array.isArray(data) ? data : data.items || []);
  }, [id, stageFilter]);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([loadProject(), loadWorkflowConfig()]);
        if (active) await loadDocuments();
      } catch (err: any) {
        if (active) setError(err?.message || "Erreur lors du chargement");
      } finally {
        if (active) setLoading(false);
      }
    };
    bootstrap();
    return () => { active = false; };
  }, [loadProject, loadWorkflowConfig, loadDocuments]);

  const handleStageChange = async (stage: string, nextStep: string) => {
    if (!id) return;
    setSavingStage((prev) => ({ ...prev, [stage]: true }));
    try {
      await apiFetch(`/api/projects/${id}/workflow/${stage}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: nextStep }),
      });
      await loadProject();
    } catch (err: any) {
      setError(err?.message || "Mise a jour impossible");
    } finally {
      setSavingStage((prev) => ({ ...prev, [stage]: false }));
    }
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("projectId", id);
      formData.append("stage", uploadStage);
      formData.append("category", uploadCategory);
      await apiFetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      setSelectedFile(null);
      await loadDocuments();
    } catch (err: any) {
      setError(err?.message || "Upload impossible");
    } finally {
      setUploading(false);
    }
  };

  const stageOptions = useMemo(() => {
    return WORKFLOW_STAGES.map((stage) => ({
      code: stage,
      label: workflowConfig?.[stage]?.label || stageFallbackLabels[stage],
    }));
  }, [workflowConfig]);

  const computedProgress = getProjectProgress(workflowConfig, project?.workflow);
  const projectProgress = project?.progress ? project.progress : computedProgress;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Chargement du projet...</div>
      </div>
    );
  }

  if (!project || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">{error || "Projet introuvable"}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-gray-500">{project.reference || "Projet"}</p>
            <h1 className="text-2xl font-bold text-gray-900">
              {project.beneficiary?.firstName} {project.beneficiary?.lastName}
            </h1>
            <p className="text-sm text-gray-500">
              {project.beneficiary?.email || "-"} - {project.beneficiary?.phone || "-"}
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            {project.status || "in_progress"}
          </span>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
            <span>Progression</span>
            <span className="font-semibold text-gray-900">{projectProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, projectProgress))}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Workflow</h2>
              <p className="text-sm text-gray-500">Mettre a jour chaque etape.</p>
            </div>

            <div className="space-y-4">
              {WORKFLOW_STAGES.map((stage) => {
                const stageConfig = workflowConfig?.[stage];
                const currentStep = project.workflow?.[stage]?.currentStep || project.workflow?.[stage]?.status || "pending";
                const status = getStageStatus(workflowConfig, stage, currentStep);
                const steps = stageConfig?.steps || [];
                const selectSteps = steps.length ? steps : [{ code: currentStep, label: currentStep }];

                return (
                  <div key={stage} className="border border-gray-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {stageConfig?.label || stageFallbackLabels[stage]}
                        </div>
                        <div className="text-xs text-gray-500">
                          Etape actuelle: {steps.find((s: any) => s.code === currentStep)?.label || currentStep}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stageStatusClasses[status]}`}>
                        {stageStatusLabels[status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200"
                        value={currentStep}
                        onChange={(event) => handleStageChange(stage, event.target.value)}
                        disabled={savingStage[stage]}
                      >
                        {selectSteps.map((step: any) => (
                          <option key={step.code} value={step.code}>
                            {step.label}
                          </option>
                        ))}
                      </select>
                      <span className={`text-xs font-semibold px-2.5 py-2 rounded-lg ${stageStatusClasses[status]}`}>
                        {stageShortLabels[stage]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
              <p className="text-sm text-gray-500">Upload et previsualisation.</p>
            </div>

            <form onSubmit={handleUpload} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200"
                  value={uploadStage}
                  onChange={(event) => setUploadStage(event.target.value)}
                >
                  {stageOptions.map((stage) => (
                    <option key={stage.code} value={stage.code}>{stage.label}</option>
                  ))}
                </select>
                <input
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200"
                  value={uploadCategory}
                  onChange={(event) => setUploadCategory(event.target.value)}
                  placeholder="Categorie"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <input
                  type="file"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-600 hover:file:bg-amber-100"
                />
                <button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white shadow-sm disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? "Upload..." : "Uploader"}
                </button>
              </div>
            </form>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <span className="inline-flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documents
              </span>
              <select
                className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                value={stageFilter}
                onChange={(event) => setStageFilter(event.target.value)}
              >
                <option value="all">Toutes les etapes</option>
                {stageOptions.map((stage) => (
                  <option key={stage.code} value={stage.code}>{stage.label}</option>
                ))}
              </select>
            </div>

            {documents.length === 0 ? (
              <div className="text-sm text-gray-400">Aucun document pour le moment.</div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc: any) => {
                  const docUrl = doc.downloadUrl || doc.url || doc.fileUrl;
                  const type = doc.type || doc.mimeType || "";
                  const isPdf = type.includes("pdf") || (docUrl || "").toLowerCase().includes(".pdf");
                  const isImage = type.startsWith("image/") || (docUrl || "").match(/\.(png|jpe?g|gif|webp)$/i);
                  return (
                    <div key={doc.id || docUrl} className="border border-gray-100 rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{doc.name || "Document"}</div>
                          <div className="text-xs text-gray-500">
                            {doc.stage ? stageFallbackLabels[doc.stage] : "Sans etape"} - {formatDate(doc.createdAt || doc.uploadedAt)}
                          </div>
                        </div>
                        {docUrl && (
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-amber-600 hover:text-amber-700"
                          >
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
                        <img src={docUrl} alt={doc.name || "Document"} className="w-full rounded-lg border" />
                      )}
                      {docUrl && !isPdf && !isImage && (
                        <div className="text-xs text-gray-400">Apercu indisponible</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
