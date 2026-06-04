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
import { dataCache } from '@/lib/dataCache';

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
  
  // Try to find the flipbook in the local dataCache first for instant hydration!
  const initialFlipbookValue = id ? (dataCache.flipbooks.find(f => f.id === id) || null) : null;
  
  const [flipbook, setFlipbook] = useState<Flipbook | null>(initialFlipbookValue);
  const [loading, setLoading] = useState(!initialFlipbookValue);

  // Flipbook state
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed page index (for dual mode: 0 is cover, 1 is pages 2 & 3, etc.)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Touch gesture states for mobile pinch-to-zoom
  const [initialTouchDistance, setInitialTouchDistance] = useState<number | null>(null);
  const [initialZoomLevel, setInitialZoomLevel] = useState<number>(1);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 1));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[1];
      const touch0 = e.touches[0];
      const distance = Math.hypot(
        touch0.clientX - touch1.clientX,
        touch0.clientY - touch1.clientY
      );
      setInitialTouchDistance(distance);
      setInitialZoomLevel(zoomLevel);
      setIsPanning(false); // Disable standard layout dragging to prioritize zoom pinch
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && initialTouchDistance !== null) {
      const touch1 = e.touches[1];
      const touch0 = e.touches[0];
      const distance = Math.hypot(
        touch0.clientX - touch1.clientX,
        touch0.clientY - touch1.clientY
      );
      
      const factor = distance / initialTouchDistance;
      const newZoom = Math.max(1, Math.min(initialZoomLevel * factor, 3));
      setZoomLevel(newZoom);
    }
  };

  const handleTouchEnd = () => {
    setInitialTouchDistance(null);
  };

  // Reset zoom level and panning offset on page turn
  useEffect(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, [currentPage]);

  // Reset panning offset if zoomLevel goes back to 1
  useEffect(() => {
    if (zoomLevel <= 1) {
      setPanOffset({ x: 0, y: 0 });
    }
  }, [zoomLevel]);

  // Drag & pan gestures handler for mobile touch/mouse
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoomLevel <= 1) return;
    // Multi-touch gestures (pinch zoom) should skip pointer panning to prevent conflict
    if (e.pointerType === 'touch' && !e.isPrimary) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning || zoomLevel <= 1) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Sensible bounding boundaries depending on the scale zoom level
    const maxBoundX = (zoomLevel - 1) * 450;
    const maxBoundY = (zoomLevel - 1) * 350;
    
    const boundedX = Math.max(-maxBoundX, Math.min(maxBoundX, newX));
    const boundedY = Math.max(-maxBoundY, Math.min(maxBoundY, newY));
    
    setPanOffset({ x: boundedX, y: boundedY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsPanning(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

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
        const cached = dataCache.flipbooks.find(f => f.id === id);
        if (cached) {
          setFlipbook(cached);
          setLoading(false);
        }

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

  // Synchronize fullscreen state with browser native events (e.g. exit fullscreen manually)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.msFullscreenElement
      );
      if (!isCurrentlyFullscreen && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

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
    const docEl = document.documentElement as any;
    const doc = document as any;

    if (!isFullscreen) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch((err: any) => {
          console.warn(`HTML5 Fullscreen standard request failed, using CSS fallback: ${err.message}`);
        });
      } else if (docEl.webkitRequestFullscreen) {
        try {
          docEl.webkitRequestFullscreen();
        } catch (err) {
          console.warn("WebKit requestFullscreen failed:", err);
        }
      } else if (docEl.msRequestFullscreen) {
        try {
          docEl.msRequestFullscreen();
        } catch (err) {
          console.warn("MS requestFullscreen failed:", err);
        }
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement) {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          try {
            doc.webkitExitFullscreen();
          } catch (err) {}
        } else if (doc.msExitFullscreen) {
          try {
            doc.msExitFullscreen();
          } catch (err) {}
        }
      }
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
      return `Pág. ${currentPage + 1} de ${totalPages}`;
    } else {
      if (currentPage === 0) {
        return `Portada (Pág. 1) de ${totalPages}`;
      } else {
        const leftPage = currentPage * 2;
        const rightPage = leftPage + 1;
        if (rightPage > totalPages) {
          return `Pág. ${leftPage} de ${totalPages}`;
        }
        return `Págs. ${leftPage} - ${rightPage} de ${totalPages}`;
      }
    }
  };

  return (
    <div className={classNames(
      "h-screen h-[100dvh] w-full bg-slate-950 flex flex-col pb-16 text-white relative select-none overflow-hidden",
      isFullscreen ? "fixed inset-0 z-50" : ""
    )}>
      
      {/* Real-time Ambient Glowing BG aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00AEEF]/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Controller Header - Unified compact single-row design */}
      <header className="h-16 shrink-0 z-10 bg-slate-900/60 backdrop-blur-md px-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link 
            to="/revista"
            className="flex h-10 w-10 sm:w-auto items-center justify-center rounded-xl bg-white/5 hover:bg-[#ED1C24] transition-all px-0 sm:px-4 group gap-2"
            title="Cerrar Visor"
          >
            <X className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
            <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest text-slate-200 group-hover:text-white">Cerrar</span>
          </Link>

          <div className="hidden md:block max-w-[200px] lg:max-w-xs xl:max-w-md">
            <h1 className="text-xs font-black tracking-tight uppercase truncate">{flipbook.title}</h1>
            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-[#00AEEF]">
              <Calendar className="h-2.5 w-2.5" />
              <span>
                {flipbook.createdAt 
                  ? format(flipbook.createdAt.toDate(), "d MMM, yyyy", { locale: es }) 
                  : "Reciente"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Controller Controls - Flat Single Row */}
        <div className="flex items-center gap-1.5">
          {/* Zoom Level controls */}
          <div className="flex items-center bg-white/5 rounded-xl border border-white/5 overflow-hidden">
            <Button
              variant="ghost"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              className="h-10 w-9 p-0 text-slate-400 hover:text-white disabled:opacity-20 hover:bg-white/5 rounded-none border-none"
              title="Alejar (Zoom -)"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <button
              onClick={handleResetZoom}
              className="px-1.5 h-10 text-[9px] font-bold text-slate-300 hover:text-white font-mono bg-transparent"
              title="Restablecer nivel"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <Button
              variant="ghost"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              className="h-10 w-9 p-0 text-slate-400 hover:text-white disabled:opacity-20 hover:bg-white/5 rounded-none border-none"
              title="Acercar (Zoom +)"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Autoplay toggle */}
          <Button
            variant="ghost"
            onClick={() => setIsAutoPlayEnabled(!isAutoPlayEnabled)}
            className={`h-10 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest gap-1.5 ${
              isAutoPlayEnabled ? "bg-[#FFF200] text-slate-950 hover:bg-[#FFF200]/95" : "bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            {isAutoPlayEnabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span className="hidden lg:inline">{isAutoPlayEnabled ? "Pausar" : "Auto-Lectura"}</span>
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
      </header>

      {/* Main Interactive Stage */}
      <div className="flex-1 min-h-0 overflow-hidden relative flex flex-col justify-center items-center p-2 bg-slate-950/40">
        
        {/* Beautiful Floating Brand Logo Badge in Upper Left Corner */}
        <div className="absolute top-4 left-4 z-30 pointer-events-none">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 px-4 py-2 rounded-2xl flex items-center justify-center shadow-2xl">
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt="Logo Zapotlán Gráfico" 
                className="h-5 md:h-6 max-w-[110px] md:max-w-[140px] object-contain brightness-0 invert opacity-90" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-[9px] md:text-xs font-black tracking-tighter text-[#00AEEF] uppercase">ZAPOTLÁN <span className="text-white">GRÁFICO</span></span>
            )}
          </div>
        </div>

        {/* Previous page overlay edge trigger (Desktop helper) */}
        {!showThumbnails && currentPage > 0 && zoomLevel <= 1 && (
          <button 
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-16 w-16 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 hover:opacity-100 transition-opacity backdrop-blur-md border border-white/10 hidden md:flex"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}

        {/* Next page overlay edge trigger (Desktop helper) */}
        {!showThumbnails && currentPage < maxIndex && zoomLevel <= 1 && (
          <button 
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-16 w-16 items-center justify-center rounded-full bg-slate-900/60 text-white opacity-0 hover:opacity-100 transition-opacity backdrop-blur-md border border-white/10 hidden md:flex"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}

        {/* Content Viewer viewport */}
        <div className="relative w-full h-full max-w-6xl max-h-full flex items-center justify-center overflow-hidden rounded-[2rem] bg-slate-950/25 p-2 md:p-4 border border-white/5 shadow-inner">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 25, rotateY: 10 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              exit={{ opacity: 0, x: -25, rotateY: -10 }}
              transition={{ duration: 0.35 }}
              className="w-full h-full flex items-center justify-center perspective-[1200px]"
            >
              {/* INNER INTERACTIVE BLOCK - DRAGGABLE TOUCH GESTURES WHEN ZOOMED */}
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                style={{ 
                  transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0px) scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                  touchAction: 'none',
                  cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
                }}
                className="w-full h-full flex items-center justify-center transition-transform duration-100 ease-out select-none"
              >
                {isMobile ? (
                  /* Mobile Layout: 1 Page Render on Screen - Fully Contained */
                  <div className="relative max-h-[92%] max-w-[92%] aspect-[3/4] h-full shadow-2xl rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-white/5">
                    <img 
                      src={flipbook.pageUrls[currentPage]} 
                      alt={`Pág. ${currentPage + 1}`}
                      className="w-full h-full object-contain pointer-events-none matches-image-perfectly"
                      referrerPolicy="no-referrer"
                    />
                    {/* Crease binder realism */}
                    <div className="absolute top-0 bottom-0 left-0 w-3 bg-gradient-to-r from-black/35 to-transparent pointer-events-none" />
                  </div>
                ) : (
                  /* Desktop Layout: True Dual-Page Side-by-Side realism with object-contain */
                  currentPage === 0 ? (
                    /* Index 0 is the COVER: render single page centered on screen with binder on left */
                    <div className="relative h-[92%] aspect-[3/4] bg-slate-900 rounded-[2rem] overflow-hidden shadow-[0_25px_50px_rgba(0,0,0,0.8)] border border-white/10 max-w-sm md:max-w-md">
                      <img 
                        src={flipbook.pageUrls[0]} 
                        alt="Portada Revista" 
                        className="w-full h-full object-contain pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Shadow crease on the left of booklet cover */}
                      <div className="absolute top-0 bottom-0 left-0 w-6 bg-gradient-to-r from-black/40 via-black/10 to-transparent pointer-events-none" />
                      {/* Golden/Silver binder spine glow on leftmost cover border */}
                      <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-white/20 pointer-events-none" />
                    </div>
                  ) : (
                    /* Indexes > 0: Render open booklet spreads with object-contain to prevent cutoff */
                    <div className="w-full h-full max-h-[92%] flex items-center justify-center gap-1.5 p-2">
                      
                      {/* LEFT PAGE SPREAD */}
                      <div className="relative h-full flex-1 aspect-[3/4] bg-slate-900 rounded-l-[1.5rem] overflow-hidden shadow-[10px_20px_40px_rgba(0,0,0,0.5)] border border-r-0 border-white/5 select-none font-sans">
                        {flipbook.pageUrls[currentPage * 2] ? (
                          <img 
                            src={flipbook.pageUrls[currentPage * 2]} 
                            alt={`Pág. ${currentPage * 2}`}
                            className="w-full h-full object-contain pointer-events-none"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-full w-full bg-slate-950 flex items-center justify-center text-slate-700 font-mono text-xs">Pág. Final</div>
                        )}
                        
                        {/* Crease shadow layout for dual booklet page effect */}
                        <div className="absolute top-0 bottom-0 right-0 w-10 bg-gradient-to-l from-black/60 via-black/10 to-transparent pointer-events-none" />
                      </div>

                      {/* RIGHT PAGE SPREAD */}
                      <div className="relative h-full flex-1 aspect-[3/4] bg-slate-900 rounded-r-[1.5rem] overflow-hidden shadow-[-10px_20px_40px_rgba(0,0,0,0.5)] border border-l-0 border-white/5 select-none font-sans">
                        {flipbook.pageUrls[currentPage * 2 + 1] ? (
                          <img 
                            src={flipbook.pageUrls[currentPage * 2 + 1]} 
                            alt={`Pág. ${currentPage * 2 + 1}`}
                            className="w-full h-full object-contain pointer-events-none"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-full w-full bg-slate-950 flex items-center justify-center text-slate-700 font-mono text-xs">Contraportada</div>
                        )}

                        {/* Crease shadow layout for dual booklet page effect */}
                        <div className="absolute top-0 bottom-0 left-0 w-10 bg-gradient-to-r from-black/60 via-black/10 to-transparent pointer-events-none" />
                      </div>

                    </div>
                  )
                )}
              </div>
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
              className="absolute inset-x-0 bottom-0 z-30 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 p-4 flex flex-col gap-3 max-h-[250px] overflow-hidden rounded-t-[2rem]"
            >
              <div className="flex justify-between items-center px-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00AEEF]">Navegador de Hojas</span>
                <button 
                  onClick={() => setShowThumbnails(false)}
                  className="text-slate-400 hover:text-white uppercase font-black text-[9px] tracking-wider cursor-pointer"
                >
                  Ocultar
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-thin scrollbar-thumb-white/20 justify-start items-center">
                {flipbook.pageUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => {
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
                    className={`relative w-20 shrink-0 aspect-[3/4] bg-slate-800 rounded-xl overflow-hidden border-2 transition-all ${
                      (isMobile ? currentPage === i : (currentPage === 0 ? i === 0 : (i === currentPage * 2 || i === currentPage * 2 + 1)))
                        ? "border-[#FFF200] scale-102 shadow-lg shadow-[#00AEEF]/20"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img 
                      src={url} 
                      alt={`Min pág ${i + 1}`} 
                      className="w-full h-full object-cover pointer-events-none" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center font-black text-[10px] text-white">
                      {i + 1}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Bottom Control Bar - Single-row design that is highly visual - Fixed to bottom */}
      <footer className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur-md px-4 border-t border-white/5 flex items-center justify-between z-30">
        
        {/* Navigation Step Indicators */}
        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 font-mono">
          {getShownPages()}
        </span>

        {/* Stepper Buttons Group - Highly safe contrast styling */}
        <div className="flex items-center gap-1.5">
          {/* Go to cover */}
          <button
            onClick={handleGoToFirst}
            disabled={currentPage === 0}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white cursor-pointer transition-all border-none"
            title="Ir al inicio"
          >
            <ChevronFirst className="h-4 w-4" />
          </button>

          {/* Regular Prev page */}
          <button
            onClick={handlePrev}
            disabled={currentPage === 0}
            className="h-10 gap-1.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer border-none font-sans"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Atrás</span>
          </button>

          {/* Regular Next page */}
          <button
            onClick={handleNext}
            disabled={currentPage === maxIndex}
            className="h-10 gap-1.5 px-5 rounded-xl bg-[#00AEEF] text-white hover:bg-[#00AEEF]/85 disabled:opacity-20 disabled:bg-white/10 disabled:text-white/40 font-black text-[10px] uppercase tracking-wider transition-all shadow-md shadow-[#00AEEF]/20 flex items-center justify-center cursor-pointer border-none font-sans"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Go to back cover */}
          <button
            onClick={handleGoToLast}
            disabled={currentPage === maxIndex}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white cursor-pointer transition-all border-none"
            title="Ir al final"
          >
            <ChevronLast className="h-4 w-4" />
          </button>
        </div>

        {/* Empty placeholder or extra helper text in desktop */}
        <p className="text-[9px] font-bold text-slate-500 font-mono hidden lg:block uppercase tracking-wider">
          * TIP: Usa las flechas (◄ ►) para dar vuelta a las hojas
        </p>

      </footer>

    </div>
  );
}

// Utility class concatenator
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
