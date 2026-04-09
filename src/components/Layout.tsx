import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Search, Facebook, Twitter, Instagram, Newspaper, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSettings } from '@/lib/SettingsContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const categories = ['Local', 'General', 'Deportes', 'Cultura', 'Policiaca'];
  const mainNav = [
    { label: 'Inicio', path: '/' },
    { label: 'Noticias', path: '/categoria/General' },
    { label: 'Revista', path: '/revista' },
    { label: 'Videos', path: '/categoria/Videos' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top Bar */}
      <div className="hidden lg:block bg-[#ED1C24] py-1.5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white">
        {format(new Date(), "EEEE, d 'de' MMMM, yyyy", { locale: es })} • CIUDAD GUZMÁN, JALISCO
      </div>

      {/* Header */}
      <header className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        isScrolled ? "bg-white/80 backdrop-blur-xl shadow-sm border-b border-slate-200 py-2" : "bg-white py-4 border-b border-slate-100"
      )}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            {/* Mobile Menu */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger
                  render={
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Menu className="h-6 w-6" />
                    </Button>
                  }
                />
                <SheetContent side="left" className="w-[300px] p-0">
                  <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-slate-100">
                      {settings.logoUrl ? (
                        <img src={settings.logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
                      ) : (
                        <span className="text-2xl font-black tracking-tighter text-[#00AEEF]">ZAPOTLÁN GRÁFICO</span>
                      )}
                    </div>
                    <nav className="flex-1 p-6 space-y-2">
                      {mainNav.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "flex items-center justify-between rounded-xl p-4 text-lg font-bold transition-all",
                            location.pathname === item.path ? "bg-slate-100 text-[#00AEEF]" : "hover:bg-slate-50"
                          )}
                        >
                          {item.label}
                          <ChevronRight className="h-5 w-5 opacity-30" />
                        </Link>
                      ))}
                      <div className="py-4">
                        <p className="px-4 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Categorías</p>
                        {categories.map((cat) => (
                          <Link
                            key={cat}
                            to={`/categoria/${cat}`}
                            className="flex items-center justify-between rounded-xl p-4 text-base font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            {cat}
                          </Link>
                        ))}
                      </div>
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Logo */}
            <Link to="/" className="flex items-center transition-transform hover:scale-105">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.siteName} className={cn("transition-all", isScrolled ? "h-10 lg:h-12" : "h-12 lg:h-16")} />
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black tracking-tighter lg:text-3xl text-[#00AEEF]">ZAPOTLÁN <span className="text-[#ED1C24]">GRÁFICO</span></span>
                  <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400">Tu voz local en la región</span>
                </div>
              )}
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-8">
              {mainNav.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "relative text-sm font-black uppercase tracking-widest transition-colors",
                    location.pathname === item.path ? "text-[#00AEEF]" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {item.label}
                  {location.pathname === item.path && (
                    <motion.div layoutId="nav-underline" className="absolute -bottom-2 left-0 right-0 h-1 bg-[#FFF200]" />
                  )}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-[#FFF200]/20">
                <Search className="h-5 w-5" />
              </Button>
              <Link to="/admin/login" className="hidden sm:block">
                <Button variant="outline" className="rounded-full border-slate-200 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50">
                  Acceso
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-400px)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 pt-20 pb-10 text-white">
        <div className="container mx-auto px-4">
          <div className="grid gap-16 lg:grid-cols-[1.5fr_1fr_1fr]">
            <div className="space-y-8">
              <Link to="/" className="inline-block">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="h-16 w-auto brightness-0 invert" />
                ) : (
                  <span className="text-3xl font-black tracking-tighter">ZAPOTLÁN GRÁFICO</span>
                )}
              </Link>
              <p className="max-w-md text-slate-400 leading-relaxed">
                Comprometidos con la verdad y la información veraz en la región sur de Jalisco. Tu voz local, ahora digital.
              </p>
              <div className="flex gap-4">
                {[Facebook, Twitter, Instagram].map((Icon, i) => (
                  <Button key={i} variant="outline" size="icon" className="rounded-full border-slate-800 bg-slate-800/50 hover:bg-[#00AEEF] hover:border-[#00AEEF] transition-all">
                    <Icon className="h-5 w-5" />
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#FFF200]">Navegación</h4>
              <ul className="space-y-4">
                {mainNav.map((item) => (
                  <li key={item.path}>
                    <Link to={item.path} className="text-slate-400 hover:text-white transition-colors font-bold">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#ED1C24]">Contacto</h4>
              <div className="space-y-4 text-slate-400">
                <p className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ED1C24]" />
                  Ciudad Guzmán, Jalisco
                </p>
                <p className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00AEEF]" />
                  contacto@zapotlangrafico.com
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-20 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span>© {new Date().getFullYear()} {settings.siteName}. Todos los derechos reservados.</span>
            <div className="flex gap-6">
              <Link to="/privacidad" className="hover:text-white">Privacidad</Link>
              <Link to="/terminos" className="hover:text-white">Términos</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

