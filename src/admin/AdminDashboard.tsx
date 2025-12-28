import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firestore";
import { PACKS } from "../constants";

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

const todayKey = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
};

const packClass = (pack = "") => `badge-pack badge-pack-${pack.replace(/[^a-z0-9]/gi, "_")}`;

const workflowStages = ["dp", "consuel", "enedis", "edfOa"] as const;

const workflowStatus = (project: any, stage: string, config: any) => {
  const stepCode = String(project?.workflow?.[stage]?.currentStep || "pending").toLowerCase();
  if (!stepCode || stepCode === "pending") return "pending";
  const step = config?.[stage]?.steps?.find((item: any) => item.code === stepCode);
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

const workflowLabel = (stage: string) => {
  if (stage === "dp") return "DP";
  if (stage === "consuel") return "Consuel";
  if (stage === "enedis") return "Enedis";
  if (stage === "edfOa") return "EDF OA";
  return stage;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [workflowConfig, setWorkflowConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packFilter, setPackFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadsRes, projectsRes, workflowRes] = await Promise.all([
        fetchJson("/api/leads?limit=200"),
        fetchJson("/api/projects?limit=200"),
        fetchJson("/api/workflow-config"),
      ]);
      const leads = Array.isArray(leadsRes?.items) ? leadsRes.items : Array.isArray(leadsRes) ? leadsRes : [];
      const projects = Array.isArray(projectsRes?.items)
        ? projectsRes.items
        : Array.isArray(projectsRes)
        ? projectsRes
        : [];
      const config = workflowRes?.config || workflowRes;
      setLeadsData(leads);
      setProjectsData(projects);
      setWorkflowConfig(config);
    } catch (err: any) {
      setError(err?.message || "Erreur API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const leads = leadsData || [];
  const projects = projectsData || [];

  const stats = useMemo(() => {
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const recentLeads = leads
      .map((lead: any) => ({
        ...lead,
        __created: toDate(lead.createdAt) || new Date(),
      }))
      .filter((lead: any) => now - lead.__created.getTime() <= THIRTY_DAYS)
      .sort((a: any, b: any) => b.__created.getTime() - a.__created.getTime());
    const gained = recentLeads.filter((lead: any) => ["gagne", "converted"].includes((lead.status || "").toLowerCase()));
    const lost = recentLeads.filter((lead: any) => ["perdu", "lost"].includes((lead.status || "").toLowerCase()));
    const activeProjects = projects.filter((project: any) => (project.status || "").toLowerCase() === "in_progress");
    const completedProjects = projects.filter((project: any) => (project.status || "").toLowerCase() === "completed");
    const blockedProjects = projects.filter((project: any) => (project.status || "").toLowerCase() === "blocked");
    return {
      leads30: recentLeads.length,
      gained: gained.length,
      lost: lost.length,
      recentLeads,
      projectsTotal: projects.length,
      projectsActive: activeProjects.length,
      projectsCompleted: completedProjects.length,
      projectsBlocked: blockedProjects.length,
    };
  }, [leads, projects]);

  const actionsToday = useMemo(() => {
    const today = todayKey();
    const tomorrow = today + 24 * 60 * 60 * 1000;
    const actions = [];
    projects.forEach((project: any) => {
      const consuelDate = toDate(project.workflow?.consuel?.visitDate);
      const enedisDate = toDate(project.workflow?.enedis?.mesDate);
      if (consuelDate && consuelDate.getTime() >= today && consuelDate.getTime() < tomorrow) {
        actions.push({ project, label: "Visite Consuel", date: consuelDate });
      }
      if (enedisDate && enedisDate.getTime() >= today && enedisDate.getTime() < tomorrow) {
        actions.push({ project, label: "MES Enedis", date: enedisDate });
      }
    });
    return actions;
  }, [projects]);

  const overdue = useMemo(() => {
    return projects.filter((project: any) => (project.status || "").toLowerCase() === "blocked");
  }, [projects]);

  const filteredFiles = useMemo(() => {
    return projects.filter((project: any) => {
      const pack = (project.pack || project.packCode || "").toLowerCase();
      if (packFilter && pack !== packFilter) return false;
      const status = (project.status || "").toLowerCase();
      if (statusFilter && status !== statusFilter) return false;
      if (search) {
        const needle = search.toLowerCase();
        const beneficiary = project.beneficiary || {};
        const address = beneficiary.address || {};
        return [
          project.reference,
          beneficiary.firstName,
          beneficiary.lastName,
          beneficiary.email,
          beneficiary.phone,
          address.street,
          address.city,
          address.postalCode,
        ]
          .filter(Boolean)
          .some((value: string) => value.toLowerCase().includes(needle));
      }
      return true;
    });
  }, [projects, packFilter, statusFilter, search]);

  const leadName = (lead: any) => {
    const contact = lead.contact || {};
    if (contact.firstName || contact.lastName) {
      return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
    }
    return lead.name || lead.fullName || lead.profile || "—";
  };

  const leadEmail = (lead: any) => lead.contact?.email || lead.email || "—";
  const leadPhone = (lead: any) => lead.contact?.phone || lead.phone || "—";

  if (loading) {
    return <div className="card">Chargement du dashboard…</div>;
  }
  if (error) {
    return <div className="card">Erreur API : {error}</div>;
  }

  return (
    <div className="dashboard">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12, gap: 8 }}>
        <button className="btn-secondary" onClick={() => navigate("/admin/login", { replace: true })}>
          Clé admin
        </button>
        <button className="btn-secondary" onClick={async () => { await signOut(auth); navigate("/client/login", { replace: true }); }}>
          Déconnexion
        </button>
      </div>
      <div className="cards">
        <div className="metric">
          <div className="metric-header">
            <span>Leads (30 j)</span>
            <span style={{ fontSize: 18 }}>📈</span>
          </div>
          <div className="big">{stats.leads30}</div>
          <div className="small">Gagnés : {stats.gained} · Perdus : {stats.lost}</div>
        </div>
        <div className="metric">
          <div className="metric-header">
            <span>Dossiers</span>
            <span style={{ fontSize: 18 }}>📂</span>
          </div>
          <div className="big">{stats.projectsTotal}</div>
          <div className="small">En cours : {stats.projectsActive} · Terminés : {stats.projectsCompleted}</div>
        </div>
        <div className="metric">
          <div className="metric-header">
            <span>Actions du jour</span>
            <span style={{ fontSize: 18 }}>⏰</span>
          </div>
          <div className="big">{actionsToday.length}</div>
          <div className="small">planifiées aujourd’hui</div>
        </div>
        <div className="metric">
          <div className="metric-header">
            <span>En retard</span>
            <span style={{ fontSize: 18 }}>⚠️</span>
          </div>
          <div className="big">{overdue.length}</div>
          <div className="small">Dossiers bloqués</div>
        </div>
      </div>

      {stats.recentLeads?.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4>Leads récents (30 j)</h4>
            <div className="small">Total : {stats.recentLeads.length}</div>
          </div>
          <div className="table-wrapper" style={{ maxHeight: 260 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nom / Profil</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentLeads.slice(0, 20).map((lead: any) => (
                <tr
                  key={lead.id}
                  className="clickable-row"
                  onClick={() => navigate(`/admin/leads/${lead.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{leadName(lead)}</td>
                  <td>{leadEmail(lead)}</td>
                  <td>{leadPhone(lead)}</td>
                  <td><span className={`badge-status ${lead.status || "nouveau"}`}>{lead.status || "nouveau"}</span></td>
                  <td>{(lead.__created || toDate(lead.createdAt) || new Date()).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid" style={{ marginTop: 24, gap: 16 }}>
        <div className="card" style={{ flex: 1 }}>
          <h4>Actions du jour</h4>
          {actionsToday.length === 0 && <div className="small">Aucune action planifiée.</div>}
          {actionsToday.length > 0 && (
            <ul className="timeline">
              {actionsToday.map((item: any) => (
                <li key={`${item.project.id}-${item.label}`}>
                  <strong>{item.project.reference || item.project.title}</strong>
                  <span>{item.label}</span>
                  <small>{item.date.toLocaleDateString()}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card" style={{ flex: 1 }}>
          <h4>Dossiers en retard</h4>
          {overdue.length === 0 && <div className="small">Aucun dossier en retard.</div>}
          {overdue.length > 0 && (
            <ul className="timeline">
              {overdue.map((project: any) => (
                <li key={project.id}>
                  <strong>{project.reference || project.title}</strong>
                  <span>Statut : bloqué</span>
                  <small>Progression : {Math.round(project.progress || 0)}%</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="filters" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <select value={packFilter} onChange={(e) => setPackFilter(e.target.value)}>
            <option value="">Pack (tous)</option>
            {PACKS.map((pack) => (
              <option key={pack.value} value={pack.value}>{pack.label}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Statut (tous)</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminé</option>
            <option value="blocked">Bloqué</option>
          </select>
          <input
            placeholder="Recherche référence / client"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Client</th>
                <th>Pack</th>
                <th>Progress</th>
                <th>Workflow</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((project: any) => {
                const beneficiary = project.beneficiary || {};
                const fullName = [beneficiary.firstName, beneficiary.lastName].filter(Boolean).join(" ");
                const packValue = (project.pack || project.packCode || "").toLowerCase();
                const progressValue = Math.round(project.progress || 0);
                return (
                  <tr
                    key={project.id}
                    className="clickable-row"
                    onClick={() => navigate(`/admin/projects/${project.id}`)}
                  >
                    <td>{project.reference || project.title}</td>
                    <td>{fullName || beneficiary.email || "—"}</td>
                    <td>
                      <span className={packClass(packValue || "")}>
                        {PACKS.find((p) => p.value === packValue)?.label || project.pack || "—"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 120 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{progressValue}%</div>
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
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {workflowStages.map((stage) => {
                          const state = workflowStatus(project, stage, workflowConfig);
                          const colors = workflowColors[state] || workflowColors.pending;
                          return (
                            <span
                              key={stage}
                              title={`${workflowLabel(stage)} : ${project.workflow?.[stage]?.currentStep || "pending"}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "4px 8px",
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 700,
                                background: colors.background,
                                color: colors.color,
                              }}
                            >
                              {workflowLabel(stage)}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
