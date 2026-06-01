import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Facebook, 
  BarChart3, 
  LogOut, 
  PlusCircle,
  Settings as SettingsIcon,
  Menu,
  X,
  Bell,
  Search,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Users,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useSettings } from '@/lib/SettingsContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard', color: 'text-brand-blue' },
    { icon: FileText, label: 'Artículos', path: '/admin/articulos', color: 'text-brand-red' },
    { icon: Facebook, label: 'Importar FB', path: '/admin/importar', color: 'text-blue-600' },
    { icon: BarChart3, label: 'Reporte', path: '/admin/reporte', color: 'text-brand-yellow' },
    { icon: Users, label: 'Suscriptores', path: '/admin/suscriptores', color: 'text-purple-500' },
    { icon: BookOpen, label: 'Revistas', path: '/admin/flipbooks', color: 'text-emerald-500' },
    { icon: SettingsIcon, label: 'Ajustes', path: '/admin/ajustes', color: 'text-slate-500' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans text-slate-900">
      {/* Desktop Sidebar - Modern Glassmorphism */}
      <aside className={cn(
        "hidden lg:flex lg:flex-col sticky top-0 h-screen transition-all duration-500 ease-in-out border-r border-slate-200/50 bg-white/80 backdrop-blur-xl z-50",
        isSidebarCollapsed ? "w-24" : "w-72"
      )}>
        <div className="flex h-24 items-center px-8">
          <Link to="/admin/dashboard" className="flex items-center gap-4 group">
            <div className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform duration-300">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="h-6 w-auto object-contain brightness-0 invert" />
              ) : (
                <span className="font-black text-sm tracking-tighter">ZG</span>
              )}
            </div>
            {!isSidebarCollapsed && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col"
              >
                <span className="text-sm font-black tracking-tighter uppercase leading-none">Panel Admin</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Zapotlán Gráfico</span>
              </motion.div>
            )}
          </Link>
        </div>

        <div className="flex-1 px-4 space-y-8 overflow-y-auto py-4">
          <nav className="space-y-1.5">
            {!isSidebarCollapsed && (
              <p className="px-4 mb-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Menú Principal</p>
            )}
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all duration-300 group relative",
                  location.pathname === item.path 
                    ? "bg-slate-900 text-white shadow-xl shadow-slate-200" 
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-transform group-hover:scale-110",
                  location.pathname === item.path ? "text-brand-blue" : item.color
                )} />
                {!isSidebarCollapsed && <span>{item.label}</span>}
                {location.pathname === item.path && !isSidebarCollapsed && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute right-4 h-1.5 w-1.5 rounded-full bg-brand-blue"
                  />
                )}
              </Link>
            ))}
          </nav>

          <div className="px-4">
            <div className={cn(
              "rounded-3xl bg-gradient-to-br from-brand-blue to-blue-600 p-6 text-white shadow-lg shadow-blue-100 relative overflow-hidden group",
              isSidebarCollapsed ? "hidden" : "block"
            )}>
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <Sparkles className="h-6 w-6 mb-4 text-brand-yellow" />
              <p className="text-xs font-black uppercase tracking-widest mb-2">Vista Pública</p>
              <p className="text-[10px] font-medium opacity-80 mb-4 leading-relaxed">Revisa cómo se ve el sitio para tus lectores.</p>
              <Link to="/" target="_blank">
                <Button size="sm" className="w-full bg-white text-brand-blue hover:bg-white/90 rounded-xl font-black text-[10px] uppercase tracking-widest">
                  Ver Sitio <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="p-4 mt-auto">
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start gap-4 rounded-2xl text-slate-500 hover:bg-red-50 hover:text-brand-red transition-all duration-300",
              isSidebarCollapsed && "justify-center px-0"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            {!isSidebarCollapsed && <span className="text-sm font-bold">Cerrar Sesión</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Header - Modern & Clean */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-20 items-center justify-between bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6">
        <Link to="/admin/dashboard" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-6 w-auto object-contain brightness-0 invert" />
            ) : (
              <span className="font-black text-sm tracking-tighter">ZG</span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-tighter uppercase leading-none">Admin</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Zapotlán Gráfico</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-2xl bg-slate-50">
            <Bell className="h-5 w-5 text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-2xl bg-slate-50" onClick={handleLogout}>
            <LogOut className="h-5 w-5 text-brand-red" />
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Bar (Bottom) - Modern Floating Style */}
      <div className="lg:hidden fixed bottom-6 left-6 right-6 z-50">
        <nav className="flex h-16 items-center justify-around rounded-[2rem] bg-slate-900/90 backdrop-blur-xl border border-white/10 px-2 shadow-2xl shadow-slate-400/20">
          {menuItems.slice(0, 6).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl px-4 py-2 transition-all duration-300",
                location.pathname === item.path 
                  ? "text-brand-blue scale-110" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              <item.icon className="h-5 w-5" />
              {location.pathname === item.path && (
                <motion.div layoutId="mobile-nav-dot" className="h-1 w-1 rounded-full bg-brand-blue" />
              )}
            </Link>
          ))}
          <Link
            to="/admin/ajustes"
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl px-4 py-2 transition-all duration-300",
              location.pathname === '/admin/ajustes' 
                ? "text-brand-blue scale-110" 
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <SettingsIcon className="h-5 w-5" />
            {location.pathname === '/admin/ajustes' && (
              <motion.div layoutId="mobile-nav-dot" className="h-1 w-1 rounded-full bg-brand-blue" />
            )}
          </Link>
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Header */}
        <header className="hidden lg:flex h-24 items-center justify-between bg-white/50 backdrop-blur-sm px-12 border-b border-slate-200/50">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-2xl hover:bg-white shadow-sm border border-slate-100"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            >
              <Menu className="h-5 w-5 text-slate-500" />
            </Button>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <Link to="/admin/dashboard" className="hover:text-slate-900 transition-colors">Admin</Link>
              <ChevronRight className="h-3 w-3 opacity-30" />
              <span className="text-slate-900">{location.pathname.split('/').pop()?.replace('-', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden xl:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
              <input 
                type="text" 
                placeholder="Buscar en el panel..." 
                className="h-12 w-64 pl-12 pr-4 rounded-2xl bg-slate-100/50 border border-slate-200/50 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-brand-blue/20 transition-all outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <Link to="/admin/articulos/nuevo">
                <Button className="h-12 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl px-6 shadow-lg shadow-slate-200 transition-all active:scale-95">
                  <PlusCircle className="mr-2 h-4 w-4 text-brand-blue" />
                  Nueva Nota
                </Button>
              </Link>
              <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-900 text-sm font-black shadow-sm group cursor-pointer hover:border-brand-blue transition-colors">
                {settings.siteName?.[0] || 'A'}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 lg:p-12 pb-32 lg:pb-12 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

