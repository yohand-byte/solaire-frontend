import { useState } from 'react';
import { Building2, User, Mail, Phone, MapPin, CreditCard } from 'lucide-react';
import { Button, Input, Select } from '../ui';

export default function InstallerForm({ onSubmit, onCancel, loading, initialData }) {
  const [form, setForm] = useState({
    company: initialData?.company || '',
    siret: initialData?.siret || '',
    firstName: initialData?.contact?.firstName || '',
    lastName: initialData?.contact?.lastName || '',
    email: initialData?.contact?.email || '',
    phone: initialData?.contact?.phone || '',
    street: initialData?.address?.street || '',
    city: initialData?.address?.city || '',
    postalCode: initialData?.address?.postalCode || '',
    plan: initialData?.subscription?.plan || 'essentiel',
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      company: form.company,
      siret: form.siret,
      contact: { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone },
      address: { street: form.street, city: form.city, postalCode: form.postalCode, country: 'FR' },
      subscription: { plan: form.plan, dossiersIncluded: form.plan === 'pro' ? 15 : form.plan === 'serenite' ? 30 : 5 },
      status: 'active',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Entreprise" name="company" value={form.company} onChange={handleChange} icon={Building2} required />
        <Input label="SIRET" name="siret" value={form.siret} onChange={handleChange} icon={CreditCard} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Prénom" name="firstName" value={form.firstName} onChange={handleChange} icon={User} required />
        <Input label="Nom" name="lastName" value={form.lastName} onChange={handleChange} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} icon={Mail} required />
        <Input label="Téléphone" name="phone" value={form.phone} onChange={handleChange} icon={Phone} />
      </div>
      <Input label="Adresse" name="street" value={form.street} onChange={handleChange} icon={MapPin} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="CP" name="postalCode" value={form.postalCode} onChange={handleChange} />
        <Input label="Ville" name="city" value={form.city} onChange={handleChange} />
      </div>
      <Select label="Formule" name="plan" value={form.plan} onChange={handleChange} options={[{value:'essentiel',label:'Essentiel'},{value:'pro',label:'Pro'},{value:'serenite',label:'Sérénité'}]} />
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" variant="primary" loading={loading}>{initialData ? 'Modifier' : 'Créer'}</Button>
      </div>
    </form>
  );
}
