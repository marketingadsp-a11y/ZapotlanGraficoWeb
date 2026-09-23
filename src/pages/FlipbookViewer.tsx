import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/firebase';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronFirst, 
  ChevronLast, 
  X, 
  Maximize2, 
  Minimize2, 
  Play, 
  Pause,
  Grid,
  Share2,
  Calendar,
  ZoomIn,
  ZoomOut,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Music
} from 'lucide-react';
import { useSettings } from '@/lib/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { dataCache } from '@/lib/dataCache';
import { pageSound } from '@/lib/pageSound';
import { formatAudioStreamUrl } from '@/lib/audioUrlHelper';
// Import PageFlip from page-flip library
import { PageFlip } from 'page-flip';

interface Flipbook {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  pageUrls: string[];
  slug: string;
  createdAt: any;
  views: number;
  autoPlayDefault?: boolean;
  autoPlayInterval?: number;
  audioUrl?: string;
  autoPlayAudio?: boolean;
}

export default function FlipbookViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  
  // Try to find the flipbook in the local dataCache first for instant loading
  const initialFlipbookValue = id ? (dataCache.flipbooks.find(f => f.id === id) || null) : null;
  
  const [flipbook, setFlipbook] = useState<Flipbook | null>(initialFlipbookValue);
  const [loading, setLoading] = useState(!initialFlipbookValue);

  // Flipbook state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [isMuted, setIsMuted] = useState(pageSound.getMuted());
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Background Audio state
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // References for DOM and PageFlip instance
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const bookHostRef = useRef<HTMLDivElement>(null);
  const pageFlipInstanceRef = useRef<PageFlip | null>(null);

  // Fetch flipbook data from Firestore
  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      try {
        const cached = dataCache.flipbooks.find(f => f.id === id);
        if (cached) {
          setFlipbook(cached);
          setTotalPages(cached.pageUrls.length);
          if (cached.autoPlayDefault) {
            setIsAutoPlayEnabled(true);
          }
          setLoading(false);
        }

        const docRef = doc(db, 'flipbooks', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Flipbook;
          setFlipbook(data);
          setTotalPages(data.pageUrls.length);
          if (data.autoPlayDefault) {
            setIsAutoPlayEnabled(true);
          }
          
          // Increment views metric asynchronously
          updateDoc(docRef, {
            views: increment(1)
          }).catch(err => console.error("Could not increment views:", err));

        } else if (!cached) {
          toast.error("La revista solicitada no existe.");
          navigate('/revista');
        }
      } catch (err) {
        console.error("Error loading flipbook detail: ", err);
        toast.error("Ocurrió un error al cargar la revista.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, navigate]);

  // Sound toggle handler (flip sound effect)
  const handleToggleSound = () => {
    pageSound.unlock();
    const nextMuted = pageSound.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      pageSound.playFlip();
      toast.success("Sonido de hojeado activado");
    } else {
      toast.info("Sonido desactivado");
    }
  };

  // Mobile Web Audio unlock on touchstart / pointerdown / click gestures
  useEffect(() => {
    const handleUnlock = () => {
      pageSound.unlock();
    };
    window.addEventListener('touchstart', handleUnlock, { passive: true });
    window.addEventListener('touchend', handleUnlock, { passive: true });
    window.addEventListener('pointerdown', handleUnlock, { passive: true });
    window.addEventListener('click', handleUnlock, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleUnlock);
      window.removeEventListener('touchend', handleUnlock);
      window.removeEventListener('pointerdown', handleUnlock);
      window.removeEventListener('click', handleUnlock);
    };
  }, []);

  // Background Music toggle handler
  const handleToggleMusic = () => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
      toast.info("Música de fondo pausada");
    } else {
      audioRef.current.play().then(() => {
        setAudioPlaying(true);
        toast.success("Reproduciendo música de fondo");
      }).catch((e) => {
        toast.error("No se pudo iniciar el audio: " + e.message);
      });
    }
  };

  // Background Music AutoPlay logic with browser interaction fallback
  useEffect(() => {
    if (!flipbook?.audioUrl) return;

    if (flipbook.autoPlayAudio) {
      const audio = audioRef.current;
      if (audio) {
        audio.play().then(() => {
          setAudioPlaying(true);
        }).catch(() => {
          // Autoplay was blocked by browser policy; wait for first interaction
          const handleFirstInteraction = () => {
            if (audioRef.current) {
              audioRef.current.play().then(() => {
                setAudioPlaying(true);
              }).catch(() => {});
            }
            window.removeEventListener('pointerdown', handleFirstInteraction);
            window.removeEventListener('keydown', handleFirstInteraction);
          };
          window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
          window.addEventListener('keydown', handleFirstInteraction, { once: true });
        });
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [flipbook?.audioUrl, flipbook?.autoPlayAudio]);

  const [isInteracting, setIsInteracting] = useState(false);

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3.5));
  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const next = Math.max(prev - 0.25, 1);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Zoom & Pan refs for synchronous access in touch/wheel handlers
  const zoomLevelRef = useRef(zoomLevel);
  zoomLevelRef.current = zoomLevel;

  const panOffsetRef = useRef(panOffset);
  panOffsetRef.current = panOffset;

  // Touch gesture state ref for fluid pinch-to-zoom, double-tap & pan
  const touchGestureRef = useRef<{
    mode: 'none' | 'pinch' | 'pan';
    initialDist: number;
    initialZoom: number;
    initialCenter: { x: number; y: number };
    initialPan: { x: number; y: number };
    startTouch: { x: number; y: number };
    startPan: { x: number; y: number };
    lastTapTime: number;
    lastTapPos: { x: number; y: number };
  }>({
    mode: 'none',
    initialDist: 0,
    initialZoom: 1,
    initialCenter: { x: 0, y: 0 },
    initialPan: { x: 0, y: 0 },
    startTouch: { x: 0, y: 0 },
    startPan: { x: 0, y: 0 },
    lastTapTime: 0,
    lastTapPos: { x: 0, y: 0 },
  });

  // Touch listeners in CAPTURE phase so pinch-to-zoom is ultra-smooth and responsive
  useEffect(() => {
    const stage = stageContainerRef.current;
    if (!stage) return;

    const handleTouchStart = (e: TouchEvent) => {
      // 2 or more fingers: PINCH TO ZOOM
      if (e.touches.length >= 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const rect = stage.getBoundingClientRect();
        const centerX = (t1.clientX + t2.clientX) / 2 - (rect.left + rect.width / 2);
        const centerY = (t1.clientY + t2.clientY) / 2 - (rect.top + rect.height / 2);

        touchGestureRef.current.mode = 'pinch';
        touchGestureRef.current.initialDist = Math.max(dist, 10);
        touchGestureRef.current.initialZoom = zoomLevelRef.current;
        touchGestureRef.current.initialCenter = { x: centerX, y: centerY };
        touchGestureRef.current.initialPan = { ...panOffsetRef.current };
        setIsInteracting(true);

        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // 1 finger touch
      if (e.touches.length === 1) {
        const t = e.touches[0];
        const now = Date.now();
        const { lastTapTime, lastTapPos } = touchGestureRef.current;
        const distFromPrev = Math.hypot(t.clientX - lastTapPos.x, t.clientY - lastTapPos.y);

        // Double tap detection (< 300ms, < 25px displacement)
        if (now - lastTapTime < 300 && distFromPrev < 25) {
          touchGestureRef.current.lastTapTime = 0;
          if (zoomLevelRef.current > 1.05) {
            setZoomLevel(1);
            setPanOffset({ x: 0, y: 0 });
            toast.info("Tamaño normal", { duration: 1000 });
          } else {
            setZoomLevel(2.2);
            const rect = stage.getBoundingClientRect();
            const tapOffsetX = t.clientX - (rect.left + rect.width / 2);
            const tapOffsetY = t.clientY - (rect.top + rect.height / 2);
            setPanOffset({
              x: Math.max(-280, Math.min(280, -tapOffsetX * 1.1)),
              y: Math.max(-320, Math.min(320, -tapOffsetY * 1.1)),
            });
            toast.success("Zoom 2.2x", { duration: 1000 });
          }
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        touchGestureRef.current.lastTapTime = now;
        touchGestureRef.current.lastTapPos = { x: t.clientX, y: t.clientY };

        // When already zoomed in (>1.05), 1 finger is used for PANNING/READING
        if (zoomLevelRef.current > 1.05) {
          touchGestureRef.current.mode = 'pan';
          touchGestureRef.current.startTouch = { x: t.clientX, y: t.clientY };
          touchGestureRef.current.startPan = { ...panOffsetRef.current };
          setIsInteracting(true);
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        touchGestureRef.current.mode = 'none';
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Handle Pinch with 2 fingers
      if (e.touches.length >= 2 && touchGestureRef.current.mode === 'pinch') {
        e.preventDefault();
        e.stopPropagation();

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

        if (touchGestureRef.current.initialDist > 5) {
          const ratio = dist / touchGestureRef.current.initialDist;
          let nextZoom = touchGestureRef.current.initialZoom * ratio;
          nextZoom = Math.min(Math.max(nextZoom, 0.95), 4.0);
          setZoomLevel(nextZoom);

          const rect = stage.getBoundingClientRect();
          const currentCenterX = (t1.clientX + t2.clientX) / 2 - (rect.left + rect.width / 2);
          const currentCenterY = (t1.clientY + t2.clientY) / 2 - (rect.top + rect.height / 2);

          const diffX = currentCenterX - touchGestureRef.current.initialCenter.x;
          const diffY = currentCenterY - touchGestureRef.current.initialCenter.y;

          const nextPanX = touchGestureRef.current.initialPan.x + diffX;
          const nextPanY = touchGestureRef.current.initialPan.y + diffY;

          if (nextZoom <= 1.02) {
            setPanOffset({ x: 0, y: 0 });
          } else {
            const maxBoundX = Math.max(0, (stage.clientWidth * nextZoom - stage.clientWidth) / 2 + 60);
            const maxBoundY = Math.max(0, (stage.clientHeight * nextZoom - stage.clientHeight) / 2 + 80);
            setPanOffset({
              x: Math.max(-maxBoundX, Math.min(maxBoundX, nextPanX)),
              y: Math.max(-maxBoundY, Math.min(maxBoundY, nextPanY)),
            });
          }
        }
        return;
      }

      // Handle Pan when zoomed with 1 finger
      if (e.touches.length === 1 && (touchGestureRef.current.mode === 'pan' || zoomLevelRef.current > 1.05)) {
        e.preventDefault();
        e.stopPropagation();

        const t = e.touches[0];
        const dx = t.clientX - touchGestureRef.current.startTouch.x;
        const dy = t.clientY - touchGestureRef.current.startTouch.y;

        const maxBoundX = Math.max(0, (stage.clientWidth * zoomLevelRef.current - stage.clientWidth) / 2 + 60);
        const maxBoundY = Math.max(0, (stage.clientHeight * zoomLevelRef.current - stage.clientHeight) / 2 + 80);

        const newX = Math.max(-maxBoundX, Math.min(maxBoundX, touchGestureRef.current.startPan.x + dx));
        const newY = Math.max(-maxBoundY, Math.min(maxBoundY, touchGestureRef.current.startPan.y + dy));

        setPanOffset({ x: newX, y: newY });
        return;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        setIsInteracting(false);
        touchGestureRef.current.mode = 'none';

        if (zoomLevelRef.current < 1.08) {
          setZoomLevel(1);
          setPanOffset({ x: 0, y: 0 });
        } else if (zoomLevelRef.current > 3.5) {
          setZoomLevel(3.5);
        }
      } else if (e.touches.length === 1 && touchGestureRef.current.mode === 'pinch') {
        if (zoomLevelRef.current > 1.05) {
          touchGestureRef.current.mode = 'pan';
          const t = e.touches[0];
          touchGestureRef.current.startTouch = { x: t.clientX, y: t.clientY };
          touchGestureRef.current.startPan = { ...panOffsetRef.current };
        } else {
          touchGestureRef.current.mode = 'none';
          setZoomLevel(1);
          setPanOffset({ x: 0, y: 0 });
          setIsInteracting(false);
        }
      }
    };

    // Wheel zoom support (Trackpad pinch or Ctrl + Mouse Wheel)
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        if (e.cancelable) e.preventDefault();
        const delta = -e.deltaY * 0.01;
        setZoomLevel(prev => {
          const next = Math.min(Math.max(prev + delta, 1), 3.5);
          if (next <= 1.02) setPanOffset({ x: 0, y: 0 });
          return next;
        });
      }
    };

    // Register with capture: true so we intercept 2-finger touches BEFORE PageFlip
    stage.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
    window.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });
    window.addEventListener('touchend', handleTouchEnd, { capture: true, passive: false });
    window.addEventListener('touchcancel', handleTouchEnd, { capture: true, passive: false });
    stage.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      stage.removeEventListener('touchstart', handleTouchStart, { capture: true });
      window.removeEventListener('touchmove', handleTouchMove, { capture: true });
      window.removeEventListener('touchend', handleTouchEnd, { capture: true });
      window.removeEventListener('touchcancel', handleTouchEnd, { capture: true });
      stage.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Desktop Mouse Pan controls when zoomed in
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return; // Handled by native touch listeners
    if (zoomLevel <= 1) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    if (!isPanning || zoomLevel <= 1) return;
    const maxBoundX = (zoomLevel - 1) * 450;
    const maxBoundY = (zoomLevel - 1) * 350;
    const newX = Math.max(-maxBoundX, Math.min(maxBoundX, e.clientX - dragStart.x));
    const newY = Math.max(-maxBoundY, Math.min(maxBoundY, e.clientY - dragStart.y));
    setPanOffset({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    setIsPanning(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Keep track of current page in a ref for resize recalculations
  const currentPageRef = useRef(0);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Debounced viewport resize listener to adapt to any screen size changes dynamically
  const [viewportKey, setViewportKey] = useState(0);
  useEffect(() => {
    let timeout: any;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setViewportKey(prev => prev + 1);
      }, 200);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update dynamic horizontal centering on the book element itself
  const updateBookCentering = useCallback((pageIdx: number, total: number, isLandscape: boolean) => {
    if (!bookHostRef.current) return;
    const bookEl = bookHostRef.current.querySelector('.magazine-book-element') as HTMLElement;
    if (!bookEl) return;

    let offset = 0;
    if (isLandscape) {
      if (pageIdx === 0) {
        // Front cover in landscape: shift book left by 25% of its width so the right cover page is centered
        offset = -25;
      } else if (total > 0 && pageIdx >= total - 1) {
        // Back cover in landscape: shift book right by 25% of its width so the left back cover is centered
        offset = 25;
      }
    }
    bookEl.style.transform = `translateX(${offset}%)`;
    bookEl.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
  }, []);

  // Initialize PageFlip instance with strict mathematical containment
  useEffect(() => {
    if (!flipbook || !flipbook.pageUrls || flipbook.pageUrls.length === 0 || !bookHostRef.current) {
      return;
    }

    const host = bookHostRef.current;
    host.innerHTML = '';

    // Create the inner container that PageFlip will bind to
    const bookEl = document.createElement('div');
    bookEl.className = 'magazine-book-element';
    host.appendChild(bookEl);

    // Get exact stage available space (between header and footer)
    const stage = stageContainerRef.current;
    const stageWidth = stage ? stage.clientWidth : window.innerWidth;
    const stageHeight = stage ? stage.clientHeight : (window.innerHeight - 120);

    const isMobile = stageWidth < 768;
    const pageRatio = 1.38; // Typical magazine aspect ratio (height / width)

    // Margins so the magazine pages never touch or overflow header, floating buttons, or screen edges
    const padX = isMobile ? 12 : 48;
    const padY = isMobile ? 74 : 36; // Keep 74px on mobile to leave room for the bottom floating dock

    const availWidth = Math.max(stageWidth - padX, 240);
    const availHeight = Math.max(stageHeight - padY, 280);

    let pageWidth = 0;
    let pageHeight = 0;

    if (isMobile) {
      // 1 single page on mobile: must fit both availWidth and availHeight
      pageWidth = Math.floor(Math.min(availWidth, availHeight / pageRatio));
      pageHeight = Math.floor(pageWidth * pageRatio);
    } else {
      // 2 pages side-by-side on desktop: spread width (2*pageWidth) and pageHeight must both fit!
      pageWidth = Math.floor(Math.min(availWidth / 2, availHeight / pageRatio));
      pageHeight = Math.floor(pageWidth * pageRatio);
    }

    const totalBookWidth = isMobile ? pageWidth : pageWidth * 2;
    bookEl.style.width = `${totalBookWidth}px`;
    bookEl.style.height = `${pageHeight}px`;

    // Initialize PageFlip instance with fixed size matching available space
    const pageFlip = new PageFlip(bookEl, {
      width: pageWidth,
      height: pageHeight,
      size: 'fixed',
      autoSize: false,
      showCover: true,
      mobileScrollSupport: false,
      usePortrait: isMobile,
      startPage: currentPageRef.current || 0,
      drawShadow: true,
      flippingTime: 750,
      useMouseEvents: !isMobile,
      swipeDistance: 25,
      showPageCorners: !isMobile,
      disableFlipByClick: true,
      maxShadowOpacity: 0.65,
    });

    try {
      pageFlip.loadFromImages(flipbook.pageUrls);
      const initialOrient = pageFlip.getOrientation() === 'portrait' ? 'portrait' : 'landscape';
      setOrientation(initialOrient);
      updateBookCentering(currentPageRef.current || 0, flipbook.pageUrls.length, initialOrient === 'landscape');

      // Enhanced cover spread: replace blank white left page with the brand logo & editorial backdrop
      const render = (pageFlip as any).render;
      if (render && render.drawFrame) {
        const logoImg = new Image();
        if (settings.logoUrl) {
          logoImg.crossOrigin = 'anonymous';
          logoImg.src = settings.logoUrl;
        }

        const originalDrawFrame = render.drawFrame.bind(render);
        render.drawFrame = function () {
          originalDrawFrame();

          // When in landscape mode and there is no left page (cover view), paint the brand presentation
          if (this.orientation !== 'portrait' && this.leftPage == null) {
            const rect = this.getRect();
            const ctx = this.ctx as CanvasRenderingContext2D;
            if (!ctx || !rect) return;

            ctx.save();

            const leftX = rect.left;
            const leftY = rect.top;
            const pW = rect.pageWidth;
            const pH = rect.height;

            // Clip strictly to the left page bounds
            ctx.beginPath();
            ctx.rect(leftX, leftY, pW, pH);
            ctx.clip();

            // Deep elegant editorial slate background
            const bgGrad = ctx.createLinearGradient(leftX, leftY, leftX + pW, leftY + pH);
            bgGrad.addColorStop(0, '#0b132b');
            bgGrad.addColorStop(1, '#020617');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(leftX, leftY, pW, pH);

            // Subtle brand radial glow (#00AEEF)
            const glowGrad = ctx.createRadialGradient(
              leftX + pW / 2, leftY + pH / 2, 5,
              leftX + pW / 2, leftY + pH / 2, pW * 0.65
            );
            glowGrad.addColorStop(0, 'rgba(0, 174, 239, 0.12)');
            glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(leftX, leftY, pW, pH);

            // Spine shadow overlay on the right edge
            const spineShadow = ctx.createLinearGradient(leftX + pW - 24, 0, leftX + pW, 0);
            spineShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
            spineShadow.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
            ctx.fillStyle = spineShadow;
            ctx.fillRect(leftX + pW - 24, leftY, 24, pH);

            // Draw brand logo or fallback styled typography
            if (logoImg.complete && logoImg.naturalWidth > 0) {
              const maxW = pW * 0.72;
              const maxH = pH * 0.36;
              const scale = Math.min(maxW / logoImg.naturalWidth, maxH / logoImg.naturalHeight);
              const drawW = logoImg.naturalWidth * scale;
              const drawH = logoImg.naturalHeight * scale;
              const drawX = leftX + (pW - drawW) / 2;
              const drawY = leftY + (pH - drawH) / 2 - 16;

              ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
            } else {
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              ctx.fillStyle = '#00AEEF';
              ctx.font = `900 ${Math.max(16, Math.floor(pW * 0.085))}px sans-serif`;
              ctx.fillText("ZAPOTLÁN", leftX + pW / 2, leftY + pH / 2 - 16);

              ctx.fillStyle = '#FFFFFF';
              ctx.font = `900 ${Math.max(16, Math.floor(pW * 0.085))}px sans-serif`;
              ctx.fillText("GRÁFICO", leftX + pW / 2, leftY + pH / 2 + 16);
            }

            // Footer editorial badge
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
            ctx.font = `800 ${Math.max(8, Math.floor(pW * 0.03))}px sans-serif`;
            ctx.fillText("EDICIÓN DIGITAL IMPRESA", leftX + pW / 2, leftY + pH - 28);

            ctx.restore();

            // If a page is actively flipping over, redraw it on top with full 3D lighting and shadow
            if (this.flippingPage != null) {
              this.flippingPage.draw();
            }
          }
        };
      }
    } catch (err) {
      console.error("Error loading pages into PageFlip:", err);
    }

    // Attach events
    pageFlip.on('init', (e: any) => {
      if (e.object) {
        const orient = e.object.getOrientation() === 'portrait' ? 'portrait' : 'landscape';
        setOrientation(orient);
        updateBookCentering(currentPageRef.current || 0, flipbook.pageUrls.length, orient === 'landscape');
      }
    });

    pageFlip.on('flip', (e: any) => {
      const pageIndex = typeof e.data === 'number' ? e.data : 0;
      setCurrentPage(pageIndex);
      pageSound.playFlip();
      const currentOrient = pageFlip.getOrientation() === 'portrait' ? 'portrait' : 'landscape';
      updateBookCentering(pageIndex, flipbook.pageUrls.length, currentOrient === 'landscape');
    });

    pageFlip.on('changeState', (e: any) => {
      if (e.data === 'flipping') {
        pageSound.playFlip();
      }
    });

    pageFlip.on('changeOrientation', (e: any) => {
      const orient = e.data === 'portrait' ? 'portrait' : 'landscape';
      setOrientation(orient);
      updateBookCentering(pageFlip.getCurrentPageIndex(), flipbook.pageUrls.length, orient === 'landscape');
    });

    pageFlipInstanceRef.current = pageFlip;

    return () => {
      try {
        if (pageFlipInstanceRef.current) {
          pageFlipInstanceRef.current.destroy();
          pageFlipInstanceRef.current = null;
        }
      } catch (err) {
        console.warn("Cleanup PageFlip error:", err);
      }
      host.innerHTML = '';
    };
  }, [flipbook, viewportKey, updateBookCentering, settings.logoUrl]);

  // Turn to specific page helper
  const goToPage = useCallback((pageNum: number) => {
    if (!pageFlipInstanceRef.current) return;
    const target = Math.max(0, Math.min(pageNum, totalPages - 1));
    try {
      pageFlipInstanceRef.current.flip(target);
    } catch {
      try {
        pageFlipInstanceRef.current.turnToPage(target);
      } catch {}
    }
  }, [totalPages]);

  const handleNext = () => {
    if (!pageFlipInstanceRef.current) return;
    try {
      pageFlipInstanceRef.current.flipNext();
    } catch (e) {
      console.warn("flipNext error:", e);
    }
  };

  const handlePrev = () => {
    if (!pageFlipInstanceRef.current) return;
    try {
      pageFlipInstanceRef.current.flipPrev();
    } catch (e) {
      console.warn("flipPrev error:", e);
    }
  };

  const handleGoToFirst = () => goToPage(0);
  const handleGoToLast = () => goToPage(totalPages - 1);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        if (showThumbnails) setShowThumbnails(false);
        else if (isFullscreen) toggleFullscreen();
      } else if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        setIsAutoPlayEnabled(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages, showThumbnails, isFullscreen]);

  // Autoplay slideshow loop
  useEffect(() => {
    if (!isAutoPlayEnabled || !flipbook || totalPages === 0) return;

    const intervalSeconds = (flipbook.autoPlayInterval && flipbook.autoPlayInterval >= 2) 
      ? flipbook.autoPlayInterval 
      : 5;

    const interval = setInterval(() => {
      if (currentPage >= totalPages - 1) {
        goToPage(0);
      } else {
        handleNext();
      }
    }, intervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [isAutoPlayEnabled, currentPage, totalPages, flipbook, goToPage]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    const docEl = document.documentElement as any;
    const doc = document as any;

    if (!isFullscreen) {
      if (docEl.requestFullscreen) docEl.requestFullscreen().catch(() => {});
      else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
      else if (docEl.msRequestFullscreen) docEl.msRequestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement) {
        if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
        else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
        else if (doc.msExitFullscreen) doc.msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Fullscreen sync listener
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

  // Share magazine link
  const handleShareUrl = () => {
    const shareUrl = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("¡Enlace de la revista copiado al portapapeles!");
    } else {
      toast.error("El navegador actual no soporta el portapapeles.");
    }
  };

  // Display label for current page
  const getPageIndicatorText = () => {
    if (totalPages === 0) return 'Cargando...';
    if (orientation === 'portrait') {
      if (currentPage === 0) return `Portada (Pág. 1 de ${totalPages})`;
      if (currentPage === totalPages - 1) return `Contraportada (${totalPages} de ${totalPages})`;
      return `Pág. ${currentPage + 1} de ${totalPages}`;
    } else {
      // Landscape double-page view
      if (currentPage === 0) return `Portada (Pág. 1 de ${totalPages})`;
      if (currentPage === totalPages - 1) return `Contraportada (${totalPages} de ${totalPages})`;
      const left = currentPage;
      const right = currentPage + 1;
      if (right >= totalPages) {
        return `Pág. ${left} de ${totalPages}`;
      }
      return `Págs. ${left} - ${right} de ${totalPages}`;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <div className="relative">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent" />
          <Sparkles className="h-6 w-6 text-[#FFF200] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
          Abriendo revista interactiva...
        </p>
      </div>
    );
  }

  if (!flipbook) return null;

  return (
    <div className={`fixed inset-0 h-[100dvh] w-screen bg-[#090b10] flex flex-col text-white select-none overflow-hidden touch-none ${
      isFullscreen ? "z-50" : "z-30"
    }`}>
      
      {/* Ambient background lighting aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#00AEEF]/5 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-[#FFF200]/3 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header Controls (Heyzine Style) */}
      <header className="h-14 shrink-0 z-30 bg-slate-950/70 backdrop-blur-xl px-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link 
            to="/revista"
            className="flex h-9 items-center justify-center rounded-xl bg-white/5 hover:bg-[#ED1C24] transition-all px-3 group gap-2"
            title="Cerrar Revista"
          >
            <X className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
            <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest text-slate-300 group-hover:text-white">
              Cerrar
            </span>
          </Link>

          <div className="hidden md:block max-w-sm lg:max-w-md">
            <h1 className="text-xs font-black tracking-tight uppercase truncate text-slate-200">
              {flipbook.title}
            </h1>
            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-[#00AEEF]">
              <Calendar className="h-2.5 w-2.5" />
              <span>
                {flipbook.createdAt 
                  ? format(flipbook.createdAt.toDate(), "d MMM, yyyy", { locale: es }) 
                  : "Edición Digital"}
              </span>
            </div>
          </div>
        </div>

        {/* Brand Center Badge */}
        <div className="flex items-center gap-2">
          {settings.logoUrl ? (
            <img 
              src={settings.logoUrl} 
              alt="Logo" 
              className="h-5 md:h-6 max-w-[120px] object-contain brightness-0 invert opacity-80" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-[10px] font-black tracking-tighter uppercase text-[#00AEEF]">
              ZAPOTLÁN <span className="text-white">GRÁFICO</span>
            </span>
          )}
        </div>

        {/* Top Right Quick Actions */}
        <div className="flex items-center gap-1.5">
          {/* Background Music Button (if audio configured) */}
          {flipbook.audioUrl && (
            <Button
              variant="ghost"
              onClick={handleToggleMusic}
              className={`h-9 px-2.5 gap-1.5 rounded-xl transition-all ${
                audioPlaying 
                  ? "bg-[#00AEEF] text-white shadow-md shadow-[#00AEEF]/20" 
                  : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10"
              }`}
              title={audioPlaying ? "Pausar música de fondo" : "Reproducir música de fondo"}
            >
              <Music className={`h-4 w-4 ${audioPlaying ? "animate-pulse text-white" : "text-slate-400"}`} />
              <span className="hidden sm:inline text-[9px] font-black uppercase tracking-wider">
                {audioPlaying ? "Música" : "Audio"}
              </span>
            </Button>
          )}

          {/* Sound Toggle (Flip effect) */}
          <Button
            variant="ghost"
            onClick={handleToggleSound}
            className={`h-9 w-9 p-0 rounded-xl transition-colors ${
              !isMuted ? "bg-white/10 text-[#00AEEF]" : "bg-white/5 text-slate-400 hover:text-white"
            }`}
            title={isMuted ? "Activar sonido de hojeado" : "Silenciar sonido de hojeado"}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          {/* Share Button */}
          <Button
            variant="ghost"
            onClick={handleShareUrl}
            className="h-9 w-9 p-0 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
            title="Compartir Edición"
          >
            <Share2 className="h-4 w-4" />
          </Button>

          {/* Fullscreen Button */}
          <Button
            variant="ghost"
            onClick={toggleFullscreen}
            className="h-9 w-9 p-0 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
            title="Pantalla Completa"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Main Interactive Stage with 3D Flipbook Canvas */}
      <div 
        ref={stageContainerRef}
        className="flex-1 min-h-0 relative flex items-center justify-center p-2 sm:p-4 overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'
        }}
      >
        {/* Floating Zoom Indicator & Quick Reset on Mobile / Zoomed state */}
        {zoomLevel > 1 && (
          <div className="absolute top-3 sm:top-4 z-30 flex items-center gap-2 bg-slate-950/90 backdrop-blur-xl border border-[#00AEEF]/50 px-3.5 py-1.5 rounded-full shadow-2xl shadow-cyan-950/50">
            <span className="text-[11px] font-mono font-bold text-[#00AEEF]">
              🔍 {Math.round(zoomLevel * 100)}%
            </span>
            <span className="text-white/30 text-[10px]">•</span>
            <button
              onClick={handleResetZoom}
              className="text-[10px] font-black uppercase tracking-wider text-[#FFF200] hover:text-white transition-colors cursor-pointer flex items-center gap-1 border-none bg-transparent"
              title="Restablecer tamaño normal"
            >
              <RotateCcw className="h-3 w-3" />
              Restablecer
            </button>
          </div>
        )}

        {/* Navigation overlay buttons (Con efecto luminoso continuo, siempre visibles en cualquier momento) */}
        {currentPage > 0 && (
          <button 
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 top-1/2 z-20 h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-slate-950/85 text-white active:scale-95 transition-all backdrop-blur-xl border border-white/35 flex shadow-2xl group cursor-pointer animate-nav-dark-glow"
            title="Página Anterior"
          >
            {/* Pulsing ripple wave */}
            <span className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-30 pointer-events-none" />
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 animate-nudge-left text-white drop-shadow" />
          </button>
        )}

        {currentPage < totalPages - 1 && (
          <button 
            onClick={handleNext}
            className="absolute right-2 sm:right-4 top-1/2 z-20 h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-gradient-to-tr from-[#0092c7] to-[#00bfff] text-white active:scale-95 transition-all backdrop-blur-xl border border-white/40 flex shadow-2xl group cursor-pointer animate-nav-cyan-glow"
            title="Página Siguiente"
          >
            {/* Pulsing ripple wave */}
            <span className="absolute inset-0 rounded-full bg-[#00AEEF]/50 animate-ping opacity-40 pointer-events-none" />
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 animate-nudge-right text-white drop-shadow" />
          </button>
        )}

        {/* Zoom & Pan Wrapper */}
        <div 
          style={{
            transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0px) scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: (isPanning || isInteracting) ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.9, 0.4, 1)',
          }}
          className="relative w-full h-full flex items-center justify-center magazine-stage-glow select-none touch-none"
        >
          {/* Host element where PageFlip creates and manages pages (pointer-events disabled during zoom so drag pans the page instead of turning) */}
          <div 
            ref={bookHostRef} 
            className="w-full h-full flex items-center justify-center select-none"
            style={{
              pointerEvents: zoomLevel > 1 ? 'none' : 'auto'
            }}
          />
        </div>

        {/* Bottom Thumbnails Drawer (Heyzine Shelf) */}
        <AnimatePresence>
          {showThumbnails && (
            <motion.div
              initial={{ opacity: 0, y: 120 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 120 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-x-0 bottom-14 sm:bottom-16 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-white/10 p-3 sm:p-4 flex flex-col gap-3 max-h-[200px] sm:max-h-[220px] rounded-t-3xl shadow-2xl"
            >
              <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-2">
                  <Grid className="h-3.5 w-3.5 text-[#00AEEF]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00AEEF]">
                    Miniaturas de Páginas ({totalPages})
                  </span>
                </div>
                <button 
                  onClick={() => setShowThumbnails(false)}
                  className="text-slate-400 hover:text-white uppercase font-black text-[9px] tracking-wider cursor-pointer px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Ocultar
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 px-2 scrollbar-thin scrollbar-thumb-white/20 items-center">
                {flipbook.pageUrls.map((url, i) => {
                  const isActive = currentPage === i;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        goToPage(i);
                        setShowThumbnails(false);
                      }}
                      className={`relative w-20 shrink-0 aspect-[3/4] bg-slate-900 rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                        isActive
                          ? "border-[#00AEEF] scale-105 shadow-lg shadow-[#00AEEF]/30"
                          : "border-transparent opacity-60 hover:opacity-100 hover:scale-102"
                      }`}
                    >
                      <img 
                        src={url} 
                        alt={`Miniatura Pág. ${i + 1}`} 
                        className="w-full h-full object-cover pointer-events-none" 
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center p-1">
                        <span className="text-[9px] font-black font-mono text-white/90">
                          {i === 0 ? "Portada" : i === totalPages - 1 ? "Atrás" : i + 1}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Mobile Compact Bottom Floating Navigation Dock */}
      <div className="sm:hidden fixed bottom-3 inset-x-0 z-30 flex justify-center px-3 pointer-events-none pb-[env(safe-area-inset-bottom)]">
        <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-2xl border border-white/15 rounded-full px-3 py-1.5 shadow-2xl flex items-center gap-2">
          {/* Previous */}
          <button
            onClick={handlePrev}
            disabled={currentPage === 0}
            className="h-8.5 w-8.5 rounded-full bg-slate-900/80 hover:bg-white/20 disabled:opacity-20 flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer border border-white/25 shadow-sm"
            title="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page Counter Compact */}
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-200 font-mono px-1 select-none">
            {currentPage === 0 ? "Portada" : currentPage >= totalPages - 1 ? "Fin" : `${currentPage + 1}/${totalPages}`}
          </span>

          {/* Next */}
          <button
            onClick={handleNext}
            disabled={currentPage >= totalPages - 1}
            className="relative h-8.5 w-8.5 rounded-full bg-gradient-to-tr from-[#0092c7] to-[#00bfff] hover:brightness-110 disabled:opacity-20 disabled:bg-white/10 flex items-center justify-center text-white shadow-lg shadow-[#00AEEF]/50 ring-2 ring-[#00AEEF]/60 active:scale-90 transition-all cursor-pointer border-none animate-pulse"
            title="Siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Mini separator */}
          <div className="h-4 w-px bg-white/15 my-auto" />

          {/* Zoom Toggle on Mobile */}
          <button
            onClick={() => {
              if (zoomLevel > 1.05) {
                handleResetZoom();
                toast.info("Tamaño normal");
              } else {
                setZoomLevel(2.0);
                toast.success("Zoom 2.0x activado");
              }
            }}
            className={`h-8 w-8 rounded-full flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer border-none ${
              zoomLevel > 1.05 ? "bg-[#FFF200] text-slate-950 font-bold shadow-md shadow-[#FFF200]/30" : "bg-white/10"
            }`}
            title={zoomLevel > 1.05 ? "Restablecer Zoom" : "Acercar Zoom"}
          >
            {zoomLevel > 1.05 ? <ZoomOut className="h-3.5 w-3.5" /> : <ZoomIn className="h-3.5 w-3.5" />}
          </button>

          {/* Thumbnails Toggle */}
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`h-8 w-8 rounded-full flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer border-none ${
              showThumbnails ? "bg-[#00AEEF]" : "bg-white/10"
            }`}
            title="Ver Páginas"
          >
            <Grid className="h-3.5 w-3.5" />
          </button>

          {/* AutoPlay Toggle */}
          <button
            onClick={() => setIsAutoPlayEnabled(!isAutoPlayEnabled)}
            className={`h-8 w-8 rounded-full flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer border-none ${
              isAutoPlayEnabled ? "bg-[#FFF200] text-slate-950" : "bg-white/10"
            }`}
            title={isAutoPlayEnabled ? "Pausar" : "Auto"}
          >
            {isAutoPlayEnabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>

          {/* Background Audio Toggle (if configured) */}
          {flipbook.audioUrl && (
            <button
              onClick={handleToggleMusic}
              className={`h-8 w-8 rounded-full flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer border-none ${
                audioPlaying ? "bg-[#00AEEF] animate-pulse" : "bg-white/10"
              }`}
              title={audioPlaying ? "Pausar Música" : "Reproducir Música"}
            >
              <Music className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Bottom Control Bar (Heyzine Layout - Desktop/Tablet) */}
      <footer className="hidden sm:flex h-16 shrink-0 z-30 bg-slate-950/80 backdrop-blur-xl px-3 sm:px-6 border-t border-white/5 items-center justify-between">
        
        {/* Left Controls: Thumbnails & Reset Zoom */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Thumbnails Drawer Toggle */}
          <Button
            variant="ghost"
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`h-10 px-3 rounded-xl gap-2 font-black text-[9px] uppercase tracking-wider transition-all ${
              showThumbnails 
                ? "bg-[#00AEEF] text-white" 
                : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10"
            }`}
            title="Ver Miniaturas"
          >
            <Grid className="h-4 w-4" />
            <span className="hidden sm:inline">Páginas</span>
          </Button>

          {/* Autoplay Slideshow */}
          <Button
            variant="ghost"
            onClick={() => setIsAutoPlayEnabled(!isAutoPlayEnabled)}
            className={`h-10 px-3 rounded-xl gap-2 font-black text-[9px] uppercase tracking-wider transition-all ${
              isAutoPlayEnabled 
                ? "bg-[#FFF200] text-slate-950 hover:bg-[#FFF200]/90 shadow-md shadow-[#FFF200]/20" 
                : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10"
            }`}
            title={isAutoPlayEnabled ? "Pausar hojeado automático" : "Iniciar lectura automática"}
          >
            {isAutoPlayEnabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span className="hidden lg:inline">{isAutoPlayEnabled ? "Pausa" : "Auto"}</span>
          </Button>
        </div>

        {/* Center Controls: Stepper Buttons & Page Scrubber */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* First Page */}
          <button
            onClick={handleGoToFirst}
            disabled={currentPage === 0}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white cursor-pointer transition-all border-none"
            title="Primera Página"
          >
            <ChevronFirst className="h-4 w-4" />
          </button>

          {/* Previous Page */}
          <button
            onClick={handlePrev}
            disabled={currentPage === 0}
            className="h-10 gap-1.5 px-3 sm:px-4 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer border-none"
            title="Página Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Atrás</span>
          </button>

          {/* Page Counter & Direct Scrubber Slider */}
          <div className="flex flex-col items-center justify-center px-2 sm:px-3 min-w-[120px] sm:min-w-[170px]">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-200 font-mono text-center">
              {getPageIndicatorText()}
            </span>
            {totalPages > 1 && (
              <input
                type="range"
                min={0}
                max={totalPages - 1}
                value={currentPage}
                onChange={(e) => goToPage(parseInt(e.target.value, 10))}
                className="w-full h-1 mt-1 accent-[#00AEEF] cursor-pointer bg-white/10 rounded-lg"
                title="Deslizar para cambiar de página"
              />
            )}
          </div>

          {/* Next Page */}
          <button
            onClick={handleNext}
            disabled={currentPage >= totalPages - 1}
            className="h-10 gap-1.5 px-4 sm:px-5 rounded-xl bg-[#00AEEF] text-white hover:bg-[#00AEEF]/85 disabled:opacity-20 disabled:bg-white/10 disabled:text-white/40 font-black text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-[#00AEEF]/25 flex items-center justify-center cursor-pointer border-none"
            title="Página Siguiente"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Last Page */}
          <button
            onClick={handleGoToLast}
            disabled={currentPage >= totalPages - 1}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white cursor-pointer transition-all border-none"
            title="Última Página"
          >
            <ChevronLast className="h-4 w-4" />
          </button>
        </div>

        {/* Right Controls: Zoom Slider / In / Out */}
        <div className="flex items-center gap-1">
          <div className="hidden sm:flex items-center bg-white/5 rounded-xl border border-white/5 overflow-hidden">
            <Button
              variant="ghost"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 1}
              className="h-9 w-8 p-0 text-slate-400 hover:text-white disabled:opacity-20 hover:bg-white/5 rounded-none border-none"
              title="Alejar Zoom"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <button
              onClick={handleResetZoom}
              className="px-2 h-9 text-[9px] font-bold text-slate-300 hover:text-white font-mono bg-transparent cursor-pointer"
              title="Restablecer tamaño normal"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <Button
              variant="ghost"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 2.5}
              className="h-9 w-8 p-0 text-slate-400 hover:text-white disabled:opacity-20 hover:bg-white/5 rounded-none border-none"
              title="Acercar Zoom"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          {zoomLevel > 1 && (
            <Button
              variant="ghost"
              onClick={handleResetZoom}
              className="h-9 w-9 p-0 rounded-xl bg-[#FFF200]/20 text-[#FFF200] hover:bg-[#FFF200]/30"
              title="Restablecer Zoom"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

      </footer>

      {/* Hidden Background Audio Element */}
      {flipbook.audioUrl && (
        <audio
          ref={audioRef}
          src={formatAudioStreamUrl(flipbook.audioUrl)}
          loop
          preload="auto"
          onPlay={() => setAudioPlaying(true)}
          onPause={() => setAudioPlaying(false)}
        />
      )}

    </div>
  );
}
