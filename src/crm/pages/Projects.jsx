import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderKanban, Search, Plus, Filter, Grid3X3, List,
  MapPin, Zap, Calendar, User, ChevronRight, X,
  CheckCircle2, Clock, AlertCircle, FileText
} from 'lucide-react';
import { Card, Button, Badge, Input, Select, EmptyState, Loading, Progress, WorkflowStep } from '../components/ui';
import { clsx } from 'clsx';

const WORKFLOW_STEPS = [
  { key: 'dp', label: 'DP Mairie', color: 'amber' },
  { key: 'consuel', label: 'Consuel', color: 'blue' },
  { key: 'enedis', label: 'Enedis', color: 'purple' },
  { key: 'edfOa', label: 'EDF OA', color: 'emerald' },
];

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'default', icon: Clock },
  in_progress: { label: 'En cours', color: 'warning', icon: Clock },
  completed: { label: 'Finalisé', color: 'success', icon: CheckCircle2 },
  blocked: { label: 'Bloqué', color: 'danger', icon: AlertCircle },
};

export default function Projects({ data, loading, onSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid | kanban
  const [selectedProject, setSelectedProject] = useState(null);

  const projects = data?.items || [];

  const filtered = useMemo(() => {
    return projects.filter(proj => {
      const matchesSearch = 
        (proj.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (proj.beneficiary?.lastName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || proj.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  // Group by workflow step for Kanban
  const kanbanColumns = useMemo(() => {
    const columns = {
      dp: { title: 'DP Mairie', items: [], color: 'amber' },
      consuel: { title: 'Consuel', items: [], color: 'blue' },
      enedis: { title: 'Enedis', items: [], color: 'purple' },
      edfOa: { title: 'EDF OA', items: [], color: 'emerald' },
      completed: { title: 'Finalisé', items: [], color: 'green' },
    };

    filtered.forEach(project => {
      if (project.status === 'completed') {
        columns.completed.items.push(project);
      } else {
        // Find current step
        const workflow = project.workflow || {};
        let currentStep = 'dp';
        for (const step of WORKFLOW_STEPS) {
          if (workflow[step.key]?.status === 'in_progress') {
            currentStep = step.key;
            break;
          }
          if (workflow[step.key]?.status !== 'completed') {
            currentStep = step.key;
            break;
          }
        }
        columns[currentStep]?.items.push(project);
      }
    });

    return columns;
  }, [filtered]);

  if (loading) return <Loading text="Chargement des projets..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Projets</h1>
          <p className="mt-1 text-gray-500">{filtered.length} projet(s)</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                viewMode === 'grid' ? 'bg-white shadow text-primary-600' : 'text-gray-500'
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                viewMode === 'kanban' ? 'bg-white shadow text-primary-600' : 'text-gray-500'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button variant="solar" icon={Plus}>
            Nouveau projet
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Rechercher par référence, client..."
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Tous les statuts' },
              { value: 'in_progress', label: 'En cours' },
              { value: 'blocked', label: 'Bloqué' },
              { value: 'completed', label: 'Finalisé' },
            ]}
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Aucun projet"
          description="Créez votre premier projet pour commencer"
          action={<Button variant="solar" icon={Plus}>Créer un projet</Button>}
        />
      ) : viewMode === 'kanban' ? (
        <KanbanView columns={kanbanColumns} onSelect={setSelectedProject} />
      ) : (
        <GridView projects={filtered} onSelect={setSelectedProject} />
      )}

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedProject && (
          <ProjectDrawer
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function GridView({ projects, onSelect }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {projects.map((project, idx) => (
        <ProjectCard key={project.id} project={project} index={idx} onClick={() => onSelect(project)} />
      ))}
    </div>
  );
}

function KanbanView({ columns, onSelect }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Object.entries(columns).map(([key, column]) => (
        <div key={key} className="flex-shrink-0 w-80">
          <div className={clsx(
            'flex items-center gap-2 px-4 py-3 rounded-t-xl',
            `bg-${column.color}-100`
          )}>
            <span className={`w-3 h-3 rounded-full bg-${column.color}-500`} />
            <h3 className="font-semibold text-gray-900">{column.title}</h3>
            <Badge variant="default" size="sm">{column.items.length}</Badge>
          </div>
          <div className="bg-gray-50 rounded-b-xl p-3 min-h-96 space-y-3">
            {column.items.map((project, idx) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card 
                  hover 
                  className="p-4 cursor-pointer"
                  onClick={() => onSelect(project)}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium text-primary-600">{project.reference}</span>
                    <Badge variant={STATUS_CONFIG[project.status]?.color || 'default'} size="sm">
                      {project.progress || 0}%
                    </Badge>
                  </div>
                  <h4 className="mt-2 font-medium text-gray-900 truncate">
                    {project.beneficiary?.lastName || 'Client'}
                  </h4>
                  <p className="text-sm text-gray-500 truncate">
                    {project.beneficiary?.address?.city || 'Ville'}
                  </p>
                  <Progress value={project.progress || 0} size="sm" className="mt-3" variant="solar" />
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectCard({ project, index, onClick }) {
  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.in_progress;
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card hover className="p-6" onClick={onClick}>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-sm font-medium text-primary-600">{project.reference}</span>
            <h3 className="mt-1 text-lg font-semibold text-gray-900">
              {project.beneficiary?.firstName} {project.beneficiary?.lastName}
            </h3>
          </div>
          <Badge variant={statusConfig.color} dot>
            {statusConfig.label}
          </Badge>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="truncate">
              {project.beneficiary?.address?.city || 'Adresse non renseignée'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Zap className="w-4 h-4 text-gray-400" />
            <span>{project.installation?.power || 0} kWc</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500">Progression</span>
            <span className="font-medium text-gray-900">{project.progress || 0}%</span>
          </div>
          <Progress value={project.progress || 0} variant="solar" />
        </div>

        {/* Mini workflow */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            {WORKFLOW_STEPS.map((step, idx) => {
              const stepStatus = project.workflow?.[step.key]?.status || 'pending';
              return (
                <div key={step.key} className="flex items-center">
                  <div className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                    stepStatus === 'completed' && 'bg-emerald-100 text-emerald-600',
                    stepStatus === 'in_progress' && 'bg-amber-100 text-amber-600',
                    stepStatus === 'pending' && 'bg-gray-100 text-gray-400',
                    stepStatus === 'blocked' && 'bg-red-100 text-red-600',
                  )}>
                    {stepStatus === 'completed' ? '✓' : idx + 1}
                  </div>
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <div className={clsx(
                      'w-6 h-0.5 mx-1',
                      stepStatus === 'completed' ? 'bg-emerald-300' : 'bg-gray-200'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function ProjectDrawer({ project, onClose }) {
  const workflow = project.workflow || {};

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-primary-600">{project.reference}</span>
            <h2 className="text-xl font-bold text-gray-900">
              {project.beneficiary?.firstName} {project.beneficiary?.lastName}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Progress */}
          <Card className="p-6 bg-gradient-to-r from-solar-50 to-solar-100 border-solar-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Progression globale</h3>
              <span className="text-2xl font-bold text-solar-600">{project.progress || 0}%</span>
            </div>
            <Progress value={project.progress || 0} size="lg" variant="solar" />
          </Card>

          {/* Workflow */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-6">Étapes du workflow</h3>
            <div className="space-y-4">
              {WORKFLOW_STEPS.map((step, idx) => {
                const stepData = workflow[step.key] || {};
                const statusConfig = STATUS_CONFIG[stepData.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div key={step.key} className="flex items-center gap-4">
                    <div className={clsx(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      stepData.status === 'completed' && 'bg-emerald-100',
                      stepData.status === 'in_progress' && 'bg-amber-100',
                      stepData.status === 'pending' && 'bg-gray-100',
                      stepData.status === 'blocked' && 'bg-red-100',
                    )}>
                      <StatusIcon className={clsx(
                        'w-5 h-5',
                        stepData.status === 'completed' && 'text-emerald-600',
                        stepData.status === 'in_progress' && 'text-amber-600',
                        stepData.status === 'pending' && 'text-gray-400',
                        stepData.status === 'blocked' && 'text-red-600',
                      )} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{step.label}</p>
                      <p className="text-sm text-gray-500">
                        {stepData.status === 'completed' ? 'Terminé' : 
                         stepData.status === 'in_progress' ? 'En cours' :
                         stepData.status === 'blocked' ? 'Bloqué' : 'En attente'}
                      </p>
                    </div>
                    <Badge variant={statusConfig.color} size="sm">
                      {statusConfig.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Info */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Installation</h4>
              <p className="text-lg font-bold text-gray-900">{project.installation?.power || 0} kWc</p>
              <p className="text-sm text-gray-500">{project.installation?.panelsCount || 0} panneaux</p>
            </Card>
            <Card className="p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Pack</h4>
              <p className="text-lg font-bold text-gray-900">{project.pack}</p>
              <p className="text-sm text-gray-500">{project.packPrice || 0}€</p>
            </Card>
          </div>

          {/* Beneficiary */}
          <Card className="p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Bénéficiaire</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span>{project.beneficiary?.firstName} {project.beneficiary?.lastName}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{project.beneficiary?.address?.street}, {project.beneficiary?.address?.city}</span>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="primary" className="flex-1" icon={FileText}>
              Générer documents
            </Button>
            <Button variant="secondary" className="flex-1">
              Modifier
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
