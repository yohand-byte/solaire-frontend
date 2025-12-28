import { useState } from 'react';
import { Building2, User, Mail, Phone } from 'lucide-react';
import { Button, Input, Select } from '../ui';

export default function LeadForm({ onSubmit, onCancel, loading, initialData, isEdit }) {
  const [form, setForm] = useState({
    company: initialData?.company || '',
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    pack: initialData?.pack || '',
    source: initialData?.source || 'manual',
    estimatedVolume: initialData?.estimatedVolume || '',
    notes: initialData?.notes || '',
    status: initialData?.status || 'new',
    score: initialData?.score || 50,
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      company: form.company,
      contact: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
      },
      pack: form.pack,
      source: form.source,
      estimatedVolume: form.estimatedVolume,
      notes: form.notes,
      ...(isEdit && { status: form.status, score: parseInt(form.score) }),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Entreprise" name="company" value={form.company} onChange={handleChange} placeholder="Nom entreprise" icon={Building2} required />
      
      <div className="grid grid-cols-2 gap-4">
        <Input label="Prénom" name="firstName" value={form.firstName} onChange={handleChange} placeholder="Prénom" icon={User} required />
        <Input label="Nom" name="lastName" value={form.lastName} onChange={handleChange} placeholder="Nom" required />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@exemple.com" icon={Mail} required />
        <Input label="Téléphone" name="phone" value={form.phone} onChange={handleChange} placeholder="06..." icon={Phone} />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Select label="Pack" name="pack" value={form.pack} onChange={handleChange} options={[
          { value: '', label: 'Sélectionner' },
          { value: 'ESSENTIEL', label: 'Essentiel - 169€' },
          { value: 'PRO', label: 'Pro - 269€' },
          { value: 'SERENITE', label: 'Sérénité - 449€' }
        ]} />
        <Select label="Source" name="source" value={form.source} onChange={handleChange} options={[
          { value: 'manual', label: 'Manuel' },
          { value: 'landing', label: 'Landing page' },
          { value: 'referral', label: 'Recommandation' },
          { value: 'api', label: 'API' }
        ]} />
      </div>

      {isEdit && (
        <div className="grid grid-cols-2 gap-4">
          <Select label="Statut" name="status" value={form.status} onChange={handleChange} options={[
            { value: 'new', label: 'Nouveau' },
            { value: 'contacted', label: 'Contacté' },
            { value: 'qualified', label: 'Qualifié' },
            { value: 'converted', label: 'Converti' },
            { value: 'lost', label: 'Perdu' }
          ]} />
          <Input label="Score (0-100)" name="score" type="number" min="0" max="100" value={form.score} onChange={handleChange} />
        </div>
      )}
      
      <Input label="Volume estimé" name="estimatedVolume" value={form.estimatedVolume} onChange={handleChange} placeholder="5-10 dossiers/mois" />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={2}
          className="w-full rounded-xl border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          placeholder="Notes..."
        />
      </div>
      
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" variant="primary" loading={loading}>{isEdit ? 'Modifier' : 'Créer'}</Button>
      </div>
    </form>
  );
}
