import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Maximize2, 
  Minimize2, 
  ChevronLast, 
  ChevronFirst, 
  Play, 
  Pause,
  Grid,
  X,
  Share2,
  Calendar,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { useSettings } from '@/lib/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface Flipbook {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  pageUrls: string[];
  slug: string;
  createdAt: any;
  views: number;
}

export default function FlipbookViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [flipbook, setFlipbook] = useState<Flipbook | null>(null);
  const [loading, setLoading] = useState(true);

  // Flipbook state
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed page index (for dual mode: 0 is cover, 1 is pages 2 & 3, etc.)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 1));
  const handleResetZoom = () => setZoomLevel(1);

  // Reset zoom level on page turn
  useEffect(() => {
    setZoomLevel(1);
  }, [currentPage]);

  // Detect mobile width for responsive viewing modes
  useEffect(() => {
    const checkMobileWidth = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobileWidth();
    window.addEventListener('resize', checkMobileWidth);
    return () => window.removeEventListener('resize', checkMobileWidth);
  }, []);

  // Fetch individual catalog / flipbook ed
  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      try {
        const docRef = doc(db, 'flipbooks', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Flipbook;
          setFlipbook(data);
          
          // Increment view counter dynamically of this flipbook publication
          updateDoc(docRef, {
            views: increment(1)
          }).catch(err => console.error("Could not increment view metric:", err));

        } else {
          toast.error("La revista o Flipbook solicitado no existe.");
          navigate('/revista');
        }
      } catch (err) {
        console.error("Error loaded flipbook detail: ", err);
        toast.error("Ocurrió un error al cargar el Flipbook.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, navigate]);

  // Handle slide transitions keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, flipbook, isFullscreen, isMobile]);

  // Autoplay Slideshow loop timer
  useEffect(() => {
    if (!isAutoPlayEnabled || !flipbook) return;

    const interval = setInterval(() => {
      const maxPages = isMobile ? flipbook.pageUrls.length - 1 : Math.ceil((flipbook.pageUrls.length - 1) / 2);
      if (currentPage >= maxPages) {
        // Reset to first
        setCurrentPage(0);
      } else {
        setCurrentPage(prev => prev + 1);
      }
    }, 4500); // Wait 4.5 seconds per page

    return () => clearInterval(interval);
  }, [isAutoPlayEnabled, currentPage, flipbook, isMobile]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent"></div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cargando publicación interactiva...</p>
      </div>
    );
  }

  if (!flipbook) return null;

  const totalPages = flipbook.pageUrls.length;

  // Navigation Logic
  // Mobile: 1 page per slider view (currentPage goes 0, 1, 2, 3...)
  // Desktop: Pages can be shown side-by-side:
  // - Index 0: Cover (Page 1) - single page in centered/right layout
  // - Index 1: Page 2 & Page 3
  // - Index 2: Page 4 & Page 5
  // - ...
  // - Last Index: Back cover (or last page)

  const maxIndex = isMobile ? totalPages - 1 : Math.ceil((totalPages - 1) / 2);

  const handleNext = () => {
    if (currentPage < maxIndex) {
      setCurrentPage(prev => prev + 1);
    } else {
      setIsAutoPlayEnabled(false);
      toast.info("Has llegado a la contraportada de la revista.");
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleGoToFirst = () => {
    setCurrentPage(0);
  };

  const handleGoToLast = () => {
    setCurrentPage(maxIndex);
  };

  // Keyboard and dynamic full screen handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error enabling fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleShareUrl = () => {
    const shareUrl = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("¡Enlace de esta página copiado al portapapeles!");
    } else {
      toast.error("El navegador actual no soporta el portapapeles.");
    }
  };

  // Compute what page numbers are being shown
  const getShownPages = () => {
    if (isMobile) {
      return `Página ${currentPage + 1} de ${totalPages}`;
    } else {
      if (currentPage === 0) {
        return `Portada (Pág. 1) de ${totalPages}`;
      } else {
        const leftPage = currentPage * 2;
        const rightPage = leftPage + 1;
        if (rightPage > totalPages) {
          return `Página ${leftPage} de ${totalPages}`;
        }
        return `Páginas ${leftPage} - ${rightPage} de ${totalPages}`;
      }
    }
  };

  return (
    <div className={classNames(
      "min-h-screen bg-slate-950 flex flex-col justify-between text-white relative select-none overflow-hidden",
      isFullscreen ? "fixed inset-0 z-50" : ""
    )}>
      
      {/* Real-time Ambient Glowing BG aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00AEEF]/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Controller Header */}
      <header className="z-10 bg-slate-900/45 backdrop-blur-md px-6 py-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-white/5">
        <div className="flex items-center justify-between lg:justify-start gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-4">
            <Link 
              to="/revista"
              className="flex h-10 items-center justify-center rounded-xl bg-white/5 hover:bg-[#ED1C24] transition-all px-4 group gap-2"
            >
              <X className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-200 group-hover:text-white">Cerrar</span>
            </Link>

            <div className="hidden sm:block">
              <h1 className="text-xs font-black tracking-tight uppercase max-w-xs md:max-w-md truncate">{flipbook.title}</h1>
              <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-[#00AEEF] mt-0.5">
                <Calendar className="h-3 w-3" />
                <span>
                  {flipbook.createdAt 
                    ? format(flipbook.createdAt.toDate(), "d MMM, yyyy", { locale: es }) 
                    : "Reciente"}
                </span>
              </div>
            </div>
          </div>

          {/* Responsive Brand Logo on mobile shown only when header stacks */}
          <div className="lg:hidden shrink-0 flex items-center pr-2">
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt="Logo Zapotlán Gráfico" 
                className="h-8 max-w-[120px] object-contain brightness-0 invert opacity-90" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-[10px] font-black tracking-tighter text-[#00AEEF] uppercase">ZAPOTLÁN <span className="text-white">GRÁFICO</span></span>
            )}
          </div>
        </div>

        {/* Brand Logo - Centered beautifully on larger screens */}
        <div className="hidden lg:flex items-center justify-center absolute left-1/2 -translate-x-1/2 pointer-events-none">
          {settings.logoUrl ? (
            <img 
              src={settings.logoUrl} 
              alt="Logo Zapotlán Gráfico" 
              className="h-9 max-w-[170px] object-contain brightness-0 invert opacity-90 pointer-events-auto hover:opacity-100 transition-opacity" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-xs font-black tracking-tighter text-[#00AEEF] uppercase pointer-events-auto">ZAPOTLÁN <span className="text-white">GRÁFICO</span></span>
          )}
        </div>

        {/* Action Widgets */}
        <div className="flex items-center gap-2.5 flex-wrap justify-between lg:justify-end w-full lg:w-auto">
          {/* Zoom Level group controls */}
          <div className="flex items-center bg-white/5 rounded-xl border border-white/5 overflow-hidden">
            <Button
              variant="ghost"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              className="h-10 w-10 p-0 text-slate-400 hover:text-white disabled:opacity-20 hover:bg-white/5 rounded-none"
              title="Alejar (Zoom -)"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <button
              onClick={handleResetZoom}
              className="px-2.5 h-10 text-[9px] font-bold text-slate-300 hover:text-white font-mono bg-transparent"
              title="Restablecer escala original"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <Button
              variant="ghost"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              className="h-10 w-10 p-0 text-slate-400 hover:text-white disabled:opacity-20 hover:bg-white/5 rounded-none"
              title="Acercar (Zoom +)"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Autoplay logic */}
            <Button
              variant="ghost"
              onClick={() => setIsAutoPlayEnabled(!isAutoPlayEnabled)}
              className={`h-10 px-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest gap-2 ${
                isAutoPlayEnabled ? "bg-[#FFF200] text-slate-950 hover:bg-[#FFF200]/95" : "bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {isAutoPlayEnabled ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Pausar</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Lectura</span>
                </>
              )}
            </Button>

            {/* Grid Thumbnails trigger */}
            <Button
              variant="ghost"
              onClick={() => setShowThumbnails(!showThumbnails)}
              className={`h-10 w-10 p-0 rounded-xl ${showThumbnails ? "bg-[#00AEEF] text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
              title="Mostrar Miniaturas"
            >
              <Grid className="h-4 w-4" />
            </Button>

            {/* Share button */}
            <Button
              variant="ghost"
              onClick={handleShareUrl}
              className="h-10 w-10 p-0 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10"
              title="Compartir Edición"
            >
              <Share2 className="h-4 w-4" />
            </Button>

            {/* Toggle Fullscreen mode */}
            <Button
              variant="ghost"
              onClick={toggleFullscreen}
              className="h-10 w-10 p-0 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10"
              title="Pantalla Completa"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <div className="flex-1 overflow-hidden relative flex flex-col justify-center items-center p-4 md:p-8">
        
        {/* Previous page overlay edge trigger (Desktop click-to-flip helper) */}
        {!showThumbnails && currentPage > 0 && (
          <button 
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-16 w-16 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 hover:opacity-100 transition-opacity backdrop-blur-md border border-white/10 hidden md:flex"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}

        {/* Next page overlay edge trigger */}
        {!showThumbnails && currentPage < maxIndex && (
          <button 
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-16 w-16 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 hover:opacity-100 transition-opacity backdrop-blur-md border border-white/10 hidden md:flex"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}

        {/* Content Viewer viewport */}
        <div className="relative w-full max-w-6xl h-[72vh] flex items-center justify-center overflow-auto rounded-[2rem] bg-slate-950/20 p-2 md:p-6 border border-white/5 shadow-inner">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 25, rotateY: 10 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              exit={{ opacity: 0, x: -25, rotateY: -10 }}
              transition={{ duration: 0.35 }}
              style={{ 
                transform: `rotateY(0deg) scale(${zoomLevel})`,
                transformOrigin: 'center center',
                minWidth: zoomLevel > 1 ? `${100 * zoomLevel}%` : '100%',
                minHeight: zoomLevel > 1 ? `${100 * zoomLevel}%` : '100%',
                cursor: zoomLevel > 1 ? 'grab' : 'default'
              }}
              className="w-full h-full flex items-center justify-center perspective-[1200px] transition-transform duration-200"
            >
              {isMobile ? (
                /* Mobile Layout: 1 Page Render on Screen */
                <div className="relative max-h-full max-w-full aspect-[3/4] h-full shadow-2xl rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-white/5">
                  <img 
                    src={flipbook.pageUrls[currentPage]} 
                    alt={`Pág. ${currentPage + 1}`}
                    className="w-full h-full object-contain pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                  {/* Crease binder realism */}
                  <div className="absolute top-0 bottom-0 left-0 w-3 bg-gradient-to-r from-black/30 to-transparent pointer-events-none" />
                </div>
              ) : (
                /* Desktop Layout: True Dual-Page Side-by-Side realism */
                currentPage === 0 ? (
                  /* Index 0 is the COVER: render single page centered on screen with binder on left */
                  <div className="relative h-full aspect-[3/4] bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-white/10 max-w-md">
                    <img 
                      src={flipbook.pageUrls[0]} 
                      alt="Portada Revista" 
                      className="w-full h-full object-contain pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Shadow crease on the left of booklet cover */}
                    <div className="absolute top-0 bottom-0 left-0 w-6 bg-gradient-to-r from-black/40 via-black/10 to-transparent pointer-events-none" />
                    {/* Golden/Silver binder spine glow on the leftmost cover border */}
                    <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-white/20 pointer-events-none" />
                  </div>
                ) : (
                  /* Indexes > 0: Render true open booklet spreads */
                  <div className="w-full h-full flex items-center justify-center gap-1.5 p-2">
                    
                    {/* LEFT PAGE SPREAD */}
                    <div className="relative h-full flex-1 aspect-[3/4] bg-slate-900 rounded-l-[2rem] overflow-hidden shadow-[10px_25px_50px_rgba(0,0,0,0.5)] border border-r-0 border-white/5 select-none font-sans">
                      {flipbook.pageUrls[currentPage * 2] ? (
                        <img 
                          src={flipbook.pageUrls[currentPage * 2]} 
                          alt={`Pág. ${currentPage * 2}`}
                          className="w-full h-full object-contain pointer-events-none"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-full w-full bg-slate-950 flex items-center justify-center text-slate-700">Pág. Final</div>
                      )}
                      
                      {/* Crease shadow layout for dual booklet page effect (on right of left page) */}
                      <div className="absolute top-0 bottom-0 right-0 w-10 bg-gradient-to-l from-black/60 via-black/10 to-transparent pointer-events-none" />
                    </div>

                    {/* RIGHT PAGE SPREAD */}
                    <div className="relative h-full flex-1 aspect-[3/4] bg-slate-900 rounded-r-[2rem] overflow-hidden shadow-[-10px_25px_50px_rgba(0,0,0,0.5)] border border-l-0 border-white/5 select-none font-sans">
                      {flipbook.pageUrls[currentPage * 2 + 1] ? (
                        <img 
                          src={flipbook.pageUrls[currentPage * 2 + 1]} 
                          alt={`Pág. ${currentPage * 2 + 1}`}
                          className="w-full h-full object-contain pointer-events-none"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-full w-full bg-slate-950 flex items-center justify-center text-slate-700">Contraportada</div>
                      )}

                      {/* Crease shadow layout for dual booklet page effect (on left of right page) */}
                      <div className="absolute top-0 bottom-0 left-0 w-10 bg-gradient-to-r from-black/60 via-black/10 to-transparent pointer-events-none" />
                    </div>

                  </div>
                )
              )}
            </motion.div>
          </AnimatePresence>

        </div>

        {/* Interactive thumbnails deck bottom shelf overlay */}
        <AnimatePresence>
          {showThumbnails && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="absolute inset-x-0 bottom-0 z-30 bg-slate-900/90 backdrop-blur-xl border-t border-white/10 p-6 flex flex-col gap-4 max-h-[300px] overflow-hidden"
            >
              <div className="flex justify-between items-center px-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00AEEF]">Navegador por Hojas Rápidas</span>
                <button 
                  onClick={() => setShowThumbnails(false)}
                  className="text-slate-400 hover:text-white uppercase font-black text-[9px] tracking-wider"
                >
                  Ocultar
                </button>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4 px-4 scrollbar-thin scrollbar-thumb-white/20 justify-start items-center">
                {flipbook.pageUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      // Compute matching currentPage index for cover or spread
                      if (isMobile) {
                        setCurrentPage(i);
                      } else {
                        if (i === 0) {
                          setCurrentPage(0);
                        } else {
                          setCurrentPage(Math.floor((i + 1) / 2));
                        }
                      }
                      setShowThumbnails(false);
                    }}
                    className={`relative w-24 shrink-0 aspect-[3/4] bg-slate-800 rounded-xl overflow-hidden border-2 transition-all ${
                      (isMobile ? currentPage === i : (currentPage === 0 ? i === 0 : (i === currentPage * 2 || i === currentPage * 2 + 1)))
                        ? "border-[#FFF200] scale-102 shadow-lg shadow-[#00AEEF]/25"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img 
                      src={url} 
                      alt={`Min pág ${i + 1}`} 
                      className="w-full h-full object-cover pointer-events-none" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center font-black text-xs text-white">
                      {i + 1}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Bottom Control Bar */}
      <footer className="bg-slate-900/50 backdrop-blur-md py-4 px-6 border-t border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between z-10">
        
        {/* Navigation Step Indicators */}
        <span className="text-xs font-black uppercase tracking-widest text-slate-400 font-mono">
          {getShownPages()}
        </span>

        {/* Stepper Buttons Group */}
        <div className="flex items-center gap-2">
          {/* Go to cover */}
          <Button
            variant="ghost"
            onClick={handleGoToFirst}
            disabled={currentPage === 0}
            className="h-10 w-10 p-0 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white"
          >
            <ChevronFirst className="h-4 w-4" />
          </Button>

          {/* Regular Prev page */}
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentPage === 0}
            className="h-10 gap-1.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white font-black text-[9px] uppercase tracking-wider transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Atrás</span>
          </Button>

          {/* Regular Next page */}
          <Button
            variant="ghost"
            onClick={handleNext}
            disabled={currentPage === maxIndex}
            className="h-10 gap-1.5 px-4 rounded-xl bg-[#00AEEF] text-white hover:bg-[#00AEEF]/80 disabled:bg-white/10 disabled:text-white/40 font-black text-[9px] uppercase tracking-wider transition-all shadow-md shadow-[#00AEEF]/10 border border-white/5"
          >
            <span>Siguiente</span>
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Go to back cover */}
          <Button
            variant="ghost"
            onClick={handleGoToLast}
            disabled={currentPage === maxIndex}
            className="h-10 w-10 p-0 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white"
          >
            <ChevronLast className="h-4 w-4" />
          </Button>
        </div>

        {/* Empty placeholder or extra helper text in desktop */}
        <p className="text-[9px] font-semibold text-slate-500 font-mono hidden md:block uppercase tracking-wider">
          * TIP: Usa los botones o las flechas de tu teclado (◄ ►) para dar vuelta a las hojas
        </p>

      </footer>

    </div>
  );
}

// Utility class concatenator
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
