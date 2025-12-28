import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderKanban, Search, Plus, MapPin, Zap, User, X,
  CheckCircle2, Clock, AlertCircle, FileText, Edit, Calendar, 
  Upload, ChevronDown, RotateCcw, ExternalLink, Trash2, Loader2, Eye, File
} from 'lucide-react';
import { Card, Button, Badge, Input, Select, EmptyState, Loading, Progress, Modal } from '../components/ui';
import ProjectForm from '../components/forms/ProjectForm';

import { clsx } from 'clsx';

const API_BASE = import.meta.env.VITE_API_URL || "https://solaire-api-828508661560.europe-west1.run.app";
const API_TOKEN = 'saftoken-123';

const WORKFLOW_CONFIG = {
  dp: {
    label: "DP Mairie",
    steps: [
      { code: "pending", label: "Non démarré" },
      { code: "draft", label: "En préparation" },
      { code: "sent", label: "Dossier envoyé" },
      { code: "receipt", label: "Récépissé reçu" },
      { code: "instruction", label: "En instruction" },
      { code: "approved", label: "Validé", final: true, success: true },
      { code: "rejected", label: "Refusé", final: true, success: false }
    ]
  },
  consuel: {
    label: "Consuel",
    steps: [
      { code: "pending", label: "Non démarré" },
      { code: "preparing", label: "Préparation dossier" },
      { code: "submitted", label: "Déposé" },
      { code: "waiting", label: "En attente retour" },
      { code: "visit_scheduled", label: "Visite programmée" },
      { code: "visit_done", label: "Visite effectuée" },
      { code: "attestation_approved", label: "Attestation visée", final: true, success: true },
      { code: "attestation_rejected", label: "Attestation non visée", final: true, success: false }
    ]
  },
  enedis: {
    label: "Enedis",
    steps: [
      { code: "pending", label: "Non démarré" },
      { code: "request_sent", label: "Demande raccordement envoyée" },
      { code: "request_approved", label: "Demande raccordement validée" },
      { code: "mes_scheduled", label: "MES programmée" },
      { code: "mes_done", label: "MES effectuée", final: true, success: true }
    ]
  },
  edfOa: {
    label: "EDF OA",
    steps: [
      { code: "pending", label: "Non démarré" },
      { code: "account_created", label: "Compte producteur créé" },
      { code: "bta_received", label: "Numéro BTA reçu" },
      { code: "s21_sent", label: "Attestation S21 envoyée" },
      { code: "s21_signed", label: "Contrat S21 signé" },
      { code: "contract_received", label: "Contrat EDF OA reçu" },
      { code: "contract_signed", label: "Contrat EDF OA signé", final: true, success: true }
    ]
  }
};

const STAGES = ['dp', 'consuel', 'enedis', 'edfOa'];

const getStepInfo = (stage, stepCode) => {
  const config = WORKFLOW_CONFIG[stage];
  return config?.steps.find(s => s.code === stepCode) || { code: stepCode, label: stepCode };
};

const getStepIndex = (stage, stepCode) => {
  const config = WORKFLOW_CONFIG[stage];
  return config?.steps.findIndex(s => s.code === stepCode) || 0;
};

const getStageColor = (stage, currentStep) => {
  const stepInfo = getStepInfo(stage, currentStep);
  if (stepInfo.final && stepInfo.success) return 'success';
  if (stepInfo.final && !stepInfo.success) return 'danger';
  if (currentStep !== 'pending') return 'warning';
  return 'default';
};

const formatDate = (d) => {
  if (!d) return null;
  const date = d._seconds ? new Date(d._seconds * 1000) : new Date(d);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function Projects({ data, loading, onCreateProject, onUpdateProject, onUpdateWorkflow, installers = [], installerFilter, onClearFilter }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [creating, setCreating] = useState(false);

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

  const handleCreate = async (formData) => {
    setCreating(true);
    try {
      await onCreateProject?.(formData);
      setShowCreateModal(false);
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setShowEditModal(true);
  };

  const handleUpdate = async (formData) => {
    setCreating(true);
    try {
      await onUpdateProject?.(editingProject.id, formData);
      setShowEditModal(false);
      setEditingProject(null);
      setSelectedProject(null);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (selectedProject) {
      const updated = projects.find(p => p.id === selectedProject.id);
      if (updated) setSelectedProject(updated);
    }
  }, [projects]);

  if (loading) return <Loading text="Chargement des projets..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Projets</h1>
          <p className="mt-1 text-gray-500">{filtered.length} projet(s)</p>
        </div>
        <Button variant="solar" icon={Plus} onClick={() => setShowCreateModal(true)}>Nouveau projet</Button>
      </div>

      {installerFilter && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <p className="text-blue-800">🔍 Filtré par installateur</p>
            <Button variant="ghost" size="sm" onClick={onClearFilter}>✕ Retirer le filtre</Button>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input placeholder="Rechercher..." icon={Search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[
            { value: 'all', label: 'Tous' },
            { value: 'in_progress', label: 'En cours' },
            { value: 'blocked', label: 'Bloqué' },
            { value: 'completed', label: 'Finalisé' },
          ]} className="w-full sm:w-40" />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Aucun projet" action={<Button variant="solar" icon={Plus} onClick={() => setShowCreateModal(true)}>Créer</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((project, idx) => (
            <ProjectCard key={project.id} project={project} index={idx} onClick={() => setSelectedProject(project)} onEdit={() => handleEdit(project)} />
          ))}
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nouveau projet" size="lg">
        <ProjectForm onSubmit={handleCreate} onCancel={() => setShowCreateModal(false)} loading={creating} installers={installers} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditingProject(null); }} title="Modifier le projet" size="lg">
        {editingProject && (
          <ProjectForm onSubmit={handleUpdate} onCancel={() => { setShowEditModal(false); setEditingProject(null); }} loading={creating} installers={installers} initialData={editingProject} isEdit />
        )}
      </Modal>

      <AnimatePresence>
        {selectedProject && (
          <ProjectDrawer 
            project={selectedProject} 
            onClose={() => setSelectedProject(null)} 
            onUpdateWorkflow={onUpdateWorkflow} 
            onEdit={() => handleEdit(selectedProject)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProjectCard({ project, index, onClick, onEdit }) {
  const workflow = project.workflow || {};
  
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card hover className="p-6" onClick={onClick}>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-sm font-medium text-blue-600">{project.reference}</span>
            <h3 className="mt-1 text-lg font-semibold">{project.beneficiary?.firstName} {project.beneficiary?.lastName}</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Edit className="w-4 h-4" />
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="truncate">{project.beneficiary?.address?.city || 'Ville non renseignée'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Zap className="w-4 h-4 text-gray-400" />
            <span>{project.installation?.power || 0} kWc - {project.installation?.panelsCount || 0} panneaux</span>
          </div>
          <Badge variant={project.installation?.raccordementType === 'surplus' ? 'primary' : 'solar'} size="sm">
            {project.installation?.raccordementType === 'surplus' ? 'Autoconso surplus' : 'Revente totale'}
          </Badge>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500">Progression</span>
            <span className="font-medium">{project.progress || 0}%</span>
          </div>
          <Progress value={project.progress || 0} variant="solar" />
        </div>

        <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-2">
          {STAGES.map((stage) => {
            const currentStep = workflow[stage]?.currentStep || workflow[stage]?.status || 'pending';
            const color = getStageColor(stage, currentStep);
            return (
              <div key={stage} className="text-center">
                <div className={clsx(
                  'w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold mb-1',
                  color === 'success' && 'bg-emerald-100 text-emerald-600',
                  color === 'warning' && 'bg-amber-100 text-amber-600',
                  color === 'danger' && 'bg-red-100 text-red-600',
                  color === 'default' && 'bg-gray-100 text-gray-400',
                )}>
                  {color === 'success' ? '✓' : color === 'danger' ? '✗' : STAGES.indexOf(stage) + 1}
                </div>
                <p className="text-[10px] text-gray-500 truncate">{WORKFLOW_CONFIG[stage].label}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
}

function ProjectDrawer({ project, onClose, onUpdateWorkflow, onEdit }) {
  const [updating, setUpdating] = useState(null);
  const [expandedStage, setExpandedStage] = useState(null);
  const [documents, setDocuments] = useState({});
  const [uploading, setUploading] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [generatingCerfa, setGeneratingCerfa] = useState(false);
  const [cerfaStatus, setCerfaStatus] = useState(null);
  const workflow = project.workflow || {};

  useEffect(() => {
    loadDocuments();
    setCerfaStatus(null);
    setGeneratingCerfa(false);
  }, [project.id]);

  const loadDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`${API_BASE}/api/documents?projectId=${project.id}`, {
        headers: { 'X-Api-Token': API_TOKEN }
      });
      const data = await res.json();
      
      const grouped = {};
      STAGES.forEach(s => grouped[s] = []);
      (data.items || []).forEach(doc => {
        if (doc.stage && grouped[doc.stage]) {
          grouped[doc.stage].push(doc);
        }
      });
      setDocuments(grouped);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleStepChange = async (stage, newStep) => {
    setUpdating(stage);
    try {
      await onUpdateWorkflow?.(project.id, stage, newStep);
    } finally {
      setUpdating(null);
    }
  };

  const generateCerfa = async () => {
    setGeneratingCerfa(true);
    setCerfaStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/cerfa/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Token': API_TOKEN
        },
        body: JSON.stringify({ projectId: project.id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.detail || 'Erreur génération CERFA');
      }
      setCerfaStatus({ type: 'ok', text: 'CERFA généré et ajouté aux documents.' });
      await onUpdateWorkflow?.(project.id, 'dp', 'draft');
      await loadDocuments();
    } catch (err) {
      setCerfaStatus({ type: 'err', text: err.message || 'Erreur génération CERFA' });
    } finally {
      setGeneratingCerfa(false);
    }
  };

  // Upload direct vers Firebase Storage
  const handleUpload = async (stage, files) => {
    if (!files.length) return;
    setUploading(stage);
    
    try {
      const formData = new FormData();
      formData.append('projectId', project.id);
      formData.append('stage', stage);
      formData.append('category', stage);
      
      for (const file of files) {
        formData.append('file', file);
      }
      
      const res = await fetch(`${API_BASE}/api/documents/upload`, {
        method: 'POST',
        headers: { 'X-Api-Token': API_TOKEN },
        body: formData
      });
      
      const data = await res.json();
      if (data.ok) {
        await loadDocuments();
      } else {
        alert('Erreur: ' + (data.error || 'Upload échoué'));
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Erreur upload: ' + err.message);
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Supprimer ce document ?')) return;
    try {
      await fetch(`${API_BASE}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'X-Api-Token': API_TOKEN }
      });
      loadDocuments();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50" onClick={onClose} />
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }} className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
          <div>
            <span className="text-sm font-medium text-blue-600">{project.reference}</span>
            <h2 className="text-xl font-bold">{project.beneficiary?.firstName} {project.beneficiary?.lastName}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}><Edit className="w-4 h-4" /></Button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Progression globale</h3>
              <span className="text-2xl font-bold text-amber-600">{project.progress || 0}%</span>
            </div>
            <Progress value={project.progress || 0} size="lg" variant="solar" />
          </Card>

          <Badge variant={project.installation?.raccordementType === 'surplus' ? 'primary' : 'solar'}>
            {project.installation?.raccordementType === 'surplus' ? '⚡ Autoconsommation avec surplus' : '💰 Revente totale'}
          </Badge>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Étapes du workflow</h3>
            <div className="space-y-3">
              {STAGES.map((stage) => {
                const config = WORKFLOW_CONFIG[stage];
                const stageData = workflow[stage] || {};
                const currentStep = stageData.currentStep || stageData.status || 'pending';
                const stepInfo = getStepInfo(stage, currentStep);
                const stepIndex = getStepIndex(stage, currentStep);
                const color = getStageColor(stage, currentStep);
                const isExpanded = expandedStage === stage;
                const stageDocs = documents[stage] || [];
                
                return (
                  <div key={stage} className={clsx(
                    'rounded-xl border-2 transition-all overflow-hidden',
                    color === 'success' && 'bg-emerald-50 border-emerald-200',
                    color === 'warning' && 'bg-amber-50 border-amber-200',
                    color === 'danger' && 'bg-red-50 border-red-200',
                    color === 'default' && 'bg-gray-50 border-gray-200',
                  )}>
                    <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedStage(isExpanded ? null : stage)}>
                      <div className={clsx(
                        'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                        color === 'success' && 'bg-emerald-100',
                        color === 'warning' && 'bg-amber-100',
                        color === 'danger' && 'bg-red-100',
                        color === 'default' && 'bg-gray-200',
                      )}>
                        {color === 'success' ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> :
                         color === 'danger' ? <AlertCircle className="w-6 h-6 text-red-600" /> :
                         color === 'warning' ? <Clock className="w-6 h-6 text-amber-600" /> :
                         <Clock className="w-6 h-6 text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{config.label}</p>
                        <p className="text-sm text-gray-600">{stepInfo.label}</p>
                        {stageDocs.length > 0 && (
                          <p className="text-xs text-blue-600 mt-1">📎 {stageDocs.length} document(s)</p>
                        )}
                      </div>
                      <ChevronDown className={clsx('w-5 h-5 text-gray-400 transition-transform', isExpanded && 'rotate-180')} />
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-200/50 space-y-4">
                        <div className="pt-4">
                          <p className="text-sm font-medium text-gray-700 mb-3">Changer l'étape :</p>
                          <div className="grid grid-cols-2 gap-2">
                            {config.steps.map((step, idx) => {
                              const isActive = step.code === currentStep;
                              const isPast = idx < stepIndex;
                              return (
                                <button
                                  key={step.code}
                                  onClick={() => handleStepChange(stage, step.code)}
                                  disabled={updating === stage}
                                  className={clsx(
                                    'p-2 rounded-lg text-sm font-medium text-left transition-all',
                                    isActive && 'bg-blue-600 text-white',
                                    !isActive && isPast && 'bg-emerald-100 text-emerald-700',
                                    !isActive && !isPast && 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200',
                                  )}
                                >
                                  {updating === stage ? '...' : (
                                    <>
                                      {isActive && '● '}
                                      {isPast && !isActive && '✓ '}
                                      {step.label}
                                    </>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        {currentStep !== 'pending' && (
                          <button onClick={() => handleStepChange(stage, 'pending')} className="mt-3 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
                            <RotateCcw className="w-4 h-4" /> Réinitialiser
                          </button>
                        )}
                      </div>

                      {stage === 'dp' && (
                        <div className="pt-4 border-t">
                          <p className="text-sm font-medium text-gray-700 mb-3">CERFA 16702-01 :</p>
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full"
                            icon={generatingCerfa ? Loader2 : FileText}
                            onClick={generateCerfa}
                            disabled={generatingCerfa}
                          >
                            {generatingCerfa ? 'Génération en cours...' : '📄 Générer CERFA 16702-01'}
                          </Button>
                          {cerfaStatus && (
                            <p className={clsx(
                              'mt-2 text-sm',
                              cerfaStatus.type === 'ok' ? 'text-emerald-600' : 'text-red-600'
                            )}>
                              {cerfaStatus.text}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium text-gray-700 mb-3">Documents :</p>
                          {loadingDocs ? (
                            <p className="text-sm text-gray-400">Chargement...</p>
                          ) : stageDocs.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">Aucun document</p>
                          ) : (
                            <div className="space-y-2">
                              {stageDocs.map(doc => (
                                <div key={doc.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border">
                                  {doc.mimeType?.startsWith('image/') ? (
                                    <img
                                      src={doc.url}
                                      className="w-10 h-10 object-cover rounded"
                                      onClick={() => setPreviewDoc(doc)}
                                    />
                                  ) : (
                                    <FileText className="w-10 h-10 text-red-500 flex-shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{doc.filename}</p>
                                    <p className="text-xs text-gray-500">{formatFileSize(doc.size)}</p>
                                  </div>
                                  <button onClick={() => setPreviewDoc(doc)} className="p-1.5 hover:bg-gray-100 rounded">
                                    <Eye className="w-4 h-4 text-gray-500" />
                                  </button>
                                  <button onClick={() => window.open(doc.url, '_blank')} className="p-1.5 hover:bg-gray-100 rounded">
                                    <ExternalLink className="w-4 h-4 text-gray-500" />
                                  </button>
                                  <button onClick={() => handleDeleteDoc(doc.id)} className="p-1.5 hover:bg-gray-100 rounded">
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <StageUploadButton stage={stage} uploading={uploading} onUpload={handleUpload} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Installation</h4>
              <p className="text-lg font-bold">{project.installation?.power || 0} kWc</p>
              <p className="text-sm text-gray-500">{project.installation?.panelsCount || 0} panneaux</p>
            </Card>
            <Card className="p-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Pack</h4>
              <p className="text-lg font-bold">{project.pack}</p>
              <p className="text-sm text-gray-500">{project.packPrice || 0}€</p>
            </Card>
          </div>

          <Card className="p-4">
            <h4 className="font-semibold mb-3">Bénéficiaire</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" />{project.beneficiary?.firstName} {project.beneficiary?.lastName}</div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{project.beneficiary?.address?.street}, {project.beneficiary?.address?.postalCode} {project.beneficiary?.address?.city}</div>
              {project.beneficiary?.email && <div>📧 {project.beneficiary.email}</div>}
              {project.beneficiary?.phone && <div>📞 {project.beneficiary.phone}</div>}
            </div>
          </Card>

          <div className="flex gap-3">
            <Button variant="primary" className="flex-1" icon={FileText}>Générer documents</Button>
          </div>
        </div>
      </motion.div>
      <ProjectPreviewModal
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onOpenNewTab={() => previewDoc && window.open(previewDoc.url, '_blank')}
      />
    </>
  );
}

function ProjectPreviewModal({ doc, onClose, onOpenNewTab }) {
  if (!doc) return null;
  const isImage = doc.mimeType?.startsWith('image/');
  const isPdf = doc.mimeType === 'application/pdf';

  return (
    <AnimatePresence>
      {doc && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-4 z-50 flex flex-col bg-white rounded-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold">{doc.filename}</h3>
                <p className="text-sm text-gray-500">{formatFileSize(doc.size)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" icon={ExternalLink} onClick={onOpenNewTab}>
                  Ouvrir
                </Button>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-100 flex items-center justify-center">
              {isImage ? (
                <img src={doc.url} alt={doc.filename} className="max-w-full max-h-full object-contain" />
              ) : isPdf ? (
                <iframe src={doc.url} className="w-full h-full bg-white rounded-lg" />
              ) : (
                <div className="text-center text-gray-500">
                  <File className="w-24 h-24 mx-auto mb-4" />
                  <p>Apercu non disponible</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StageUploadButton({ stage, uploading, onUpload }) {
  const fileInputRef = useRef(null);
  
  const handleChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      onUpload(stage, files);
    }
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        variant="secondary"
        size="sm"
        className="mt-3 w-full"
        icon={uploading === stage ? Loader2 : Upload}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading === stage}
      >
        {uploading === stage ? 'Upload en cours...' : 'Ajouter un document'}
      </Button>
    </>
  );
}
