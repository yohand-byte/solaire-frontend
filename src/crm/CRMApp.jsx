import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Installers from './pages/Installers';
import Projects from './pages/Projects';
import Leads from './pages/Leads';
import Documents from './pages/Documents';
import Settings from './pages/Settings';
import { Loading } from './components/ui';
import { auth } from '../lib/firestore';

const API_BASE = import.meta.env.VITE_API_URL || "https://solaire-api-828508661560.europe-west1.run.app";
const API_TOKEN = 'saftoken-123';

const fetchAPI = async (endpoint, options = {}) => {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { 
      'X-Api-Token': API_TOKEN,
      'Content-Type': 'application/json',
      ...options.headers 
    }
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
};

export default function CRMApp() {
  const [installerFilter, setInstallerFilter] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [data, setData] = useState({ dashboard: null, installers: null, projects: null, leads: null, documents: null });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboard, installers, projects, leads, documents] = await Promise.all([
        fetchAPI('/api/dashboard'),
        fetchAPI('/api/installers?limit=100'),
        fetchAPI('/api/projects?limit=100'),
        fetchAPI('/api/leads?limit=100'),
        fetchAPI('/api/documents?limit=100'),
      ]);
      setData({ dashboard, installers, projects, leads, documents });
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authUser) return;
    loadData();
  }, [authUser, loadData]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sf_crm_dark');
      if (stored === null) return;
      const enabled = stored === '1';
      setDarkMode(enabled);
      document.documentElement.classList.toggle('dark', enabled);
    } catch {}
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      try {
        localStorage.setItem('sf_crm_dark', next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setAuthError(null);
    if (!authEmail || !authPassword) {
      setAuthError('Email et mot de passe requis.');
      return;
    }
    setAuthSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
      setAuthEmail('');
      setAuthPassword('');
    } catch (err) {
      setAuthError('Connexion impossible. Verifiez vos identifiants.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // API Handlers
  const handleCreateLead = async (formData) => {
    await fetchAPI('/api/leads', { method: 'POST', body: JSON.stringify(formData) });
    loadData();
  };

  const handleUpdateLead = async (leadId, formData) => {
    await fetchAPI(`/api/leads/${leadId}`, { method: 'PATCH', body: JSON.stringify(formData) });
    loadData();
  };

  const handleConvertLead = async (leadId) => {
    await fetchAPI(`/api/leads/${leadId}/convert`, { method: 'POST' });
    loadData();
  };

  const handleCreateInstaller = async (formData) => {
    await fetchAPI('/api/installers', { method: 'POST', body: JSON.stringify(formData) });
    loadData();
  };

  const handleUpdateInstaller = async (installerId, formData) => {
    await fetchAPI(`/api/installers/${installerId}`, { method: 'PATCH', body: JSON.stringify(formData) });
    loadData();
  };

  const handleCreateProject = async (formData) => {
    await fetchAPI('/api/projects', { method: 'POST', body: JSON.stringify(formData) });
    loadData();
  };

  const handleViewProjects = (installerId) => {
    setInstallerFilter(installerId);
    setCurrentPage("projects");
  };

  const handleUpdateProject = async (projectId, formData) => {
    await fetchAPI(`/api/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(formData) });
    loadData();
  };

  const handleUpdateWorkflow = async (projectId, stage, step) => {
    await fetchAPI(`/api/projects/${projectId}/workflow/${stage}`, {
      method: 'PATCH',
      body: JSON.stringify({ step })
    });
    loadData();
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard data={data.dashboard} onNavigate={setCurrentPage} />;
      case 'installers':
        return <Installers data={data.installers} loading={loading} onCreateInstaller={handleCreateInstaller} onUpdateInstaller={handleUpdateInstaller} onCreateProject={handleCreateProject} onViewProjects={handleViewProjects} installers={data.installers?.items || []} />;
      case 'projects':
        return <Projects data={installerFilter ? { ...data.projects, items: (data.projects?.items || []).filter(p => p.installerId === installerFilter) } : data.projects} loading={loading} onCreateProject={handleCreateProject} onUpdateProject={handleUpdateProject} onUpdateWorkflow={handleUpdateWorkflow} installers={data.installers?.items || []} installerFilter={installerFilter} onClearFilter={() => setInstallerFilter(null)} />;
      case 'leads':
        return <Leads data={data.leads} loading={loading} onConvert={handleConvertLead} onCreateLead={handleCreateLead} onUpdateLead={handleUpdateLead} />;
      case 'documents':
        return <Documents documents={data.documents} loading={loading} onRefresh={loadData} />;
      case 'settings':
        return <Settings darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />;
      default:
        return <Dashboard data={data.dashboard} onNavigate={setCurrentPage} />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loading size="lg" text="Chargement de la session..." />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-sm p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Connexion admin</h1>
            <p className="text-sm text-gray-500">Acces securise au CRM.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-200"
                placeholder="admin@solaire-facile.fr"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-200"
                placeholder="••••••••"
                required
              />
            </div>
            {authError ? (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
                {authError}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full inline-flex items-center justify-center rounded-xl bg-primary-600 text-white font-semibold py-2 text-sm shadow-sm disabled:opacity-50"
            >
              {authSubmitting ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading && !data.dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Loading size="lg" text="Chargement de Solaire Facile..." />
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <MainLayout currentPage={currentPage} onNavigate={setCurrentPage} stats={data.dashboard?.kpis}>
        {renderPage()}
      </MainLayout>
    </div>
  );
}
