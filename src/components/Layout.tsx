import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, Facebook, Twitter, Instagram, Newspaper, X, ChevronRight, Bell, Globe, Youtube, Video, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSettings } from '@/lib/SettingsContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { DEFAULT_NAV_MENU } from '@/lib/constants';
import { NavMenuItem } from '@/types';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { settings, categories: dbCategories } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = React.useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = React.useState('');
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

  const mainNav = React.useMemo<NavMenuItem[]>(() => {
    const list = (settings.navigationMenu && Array.isArray(settings.navigationMenu) && settings.navigationMenu.length > 0)
      ? settings.navigationMenu
      : DEFAULT_NAV_MENU;
    return [...list]
      .filter(item => item.isActive !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [settings.navigationMenu]);

  const displayCategories = React.useMemo(() => {
    if (dbCategories && dbCategories.length > 0) {
      return dbCategories.slice(0, 8).map(c => c.name);
    }
    return ['Local', 'General', 'Deportes', 'Cultura', 'Policiaca'];
  }, [dbCategories]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-brand-blue/20 selection:text-brand-blue overflow-x-hidden w-full">
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
      <header 
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300 backdrop-blur-md bg-white/95",
          isScrolled 
            ? "h-16 lg:h-20 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border-b border-slate-200/50" 
            : "h-20 lg:h-24 border-b border-transparent"
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
                    <nav className="flex-1 p-6 space-y-1 overflow-y-auto">
                      {mainNav.map((item) => {
                        const isExternal = item.openInNewTab || item.path.startsWith('http://') || item.path.startsWith('https://');
                        const isSelected = !isExternal && (location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)));

                        if (isExternal) {
                          return (
                            <a
                              key={item.id || item.path}
                              href={item.path}
                              target={item.openInNewTab ? "_blank" : undefined}
                              rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                              className="flex items-center justify-between rounded-2xl p-4 text-base font-bold transition-all text-slate-600 hover:bg-slate-50 group"
                            >
                              <span className="flex items-center gap-2">
                                {item.label}
                                {item.badge && (
                                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-red text-white uppercase font-black">
                                    {item.badge}
                                  </span>
                                )}
                              </span>
                              <ExternalLink className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                            </a>
                          );
                        }

                        return (
                          <Link
                            key={item.id || item.path}
                            to={item.path}
                            className={cn(
                              "flex items-center justify-between rounded-2xl p-4 text-base font-bold transition-all group",
                              isSelected 
                                ? "bg-brand-blue/5 text-brand-blue" 
                                : "text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              {item.label}
                              {item.badge && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-red text-white uppercase font-black">
                                  {item.badge}
                                </span>
                              )}
                            </span>
                            <ChevronRight className={cn(
                              "h-4 w-4 transition-transform group-hover:translate-x-1",
                              isSelected ? "opacity-100" : "opacity-20"
                            )} />
                          </Link>
                        );
                      })}
                      <div className="pt-8 pb-4 px-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Secciones</p>
                        <div className="grid grid-cols-2 gap-2">
                          {displayCategories.map((cat) => {
                            const clean = cat.trim().toLowerCase().replace(/[\s\-_]/g, '');
                            const catPath = (clean === 'losanfitriones' || clean === 'revista' || clean === 'periodico')
                              ? '/losanfitriones'
                              : clean === 'noticias'
                              ? '/noticias'
                              : `/categoria/${cat}`;

                            return (
                              <Link
                                key={cat}
                                to={catPath}
                                className="px-4 py-3 rounded-xl bg-slate-50 text-xs font-bold text-slate-600 hover:bg-brand-blue/5 hover:text-brand-blue transition-all"
                              >
                                {cat}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </nav>
                    <div className="p-8 bg-slate-50 mt-auto">
                      <div className="flex gap-4 justify-center">
                        {settings.facebookUrl && (
                          <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm text-[#1877F2] hover:bg-[#1877F2]/10 transition-colors">
                              <Facebook className="h-5 w-5" />
                            </Button>
                          </a>
                        )}
                        {settings.instagramUrl && (
                          <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm text-[#E1306C] hover:bg-[#E1306C]/10 transition-colors">
                              <Instagram className="h-5 w-5" />
                            </Button>
                          </a>
                        )}
                        {settings.twitterUrl && (
                          <a href={settings.twitterUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm text-[#1DA1F2] hover:bg-[#1DA1F2]/10 transition-colors">
                              <Twitter className="h-5 w-5" />
                            </Button>
                          </a>
                        )}
                        {settings.youtubeUrl && (
                          <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm text-[#FF0000] hover:bg-[#FF0000]/10 transition-colors">
                              <Youtube className="h-5 w-5" />
                            </Button>
                          </a>
                        )}
                        {settings.tiktokUrl && (
                          <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm text-slate-900 hover:bg-slate-100 transition-colors">
                              <Video className="h-5 w-5" />
                            </Button>
                          </a>
                        )}
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
              {mainNav.map((item) => {
                const isExternal = item.openInNewTab || item.path.startsWith('http://') || item.path.startsWith('https://');
                const isSelected = !isExternal && (location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)));

                if (isExternal) {
                  return (
                    <a
                      key={item.id || item.path}
                      href={item.path}
                      target={item.openInNewTab ? "_blank" : undefined}
                      rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                      className="relative px-5 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-full text-slate-500 hover:text-slate-900 flex items-center gap-1.5"
                    >
                      <span className="relative z-10 flex items-center gap-1.5">
                        {item.label}
                        {item.badge && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-brand-red text-white font-black">
                            {item.badge}
                          </span>
                        )}
                        <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                      </span>
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.id || item.path}
                    to={item.path}
                    className={cn(
                      "relative px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-full flex items-center gap-1.5",
                      isSelected 
                        ? "text-white" 
                        : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <span className="relative z-10 flex items-center gap-1.5">
                      {item.label}
                      {item.badge && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-brand-red text-white font-black">
                          {item.badge}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <motion.div 
                        layoutId="nav-pill" 
                        className="absolute inset-0 bg-slate-900 rounded-full shadow-lg shadow-slate-200"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Actions - Minimalist */}
            <div className="flex items-center gap-3">
              <div className="relative flex items-center">
                <AnimatePresence initial={false}>
                  {isSearchExpanded && (
                    <motion.form
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="relative flex items-center overflow-hidden"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (headerSearchQuery.trim()) {
                          navigate(`/noticias?search=${encodeURIComponent(headerSearchQuery.trim())}`);
                        }
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={headerSearchQuery}
                        onChange={(e) => setHeaderSearchQuery(e.target.value)}
                        className="w-28 sm:w-48 h-10 pl-3 pr-8 rounded-full border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/50 transition-all mr-1"
                        autoFocus
                      />
                    </motion.form>
                  )}
                </AnimatePresence>

                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-2xl hover:bg-slate-100 text-slate-500",
                    isSearchExpanded && "text-[#00AEEF]"
                  )}
                  onClick={() => {
                    if (isSearchExpanded) {
                      if (headerSearchQuery.trim()) {
                        navigate(`/noticias?search=${encodeURIComponent(headerSearchQuery.trim())}`);
                      } else {
                        setIsSearchExpanded(false);
                      }
                    } else {
                      setIsSearchExpanded(true);
                    }
                  }}
                >
                  {isSearchExpanded ? (
                    <X 
                      className="h-5 w-5 text-slate-400 hover:text-slate-600 cursor-pointer" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSearchExpanded(false);
                        setHeaderSearchQuery('');
                      }} 
                    />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </Button>
              </div>
              <div className="hidden md:block h-8 w-px bg-slate-200 mx-1" />
              
              {/* Dynamic Social Icons (desktop / tablet) */}
              <div className="hidden md:flex items-center gap-1">
                {settings.facebookUrl && (
                  <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" title="Facebook">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-[#1877F2] hover:bg-[#1877F2]/10 transition-colors">
                      <Facebook className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                {settings.instagramUrl && (
                  <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" title="Instagram">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-[#E1306C] hover:bg-[#E1306C]/10 transition-colors">
                      <Instagram className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                {settings.twitterUrl && (
                  <a href={settings.twitterUrl} target="_blank" rel="noopener noreferrer" title="Twitter / X">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-[#1DA1F2] hover:bg-[#1DA1F2]/10 transition-colors">
                      <Twitter className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                {settings.youtubeUrl && (
                  <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer" title="YouTube">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-[#FF0000] hover:bg-[#FF0000]/10 transition-colors">
                      <Youtube className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                {settings.tiktokUrl && (
                  <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer" title="TikTok">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-slate-800 hover:bg-slate-100 transition-colors">
                      <Video className="h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-400px)] overflow-x-hidden w-full">
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
                {settings.facebookUrl && (
                  <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" title="Facebook">
                    <Button variant="outline" size="icon" className="rounded-full border-[#1877F2]/40 bg-slate-800/60 text-[#1877F2] hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-all shadow-sm">
                      <Facebook className="h-5 w-5" />
                    </Button>
                  </a>
                )}
                {settings.instagramUrl && (
                  <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" title="Instagram">
                    <Button variant="outline" size="icon" className="rounded-full border-[#E1306C]/40 bg-slate-800/60 text-[#E1306C] hover:bg-[#E1306C] hover:text-white hover:border-[#E1306C] transition-all shadow-sm">
                      <Instagram className="h-5 w-5" />
                    </Button>
                  </a>
                )}
                {settings.twitterUrl && (
                  <a href={settings.twitterUrl} target="_blank" rel="noopener noreferrer" title="Twitter / X">
                    <Button variant="outline" size="icon" className="rounded-full border-[#1DA1F2]/40 bg-slate-800/60 text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white hover:border-[#1DA1F2] transition-all shadow-sm">
                      <Twitter className="h-5 w-5" />
                    </Button>
                  </a>
                )}
                {settings.youtubeUrl && (
                  <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer" title="YouTube">
                    <Button variant="outline" size="icon" className="rounded-full border-[#FF0000]/40 bg-slate-800/60 text-[#FF0000] hover:bg-[#FF0000] hover:text-white hover:border-[#FF0000] transition-all shadow-sm">
                      <Youtube className="h-5 w-5" />
                    </Button>
                  </a>
                )}
                {settings.tiktokUrl && (
                  <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer" title="TikTok">
                    <Button variant="outline" size="icon" className="rounded-full border-slate-700 bg-slate-800/60 text-white hover:bg-white hover:text-black hover:border-white transition-all shadow-sm">
                      <Video className="h-5 w-5" />
                    </Button>
                  </a>
                )}
                {!settings.facebookUrl && !settings.twitterUrl && !settings.instagramUrl && !settings.youtubeUrl && !settings.tiktokUrl && (
                  <p className="text-slate-500 text-xs font-medium">No hay redes configuradas.</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#FFF200]">Navegación</h4>
              <ul className="space-y-4">
                {mainNav.map((item) => {
                  const isExternal = item.openInNewTab || item.path.startsWith('http://') || item.path.startsWith('https://');
                  if (isExternal) {
                    return (
                      <li key={item.id || item.path}>
                        <a 
                          href={item.path} 
                          target={item.openInNewTab ? "_blank" : undefined}
                          rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                          className="text-slate-400 hover:text-white transition-colors font-bold inline-flex items-center gap-1.5"
                        >
                          {item.label}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      </li>
                    );
                  }
                  return (
                    <li key={item.id || item.path}>
                      <Link to={item.path} className="text-slate-400 hover:text-white transition-colors font-bold">{item.label}</Link>
                    </li>
                  );
                })}
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

