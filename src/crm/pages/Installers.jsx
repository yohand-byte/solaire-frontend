import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, Plus, Filter, MoreVertical,
  Building2, Mail, Phone, TrendingUp, FolderKanban,
  ChevronRight, X
} from 'lucide-react';
import { Card, Button, Badge, Avatar, Input, Select, EmptyState, Loading, Progress } from '../components/ui';
import { clsx } from 'clsx';

export default function Installers({ data, loading, onSelect, onCreateProject }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInstaller, setSelectedInstaller] = useState(null);

  const installers = data?.items || [];

  const filtered = installers.filter(inst => {
    const matchesSearch = 
      (inst.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst.contact?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inst.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <Loading text="Chargement des installateurs..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Installateurs</h1>
          <p className="mt-1 text-gray-500">{filtered.length} installateur(s)</p>
        </div>
        <Button variant="primary" icon={Plus}>
          Nouvel installateur
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Rechercher par nom, email..."
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
              { value: 'active', label: 'Actif' },
              { value: 'inactive', label: 'Inactif' },
            ]}
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun installateur"
          description="Commencez par ajouter votre premier installateur"
          action={<Button variant="primary" icon={Plus}>Ajouter</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((installer, idx) => (
            <motion.div
              key={installer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card hover className="p-6" onClick={() => setSelectedInstaller(installer)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar name={installer.company || installer.contact?.firstName} size="lg" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {installer.company || 'Sans nom'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {installer.contact?.firstName} {installer.contact?.lastName}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={installer.status === 'active' ? 'success' : 'default'}
                    dot
                  >
                    {installer.status === 'active' ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>

                <div className="mt-6 space-y-3">
                  {installer.contact?.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{installer.contact.email}</span>
                    </div>
                  )}
                  {installer.contact?.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{installer.contact.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">{installer.stats?.totalDossiers || 0}</p>
                        <p className="text-xs text-gray-500">Dossiers</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-600">{installer.stats?.dossiersFinalises || 0}</p>
                        <p className="text-xs text-gray-500">Finalisés</p>
                      </div>
                    </div>
                    <Badge variant="solar" size="sm">
                      {(installer.subscription?.plan || 'essentiel').toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={(e) => {
                    e.stopPropagation();
                    onCreateProject?.(installer.id);
                  }}>
                    <Plus className="w-4 h-4 mr-1" /> Projet
                  </Button>
                  <Button variant="ghost" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    setSelectedInstaller(installer);
                  }}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedInstaller && (
          <InstallerDrawer
            installer={selectedInstaller}
            onClose={() => setSelectedInstaller(null)}
            onCreateProject={onCreateProject}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function InstallerDrawer({ installer, onClose, onCreateProject }) {
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
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Détail installateur</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Avatar name={installer.company} size="xl" />
            <div>
              <h3 className="text-xl font-bold text-gray-900">{installer.company}</h3>
              <p className="text-gray-500">
                {installer.contact?.firstName} {installer.contact?.lastName}
              </p>
              <Badge variant={installer.status === 'active' ? 'success' : 'default'} className="mt-2">
                {installer.status === 'active' ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
          </div>

          {/* Contact */}
          <Card className="p-4 space-y-3">
            <h4 className="font-semibold text-gray-900">Contact</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{installer.contact?.email || '—'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{installer.contact?.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{installer.siret || 'SIRET non renseigné'}</span>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <Card className="p-4">
            <h4 className="font-semibold text-gray-900 mb-4">Statistiques</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{installer.stats?.totalDossiers || 0}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">{installer.stats?.dossiersEnCours || 0}</p>
                <p className="text-xs text-gray-500">En cours</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-500">{installer.stats?.dossiersFinalises || 0}</p>
                <p className="text-xs text-gray-500">Finalisés</p>
              </div>
            </div>
          </Card>

          {/* Subscription */}
          <Card className="p-4">
            <h4 className="font-semibold text-gray-900 mb-4">Abonnement</h4>
            <div className="flex items-center justify-between">
              <Badge variant="solar" size="lg">
                Pack {(installer.subscription?.plan || 'essentiel').toUpperCase()}
              </Badge>
              <span className="text-sm text-gray-500">
                {installer.subscription?.dossiersUsed || 0} / {installer.subscription?.dossiersIncluded || 10} dossiers
              </span>
            </div>
            <Progress 
              value={installer.subscription?.dossiersUsed || 0} 
              max={installer.subscription?.dossiersIncluded || 10}
              className="mt-3"
              variant="solar"
            />
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="primary" className="flex-1" icon={Plus} onClick={() => onCreateProject?.(installer.id)}>
              Nouveau projet
            </Button>
            <Button variant="secondary" className="flex-1" icon={FolderKanban}>
              Voir projets
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
