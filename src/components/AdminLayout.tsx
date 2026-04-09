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
  X
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: FileText, label: 'Artículos', path: '/admin/articulos' },
    { icon: Facebook, label: 'Importar FB', path: '/admin/importar' },
    { icon: BarChart3, label: 'Reporte', path: '/admin/reporte' },
    { icon: SettingsIcon, label: 'Ajustes', path: '/admin/ajustes' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b border-slate-100 px-6">
          <Link to="/admin/dashboard" className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
            ) : (
              <div className="h-8 w-8 rounded bg-[#00AEEF] flex items-center justify-center text-white font-bold">ZG</div>
            )}
            <span className="text-sm font-black tracking-tight uppercase">Admin</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200",
                location.pathname === item.path 
                  ? "bg-[#00AEEF] text-white shadow-lg shadow-blue-100" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-semibold">Cerrar Sesión</span>
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
        <Link to="/admin/dashboard" className="flex items-center gap-2">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
          ) : (
            <div className="h-8 w-8 rounded bg-[#00AEEF] flex items-center justify-center text-white font-bold">ZG</div>
          )}
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Mobile Navigation Bar (Bottom) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-slate-200 bg-white px-2 pb-safe">
        {menuItems.slice(0, 4).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg px-3 py-1 transition-all",
              location.pathname === item.path 
                ? "text-[#00AEEF]" 
                : "text-slate-400"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label.split(' ')[0]}</span>
          </Link>
        ))}
        <Link
          to="/admin/ajustes"
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg px-3 py-1 transition-all",
            location.pathname === '/admin/ajustes' 
              ? "text-[#00AEEF]" 
              : "text-slate-400"
          )}
        >
          <SettingsIcon className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Ajustes</span>
        </Link>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 lg:pb-0 pt-16 lg:pt-0">
        <header className="hidden lg:flex h-16 items-center justify-between border-b border-slate-100 bg-white px-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-900">{location.pathname.split('/').pop()?.replace('-', ' ')}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin/articulos/nuevo">
              <Button size="sm" className="bg-[#00AEEF] text-white hover:bg-[#00AEEF]/90 rounded-full px-6">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Nota
              </Button>
            </Link>
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold border border-slate-200">
              {settings.siteName?.[0] || 'A'}
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

