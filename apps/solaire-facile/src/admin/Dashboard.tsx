import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firestore";
import { 
  LayoutDashboard, Users, FolderKanban, UserPlus, FileText, Settings, Menu, X, 
  Sun, Bell, Search, ChevronDown, LogOut, Mail, Phone, Building2, MapPin, Zap,
  Plus, ChevronRight, Clock, CheckCircle2, AlertCircle, Play, Check, Euro
} from "lucide-react";
import { clsx } from "clsx";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const API_BASE = "https://solaire-api-828508661560.europe-west1.run.app";
const API_TOKEN = "saftoken-123";

const fetchAPI = async (endpoint: string) => {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "X-Api-Token": API_TOKEN }
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
};

const postAPI = async (endpoint: string, data: any) => {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "X-Api-Token": API_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
};

const WORKFLOW_STAGES = ["dp", "consuel", "enedis", "edfOa"];
const STAGE_SHORT_LABELS: Record<string, string> = {
  dp: "DP",
  consuel: "CONS",
  enedis: "ENED",
  edfOa: "OA",
};
const STAGE_STATUS_CLASSES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-400",
  in_progress: "bg-amber-100 text-amber-700",
  success: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const getStageStatus = (workflowConfig: any, stage: string, currentStep?: string) => {
  if (!currentStep || currentStep === "pending") return "pending";
  const stageConfig = workflowConfig?.[stage];
  const step = stageConfig?.steps?.find((item: any) => item.code === currentStep);
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
  const total = WORKFLOW_STAGES.reduce((acc, stage) => {
    const current = workflow?.[stage]?.currentStep || workflow?.[stage]?.status || "pending";
    return acc + getStageProgress(workflowConfig, stage, current);
  }, 0);
  return Math.round((total / WORKFLOW_STAGES.length) * 100);
};

// ═══════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════

function Button({ children, variant = "primary", size = "md", loading, icon: Icon, className, ...props }: any) {
  const variants: any = {
    primary: "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-500/25",
    secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm",
    success: "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/25",
    danger: "bg-gradient-to-r from-red-600 to-red-500 text-white",
    ghost: "hover:bg-gray-100 text-gray-600",
    solar: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25",
  };
  const sizes: any = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-6 py-3" };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={clsx("inline-flex items-center justify-center font-medium rounded-xl transition-all", variants[variant], sizes[size], className)}
      disabled={loading}
      {...props}
    >
      {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> : Icon ? <Icon className="w-4 h-4 mr-2" /> : null}
      {children}
    </motion.button>
  );
}

function Card({ children, className, hover, ...props }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -4 } : {}}
      className={clsx("rounded-2xl bg-white border border-gray-100 shadow-sm", hover && "cursor-pointer hover:shadow-md transition-shadow", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

function Badge({ children, variant = "default", dot }: any) {
  const variants: any = {
    default: "bg-gray-100 text-gray-700",
    primary: "bg-blue-100 text-blue-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    solar: "bg-amber-100 text-amber-700",
  };
  const dotColors: any = {
    default: "bg-gray-400", primary: "bg-blue-500", success: "bg-emerald-500",
    warning: "bg-amber-500", danger: "bg-red-500", solar: "bg-amber-500",
  };

  return (
    <span className={clsx("inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full", variants[variant])}>
      {dot && <span className={clsx("w-1.5 h-1.5 rounded-full mr-1.5", dotColors[variant])} />}
      {children}
    </span>
  );
}

function Avatar({ name, size = "md" }: any) {
  const sizes: any = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base", xl: "w-16 h-16 text-lg" };
  const initials = name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-pink-500"];
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

  return (
    <div className={clsx("rounded-full flex items-center justify-center text-white font-semibold", sizes[size], colors[colorIndex])}>
      {initials}
    </div>
  );
}

function Progress({ value = 0, variant = "primary" }: any) {
  const variants: any = {
    primary: "bg-blue-500", success: "bg-emerald-500", warning: "bg-amber-500",
    danger: "bg-red-500", solar: "bg-gradient-to-r from-amber-400 to-orange-500",
  };
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, value)}%` }} className={clsx("h-full rounded-full", variants[variant])} />
    </div>
  );
}

function Input({ label, icon: Icon, ...props }: any) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
        <input className={clsx("w-full rounded-xl border border-gray-200 shadow-sm py-2 px-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20", Icon && "pl-10")} {...props} />
      </div>
    </div>
  );
}

function Select({ label, options = [], ...props }: any) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <select className="w-full rounded-xl border border-gray-200 shadow-sm py-2 px-4 focus:border-blue-500" {...props}>
        {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-xl font-bold">{title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}

function Loading({ text }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      {text && <p className="mt-4 text-sm text-gray-500">{text}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════

const navigation = [
  { name: "Dashboard", key: "dashboard", icon: LayoutDashboard },
  { name: "Leads", key: "leads", icon: UserPlus },
  { name: "Installateurs", key: "installers", icon: Users },
  { name: "Projets", key: "projects", icon: FolderKanban },
  { name: "Documents", key: "documents", icon: FileText },
];

// ═══════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════

export default function AdminDashboard() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [installerFilter, setInstallerFilter] = useState<string | null>(null);
  const [installerFilterLabel, setInstallerFilterLabel] = useState<string | null>(null);
  const [createProjectInstallerId, setCreateProjectInstallerId] = useState<string | null>(null);
  const [data, setData] = useState<any>({
    dashboard: null,
    installers: null,
    projects: null,
    leads: null,
    documents: null,
    workflowConfig: null,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboard, installers, projects, leads, documents, workflowConfig] = await Promise.all([
        fetchAPI("/api/dashboard"),
        fetchAPI("/api/installers?limit=100"),
        fetchAPI("/api/projects?limit=100"),
        fetchAPI("/api/leads?limit=100"),
        fetchAPI("/api/documents?limit=200"),
        fetchAPI("/api/workflow-config"),
      ]);
      setData({ dashboard, installers, projects, leads, documents, workflowConfig });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/admin/login";
  };

  const kpis = data.dashboard?.kpis || {};

  const handleViewInstallerProjects = (installer: any) => {
    setInstallerFilter(installer.id);
    setInstallerFilterLabel(installer.company || installer.contact?.firstName || "Installateur");
    setCurrentPage("projects");
  };

  const handleCreateProjectForInstaller = (installer: any) => {
    setInstallerFilter(installer.id);
    setInstallerFilterLabel(installer.company || installer.contact?.firstName || "Installateur");
    setCreateProjectInstallerId(installer.id);
    setCurrentPage("projects");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Sidebar */}
      <aside className={clsx(
        "fixed top-0 left-0 z-50 h-full w-72 transform transition-transform lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full bg-white/90 backdrop-blur-xl border-r border-gray-200/50 flex flex-col">
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Sun className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Solaire Facile</h1>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => (
              <button
                key={item.key}
                onClick={() => { setCurrentPage(item.key); setSidebarOpen(false); }}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  currentPage === item.key
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <item.icon className={clsx("w-5 h-5", currentPage === item.key ? "text-white" : "text-gray-400")} />
                <span className="flex-1 text-left">{item.name}</span>
                {item.key === "leads" && kpis.newLeads > 0 && (
                  <span className={clsx("px-2 py-0.5 rounded-full text-xs font-bold", currentPage === item.key ? "bg-white/20" : "bg-red-100 text-red-600")}>
                    {kpis.newLeads}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all">
              <LogOut className="w-5 h-5" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
          <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden sm:block relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Rechercher..." className="w-64 lg:w-80 pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-xl hover:bg-gray-100">
                <Bell className="w-5 h-5 text-gray-500" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl">
                <span className="text-xs text-emerald-600 font-medium">Ce mois</span>
                <span className="text-sm font-bold text-emerald-700">{(kpis.revenueThisMonth || 0).toLocaleString("fr-FR")}€</span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {loading && !data.dashboard ? (
            <Loading text="Chargement..." />
          ) : (
            <motion.div key={currentPage} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {currentPage === "dashboard" && <DashboardPage data={data} onNavigate={setCurrentPage} />}
              {currentPage === "leads" && <LeadsPage data={data.leads} onRefresh={loadData} />}
              {currentPage === "installers" && (
                <InstallersPage
                  data={data.installers}
                  onRefresh={loadData}
                  onViewProjects={handleViewInstallerProjects}
                  onCreateProject={handleCreateProjectForInstaller}
                />
              )}
              {currentPage === "projects" && (
                <ProjectsPage
                  data={data.projects}
                  installers={data.installers?.items || []}
                  workflowConfig={data.workflowConfig}
                  installerFilter={installerFilter}
                  installerFilterLabel={installerFilterLabel}
                  createProjectInstallerId={createProjectInstallerId}
                  onClearFilter={() => {
                    setInstallerFilter(null);
                    setInstallerFilterLabel(null);
                  }}
                  onCreateModalClosed={() => setCreateProjectInstallerId(null)}
                  onRefresh={loadData}
                />
              )}
              {currentPage === "documents" && <DocumentsPage documents={data.documents} />}
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PAGES
// ═══════════════════════════════════════════════════════════

function DashboardPage({ data, onNavigate }: any) {
  const kpis = data.dashboard?.kpis || {};
  const pipeline = data.dashboard?.pipeline || {};
  const recentProjects = data.dashboard?.recentProjects || [];

  const revenueData = [
    { month: "Jan", revenue: 12400 }, { month: "Fév", revenue: 15200 },
    { month: "Mar", revenue: 18100 }, { month: "Avr", revenue: 16800 },
    { month: "Mai", revenue: 21500 }, { month: "Juin", revenue: 24200 },
  ];

  const pipelineData = [
    { name: "DP Mairie", value: pipeline.dp || 0, color: "#f59e0b" },
    { name: "Consuel", value: pipeline.consuel || 0, color: "#3b82f6" },
    { name: "Enedis", value: pipeline.enedis || 0, color: "#8b5cf6" },
    { name: "EDF OA", value: pipeline.edfOa || 0, color: "#10b981" },
    { name: "Finalisé", value: pipeline.completed || 0, color: "#06b6d4" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Bonjour ! 👋</h1>
          <p className="mt-1 text-gray-500">Voici un aperçu de votre activité</p>
        </div>
        <Button variant="solar" icon={Zap}>Nouveau projet</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { title: "Nouveaux leads", value: kpis.newLeads || 0, icon: UserPlus, color: "primary" },
          { title: "Installateurs actifs", value: kpis.activeInstallers || 0, icon: Users, color: "success" },
          { title: "Projets en cours", value: kpis.projectsInProgress || 0, icon: FolderKanban, color: "solar" },
          { title: "Revenue ce mois", value: `${(kpis.revenueThisMonth || 0).toLocaleString("fr-FR")}€`, icon: Euro, color: "success" },
        ].map((stat) => (
          <Card key={stat.title} hover className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={clsx("p-3 rounded-xl", stat.color === "primary" && "bg-blue-100 text-blue-600", stat.color === "success" && "bg-emerald-100 text-emerald-600", stat.color === "solar" && "bg-amber-100 text-amber-600")}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Revenue</h3>
              <p className="text-sm text-gray-500">Évolution sur 6 mois</p>
            </div>
            <Badge variant="success">+18%</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: "white", border: "none", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} />
                <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold">Pipeline</h3>
            <p className="text-sm text-gray-500">Répartition des projets</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pipelineData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                  {pipelineData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {pipelineData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick pipeline view */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Vue pipeline</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {pipelineData.map((step) => (
            <div key={step.name} className="text-center p-4 rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
              <p className="text-3xl font-bold text-gray-900">{step.value}</p>
              <p className="text-sm text-gray-500 mt-1">{step.name}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function LeadsPage({ data, onRefresh }: any) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ company: "", firstName: "", lastName: "", email: "", phone: "", pack: "", source: "manual" });
  const navigate = useNavigate();

  const leads = data?.items || [];
  const filtered = leads.filter((l: any) =>
    (l.company || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.contact?.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: any) => {
    e.preventDefault();
    setCreating(true);
    try {
      await postAPI("/api/leads", {
        company: form.company,
        contact: { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone },
        pack: form.pack,
        source: form.source,
      });
      setShowModal(false);
      setForm({ company: "", firstName: "", lastName: "", email: "", phone: "", pack: "", source: "manual" });
      onRefresh?.();
    } finally {
      setCreating(false);
    }
  };

  const handleConvert = async (id: string) => {
    await postAPI(`/api/leads/${id}/convert`, {});
    onRefresh?.();
  };

  const STATUS: any = { new: "primary", contacted: "warning", qualified: "warning", converted: "success", lost: "danger" };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Leads</h1>
        <Button variant="primary" icon={Plus} onClick={() => setShowModal(true)}>Nouveau lead</Button>
      </div>

      <Card className="p-4">
        <Input placeholder="Rechercher..." icon={Search} value={search} onChange={(e: any) => setSearch(e.target.value)} />
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Entreprise</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Pack</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((lead: any) => (
              <tr
                key={lead.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/admin/leads/${lead.id}`)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={`${lead.contact?.firstName} ${lead.contact?.lastName}`} size="sm" />
                    <div>
                      <p className="font-medium">{lead.contact?.firstName} {lead.contact?.lastName}</p>
                      <p className="text-sm text-gray-500">{lead.contact?.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{lead.company || "—"}</td>
                <td className="px-6 py-4"><Badge variant="solar">{lead.pack || "—"}</Badge></td>
                <td className="px-6 py-4"><Badge variant={STATUS[lead.status] || "default"} dot>{lead.status}</Badge></td>
                <td className="px-6 py-4">
                  {lead.status !== "converted" && (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={(event: any) => {
                        event.stopPropagation();
                        handleConvert(lead.id);
                      }}
                    >
                      Convertir
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouveau lead">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Entreprise" value={form.company} onChange={(e: any) => setForm({ ...form, company: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prénom" value={form.firstName} onChange={(e: any) => setForm({ ...form, firstName: e.target.value })} required />
            <Input label="Nom" value={form.lastName} onChange={(e: any) => setForm({ ...form, lastName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} required />
            <Input label="Téléphone" value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Select label="Pack" value={form.pack} onChange={(e: any) => setForm({ ...form, pack: e.target.value })} options={[{ value: "", label: "Sélectionner" }, { value: "ESSENTIEL", label: "Essentiel" }, { value: "PRO", label: "Pro" }, { value: "SERENITE", label: "Sérénité" }]} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" variant="primary" loading={creating}>Créer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function InstallersPage({ data, onRefresh, onViewProjects, onCreateProject }: any) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    company: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    plan: "essentiel",
  });
  const items = data?.items || [];
  const filtered = items.filter((i: any) => (i.company || "").toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async (event: any) => {
    event.preventDefault();
    setCreating(true);
    try {
      await postAPI("/api/installers", {
        company: form.company,
        contact: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
        },
        address: { city: form.city },
        subscription: { plan: form.plan },
        status: "active",
        source: "manual",
      });
      setShowModal(false);
      setForm({
        company: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        city: "",
        plan: "essentiel",
      });
      onRefresh?.();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Erreur creation installateur");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Installateurs</h1>
        <Button variant="primary" icon={Plus} onClick={() => setShowModal(true)}>Nouvel installateur</Button>
      </div>

      <Card className="p-4">
        <Input placeholder="Rechercher..." icon={Search} value={search} onChange={(e: any) => setSearch(e.target.value)} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((installer: any) => (
          <Card
            key={installer.id}
            hover
            className="p-6"
            onClick={() => onViewProjects?.(installer)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar name={installer.company} size="lg" />
                <div>
                  <h3 className="font-semibold">{installer.company || "Sans nom"}</h3>
                  <p className="text-sm text-gray-500">{installer.contact?.firstName} {installer.contact?.lastName}</p>
                </div>
              </div>
              <Badge variant={installer.status === "active" ? "success" : "default"} dot>{installer.status}</Badge>
            </div>
            <div className="mt-4 space-y-2">
              {installer.contact?.email && <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="w-4 h-4 text-gray-400" />{installer.contact.email}</div>}
              {installer.contact?.phone && <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4 text-gray-400" />{installer.contact.phone}</div>}
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div className="flex gap-4">
                <div className="text-center"><p className="text-lg font-bold">{installer.stats?.totalDossiers || 0}</p><p className="text-xs text-gray-500">Dossiers</p></div>
                <div className="text-center"><p className="text-lg font-bold text-emerald-600">{installer.stats?.dossiersFinalises || 0}</p><p className="text-xs text-gray-500">Finalisés</p></div>
              </div>
              <Badge variant="solar">{(installer.subscription?.plan || "essentiel").toUpperCase()}</Badge>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={(event: any) => {
                  event.stopPropagation();
                  onViewProjects?.(installer);
                }}
              >
                Voir dossiers
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={(event: any) => {
                  event.stopPropagation();
                  onCreateProject?.(installer);
                }}
              >
                Ajouter projet
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouvel installateur">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Entreprise" value={form.company} onChange={(e: any) => setForm({ ...form, company: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prenom" value={form.firstName} onChange={(e: any) => setForm({ ...form, firstName: e.target.value })} required />
            <Input label="Nom" value={form.lastName} onChange={(e: any) => setForm({ ...form, lastName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} />
            <Input label="Telephone" value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Input label="Ville" value={form.city} onChange={(e: any) => setForm({ ...form, city: e.target.value })} />
          <Select
            label="Plan"
            value={form.plan}
            onChange={(e: any) => setForm({ ...form, plan: e.target.value })}
            options={[
              { value: "essentiel", label: "Essentiel" },
              { value: "pro", label: "Pro" },
              { value: "serenite", label: "Serenite" },
            ]}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" variant="primary" loading={creating}>Creer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ProjectsPage({
  data,
  installers,
  workflowConfig,
  installerFilter,
  installerFilterLabel,
  createProjectInstallerId,
  onClearFilter,
  onCreateModalClosed,
  onRefresh,
}: any) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    installerId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    power: "",
    pack: "ESSENTIEL",
  });
  const navigate = useNavigate();
  const projects = data?.items || [];
  const filtered = projects.filter((p: any) => {
    if (installerFilter && p.installerId !== installerFilter) return false;
    const matchSearch =
      (p.reference || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.beneficiary?.lastName || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.beneficiary?.firstName || "").toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const STATUS: any = { pending: "default", in_progress: "warning", completed: "success", blocked: "danger" };
  const PACK_PRICES: any = { ESSENTIEL: 169, PRO: 269, SERENITE: 449 };

  useEffect(() => {
    if (createProjectInstallerId) {
      setForm((prev) => ({ ...prev, installerId: createProjectInstallerId }));
      setShowModal(true);
      onCreateModalClosed?.();
    }
  }, [createProjectInstallerId, onCreateModalClosed]);

  const handleCreateProject = async (event: any) => {
    event.preventDefault();
    setCreating(true);
    try {
      const packPrice = PACK_PRICES[form.pack] ?? 169;
      await postAPI("/api/projects", {
        installerId: form.installerId || null,
        beneficiary: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          address: { city: form.city },
        },
        installation: {
          power: form.power ? Number(form.power) : 0,
        },
        pack: form.pack,
        packPrice,
      });
      setShowModal(false);
      setForm({
        installerId: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        city: "",
        power: "",
        pack: "ESSENTIEL",
      });
      onRefresh?.();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Erreur creation projet");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Projets</h1>
        <Button
          variant="solar"
          icon={Plus}
          onClick={() => {
            setForm((prev) => ({ ...prev, installerId: installerFilter || prev.installerId }));
            setShowModal(true);
          }}
        >
          Nouveau projet
        </Button>
      </div>

      {installerFilter && (
        <Card className="p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Filtre installateur: <span className="font-semibold">{installerFilterLabel || installerFilter}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={onClearFilter}>Voir tous</Button>
        </Card>
      )}

      <Card className="p-4">
        <Input placeholder="Rechercher..." icon={Search} value={search} onChange={(e: any) => setSearch(e.target.value)} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((project: any) => (
          <Card
            key={project.id}
            hover
            className="p-6"
            onClick={() => navigate(`/admin/projects/${project.id}`)}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-sm font-medium text-blue-600">{project.reference}</span>
                <h3 className="mt-1 text-lg font-semibold">{project.beneficiary?.firstName} {project.beneficiary?.lastName}</h3>
              </div>
              <Badge variant={STATUS[project.status]} dot>{project.status}</Badge>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600"><MapPin className="w-4 h-4 text-gray-400" />{project.beneficiary?.address?.city || "Ville"}</div>
              <div className="flex items-center gap-2 text-sm text-gray-600"><Zap className="w-4 h-4 text-gray-400" />{project.installation?.power || 0} kWc</div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-500">Progression</span>
                <span className="font-medium">
                  {project.progress ? project.progress : getProjectProgress(workflowConfig, project.workflow)}%
                </span>
              </div>
              <Progress
                value={project.progress ? project.progress : getProjectProgress(workflowConfig, project.workflow)}
                variant="solar"
              />
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-2">
                {WORKFLOW_STAGES.map((stage) => {
                  const currentStep = project.workflow?.[stage]?.currentStep || "pending";
                  const status = getStageStatus(workflowConfig, stage, currentStep);
                  const label = workflowConfig?.[stage]?.label || stage;
                  return (
                    <span
                      key={stage}
                      title={`${label}: ${currentStep}`}
                      className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold",
                        STAGE_STATUS_CLASSES[status]
                      )}
                    >
                      {STAGE_SHORT_LABELS[stage]}
                    </span>
                  );
                })}
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={(event: any) => {
                  event.stopPropagation();
                  navigate(`/admin/projects/${project.id}`);
                }}
              >
                Ouvrir
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouveau projet">
        <form onSubmit={handleCreateProject} className="space-y-4">
          <Select
            label="Installateur"
            value={form.installerId}
            onChange={(e: any) => setForm({ ...form, installerId: e.target.value })}
            options={[
              { value: "", label: "Selectionner" },
              ...(installers || []).map((i: any) => ({ value: i.id, label: i.company || i.contact?.firstName || i.id })),
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prenom" value={form.firstName} onChange={(e: any) => setForm({ ...form, firstName: e.target.value })} required />
            <Input label="Nom" value={form.lastName} onChange={(e: any) => setForm({ ...form, lastName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} />
            <Input label="Telephone" value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Ville" value={form.city} onChange={(e: any) => setForm({ ...form, city: e.target.value })} />
            <Input label="Puissance (kWc)" value={form.power} onChange={(e: any) => setForm({ ...form, power: e.target.value })} />
          </div>
          <Select
            label="Pack"
            value={form.pack}
            onChange={(e: any) => setForm({ ...form, pack: e.target.value })}
            options={[
              { value: "ESSENTIEL", label: "Essentiel" },
              { value: "PRO", label: "Pro" },
              { value: "SERENITE", label: "Serenite" },
            ]}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" variant="primary" loading={creating}>Creer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function DocumentsPage({ documents }: any) {
  const items = documents?.items || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Documents</h1>
      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-300" />
          <p className="mt-4 text-gray-500">Aucun document</p>
          <p className="text-sm text-gray-400">Les documents seront disponibles ici</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Document</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Projet</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Etape</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Categorie</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((doc: any) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">{doc.filename || doc.name || "Document"}</div>
                    <div className="text-xs text-gray-500">{doc.mimeType || doc.type}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{doc.projectId || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{doc.stage || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{doc.category || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {doc.createdAt?._seconds ? new Date(doc.createdAt._seconds * 1000).toLocaleDateString("fr-FR") : "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-amber-600 hover:text-amber-700"
                      >
                        Ouvrir
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
