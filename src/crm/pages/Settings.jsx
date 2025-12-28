import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, User, Bell, Shield, CreditCard,
  Palette, Globe, Key, Save, Moon, Sun
} from 'lucide-react';
import { Card, Button, Badge, Input, Select } from '../components/ui';
import { clsx } from 'clsx';

const TABS = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Sécurité', icon: Shield },
  { id: 'billing', label: 'Facturation', icon: CreditCard },
  { id: 'appearance', label: 'Apparence', icon: Palette },
];

export default function Settings({ onToggleDarkMode, darkMode }) {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Paramètres</h1>
        <p className="mt-1 text-gray-500">Gérez les paramètres de votre compte</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs */}
        <Card className="lg:w-64 p-2">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </Card>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'billing' && <BillingSettings />}
          {activeTab === 'appearance' && <AppearanceSettings onToggleDarkMode={onToggleDarkMode} darkMode={darkMode} />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Informations du profil</h2>
        <p className="text-sm text-gray-500">Mettez à jour vos informations personnelles</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Prénom" placeholder="Votre prénom" defaultValue="Admin" />
        <Input label="Nom" placeholder="Votre nom" defaultValue="Solaire" />
        <Input label="Email" type="email" placeholder="votre@email.com" defaultValue="admin@solaire-facile.fr" />
        <Input label="Téléphone" placeholder="06 XX XX XX XX" />
      </div>

      <div>
        <Input label="Entreprise" placeholder="Nom de l'entreprise" defaultValue="Solaire Facile" />
      </div>

      <div className="pt-4 border-t border-gray-100">
        <Button variant="primary" icon={Save}>
          Sauvegarder
        </Button>
      </div>
    </Card>
  );
}

function NotificationSettings() {
  const STORAGE_KEY = 'sf_crm_notification_prefs';
  const DEFAULT_PREFS = {
    newLead: true,
    blockedProject: true,
    reminders: true,
    weeklyReport: true,
  };
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  const savePrefs = (nextPrefs) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPrefs));
    } catch {}
    window.dispatchEvent(new Event('sf-notification-prefs'));
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setPrefs({ ...DEFAULT_PREFS, ...parsed });
      }
    } catch {}
  }, []);

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        <p className="text-sm text-gray-500">Configurez vos préférences de notification</p>
      </div>

      <div className="space-y-4">
        {[
          { key: 'newLead', label: 'Nouveau lead', description: 'Recevoir une notification pour chaque nouveau lead' },
          { key: 'blockedProject', label: 'Projet bloqué', description: 'Être alerté quand un projet est bloqué' },
          { key: 'reminders', label: 'Rappels', description: 'Recevoir des rappels pour les relances' },
          { key: 'weeklyReport', label: 'Rapports hebdo', description: 'Recevoir un récapitulatif hebdomadaire' },
        ].map((notif) => (
          <div key={notif.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">{notif.label}</p>
              <p className="text-sm text-gray-500">{notif.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(prefs[notif.key])}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setPrefs((prev) => ({ ...prev, [notif.key]: checked }));
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-100">
        <Button
          variant="primary"
          icon={Save}
          onClick={() => {
            savePrefs(prefs);
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          }}
        >
          {saved ? 'Sauvegardé' : 'Sauvegarder'}
        </Button>
      </div>
    </Card>
  );
}

function SecuritySettings() {
  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Sécurité</h2>
        <p className="text-sm text-gray-500">Gérez la sécurité de votre compte</p>
      </div>

      <div className="space-y-4">
        <Input label="Mot de passe actuel" type="password" placeholder="••••••••" />
        <Input label="Nouveau mot de passe" type="password" placeholder="••••••••" />
        <Input label="Confirmer le mot de passe" type="password" placeholder="••••••••" />
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-center gap-3">
          <Key className="w-5 h-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">Authentification à deux facteurs</p>
            <p className="text-sm text-amber-600">Non activée - Activez pour plus de sécurité</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" className="mt-3">
          Activer 2FA
        </Button>
      </div>

      <div className="pt-4 border-t border-gray-100">
        <Button variant="primary" icon={Save}>
          Mettre à jour
        </Button>
      </div>
    </Card>
  );
}

function BillingSettings() {
  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Facturation</h2>
        <p className="text-sm text-gray-500">Gérez votre abonnement et vos paiements</p>
      </div>

      <div className="p-4 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Plan actuel</p>
            <p className="text-2xl font-bold">PRO</p>
          </div>
          <Badge className="bg-white/20 text-white">Actif</Badge>
        </div>
        <p className="mt-2 text-sm opacity-80">Prochain renouvellement : 1er Février 2025</p>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-gray-900">Historique des factures</h3>
        {[
          { date: '01/12/2024', amount: '269€', status: 'Payée' },
          { date: '01/11/2024', amount: '269€', status: 'Payée' },
          { date: '01/10/2024', amount: '269€', status: 'Payée' },
        ].map((invoice, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">{invoice.date}</p>
              <p className="text-sm text-gray-500">{invoice.amount}</p>
            </div>
            <Badge variant="success">{invoice.status}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AppearanceSettings({ onToggleDarkMode, darkMode }) {
  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Apparence</h2>
        <p className="text-sm text-gray-500">Personnalisez l'apparence de l'application</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3">
            {darkMode ? <Moon className="w-5 h-5 text-gray-600" /> : <Sun className="w-5 h-5 text-amber-500" />}
            <div>
              <p className="font-medium text-gray-900">Mode sombre</p>
              <p className="text-sm text-gray-500">Basculer entre le mode clair et sombre</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={darkMode || false}
              onChange={() => onToggleDarkMode?.()}
              className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-gray-600" />
            <div>
              <p className="font-medium text-gray-900">Langue</p>
              <p className="text-sm text-gray-500">Choisir la langue de l'interface</p>
            </div>
          </div>
          <Select
            options={[
              { value: 'fr', label: '🇫🇷 Français' },
              { value: 'en', label: '🇬🇧 English' },
            ]}
            defaultValue="fr"
            className="w-40"
          />
        </div>
      </div>
    </Card>
  );
}
