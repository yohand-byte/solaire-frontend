import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Search, Plus, Phone, Mail, Building2, ChevronRight, X, Check, XCircle, Edit } from 'lucide-react';
import { Card, Button, Badge, Avatar, Input, Select, EmptyState, Loading, Progress, Modal } from '../components/ui';
import LeadForm from '../components/forms/LeadForm';
import { clsx } from 'clsx';

const STATUS_CONFIG = {
  new: { label: 'Nouveau', color: 'primary' },
  nouveau: { label: 'Nouveau', color: 'primary' },
  contacted: { label: 'Contacté', color: 'info' },
  qualified: { label: 'Qualifié', color: 'warning' },
  converted: { label: 'Converti', color: 'success' },
  converti: { label: 'Converti', color: 'success' },
  lost: { label: 'Perdu', color: 'danger' },
};

// Helper pour gérer les deux structures de leads
const getLeadContact = (lead) => ({
  firstName: lead.contact?.firstName || lead.name?.split(' ')[0] || '',
  lastName: lead.contact?.lastName || lead.name?.split(' ').slice(1).join(' ') || '',
  email: lead.contact?.email || lead.email || '',
  phone: lead.contact?.phone || lead.phone || '',
});

const getLeadName = (lead) => {
  const contact = getLeadContact(lead);
  return `${contact.firstName} ${contact.lastName}`.trim() || 'Sans nom';
};

export default function Leads({ data, loading, onConvert, onCreateLead, onUpdateLead }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [creating, setCreating] = useState(false);

  const leads = data?.items || [];

  const filtered = leads.filter(lead => {
    const contact = getLeadContact(lead);
    const matchesSearch = 
      (lead.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.firstName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new' || l.status === 'nouveau').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
    converted: leads.filter(l => l.status === 'converted' || l.status === 'converti').length,
  };

  const handleCreateLead = async (formData) => {
    setCreating(true);
    try {
      await onCreateLead?.(formData);
      setShowCreateModal(false);
    } finally {
      setCreating(false);
    }
  };

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setShowEditModal(true);
  };

  const handleUpdateLead = async (formData) => {
    setCreating(true);
    try {
      await onUpdateLead?.(editingLead.id, formData);
      setShowEditModal(false);
      setEditingLead(null);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <Loading text="Chargement des leads..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Leads</h1>
          <p className="mt-1 text-gray-500">{filtered.length} lead(s)</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setShowCreateModal(true)}>
          Nouveau lead
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'gray' },
          { label: 'Nouveaux', value: stats.new, color: 'primary' },
          { label: 'Qualifiés', value: stats.qualified, color: 'warning' },
          { label: 'Convertis', value: stats.converted, color: 'success' },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Rechercher par nom, email, entreprise..."
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
              { value: 'new', label: 'Nouveau' },
              { value: 'contacted', label: 'Contacté' },
              { value: 'qualified', label: 'Qualifié' },
              { value: 'converted', label: 'Converti' },
              { value: 'lost', label: 'Perdu' },
            ]}
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="Aucun lead"
          description="Les leads apparaîtront ici"
          action={<Button variant="primary" icon={Plus} onClick={() => setShowCreateModal(true)}>Nouveau lead</Button>}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Entreprise</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Téléphone</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Pack</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Score</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((lead, idx) => {
                  const contact = getLeadContact(lead);
                  const status = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
                  return (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={getLeadName(lead)} size="sm" />
                          <div>
                            <p className="font-medium text-gray-900">{getLeadName(lead)}</p>
                            <p className="text-sm text-gray-500">{contact.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{lead.company || '—'}</td>
                      <td className="px-6 py-4 text-gray-600">{contact.phone || '—'}</td>
                      <td className="px-6 py-4"><Badge variant="solar">{lead.pack || lead.packCode || '—'}</Badge></td>
                      <td className="px-6 py-4"><Badge variant={status.color} dot>{status.label}</Badge></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16">
                            <Progress value={lead.score || 50} size="sm" variant={lead.score >= 70 ? 'success' : lead.score >= 40 ? 'warning' : 'danger'} />
                          </div>
                          <span className="text-sm font-medium">{lead.score || 50}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditLead(lead); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nouveau lead" size="lg">
        <LeadForm
          onSubmit={handleCreateLead}
          onCancel={() => setShowCreateModal(false)}
          loading={creating}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditingLead(null); }} title="Modifier le lead" size="lg">
        {editingLead && (
          <LeadForm
            onSubmit={handleUpdateLead}
            onCancel={() => { setShowEditModal(false); setEditingLead(null); }}
            loading={creating}
            initialData={{
              company: editingLead.company || '',
              firstName: getLeadContact(editingLead).firstName,
              lastName: getLeadContact(editingLead).lastName,
              email: getLeadContact(editingLead).email,
              phone: getLeadContact(editingLead).phone,
              pack: editingLead.pack || editingLead.packCode || '',
              source: editingLead.source || 'manual',
              estimatedVolume: editingLead.estimatedVolume || '',
              notes: editingLead.notes || '',
              status: editingLead.status || 'new',
              score: editingLead.score || 50,
            }}
            isEdit
          />
        )}
      </Modal>

      {/* Detail Drawer */}
      {selectedLead && (
        <LeadDrawer 
          lead={selectedLead} 
          onClose={() => setSelectedLead(null)}
          onConvert={onConvert}
          onEdit={() => { setSelectedLead(null); handleEditLead(selectedLead); }}
        />
      )}
    </div>
  );
}

function LeadDrawer({ lead, onClose, onConvert, onEdit }) {
  const contact = getLeadContact(lead);
  const status = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
  const [converting, setConverting] = useState(false);

  const handleConvert = async () => {
    setConverting(true);
    try {
      await onConvert?.(lead.id);
      onClose();
    } finally {
      setConverting(false);
    }
  };

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
          <h2 className="text-xl font-bold text-gray-900">Détail lead</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}><Edit className="w-4 h-4" /></Button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar name={getLeadName(lead)} size="xl" />
            <div>
              <h3 className="text-xl font-bold text-gray-900">{getLeadName(lead)}</h3>
              <p className="text-gray-500">{lead.company}</p>
              <Badge variant={status.color} className="mt-2" dot>{status.label}</Badge>
            </div>
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-700">Score</span>
              <span className="text-2xl font-bold">{lead.score || 50}/100</span>
            </div>
            <Progress value={lead.score || 50} variant={lead.score >= 70 ? 'success' : 'warning'} />
          </Card>

          <Card className="p-4 space-y-3">
            <h4 className="font-semibold text-gray-900">Contact</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{contact.email || '—'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{contact.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{lead.company || '—'}</span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Informations</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Pack souhaité</p>
                <p className="font-medium">{lead.pack || lead.packCode || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Prix</p>
                <p className="font-medium">{lead.packPrice ? `${lead.packPrice}€` : '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Volume</p>
                <p className="font-medium">{lead.estimatedVolume || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Source</p>
                <p className="font-medium capitalize">{lead.source || 'direct'}</p>
              </div>
            </div>
          </Card>

          {(lead.status !== 'converted' && lead.status !== 'converti' && lead.status !== 'lost') && (
            <div className="flex gap-3">
              <Button 
                variant="success" 
                className="flex-1" 
                icon={Check}
                loading={converting}
                onClick={handleConvert}
              >
                Convertir en installateur
              </Button>
              <Button variant="danger" icon={XCircle}>
                Perdu
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
