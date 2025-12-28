import { useState } from 'react';
import { Building2, User, Mail, Phone } from 'lucide-react';
import { Button, Input, Select } from '../ui';

export default function LeadForm({ onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    company: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    pack: '',
    source: 'manual',
    estimatedVolume: '',
    notes: '',
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
        <Select label="Pack" name="pack" value={form.pack} onChange={handleChange} options={[{value:'',label:'Sélectionner'},{value:'ESSENTIEL',label:'Essentiel'},{value:'PRO',label:'Pro'},{value:'SERENITE',label:'Sérénité'}]} />
        <Select label="Source" name="source" value={form.source} onChange={handleChange} options={[{value:'manual',label:'Manuel'},{value:'landing',label:'Landing'},{value:'referral',label:'Recommandation'}]} />
      </div>
      <Input label="Volume estimé" name="estimatedVolume" value={form.estimatedVolume} onChange={handleChange} placeholder="5-10 dossiers/mois" />
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" variant="primary" loading={loading}>Créer</Button>
      </div>
    </form>
  );
}
