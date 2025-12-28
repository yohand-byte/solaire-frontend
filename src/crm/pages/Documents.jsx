import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Search, Upload, Download, Trash2, Eye, X,
  File, FileImage, Folder, Filter, ExternalLink, Loader2
} from 'lucide-react';
import { Card, Button, Badge, Input, Select, EmptyState, Loading, Modal } from '../components/ui';
import { clsx } from 'clsx';

const API_BASE = import.meta.env.VITE_API_URL || "https://solaire-api-828508661560.europe-west1.run.app";
const API_TOKEN = 'saftoken-123';

const CATEGORY_CONFIG = {
  dp: { label: 'DP Mairie', color: 'amber' },
  consuel: { label: 'Consuel', color: 'blue' },
  enedis: { label: 'Enedis', color: 'purple' },
  edfoa: { label: 'EDF OA', color: 'emerald' },
  facture: { label: 'Facture', color: 'cyan' },
  autre: { label: 'Autre', color: 'gray' },
};

const getFileIcon = (mimeType) => {
  if (mimeType === 'application/pdf') return FileText;
  if (mimeType?.startsWith('image/')) return FileImage;
  return File;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (d) => {
  if (!d) return '';
  const date = d._seconds ? new Date(d._seconds * 1000) : new Date(d);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function Documents({ documents = [], loading, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const fileInputRef = useRef(null);

  const items = documents?.items || [];

  const filtered = items.filter(doc => {
    const matchesSearch = (doc.filename || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = Object.keys(CATEGORY_CONFIG).reduce((acc, key) => {
    acc[key] = items.filter(d => d.category === key).length;
    return acc;
  }, {});

  const handleUpload = async (files, category, projectId) => {
    if (!files.length) return;
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('projectId', projectId || '');
      
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
        setShowUploadModal(false);
        onRefresh?.();
      } else {
        alert('Erreur upload: ' + (data.error || 'Erreur inconnue'));
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Erreur upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!confirm(`Supprimer "${doc.filename}" ?`)) return;
    setDeleting(doc.id);
    
    try {
      const res = await fetch(`${API_BASE}/api/documents/${doc.id}`, {
        method: 'DELETE',
        headers: { 'X-Api-Token': API_TOKEN }
      });
      
      if (res.ok) {
        onRefresh?.();
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(null);
    }
  };

  const openInNewTab = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) return <Loading text="Chargement des documents..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Documents</h1>
          <p className="mt-1 text-gray-500">{items.length} document(s)</p>
        </div>
        <Button variant="primary" icon={Upload} onClick={() => setShowUploadModal(true)}>
          Uploader un document
        </Button>
      </div>

      {/* Stats par catégorie */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
          <Card 
            key={key} 
            hover 
            className={clsx(
              "p-4 text-center cursor-pointer transition-all",
              categoryFilter === key && "ring-2 ring-blue-500"
            )}
            onClick={() => setCategoryFilter(categoryFilter === key ? 'all' : key)}
          >
            <div className={clsx(
              'w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center',
              `bg-${config.color}-100`
            )}>
              <FileText className={clsx('w-5 h-5', `text-${config.color}-600`)} />
            </div>
            <p className="text-sm font-medium text-gray-900">{config.label}</p>
            <p className="text-xs text-gray-500">{stats[key] || 0} fichier(s)</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Rechercher un document..."
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Toutes catégories' },
              ...Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
                value: key,
                label: config.label
              }))
            ]}
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Documents Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Folder}
          title="Aucun document"
          description="Uploadez des documents PDF, PNG ou JPEG"
          action={
            <Button variant="primary" icon={Upload} onClick={() => setShowUploadModal(true)}>
              Uploader un document
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((doc, idx) => {
            const FileIcon = getFileIcon(doc.mimeType);
            const isImage = doc.mimeType?.startsWith('image/');
            const isPdf = doc.mimeType === 'application/pdf';
            const categoryConfig = CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.autre;
            
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card hover className="overflow-hidden group">
                  {/* Preview */}
                  <div 
                    className="relative h-40 bg-gray-100 flex items-center justify-center cursor-pointer overflow-hidden"
                    onClick={() => isImage || isPdf ? openInNewTab(doc.url) : setPreviewDoc(doc)}
                  >
                    {isImage ? (
                      <img 
                        src={doc.url} 
                        alt={doc.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : isPdf ? (
                      <div className="flex flex-col items-center text-gray-400">
                        <FileText className="w-16 h-16" />
                        <span className="text-xs mt-2">PDF</span>
                      </div>
                    ) : (
                      <FileIcon className="w-16 h-16 text-gray-300" />
                    )}
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openInNewTab(doc.url); }}
                        className="p-2 bg-white rounded-full hover:bg-gray-100"
                      >
                        <ExternalLink className="w-5 h-5 text-gray-700" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setPreviewDoc(doc); }}
                        className="p-2 bg-white rounded-full hover:bg-gray-100"
                      >
                        <Eye className="w-5 h-5 text-gray-700" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate" title={doc.filename}>
                          {doc.filename}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatFileSize(doc.size)} • {formatDate(doc.createdAt)}
                        </p>
                      </div>
                      <Badge variant={categoryConfig.color} size="sm">
                        {categoryConfig.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => openInNewTab(doc.url)}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Ouvrir
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(doc)}
                        disabled={deleting === doc.id}
                      >
                        {deleting === doc.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal 
        isOpen={showUploadModal} 
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        uploading={uploading}
      />

      {/* Preview Modal */}
      <PreviewModal
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onOpenNewTab={() => previewDoc && openInNewTab(previewDoc.url)}
      />
    </div>
  );
}

function UploadModal({ isOpen, onClose, onUpload, uploading }) {
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState('autre');
  const [projectId, setProjectId] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = (newFiles) => {
    const validFiles = Array.from(newFiles).filter(f => 
      ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'].includes(f.type)
    );
    setFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (files.length > 0) {
      onUpload(files, category, projectId);
    }
  };

  const reset = () => {
    setFiles([]);
    setCategory('autre');
    setProjectId('');
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); reset(); }} title="Uploader des documents" size="lg">
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          className={clsx(
            "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
            dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium">Glissez vos fichiers ici</p>
          <p className="text-sm text-gray-400 mt-1">ou cliquez pour sélectionner</p>
          <p className="text-xs text-gray-400 mt-2">PDF, PNG, JPEG (max 10MB)</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Files list */}
        {files.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                {file.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(file)} className="w-10 h-10 object-cover rounded" />
                ) : (
                  <FileText className="w-10 h-10 text-red-500" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <button onClick={() => removeFile(idx)} className="p-1 hover:bg-gray-200 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Category */}
        <Select
          label="Catégorie"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
            value: key,
            label: config.label
          }))}
        />

        {/* Project ID (optional) */}
        <Input
          label="ID Projet (optionnel)"
          placeholder="Laisser vide pour documents généraux"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={() => { onClose(); reset(); }}>
            Annuler
          </Button>
          <Button 
            variant="primary" 
            icon={Upload}
            onClick={handleSubmit}
            disabled={files.length === 0 || uploading}
            loading={uploading}
          >
            {uploading ? 'Upload en cours...' : `Uploader ${files.length} fichier(s)`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function PreviewModal({ doc, onClose, onOpenNewTab }) {
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
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold">{doc.filename}</h3>
                <p className="text-sm text-gray-500">{formatFileSize(doc.size)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" icon={ExternalLink} onClick={onOpenNewTab}>
                  Ouvrir dans un nouvel onglet
                </Button>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-auto p-4 bg-gray-100 flex items-center justify-center">
              {isImage ? (
                <img src={doc.url} alt={doc.filename} className="max-w-full max-h-full object-contain" />
              ) : isPdf ? (
                <iframe src={doc.url} className="w-full h-full bg-white rounded-lg" />
              ) : (
                <div className="text-center text-gray-500">
                  <File className="w-24 h-24 mx-auto mb-4" />
                  <p>Aperçu non disponible</p>
                  <Button variant="primary" className="mt-4" onClick={onOpenNewTab}>
                    Télécharger
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
