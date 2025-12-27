import { motion } from 'framer-motion';
import { 
  Users, FolderKanban, UserPlus, TrendingUp, 
  ArrowUpRight, ArrowDownRight, Clock, AlertCircle,
  CheckCircle2, Zap, Euro
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { Card, Badge, Progress, Avatar, Button, StatCard } from '../components/ui';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function Dashboard({ data, onNavigate }) {
  const { kpis = {}, pipeline = {}, recentProjects = [] } = data || {};

  // Mock chart data (à remplacer par vraies données)
  const revenueData = [
    { month: 'Jan', revenue: 12400 },
    { month: 'Fév', revenue: 15200 },
    { month: 'Mar', revenue: 18100 },
    { month: 'Avr', revenue: 16800 },
    { month: 'Mai', revenue: 21500 },
    { month: 'Juin', revenue: 24200 },
  ];

  const pipelineData = [
    { name: 'DP Mairie', value: pipeline.dp || 0, color: '#f59e0b' },
    { name: 'Consuel', value: pipeline.consuel || 0, color: '#3b82f6' },
    { name: 'Enedis', value: pipeline.enedis || 0, color: '#8b5cf6' },
    { name: 'EDF OA', value: pipeline.edfOa || 0, color: '#10b981' },
    { name: 'Finalisé', value: pipeline.completed || 0, color: '#06b6d4' },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Bonjour ! 👋
          </h1>
          <p className="mt-1 text-gray-500">
            Voici un aperçu de votre activité aujourd'hui
          </p>
        </div>
        <Button variant="solar" icon={Zap}>
          Nouveau projet
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Nouveaux leads"
          value={kpis.newLeads || 0}
          change="+12% vs sem. dernière"
          changeType="increase"
          icon={UserPlus}
          color="primary"
        />
        <StatCard
          title="Installateurs actifs"
          value={kpis.activeInstallers || 0}
          change="+3 ce mois"
          changeType="increase"
          icon={Users}
          color="success"
        />
        <StatCard
          title="Projets en cours"
          value={kpis.projectsInProgress || 0}
          icon={FolderKanban}
          color="solar"
        />
        <StatCard
          title="Revenue ce mois"
          value={`${(kpis.revenueThisMonth || 0).toLocaleString('fr-FR')}€`}
          change="+18% vs mois dernier"
          changeType="increase"
          icon={Euro}
          color="success"
        />
      </motion.div>

      {/* Charts row */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Revenue</h3>
              <p className="text-sm text-gray-500">Évolution sur 6 mois</p>
            </div>
            <Badge variant="success">+18%</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value) => [`${value.toLocaleString('fr-FR')}€`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pipeline chart */}
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Pipeline</h3>
            <p className="text-sm text-gray-500">Répartition des projets</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pipelineData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
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
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Recent projects & Alerts */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent projects */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Projets récents</h3>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('projects')}>
              Voir tout
            </Button>
          </div>
          <div className="space-y-4">
            {recentProjects.slice(0, 5).map((project, idx) => (
              <motion.div
                key={project.id || idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                    <FolderKanban className="w-6 h-6 text-primary-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{project.reference || 'N/A'}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {project.beneficiary?.lastName || 'Client'} • {project.pack}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Badge 
                    variant={project.status === 'completed' ? 'success' : project.status === 'blocked' ? 'danger' : 'warning'}
                    dot
                  >
                    {project.progress || 0}%
                  </Badge>
                </div>
              </motion.div>
            ))}
            {recentProjects.length === 0 && (
              <p className="text-center text-gray-500 py-8">Aucun projet récent</p>
            )}
          </div>
        </Card>

        {/* Alerts / Actions requises */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Actions requises</h3>
            <Badge variant="danger">{kpis.projectsBlocked || 0}</Badge>
          </div>
          <div className="space-y-4">
            {kpis.projectsBlocked > 0 ? (
              <div className="flex items-start gap-4 p-4 rounded-xl bg-red-50 border border-red-100">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-red-800">Projets bloqués</p>
                  <p className="text-sm text-red-600 mt-1">
                    {kpis.projectsBlocked} projet(s) nécessitent votre attention
                  </p>
                  <Button variant="danger" size="sm" className="mt-3" onClick={() => onNavigate('projects')}>
                    Voir les projets
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-emerald-800">Tout est en ordre !</p>
                  <p className="text-sm text-emerald-600 mt-1">
                    Aucun projet bloqué actuellement
                  </p>
                </div>
              </div>
            )}

            {/* Upcoming tasks */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
              <div className="flex-shrink-0">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-800">Relances à faire</p>
                <p className="text-sm text-amber-600 mt-1">
                  {kpis.newLeads || 0} leads à contacter
                </p>
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => onNavigate('leads')}>
                  Voir les leads
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Quick workflow overview */}
      <motion.div variants={item}>
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Vue pipeline</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: 'DP Mairie', count: pipeline.dp || 0, color: 'solar' },
              { label: 'Consuel', count: pipeline.consuel || 0, color: 'primary' },
              { label: 'Enedis', count: pipeline.enedis || 0, color: 'info' },
              { label: 'EDF OA', count: pipeline.edfOa || 0, color: 'success' },
              { label: 'Finalisé', count: pipeline.completed || 0, color: 'success' },
            ].map((step, idx) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="text-center p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <p className="text-3xl font-bold text-gray-900">{step.count}</p>
                <p className="text-sm text-gray-500 mt-1">{step.label}</p>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
