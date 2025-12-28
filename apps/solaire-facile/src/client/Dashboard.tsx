import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

const API_BASE = "https://solaire-api-828508661560.europe-west1.run.app";
const API_TOKEN = "saftoken-123";

const STAGES = ["dp", "consuel", "enedis", "edfOa"];
const STAGE_LABELS: Record<string, string> = {
  dp: "DP",
  consuel: "CONS",
  enedis: "ENED",
  edfOa: "OA",
};

const fetchJson = async (endpoint: string) => {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "X-Api-Token": API_TOKEN },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || `Erreur API (${res.status})`);
  }
  return body;
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

export default function ClientDashboard() {
  const navigate = useNavigate();
  const installerId = localStorage.getItem("installerId");
  const [installer, setInstaller] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [workflowConfig, setWorkflowConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!installerId) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [installerRes, projectsRes, workflowRes] = await Promise.all([
          fetchJson(`/api/installers/${installerId}`),
          fetchJson(`/api/installers/${installerId}/projects`),
          fetchJson("/api/workflow-config"),
        ]);
        if (!active) return;
        setInstaller(installerRes.installer || installerRes);
        setProjects(projectsRes.items || []);
        setWorkflowConfig(workflowRes);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Erreur de chargement");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [installerId]);

  const stats = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter((p) => p.status === "in_progress").length;
    const completed = projects.filter((p) => p.status === "completed").length;
    return { total, inProgress, completed };
  }, [projects]);

  const handleLogout = () => {
    localStorage.removeItem("installerId");
    localStorage.removeItem("installerEmail");
    navigate("/client/login", { replace: true });
  };

  if (!installerId) {
    return <Navigate to="/client/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{installer?.company || "Installateur"}</h1>
            <p className="text-sm text-gray-500">Vos dossiers Solaire Facile</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
          >
            <LogOut className="w-4 h-4" />
            Deconnexion
          </button>
        </header>

        {loading ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-gray-500">Chargement...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-600">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Total dossiers", value: stats.total },
                { label: "En cours", value: stats.inProgress },
                { label: "Finalises", value: stats.completed },
              ].map((stat) => (
                <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {projects.map((project) => {
                const progress = project.progress ? project.progress : getProjectProgress(workflowConfig, project.workflow);
                return (
                  <div
                    key={project.id}
                    className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/client/projects/${project.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">{project.reference}</p>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {project.beneficiary?.firstName} {project.beneficiary?.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">{project.installation?.power || 0} kWc</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                        {project.status || "in_progress"}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-500">Progression</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      {STAGES.map((stage) => {
                        const current = project.workflow?.[stage]?.currentStep || project.workflow?.[stage]?.status || "pending";
                        const status = getStageStatus(workflowConfig, stage, current);
                        return (
                          <span
                            key={stage}
                            className={[
                              "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold",
                              status === "success" && "bg-emerald-100 text-emerald-600",
                              status === "rejected" && "bg-red-100 text-red-600",
                              status === "in_progress" && "bg-amber-100 text-amber-600",
                              status === "pending" && "bg-gray-100 text-gray-400",
                            ].filter(Boolean).join(" ")}
                          >
                            {STAGE_LABELS[stage]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
