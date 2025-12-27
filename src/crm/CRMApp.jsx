import { useState, useEffect, useCallback } from 'react';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Installers from './pages/Installers';
import Projects from './pages/Projects';
import { Loading } from './components/ui';

const API_BASE = import.meta.env.VITE_API_URL || "https://solaire-api-828508661560.europe-west1.run.app";
const API_TOKEN = 'saftoken-123';

const fetchAPI = async (endpoint) => {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'X-Api-Token': API_TOKEN }
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
};

export default function CRMApp() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    dashboard: null,
    installers: null,
    projects: null,
    leads: null,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboard, installers, projects, leads] = await Promise.all([
        fetchAPI('/api/dashboard'),
        fetchAPI('/api/installers?limit=100'),
        fetchAPI('/api/projects?limit=100'),
        fetchAPI('/api/leads?limit=100'),
      ]);
      setData({ dashboard, installers, projects, leads });
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <Dashboard 
            data={data.dashboard} 
            onNavigate={handleNavigate}
          />
        );
      case 'installers':
        return (
          <Installers 
            data={data.installers}
            loading={loading}
          />
        );
      case 'projects':
        return (
          <Projects 
            data={data.projects}
            loading={loading}
          />
        );
      case 'leads':
        return <div className="text-center py-12 text-gray-500">Page Leads - Coming soon</div>;
      case 'documents':
        return <div className="text-center py-12 text-gray-500">Page Documents - Coming soon</div>;
      case 'settings':
        return <div className="text-center py-12 text-gray-500">Page Paramètres - Coming soon</div>;
      default:
        return <Dashboard data={data.dashboard} onNavigate={handleNavigate} />;
    }
  };

  if (loading && !data.dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="lg" text="Chargement de Solaire Facile..." />
      </div>
    );
  }

  return (
    <MainLayout 
      currentPage={currentPage} 
      onNavigate={handleNavigate}
      stats={data.dashboard?.kpis}
    >
      {renderPage()}
    </MainLayout>
  );
}
