import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Search, Facebook, Twitter, Instagram, Newspaper, X, ChevronRight, Bell, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSettings } from '@/lib/SettingsContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { scrollY } = useScroll();
  
  const headerHeight = useTransform(scrollY, [0, 50], [80, 64]);
  const headerBg = useTransform(
    scrollY,
    [0, 50],
    ["rgba(255, 255, 255, 1)", "rgba(255, 255, 255, 0.8)"]
  );

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
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-brand-blue/20 selection:text-brand-blue">
      {/* Top Bar - More subtle and elegant */}
      <div className="hidden lg:block bg-slate-900 py-2 text-center">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span className="flex items-center gap-1.5">
              <Globe className="h-3 w-3 text-brand-blue" />
              Zapotlán el Grande, Jalisco
            </span>
            <span className="h-1 w-1 rounded-full bg-slate-700" />
            <span>{format(new Date(), "EEEE, d 'de' MMMM, yyyy", { locale: es })}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin/login" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
              Acceso Staff
            </Link>
          </div>
        </div>
      </div>

      {/* Header - Modern Floating Style */}
      <motion.header 
        style={{ height: headerHeight, backgroundColor: headerBg }}
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-500 backdrop-blur-md",
          isScrolled ? "shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-b border-slate-200/50" : "border-b border-transparent"
        )}
      >
        <div className="container mx-auto px-4 h-full">
          <div className="flex items-center justify-between h-full">
            {/* Mobile Menu Trigger */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger
                  render={
                    <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-slate-100 transition-colors">
                      <Menu className="h-6 w-6 text-slate-600" />
                    </Button>
                  }
                />
                <SheetContent side="left" className="w-[320px] p-0 border-none bg-white">
                  <div className="flex flex-col h-full">
                    <div className="p-8 border-b border-slate-50">
                      {settings.logoUrl ? (
                        <img src={settings.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
                      ) : (
                        <span className="text-xl font-black tracking-tighter text-brand-blue">ZAPOTLÁN <span className="text-brand-red">GRÁFICO</span></span>
                      )}
                    </div>
                    <nav className="flex-1 p-6 space-y-1">
                      {mainNav.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "flex items-center justify-between rounded-2xl p-4 text-base font-bold transition-all group",
                            location.pathname === item.path 
                              ? "bg-brand-blue/5 text-brand-blue" 
                              : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {item.label}
                          <ChevronRight className={cn(
                            "h-4 w-4 transition-transform group-hover:translate-x-1",
                            location.pathname === item.path ? "opacity-100" : "opacity-20"
                          )} />
                        </Link>
                      ))}
                      <div className="pt-8 pb-4 px-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Secciones</p>
                        <div className="grid grid-cols-2 gap-2">
                          {categories.map((cat) => (
                            <Link
                              key={cat}
                              to={`/categoria/${cat}`}
                              className="px-4 py-3 rounded-xl bg-slate-50 text-xs font-bold text-slate-600 hover:bg-brand-blue/5 hover:text-brand-blue transition-all"
                            >
                              {cat}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </nav>
                    <div className="p-8 bg-slate-50 mt-auto">
                      <div className="flex gap-4 justify-center">
                        {[Facebook, Twitter, Instagram].map((Icon, i) => (
                          <Button key={i} variant="ghost" size="icon" className="rounded-full bg-white shadow-sm hover:text-brand-blue">
                            <Icon className="h-5 w-5" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Logo - Elegant and centered on mobile */}
            <Link to="/" className="flex items-center group">
              <div className="relative">
                {settings.logoUrl ? (
                  <img 
                    src={settings.logoUrl} 
                    alt={settings.siteName} 
                    className={cn("transition-all duration-500 group-hover:scale-105", isScrolled ? "h-8 lg:h-10" : "h-10 lg:h-14")} 
                  />
                ) : (
                  <div className="flex flex-col items-center">
                    <span className={cn(
                      "font-black tracking-tighter transition-all duration-500",
                      isScrolled ? "text-xl lg:text-2xl" : "text-2xl lg:text-4xl"
                    )}>
                      <span className="text-brand-blue">ZAPOTLÁN</span>
                      <span className="text-brand-red">GRÁFICO</span>
                    </span>
                    {!isScrolled && (
                      <motion.span 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[7px] font-black uppercase tracking-[0.5em] text-slate-400 mt-1"
                      >
                        Periodismo con Identidad
                      </motion.span>
                    )}
                  </div>
                )}
              </div>
            </Link>

            {/* Desktop Nav - Modern pill style */}
            <nav className="hidden lg:flex items-center bg-slate-100/50 p-1.5 rounded-full border border-slate-200/50">
              {mainNav.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "relative px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-full",
                    location.pathname === item.path 
                      ? "text-white" 
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <span className="relative z-10">{item.label}</span>
                  {location.pathname === item.path && (
                    <motion.div 
                      layoutId="nav-pill" 
                      className="absolute inset-0 bg-slate-900 rounded-full shadow-lg shadow-slate-200"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              ))}
            </nav>

            {/* Actions - Minimalist */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-slate-100 text-slate-500">
                <Search className="h-5 w-5" />
              </Button>
              <div className="hidden sm:block h-8 w-px bg-slate-200 mx-1" />
              <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-slate-100 text-slate-500 relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-brand-red border-2 border-white" />
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

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

