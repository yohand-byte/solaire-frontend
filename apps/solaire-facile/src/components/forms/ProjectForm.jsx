import { useState } from 'react';
import { User, Mail, Phone, MapPin, Zap } from 'lucide-react';
import { Button, Input, Select } from '../ui';

export default function ProjectForm({ onSubmit, onCancel, loading, installers = [] }) {
  const [form, setForm] = useState({
    installerId: '',
    firstName: '', lastName: '', email: '', phone: '',
    street: '', city: '', postalCode: '',
    power: '', panelsCount: '', roofType: 'tuile',
    pack: 'ESSENTIEL', packPrice: 169,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'pack') updated.packPrice = { ESSENTIEL: 169, PRO: 269, SERENITE: 449 }[value] || 169;
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      installerId: form.installerId || null,
      beneficiary: {
        type: 'particulier',
        firstName: form.firstName, lastName: form.lastName,
        email: form.email, phone: form.phone,
        address: { street: form.street, city: form.city, postalCode: form.postalCode },
      },
      installation: {
        power: parseFloat(form.power) || 0,
        panelsCount: parseInt(form.panelsCount) || 0,
        roofType: form.roofType,
      },
      pack: form.pack,
      packPrice: parseFloat(form.packPrice),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto">
      <Select label="Installateur" name="installerId" value={form.installerId} onChange={handleChange} options={[{value:'',label:'Sélectionner'},...installers.map(i=>({value:i.id,label:i.company||'Sans nom'}))]} />
      
      <div className="p-3 bg-gray-50 rounded-lg space-y-3">
        <p className="font-medium text-sm">Bénéficiaire</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Prénom" name="firstName" value={form.firstName} onChange={handleChange} icon={User} required />
          <Input label="Nom" name="lastName" value={form.lastName} onChange={handleChange} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Email" name="email" value={form.email} onChange={handleChange} icon={Mail} />
          <Input label="Tél" name="phone" value={form.phone} onChange={handleChange} icon={Phone} />
        </div>
        <Input label="Adresse" name="street" value={form.street} onChange={handleChange} icon={MapPin} required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="CP" name="postalCode" value={form.postalCode} onChange={handleChange} required />
          <Input label="Ville" name="city" value={form.city} onChange={handleChange} required />
        </div>
      </div>

      <div className="p-3 bg-blue-50 rounded-lg space-y-3">
        <p className="font-medium text-sm">Installation</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Puissance kWc" name="power" type="number" value={form.power} onChange={handleChange} icon={Zap} required />
          <Input label="Panneaux" name="panelsCount" type="number" value={form.panelsCount} onChange={handleChange} />
        </div>
        <Select label="Toiture" name="roofType" value={form.roofType} onChange={handleChange} options={[{value:'tuile',label:'Tuile'},{value:'ardoise',label:'Ardoise'},{value:'bac_acier',label:'Bac acier'}]} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Pack" name="pack" value={form.pack} onChange={handleChange} options={[{value:'ESSENTIEL',label:'Essentiel 169€'},{value:'PRO',label:'Pro 269€'},{value:'SERENITE',label:'Sérénité 449€'}]} />
        <Input label="Prix €" name="packPrice" type="number" value={form.packPrice} onChange={handleChange} />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" variant="solar" loading={loading}>Créer</Button>
      </div>
    </form>
  );
}
