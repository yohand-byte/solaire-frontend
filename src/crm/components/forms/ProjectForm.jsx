import { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, Zap } from 'lucide-react';
import { Button, Input, Select } from '../ui';

export default function ProjectForm({ onSubmit, onCancel, loading, installers = [], initialData, isEdit }) {
  const [form, setForm] = useState({
    installerId: initialData?.installerId || '',
    firstName: initialData?.beneficiary?.firstName || '', 
    lastName: initialData?.beneficiary?.lastName || '', 
    email: initialData?.beneficiary?.email || '', 
    phone: initialData?.beneficiary?.phone || '',
    street: initialData?.beneficiary?.address?.street || '', 
    city: initialData?.beneficiary?.address?.city || '', 
    postalCode: initialData?.beneficiary?.address?.postalCode || '',
    power: initialData?.installation?.power || '', 
    panelsCount: initialData?.installation?.panelsCount || '', 
    panelPower: initialData?.installation?.panelPower || '',
    panelsBrand: initialData?.installation?.panelsBrand || '',
    inverterBrand: initialData?.installation?.inverterBrand || '',
    roofType: initialData?.installation?.roofType || 'tuile',
    raccordementType: initialData?.installation?.raccordementType || 'surplus',
    pack: initialData?.pack || 'ESSENTIEL', 
    packPrice: initialData?.packPrice || 169,
    status: initialData?.status || 'in_progress',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'pack') updated.packPrice = { ESSENTIEL: 169, PRO: 269, SERENITE: 449 }[value] || 169;
      return updated;
    });
  };

  useEffect(() => {
    const powerKw = parseFloat(form.power);
    const panelPower = parseFloat(form.panelPower);
    if (!powerKw || !panelPower) return;
    const computed = Math.round((powerKw * 1000) / panelPower);
    setForm(prev => {
      if (String(prev.panelsCount) === String(computed)) return prev;
      return { ...prev, panelsCount: String(computed) };
    });
  }, [form.power, form.panelPower]);

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
        panelPower: parseFloat(form.panelPower) || 0,
        panelsBrand: form.panelsBrand,
        inverterBrand: form.inverterBrand,
        roofType: form.roofType,
        raccordementType: form.raccordementType,
      },
      pack: form.pack,
      packPrice: parseFloat(form.packPrice),
      ...(isEdit && { status: form.status }),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto">
      <Select label="Installateur" name="installerId" value={form.installerId} onChange={handleChange} options={[
        { value: '', label: 'Sélectionner' },
        ...installers.map(i => ({ value: i.id, label: i.company || 'Sans nom' }))
      ]} />
      
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
          <Input label="Puissance kWc" name="power" type="number" step="0.1" value={form.power} onChange={handleChange} icon={Zap} required />
          <Input label="Puissance panneau (Wc)" name="panelPower" type="number" value={form.panelPower} onChange={handleChange} />
          <Input label="Panneaux" name="panelsCount" type="number" value={form.panelsCount} onChange={handleChange} />
          <Input label="Marque panneaux" name="panelsBrand" value={form.panelsBrand} onChange={handleChange} placeholder="Longi, Jinko..." />
          <Input label="Marque onduleur" name="inverterBrand" value={form.inverterBrand} onChange={handleChange} placeholder="Enphase, Huawei..." />
        </div>
        <Select label="Toiture" name="roofType" value={form.roofType} onChange={handleChange} options={[
          { value: 'tuile', label: 'Tuile' },
          { value: 'ardoise', label: 'Ardoise' },
          { value: 'bac_acier', label: 'Bac acier' },
          { value: 'toit_plat', label: 'Toit plat' }
        ]} />
        <Select label="Type de raccordement" name="raccordementType" value={form.raccordementType} onChange={handleChange} options={[
          { value: "surplus", label: "Autoconsommation avec revente de surplus" },
          { value: "revente_totale", label: "Revente totale" }
        ]} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Pack" name="pack" value={form.pack} onChange={handleChange} options={[
          { value: 'ESSENTIEL', label: 'Essentiel 169€' },
          { value: 'PRO', label: 'Pro 269€' },
          { value: 'SERENITE', label: 'Sérénité 449€' }
        ]} />
        <Input label="Prix €" name="packPrice" type="number" value={form.packPrice} onChange={handleChange} />
      </div>

      {isEdit && (
        <Select label="Statut" name="status" value={form.status} onChange={handleChange} options={[
          { value: 'in_progress', label: 'En cours' },
          { value: 'completed', label: 'Finalisé' },
          { value: 'blocked', label: 'Bloqué' }
        ]} />
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button type="submit" variant="solar" loading={loading}>{isEdit ? 'Modifier' : 'Créer'}</Button>
      </div>
    </form>
  );
}
