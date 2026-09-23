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
  // Direct GPU Zoom & Pan Engine state
  const [displayZoom, setDisplayZoom] = useState(1);
  const currentScaleRef = useRef(1);
  const currentPanRef = useRef({ x: 0, y: 0 });
  const zoomWrapperRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isDraggingMouseRef = useRef(false);

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

  // Direct GPU Transform Zoom & Pan Engine (Zero React re-render bottleneck on touchmove)
  const applyTransform = useCallback((scale: number, panX: number, panY: number, animate = false) => {
    currentScaleRef.current = scale;
    currentPanRef.current = { x: panX, y: panY };
    if (zoomWrapperRef.current) {
      zoomWrapperRef.current.style.transition = animate 
        ? 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)' 
        : 'none';
      zoomWrapperRef.current.style.transform = `translate3d(${panX}px, ${panY}px, 0px) scale(${scale})`;
    }
  }, []);

  const handleZoomIn = () => {
    const next = Math.min(currentScaleRef.current + 0.5, 6.0);
    applyTransform(next, currentPanRef.current.x, currentPanRef.current.y, true);
    setDisplayZoom(next);
  };

  const handleZoomOut = () => {
    const next = Math.max(currentScaleRef.current - 0.5, 1.0);
    const nextPan = next <= 1.05 ? { x: 0, y: 0 } : currentPanRef.current;
    applyTransform(next, nextPan.x, nextPan.y, true);
    setDisplayZoom(next);
  };

  const handleResetZoom = () => {
    applyTransform(1.0, 0, 0, true);
    setDisplayZoom(1.0);
  };

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
        touchGestureRef.current.initialZoom = currentScaleRef.current;
        touchGestureRef.current.initialCenter = { x: centerX, y: centerY };
        touchGestureRef.current.initialPan = { ...currentPanRef.current };

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
          if (currentScaleRef.current > 1.1) {
            handleResetZoom();
          } else {
            const rect = stage.getBoundingClientRect();
            const tapOffsetX = t.clientX - (rect.left + rect.width / 2);
            const tapOffsetY = t.clientY - (rect.top + rect.height / 2);
            const targetPanX = Math.max(-280, Math.min(280, -tapOffsetX * 1.2));
            const targetPanY = Math.max(-320, Math.min(320, -tapOffsetY * 1.2));
            applyTransform(2.5, targetPanX, targetPanY, true);
            setDisplayZoom(2.5);
          }
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        touchGestureRef.current.lastTapTime = now;
        touchGestureRef.current.lastTapPos = { x: t.clientX, y: t.clientY };

        // When already zoomed in (>1.05), 1 finger is used for PANNING/READING
        if (currentScaleRef.current > 1.05) {
          touchGestureRef.current.mode = 'pan';
          touchGestureRef.current.startTouch = { x: t.clientX, y: t.clientY };
          touchGestureRef.current.startPan = { ...currentPanRef.current };
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
          // Unrestricted zoom: up to 6.0x!
          nextZoom = Math.min(Math.max(nextZoom, 0.9), 6.5);

          const rect = stage.getBoundingClientRect();
          const currentCenterX = (t1.clientX + t2.clientX) / 2 - (rect.left + rect.width / 2);
          const currentCenterY = (t1.clientY + t2.clientY) / 2 - (rect.top + rect.height / 2);

          const diffX = currentCenterX - touchGestureRef.current.initialCenter.x;
          const diffY = currentCenterY - touchGestureRef.current.initialCenter.y;

          const nextPanX = touchGestureRef.current.initialPan.x + diffX;
          const nextPanY = touchGestureRef.current.initialPan.y + diffY;

          if (nextZoom <= 1.02) {
            applyTransform(nextZoom, 0, 0, false);
          } else {
            const maxBoundX = Math.max(0, (stage.clientWidth * nextZoom - stage.clientWidth) / 2 + 80);
            const maxBoundY = Math.max(0, (stage.clientHeight * nextZoom - stage.clientHeight) / 2 + 100);
            applyTransform(
              nextZoom,
              Math.max(-maxBoundX, Math.min(maxBoundX, nextPanX)),
              Math.max(-maxBoundY, Math.min(maxBoundY, nextPanY)),
              false
            );
          }
        }
        return;
      }

      // Handle Pan when zoomed with 1 finger
      if (e.touches.length === 1 && (touchGestureRef.current.mode === 'pan' || currentScaleRef.current > 1.05)) {
        e.preventDefault();
        e.stopPropagation();

        const t = e.touches[0];
        const dx = t.clientX - touchGestureRef.current.startTouch.x;
        const dy = t.clientY - touchGestureRef.current.startTouch.y;

        const maxBoundX = Math.max(0, (stage.clientWidth * currentScaleRef.current - stage.clientWidth) / 2 + 80);
        const maxBoundY = Math.max(0, (stage.clientHeight * currentScaleRef.current - stage.clientHeight) / 2 + 100);

        const newX = Math.max(-maxBoundX, Math.min(maxBoundX, touchGestureRef.current.startPan.x + dx));
        const newY = Math.max(-maxBoundY, Math.min(maxBoundY, touchGestureRef.current.startPan.y + dy));

        applyTransform(currentScaleRef.current, newX, newY, false);
        return;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        touchGestureRef.current.mode = 'none';

        if (currentScaleRef.current < 1.08) {
          applyTransform(1.0, 0, 0, true);
          setDisplayZoom(1.0);
        } else if (currentScaleRef.current > 6.0) {
          applyTransform(6.0, currentPanRef.current.x, currentPanRef.current.y, true);
          setDisplayZoom(6.0);
        } else {
          setDisplayZoom(currentScaleRef.current);
        }
      } else if (e.touches.length === 1 && touchGestureRef.current.mode === 'pinch') {
        if (currentScaleRef.current > 1.05) {
          touchGestureRef.current.mode = 'pan';
          const t = e.touches[0];
          touchGestureRef.current.startTouch = { x: t.clientX, y: t.clientY };
          touchGestureRef.current.startPan = { ...currentPanRef.current };
          setDisplayZoom(currentScaleRef.current);
        } else {
          touchGestureRef.current.mode = 'none';
          applyTransform(1.0, 0, 0, true);
          setDisplayZoom(1.0);
        }
      }
    };

    // Wheel zoom support (Trackpad pinch or Ctrl + Mouse Wheel)
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        if (e.cancelable) e.preventDefault();
        const delta = -e.deltaY * 0.01;
        const next = Math.min(Math.max(currentScaleRef.current + delta, 1), 6.0);
        const nextPan = next <= 1.02 ? { x: 0, y: 0 } : currentPanRef.current;
        applyTransform(next, nextPan.x, nextPan.y, false);
        setDisplayZoom(next);
      }
    };

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
  }, [applyTransform]);

  // Desktop Mouse Pan controls when zoomed in
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    if (currentScaleRef.current <= 1.05) return;
    isDraggingMouseRef.current = true;
    dragStartRef.current = {
      x: e.clientX - currentPanRef.current.x,
      y: e.clientY - currentPanRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    if (!isDraggingMouseRef.current || currentScaleRef.current <= 1.05) return;
    const stage = stageContainerRef.current;
    const maxBoundX = stage ? Math.max(0, (stage.clientWidth * currentScaleRef.current - stage.clientWidth) / 2 + 80) : 600;
    const maxBoundY = stage ? Math.max(0, (stage.clientHeight * currentScaleRef.current - stage.clientHeight) / 2 + 100) : 600;
    const newX = Math.max(-maxBoundX, Math.min(maxBoundX, e.clientX - dragStartRef.current.x));
    const newY = Math.max(-maxBoundY, Math.min(maxBoundY, e.clientY - dragStartRef.current.y));
    applyTransform(currentScaleRef.current, newX, newY, false);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    isDraggingMouseRef.current = false;
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

            // Crisp elegant editorial white/ivory cardstock background
            const bgGrad = ctx.createLinearGradient(leftX, leftY, leftX + pW, leftY + pH);
            bgGrad.addColorStop(0, '#ffffff');
            bgGrad.addColorStop(0.6, '#f8fafc');
            bgGrad.addColorStop(1, '#f1f5f9');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(leftX, leftY, pW, pH);

            // Subtle brand radial glow (#00AEEF)
            const glowGrad = ctx.createRadialGradient(
              leftX + pW / 2, leftY + pH / 2, 5,
              leftX + pW / 2, leftY + pH / 2, pW * 0.7
            );
            glowGrad.addColorStop(0, 'rgba(0, 174, 239, 0.08)');
            glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(leftX, leftY, pW, pH);

            // Spine shadow overlay on the right edge
            const spineShadow = ctx.createLinearGradient(leftX + pW - 28, 0, leftX + pW, 0);
            spineShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
            spineShadow.addColorStop(1, 'rgba(0, 0, 0, 0.16)');
            ctx.fillStyle = spineShadow;
            ctx.fillRect(leftX + pW - 28, leftY, 28, pH);

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

              ctx.fillStyle = '#0f172a';
              ctx.font = `900 ${Math.max(16, Math.floor(pW * 0.085))}px sans-serif`;
              ctx.fillText("GRÁFICO", leftX + pW / 2, leftY + pH / 2 + 16);
            }

            // Footer editorial badge
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#94a3b8';
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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f8fafc] text-slate-800 gap-4">
        <div className="relative">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent shadow-xs" />
          <Sparkles className="h-6 w-6 text-[#00AEEF] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
          Abriendo revista digital...
        </p>
      </div>
    );
  }

  if (!flipbook) return null;

  return (
    <div className={`fixed inset-0 h-[100dvh] w-screen bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] flex flex-col text-slate-800 select-none overflow-hidden touch-none ${
      isFullscreen ? "z-50" : "z-30"
    }`}>
      
      {/* Ambient background lighting aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#00AEEF]/8 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-[#FFF200]/12 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header Controls (Light Editorial Modern) */}
      <header className="h-14 shrink-0 z-30 bg-white/80 backdrop-blur-xl px-4 flex items-center justify-between border-b border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <Link 
            to="/revista"
            className="flex h-9 items-center justify-center rounded-xl bg-slate-100 hover:bg-[#ED1C24] transition-all px-3 group gap-2 border border-slate-200/60"
            title="Cerrar Revista"
          >
            <X className="h-4 w-4 text-slate-600 group-hover:text-white transition-colors" />
            <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest text-slate-700 group-hover:text-white">
              Cerrar
            </span>
          </Link>

          <div className="hidden md:block max-w-sm lg:max-w-md">
            <h1 className="text-xs font-black tracking-tight uppercase truncate text-slate-900">
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
              className="h-6 md:h-7 max-w-[140px] object-contain drop-shadow-xs" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-[11px] font-black tracking-tighter uppercase text-[#00AEEF]">
              ZAPOTLÁN <span className="text-slate-900">GRÁFICO</span>
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
              className={`h-9 px-2.5 gap-1.5 rounded-xl transition-all border ${
                audioPlaying 
                  ? "bg-[#00AEEF] text-white border-[#00AEEF] shadow-xs shadow-[#00AEEF]/30" 
                  : "bg-slate-100/80 text-slate-700 hover:text-slate-900 hover:bg-slate-200/90 border-slate-200/70"
              }`}
              title={audioPlaying ? "Pausar música de fondo" : "Reproducir música de fondo"}
            >
              <Music className={`h-4 w-4 ${audioPlaying ? "animate-pulse text-white" : "text-slate-600"}`} />
              <span className="hidden sm:inline text-[9px] font-black uppercase tracking-wider">
                {audioPlaying ? "Música" : "Audio"}
              </span>
            </Button>
          )}

          {/* Sound Toggle (Flip effect) */}
          <Button
            variant="ghost"
            onClick={handleToggleSound}
            className={`h-9 w-9 p-0 rounded-xl transition-colors border ${
              !isMuted ? "bg-[#00AEEF]/10 text-[#00AEEF] border-[#00AEEF]/30" : "bg-slate-100/80 text-slate-600 hover:text-slate-900 border-slate-200/70"
            }`}
            title={isMuted ? "Activar sonido de hojeado" : "Silenciar sonido de hojeado"}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          {/* Share Button */}
          <Button
            variant="ghost"
            onClick={handleShareUrl}
            className="h-9 w-9 p-0 rounded-xl bg-slate-100/80 text-slate-600 hover:text-slate-900 hover:bg-slate-200/90 border border-slate-200/70"
            title="Compartir Edición"
          >
            <Share2 className="h-4 w-4" />
          </Button>

          {/* Fullscreen Button */}
          <Button
            variant="ghost"
            onClick={toggleFullscreen}
            className="h-9 w-9 p-0 rounded-xl bg-slate-100/80 text-slate-600 hover:text-slate-900 hover:bg-slate-200/90 border border-slate-200/70"
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
          cursor: displayZoom > 1.05 ? (isDraggingMouseRef.current ? 'grabbing' : 'grab') : 'default'
        }}
      >
        {/* Floating Zoom Indicator & Quick Reset on Mobile / Zoomed state */}
        {displayZoom > 1.05 && (
          <div className="absolute top-3 sm:top-4 z-30 flex items-center gap-2 bg-white/95 backdrop-blur-xl border border-slate-200 px-3.5 py-1.5 rounded-full shadow-lg shadow-slate-300/40">
            <span className="text-[11px] font-mono font-bold text-[#00AEEF]">
              🔍 {Math.round(displayZoom * 100)}%
            </span>
            <span className="text-slate-300 text-[10px]">•</span>
            <button
              onClick={handleResetZoom}
              className="text-[10px] font-black uppercase tracking-wider text-slate-700 hover:text-[#00AEEF] transition-colors cursor-pointer flex items-center gap-1 border-none bg-transparent"
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
            className="absolute left-2 sm:left-4 top-1/2 z-20 h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-white/95 text-slate-700 hover:text-[#00AEEF] hover:bg-white active:scale-95 transition-all backdrop-blur-xl border border-slate-200 flex shadow-xl shadow-slate-400/20 group cursor-pointer animate-nav-light-prev"
            title="Página Anterior"
          >
            <span className="absolute inset-0 rounded-full bg-slate-300/30 animate-ping opacity-30 pointer-events-none" />
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 animate-nudge-left text-slate-700 group-hover:text-[#00AEEF] drop-shadow-xs" />
          </button>
        )}

        {currentPage < totalPages - 1 && (
          <button 
            onClick={handleNext}
            className="absolute right-2 sm:right-4 top-1/2 z-20 h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-gradient-to-tr from-[#0092c7] to-[#00bfff] text-white active:scale-95 transition-all backdrop-blur-xl border border-white/60 flex shadow-xl shadow-[#00AEEF]/30 group cursor-pointer animate-nav-light-cyan"
            title="Página Siguiente"
          >
            <span className="absolute inset-0 rounded-full bg-[#00AEEF]/50 animate-ping opacity-40 pointer-events-none" />
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 animate-nudge-right text-white drop-shadow-xs" />
          </button>
        )}

        {/* Zoom & Pan Wrapper (Direct GPU Transform, zero React re-render freeze) */}
        <div 
          ref={zoomWrapperRef}
          style={{
            willChange: 'transform',
            transformOrigin: 'center center',
          }}
          className="relative w-full h-full flex items-center justify-center magazine-stage-glow-light select-none touch-none"
        >
          {/* Host element where PageFlip creates and manages pages */}
          <div 
            ref={bookHostRef} 
            className="w-full h-full flex items-center justify-center select-none"
            style={{
              pointerEvents: displayZoom > 1.05 ? 'none' : 'auto'
            }}
          />
        </div>

        {/* Bottom Thumbnails Drawer (Heyzine Shelf - Light Mode) */}
        <AnimatePresence>
          {showThumbnails && (
            <motion.div
              initial={{ opacity: 0, y: 120 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 120 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-x-0 bottom-14 sm:bottom-16 z-40 bg-white/95 backdrop-blur-2xl border-t border-slate-200/90 p-3 sm:p-4 flex flex-col gap-3 max-h-[200px] sm:max-h-[220px] rounded-t-3xl shadow-2xl text-slate-800"
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
                  className="text-slate-500 hover:text-slate-900 uppercase font-black text-[9px] tracking-wider cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Ocultar
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 px-2 scrollbar-thin scrollbar-thumb-slate-300 items-center">
                {flipbook.pageUrls.map((url, i) => {
                  const isActive = currentPage === i;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        goToPage(i);
                        setShowThumbnails(false);
                      }}
                      className={`relative w-20 shrink-0 aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                        isActive
                          ? "border-[#00AEEF] scale-105 shadow-lg shadow-[#00AEEF]/25"
                          : "border-slate-200/80 opacity-70 hover:opacity-100 hover:scale-102 hover:border-slate-300"
                      }`}
                    >
                      <img 
                        src={url} 
                        alt={`Miniatura Pág. ${i + 1}`} 
                        className="w-full h-full object-cover pointer-events-none" 
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex items-end justify-center p-1">
                        <span className="text-[9px] font-black font-mono text-white">
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

      {/* Mobile Compact Bottom Floating Navigation Dock (Light Mode) */}
      <div className="sm:hidden fixed bottom-3 inset-x-0 z-30 flex justify-center px-3 pointer-events-none pb-[env(safe-area-inset-bottom)]">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-full px-3 py-1.5 shadow-2xl shadow-slate-400/25 flex items-center gap-2">
          {/* Previous */}
          <button
            onClick={handlePrev}
            disabled={currentPage === 0}
            className="h-8.5 w-8.5 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-20 flex items-center justify-center text-slate-700 active:scale-90 transition-all cursor-pointer border border-slate-200/80 shadow-xs"
            title="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Page Counter Compact */}
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 font-mono px-1 select-none">
            {currentPage === 0 ? "Portada" : currentPage >= totalPages - 1 ? "Fin" : `${currentPage + 1}/${totalPages}`}
          </span>

          {/* Next */}
          <button
            onClick={handleNext}
            disabled={currentPage >= totalPages - 1}
            className="relative h-8.5 w-8.5 rounded-full bg-gradient-to-tr from-[#0092c7] to-[#00bfff] hover:brightness-105 disabled:opacity-20 flex items-center justify-center text-white shadow-md shadow-[#00AEEF]/40 active:scale-90 transition-all cursor-pointer border-none"
            title="Siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Mini separator */}
          <div className="h-4 w-px bg-slate-200 my-auto" />

          {/* Direct GPU Zoom Toggle on Mobile (No freeze, instant toggle) */}
          <button
            onClick={() => {
              if (currentScaleRef.current > 1.1) {
                handleResetZoom();
              } else {
                applyTransform(2.0, 0, 0, true);
                setDisplayZoom(2.0);
              }
            }}
            className={`h-8 w-8 rounded-full flex items-center justify-center active:scale-90 transition-all cursor-pointer border-none ${
              displayZoom > 1.05 
                ? "bg-[#FFF200] text-slate-950 font-bold shadow-md shadow-[#FFF200]/30" 
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            title={displayZoom > 1.05 ? "Restablecer Zoom" : "Acercar Zoom"}
          >
            {displayZoom > 1.05 ? <ZoomOut className="h-3.5 w-3.5" /> : <ZoomIn className="h-3.5 w-3.5" />}
          </button>

          {/* Thumbnails Toggle */}
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`h-8 w-8 rounded-full flex items-center justify-center active:scale-90 transition-all cursor-pointer border-none ${
              showThumbnails 
                ? "bg-[#00AEEF] text-white shadow-xs" 
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            title="Ver Páginas"
          >
            <Grid className="h-3.5 w-3.5" />
          </button>

          {/* AutoPlay Toggle */}
          <button
            onClick={() => setIsAutoPlayEnabled(!isAutoPlayEnabled)}
            className={`h-8 w-8 rounded-full flex items-center justify-center active:scale-90 transition-all cursor-pointer border-none ${
              isAutoPlayEnabled 
                ? "bg-[#FFF200] text-slate-950 shadow-xs" 
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
            title={isAutoPlayEnabled ? "Pausar" : "Auto"}
          >
            {isAutoPlayEnabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>

          {/* Background Audio Toggle (if configured) */}
          {flipbook.audioUrl && (
            <button
              onClick={handleToggleMusic}
              className={`h-8 w-8 rounded-full flex items-center justify-center active:scale-90 transition-all cursor-pointer border-none ${
                audioPlaying 
                  ? "bg-[#00AEEF] text-white animate-pulse" 
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              title={audioPlaying ? "Pausar Música" : "Reproducir Música"}
            >
              <Music className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Bottom Control Bar (Light Editorial Layout - Desktop/Tablet) */}
      <footer className="hidden sm:flex h-16 shrink-0 z-30 bg-white/85 backdrop-blur-xl px-3 sm:px-6 border-t border-slate-200/90 items-center justify-between text-slate-800 shadow-xs">
        
        {/* Left Controls: Thumbnails & Reset Zoom */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Thumbnails Drawer Toggle */}
          <Button
            variant="ghost"
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`h-10 px-3 rounded-xl gap-2 font-black text-[9px] uppercase tracking-wider transition-all border ${
              showThumbnails 
                ? "bg-[#00AEEF] text-white border-[#00AEEF]" 
                : "bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border-slate-200/80"
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
            className={`h-10 px-3 rounded-xl gap-2 font-black text-[9px] uppercase tracking-wider transition-all border ${
              isAutoPlayEnabled 
                ? "bg-[#FFF200] text-slate-950 hover:bg-[#FFF200]/90 border-[#FFF200] shadow-xs shadow-[#FFF200]/30" 
                : "bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border-slate-200/80"
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
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-20 text-slate-700 cursor-pointer transition-all border border-slate-200/70"
            title="Primera Página"
          >
            <ChevronFirst className="h-4 w-4" />
          </button>

          {/* Previous Page */}
          <button
            onClick={handlePrev}
            disabled={currentPage === 0}
            className="h-10 gap-1.5 px-3 sm:px-4 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-20 text-slate-700 font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer border border-slate-200/70"
            title="Página Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Atrás</span>
          </button>

          {/* Page Counter & Direct Scrubber Slider */}
          <div className="flex flex-col items-center justify-center px-2 sm:px-3 min-w-[120px] sm:min-w-[170px]">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-800 font-mono text-center">
              {getPageIndicatorText()}
            </span>
            {totalPages > 1 && (
              <input
                type="range"
                min={0}
                max={totalPages - 1}
                value={currentPage}
                onChange={(e) => goToPage(parseInt(e.target.value, 10))}
                className="w-full h-1.5 mt-1 accent-[#00AEEF] cursor-pointer bg-slate-200 rounded-lg"
                title="Deslizar para cambiar de página"
              />
            )}
          </div>

          {/* Next Page */}
          <button
            onClick={handleNext}
            disabled={currentPage >= totalPages - 1}
            className="h-10 gap-1.5 px-4 sm:px-5 rounded-xl bg-[#00AEEF] text-white hover:bg-[#00AEEF]/90 disabled:opacity-20 disabled:bg-slate-200 disabled:text-slate-400 font-black text-[10px] uppercase tracking-wider transition-all shadow-xs shadow-[#00AEEF]/20 flex items-center justify-center cursor-pointer border-none"
            title="Página Siguiente"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Last Page */}
          <button
            onClick={handleGoToLast}
            disabled={currentPage >= totalPages - 1}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-20 text-slate-700 cursor-pointer transition-all border border-slate-200/70"
            title="Última Página"
          >
            <ChevronLast className="h-4 w-4" />
          </button>
        </div>

        {/* Right Controls: Zoom Slider / In / Out */}
        <div className="flex items-center gap-1">
          <div className="hidden sm:flex items-center bg-slate-100 rounded-xl border border-slate-200/80 overflow-hidden">
            <Button
              variant="ghost"
              onClick={handleZoomOut}
              disabled={displayZoom <= 1.05}
              className="h-9 w-8 p-0 text-slate-600 hover:text-slate-900 disabled:opacity-20 hover:bg-slate-200 rounded-none border-none"
              title="Alejar Zoom"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <button
              onClick={handleResetZoom}
              className="px-2 h-9 text-[9px] font-bold text-slate-800 hover:text-[#00AEEF] font-mono bg-transparent cursor-pointer"
              title="Restablecer tamaño normal"
            >
              {Math.round(displayZoom * 100)}%
            </button>
            <Button
              variant="ghost"
              onClick={handleZoomIn}
              disabled={displayZoom >= 5.8}
              className="h-9 w-8 p-0 text-slate-600 hover:text-slate-900 disabled:opacity-20 hover:bg-slate-200 rounded-none border-none"
              title="Acercar Zoom"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          {displayZoom > 1.05 && (
            <Button
              variant="ghost"
              onClick={handleResetZoom}
              className="h-9 w-9 p-0 rounded-xl bg-[#FFF200] text-slate-950 hover:bg-[#FFF200]/80 shadow-xs"
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
