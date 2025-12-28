import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  UserPlus,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Bell,
  Search,
  ChevronDown,
} from 'lucide-react';
import { Avatar } from '../components/ui';

const navigation = [
  { name: 'Dashboard', href: 'dashboard', icon: LayoutDashboard },
  { name: 'Leads', href: 'leads', icon: UserPlus, badge: null },
  { name: 'Installateurs', href: 'installers', icon: Users },
  { name: 'Projets', href: 'projects', icon: FolderKanban },
  { name: 'Documents', href: 'documents', icon: FileText },
];

const secondaryNav = [
  { name: 'Paramètres', href: 'settings', icon: Settings },
];

export default function MainLayout({ children, currentPage, onNavigate, stats }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    newLead: true,
    blockedProject: true,
    reminders: true,
    weeklyReport: true,
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const STORAGE_KEY = 'sf_crm_notification_prefs';
    const loadPrefs = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        setNotificationPrefs((prev) => ({ ...prev, ...parsed }));
      } catch {}
    };

    loadPrefs();
    const handlePrefsUpdate = () => loadPrefs();
    window.addEventListener('sf-notification-prefs', handlePrefsUpdate);
    window.addEventListener('storage', handlePrefsUpdate);
    return () => {
      window.removeEventListener('sf-notification-prefs', handlePrefsUpdate);
      window.removeEventListener('storage', handlePrefsUpdate);
    };
  }, []);

  const notifications = [];
  if (notificationPrefs.newLead && stats?.newLeads > 0) {
    notifications.push({
      id: 'new-leads',
      label: `${stats.newLeads} nouveau${stats.newLeads > 1 ? 'x' : ''} lead${stats.newLeads > 1 ? 's' : ''}`,
      description: 'Consultez la liste des leads',
      target: 'leads',
    });
  }
  if (notificationPrefs.blockedProject && stats?.projectsBlocked > 0) {
    notifications.push({
      id: 'blocked-projects',
      label: `${stats.projectsBlocked} projet${stats.projectsBlocked > 1 ? 's' : ''} bloqué${stats.projectsBlocked > 1 ? 's' : ''}`,
      description: 'Voir les projets bloqués',
      target: 'projects',
    });
  }
  const hasNotifications = notifications.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={clsx(
        'fixed top-0 left-0 z-50 h-full w-72 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="h-full bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
            <div className="flex items-center gap-3 relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-solar-400 to-solar-500 flex items-center justify-center shadow-lg shadow-solar-500/30">
                <Sun className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Solaire Facile</h1>
                <p className="text-xs text-gray-500">CRM Admin</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = currentPage === item.href;
              const badgeCount = item.href === 'leads' && stats?.newLeads;
              
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    onNavigate(item.href);
                    setSidebarOpen(false);
                  }}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <item.icon className={clsx('w-5 h-5', isActive ? 'text-white' : 'text-gray-400')} />
                  <span className="flex-1 text-left">{item.name}</span>
                  {badgeCount > 0 && (
                    <span className={clsx(
                      'px-2 py-0.5 rounded-full text-xs font-bold',
                      isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
                    )}>
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-6 mt-6 border-t border-gray-100">
              {secondaryNav.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    onNavigate(item.href);
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all duration-200"
                >
                  <item.icon className="w-5 h-5 text-gray-400" />
                  {item.name}
                </button>
              ))}
            </div>
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
              <Avatar name="Admin Solaire" size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">Admin</p>
                <p className="text-xs text-gray-500 truncate">admin@solaire-facile.fr</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
          <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <Menu className="w-5 h-5 text-gray-500" />
              </button>
              
              {/* Search */}
              <div className="hidden sm:block relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="w-64 lg:w-80 pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button
                className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                <Bell className="w-5 h-5 text-gray-500" />
                {hasNotifications ? (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                ) : null}
              </button>
              {notificationsOpen ? (
                <div className="absolute right-4 top-14 w-80 bg-white border border-gray-200 rounded-2xl shadow-lg z-50">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">Notifications</div>
                    <button
                      className="text-xs text-gray-400 hover:text-gray-600"
                      onClick={() => setNotificationsOpen(false)}
                    >
                      Fermer
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-500">Aucune notification.</div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50"
                          onClick={() => {
                            onNavigate(notification.target);
                            setNotificationsOpen(false);
                          }}
                        >
                          <div className="text-sm font-medium text-gray-900">{notification.label}</div>
                          <div className="text-xs text-gray-500">{notification.description}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Quick stats */}
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl">
                <span className="text-xs text-emerald-600 font-medium">Ce mois</span>
                <span className="text-sm font-bold text-emerald-700">{stats?.revenueThisMonth || 0}€</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
