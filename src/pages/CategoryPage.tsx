import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { Article, Category } from '@/types';
import PublicLayout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { getSafeImageUrl, cn } from '@/lib/utils';
import { Play, Calendar, User, ChevronRight, Youtube, Video, X, ExternalLink, Loader2, Sparkles, Newspaper, Facebook } from 'lucide-react';
import { useSettings } from '@/lib/SettingsContext';
import { dataCache } from '@/lib/dataCache';
import { syncYouTubeVideosToArticles } from '@/lib/youtubeSync';
import Secciones from '@/components/Secciones';
import PromoAd from '@/components/PromoAd';

export default function CategoryPage() {
  const { settings } = useSettings();
  const { category: rawCategory } = useParams();
  const category = rawCategory ? decodeURIComponent(rawCategory) : '';

  const isArticleInCategory = (art: Article, targetCat: string) => {
    if (!targetCat) return false;
    const target = targetCat.trim().toLowerCase();
    
    if (Array.isArray(art.categories)) {
      return art.categories.some(c => typeof c === 'string' && c.trim().toLowerCase() === target);
    }
    
    if (typeof art.categories === 'string') {
      return (art.categories as string)
        .split(',')
        .map(c => c.trim().toLowerCase())
        .includes(target);
    }
    
    // Fallback to check legacy singular "category" field
    const legacyCat = (art as any).category;
    if (typeof legacyCat === 'string') {
      return legacyCat.trim().toLowerCase() === target;
    }
    
    return false;
  };
  
  // Find matching articles from local cache first for instant hydration!
  const cachedCategoryArticles = category ? dataCache.articles.filter(
    art => isArticleInCategory(art, category)
  ) : [];
  
  const [rawArticles, setRawArticles] = useState<Article[]>(cachedCategoryArticles);
  const [categoryMeta, setCategoryMeta] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState('Todas');
  const [loading, setLoading] = useState(cachedCategoryArticles.length === 0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // YouTube Channel States
  const [ytVideos, setYtVideos] = useState<any[]>([]);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);
  const [activeVideoSource, setActiveVideoSource] = useState<'youtube' | 'portal'>('youtube');
  const [selectedYtVideo, setSelectedYtVideo] = useState<any | null>(null);
  const [ytFilter, setYtFilter] = useState<'all' | 'streams' | 'videos'>('all');

  const isVideosCategory = category.trim().toLowerCase() === 'videos';
  const isFacebookCategory = category.trim().toLowerCase() === 'facebook';
  const [activeFacebookSource, setActiveFacebookSource] = useState<'live' | 'portal'>('live');

  const streamsCount = ytVideos.filter(v => v.isLiveStream).length;
  const regularCount = ytVideos.filter(v => !v.isLiveStream).length;
  const displayYtVideos = ytVideos.filter(v => {
    if (ytFilter === 'streams') return v.isLiveStream;
    if (ytFilter === 'videos') return !v.isLiveStream;
    return true;
  });

  const formatVideoPublished = (published?: string) => {
    if (!published) return 'Subido recientemente';
    // If it is already human-readable relative time (e.g. "80 vistas • hace 2 días")
    if (published.includes('hace') || published.includes('vistas') || published.includes('ago') || isNaN(Date.parse(published))) {
      return published;
    }
    try {
      const d = new Date(published);
      if (isNaN(d.getTime())) return published;
      return format(d, "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return published;
    }
  };

  // Load Category Metadata (e.g. subcategories)
  useEffect(() => {
    if (!category) return;
    const fetchCategoryMeta = async () => {
      try {
        const snap = await getDocs(collection(db, 'categories'));
        let found: Category | null = null;
        snap.forEach((doc) => {
          const data = doc.data() as Category;
          if (data.name.trim().toLowerCase() === category.trim().toLowerCase()) {
            found = { id: doc.id, ...data };
          }
        });
        setCategoryMeta(found);
      } catch (error) {
        console.error("Error fetching category meta:", error);
      }
    };
    fetchCategoryMeta();
    setSelectedSubcategory('Todas'); // Reset to default subcategory tab on parent change
    setCurrentPage(1);
  }, [category]);

  // Load Firebase Articles
  useEffect(() => {
    if (!category) return;
    setCurrentPage(1); // Reset page on category change
    
    const q = query(
      collection(db, 'articles'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
      
      // Update shared cache
      dataCache.articles = docs;
      dataCache.hasFetchedArticles = true;

      // Filter articles for category with our super robust matching
      const filtered = docs.filter(art => isArticleInCategory(art, category));

      setRawArticles(filtered);
      setLoading(false);
    }, (error) => {
      console.error("Error loaded articles on CategoryPage:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [category]);

  // Fetch YouTube Videos when category is 'Videos' and settings have youtubeUrl
  useEffect(() => {
    if (!isVideosCategory || !settings.youtubeUrl) {
      setYtVideos([]);
      return;
    }

    const fetchYT = async () => {
      setYtLoading(true);
      setYtError(null);
      try {
        const response = await fetch(`/api/youtube-channel-videos?url=${encodeURIComponent(settings.youtubeUrl || '')}`);
        const rawText = await response.text();
        
        let data: any = null;
        try {
          data = JSON.parse(rawText);
        } catch (parseErr) {
          console.error("Failed to parse YouTube API response as JSON:", rawText);
          throw new Error(`Respuesta inválida del servidor (formato no soportado). Contenido: ${rawText.slice(0, 150)}`);
        }

        if (!response.ok) {
          let errorMsg = "El portal no pudo sincronizar los videos en este momento.";
          if (data && data.error) {
            errorMsg = data.error === "Could not find a YouTube Channel ID for the provided URL."
              ? "No se pudo encontrar el identificador del canal de YouTube. Revisa que el enlace sea correcto."
              : data.error;
            if (data.details) {
              errorMsg += ` (${data.details})`;
            }
          }
          throw new Error(errorMsg);
        }
        
        if (data.error) {
          throw new Error(data.error);
        }
        setYtVideos(data.videos || []);

        // Trigger automatic sync to articles if enabled
        if (data.videos && data.videos.length > 0 && settings.autoSyncYouTube !== false && settings.youtubeUrl) {
          syncYouTubeVideosToArticles(settings.youtubeUrl).catch(() => {});
        }
      } catch (err: any) {
        console.error("Error loading YouTube channel videos:", err);
        setYtError(err.message || "No se pudieron conectar los videos de YouTube.");
      } finally {
        setYtLoading(false);
      }
    };

    fetchYT();
  }, [category, settings.youtubeUrl, isVideosCategory]);

  // Handle Tab Default for Videos section
  useEffect(() => {
    if (isVideosCategory && settings.youtubeUrl) {
      setActiveVideoSource('youtube');
    } else {
      setActiveVideoSource('portal');
    }
  }, [category, settings.youtubeUrl, isVideosCategory]);

  // Handle Tab Default for Facebook section
  useEffect(() => {
    if (isFacebookCategory) {
      setActiveFacebookSource('live');
    }
  }, [category, isFacebookCategory]);

  // Compute filtered articles based on subcategory tab filter
  const filteredArticles = rawArticles.filter(art => {
    if (selectedSubcategory === 'Todas') return true;
    return Array.isArray(art.subcategories) && 
           art.subcategories.some(s => s.trim().toLowerCase() === selectedSubcategory.toLowerCase());
  });

  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  const currentArticles = filteredArticles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Secciones Bar */}
        <Secciones currentCategory={category} />

        {/* Dynamic Facebook Source Toggle Selector */}
        {isFacebookCategory && (
          <div className="bg-slate-100 p-1 rounded-2xl flex max-w-md border border-slate-200/50">
            <button
              onClick={() => setActiveFacebookSource('live')}
              className={cn(
                "flex-1 py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                activeFacebookSource === 'live'
                  ? "bg-[#1877F2] text-white shadow-md shadow-[#1877F2]/20 scale-102"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Facebook className={cn("h-3.5 w-3.5", activeFacebookSource === 'live' ? "fill-white text-white" : "text-[#1877F2]")} />
              Muro en Vivo de Facebook
            </button>
            <button
              onClick={() => setActiveFacebookSource('portal')}
              className={cn(
                "flex-1 py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                activeFacebookSource === 'portal'
                  ? "bg-white text-slate-900 shadow-md scale-102 font-black"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Newspaper className="h-3.5 w-3.5 text-[#00AEEF]" />
              Notas del Portal ({filteredArticles.length})
            </button>
          </div>
        )}

        {/* Dynamic Videos Source Toggle Selector */}
        {isVideosCategory && settings.youtubeUrl && (
          <div className="bg-slate-100 p-1 rounded-2xl flex max-w-md border border-slate-200/50">
            <button
              onClick={() => setActiveVideoSource('youtube')}
              className={cn(
                "flex-1 py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                activeVideoSource === 'youtube'
                  ? "bg-white text-slate-900 shadow-md scale-102"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Youtube className="h-3.5 w-3.5 text-red-600 fill-red-600" />
              Canal de YouTube
            </button>
            <button
              onClick={() => setActiveVideoSource('portal')}
              className={cn(
                "flex-1 py-3 text-center rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                activeVideoSource === 'portal'
                  ? "bg-white text-slate-900 shadow-md scale-102"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Video className="h-3.5 w-3.5 text-[#00AEEF]" />
              Notas de Video Portal
            </button>
          </div>
        )}

        {/* Dynamic Subcategories Filtering Tabs (Only for standard portal source) */}
        {(!isVideosCategory || activeVideoSource === 'portal') && (!isFacebookCategory || activeFacebookSource === 'portal') && categoryMeta && categoryMeta.subcategories && categoryMeta.subcategories.length > 0 && (
          <div className="bg-slate-50 border border-slate-100/80 p-3 rounded-[2rem] flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">Subsecciones:</span>
            {['Todas', ...categoryMeta.subcategories].map((sub) => {
              const isActive = selectedSubcategory.toLowerCase() === sub.toLowerCase();
              return (
                <button
                  key={sub}
                  onClick={() => {
                    setSelectedSubcategory(sub);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer",
                    isActive
                      ? "bg-[#00AEEF] text-white shadow-md shadow-[#00AEEF]/20 scale-102"
                      : "bg-white border border-slate-100 text-slate-600 hover:bg-slate-100 hover:border-slate-200"
                  )}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        )}

        {/* Banner de Publicidad Interna */}
        <PromoAd type="horizontal" className="my-2" />

        {/* PRIMARY DISPLAY VIEWPORT (YouTube channel vs Facebook Live Feed vs Portal dynamic layout routing) */}
        {isVideosCategory && activeVideoSource === 'youtube' ? (
          // YouTube Channel Videos section rendering
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Canal Oficial de YouTube</h2>
              </div>

              {/* Sub-tabs for All, Streams, and Uploads */}
              {ytVideos.length > 0 && (
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto border border-slate-200/50">
                  <button
                    onClick={() => setYtFilter('all')}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      ytFilter === 'all'
                        ? "bg-white text-slate-900 shadow-sm font-bold"
                        : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Todos ({ytVideos.length})
                  </button>
                  {streamsCount > 0 && (
                    <button
                      onClick={() => setYtFilter('streams')}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                        ytFilter === 'streams'
                          ? "bg-red-600 text-white shadow-sm font-bold"
                          : "text-slate-500 hover:text-red-600"
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", ytFilter === 'streams' ? "bg-white animate-pulse" : "bg-red-600")} />
                      En vivo ({streamsCount})
                    </button>
                  )}
                  {regularCount > 0 && (
                    <button
                      onClick={() => setYtFilter('videos')}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                        ytFilter === 'videos'
                          ? "bg-white text-slate-900 shadow-sm font-bold"
                          : "text-slate-500 hover:text-slate-900"
                      )}
                    >
                      Videos subidos ({regularCount})
                    </button>
                  )}
                </div>
              )}
            </div>

            {ytLoading ? (
              <div className="flex flex-col items-center justify-center py-24 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 gap-3">
                <Loader2 className="h-8 w-8 text-red-600 animate-spin" />
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Sincronizando canal de YouTube...</p>
              </div>
            ) : ytError ? (
              <div className="py-16 text-center bg-red-50/50 border border-red-100 rounded-[2.5rem] p-8 space-y-4">
                <Youtube className="h-12 w-12 text-red-500 mx-auto" />
                <p className="text-sm font-bold text-red-950">Error al sincronizar canal: {ytError}</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Asegúrate de configurar un enlace de canal correcto en los ajustes (ej. <code className="bg-slate-100 p-1 rounded font-mono text-xs">https://www.youtube.com/@NombreCanal</code>).
                </p>
              </div>
            ) : displayYtVideos.length === 0 ? (
              <div className="py-20 text-center bg-slate-50 rounded-[2.5rem] p-8 space-y-4">
                <Youtube className="h-12 w-12 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-500">No se encontraron videos en esta vista.</p>
                <p className="text-xs text-slate-400">Prueba cambiando el filtro a "Todos".</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {displayYtVideos.map((video, idx) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 0.3) }}
                    className="group flex flex-col space-y-3 cursor-pointer"
                    onClick={() => setSelectedYtVideo(video)}
                  >
                    {/* Thumbnail video play trigger box */}
                    <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-900 shadow-sm border border-slate-100">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* Play overlay button */}
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <div className="h-14 w-14 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Play className="h-6 w-6 fill-white ml-0.5" />
                        </div>
                      </div>
                      
                      {video.isLiveStream ? (
                        <Badge className="absolute bottom-3 right-3 bg-red-600 text-white border-none text-[8px] font-black uppercase rounded px-2 flex items-center gap-1 shadow-md">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          En vivo
                        </Badge>
                      ) : (
                        <Badge className="absolute bottom-3 right-3 bg-black/75 backdrop-blur text-white border-none text-[8px] font-black uppercase rounded px-2">
                          Video
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1.5 px-1.5">
                      <h3 className="text-base font-black leading-tight text-slate-900 group-hover:text-red-600 transition-colors line-clamp-2">
                        {video.title}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-red-500" />
                        {formatVideoPublished(video.published)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : isFacebookCategory && activeFacebookSource === 'live' ? (
          // Facebook Live Timeline section rendering
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#1877F2] animate-pulse" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-600">
                  Publicaciones y Transmisiones en Tiempo Real
                </h2>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                <span>Sincronizado directamente desde Facebook Oficial (@zapotlan.grafico)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left/Center Main Column: The Facebook Page Timeline Plugin */}
              <div className="lg:col-span-7 xl:col-span-8 flex justify-center">
                <div className="w-full max-w-[500px] bg-white rounded-3xl border border-slate-200/80 shadow-sm p-2 sm:p-4 overflow-hidden flex flex-col items-center">
                  <iframe
                    src={`https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(
                      settings.facebookUrl || 'https://www.facebook.com/zapotlan.grafico'
                    )}&tabs=timeline&width=500&height=1200&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=false&lazy=true`}
                    width="100%"
                    height="1200"
                    style={{
                      border: 'none',
                      overflow: 'hidden',
                      minHeight: '850px',
                      maxWidth: '500px',
                      width: '100%',
                      borderRadius: '1rem',
                    }}
                    scrolling="yes"
                    frameBorder="0"
                    allowFullScreen={true}
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    title="Muro en Vivo de Facebook - Zapotlán Gráfico"
                  />
                </div>
              </div>

              {/* Right Column: Information, Direct Access & Portal highlights */}
              <div className="lg:col-span-5 xl:col-span-4 space-y-6">
                {/* Official Facebook Info Card */}
                <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-50/80 to-white border border-blue-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center shadow-md shadow-[#1877F2]/25 shrink-0">
                      <Facebook className="h-6 w-6 fill-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase text-slate-900 tracking-tight">
                        Zapotlán Gráfico
                      </h3>
                      <p className="text-[11px] font-bold text-[#1877F2]">
                        Página Oficial en Facebook
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    Sigue nuestra cobertura al instante. Todas las notas, transmisiones en vivo, avisos comunitarios y publicaciones que se suben a Facebook están disponibles aquí al momento.
                  </p>

                  <div className="space-y-2 pt-2">
                    <a
                      href={settings.facebookUrl || 'https://www.facebook.com/zapotlan.grafico'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-[#1877F2]/20"
                    >
                      <Facebook className="h-4 w-4 fill-white" />
                      Abrir en Facebook
                      <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </a>
                    <a
                      href="https://m.me/zapotlan.grafico"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      Enviar Mensaje por Messenger
                    </a>
                  </div>
                </div>

                {/* If there are articles in the portal for Facebook */}
                {filteredArticles.length > 0 && (
                  <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Notas Archivadas en Portal ({filteredArticles.length})
                      </h4>
                      <button
                        onClick={() => setActiveFacebookSource('portal')}
                        className="text-[10px] font-black uppercase tracking-wider text-[#00AEEF] hover:underline cursor-pointer"
                      >
                        Ver todas
                      </button>
                    </div>
                    <div className="space-y-3">
                      {filteredArticles.slice(0, 3).map((art) => (
                        <Link
                          key={art.id}
                          to={`/nota/${art.slug || art.id}`}
                          className="group flex gap-3 items-center p-2 rounded-2xl hover:bg-slate-50 transition-colors"
                        >
                          {art.imageUrl && (
                            <img
                              src={getSafeImageUrl(art.imageUrl)}
                              alt={art.title}
                              className="h-12 w-12 rounded-xl object-cover shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-slate-900 group-hover:text-[#1877F2] transition-colors line-clamp-2">
                              {art.title}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              {art.createdAt && typeof (art.createdAt as any).toDate === 'function'
                                ? format((art.createdAt as any).toDate(), "d 'de' MMMM", { locale: es })
                                : ''}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Internal Ad */}
                <PromoAd type="square" />
              </div>
            </div>
          </div>
        ) : (
          // Standard Portal display articles
          <>
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="grid gap-6 sm:gap-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
                  {currentArticles.map((article, index) => (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className="min-w-0 w-full"
                    >
                      <Link to={`/nota/${article.slug}`} className="group block space-y-4 sm:space-y-5 min-w-0 w-full">
                        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl sm:rounded-[2.5rem] bg-slate-100 shadow-sm border border-slate-100 w-full shrink-0">
                          <img
                            src={getSafeImageUrl(article.imageUrl)}
                            alt={article.title}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          {article.videoUrl && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20">
                              <div className="h-12 w-12 rounded-full bg-[#FFF200] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                <Play className="h-6 w-6 text-slate-900 fill-slate-900 ml-1" />
                              </div>
                            </div>
                          )}
                          <div className="absolute top-4 left-4">
                            <Badge className="bg-white/90 backdrop-blur-md text-slate-900 border-none text-[8px] font-black uppercase tracking-widest px-3 shadow-sm">
                              {category}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2 sm:space-y-3 px-1 sm:px-2 min-w-0">
                          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 min-w-0 flex-wrap">
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Calendar className="h-3.5 w-3.5 text-[#ED1C24]" />
                              {format(article.createdAt.toDate(), "d MMM, yyyy", { locale: es })}
                            </div>
                            {settings.showAuthor !== false && article.author && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1.5 min-w-0 truncate max-w-[140px]">
                                  <User className="h-3.5 w-3.5 text-[#00AEEF] shrink-0" />
                                  <span className="truncate">{article.author}</span>
                                </div>
                              </>
                            )}
                          </div>
                          <h3 className="text-xl sm:text-2xl font-black leading-tight tracking-tight group-hover:text-[#00AEEF] transition-colors line-clamp-2 break-words [overflow-wrap:anywhere]">
                            {article.title}
                          </h3>
                          <p className="text-sm font-medium text-slate-500 line-clamp-2 leading-relaxed break-words [overflow-wrap:anywhere]">
                            {article.summary}
                          </p>
                          <div className="pt-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#ED1C24] opacity-0 group-hover:opacity-100 transition-opacity">
                            Leer más <ChevronRight className="h-3 w-3" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 pt-8 border-t border-slate-100">
                    <Button
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => {
                        setCurrentPage(prev => Math.max(1, prev - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="rounded-full border-slate-200 font-black text-[10px] uppercase tracking-widest px-8"
                    >
                      Anterior
                    </Button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={cn(
                            "h-10 w-10 rounded-full text-xs font-black transition-all",
                            currentPage === page 
                              ? "bg-[#00AEEF] text-white shadow-lg shadow-[#00AEEF]/20" 
                              : "text-slate-400 hover:bg-slate-100"
                          )}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      disabled={currentPage === totalPages}
                      onClick={() => {
                        setCurrentPage(prev => Math.min(totalPages, prev + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="rounded-full border-slate-200 font-black text-[10px] uppercase tracking-widest px-8"
                    >
                      Siguiente
                    </Button>
                  </div>
                )}
              </div>
            )}

            {rawArticles.length === 0 && !loading && (
              isFacebookCategory ? (
                <div className="flex h-96 flex-col items-center justify-center rounded-[3rem] bg-blue-50/40 border-2 border-dashed border-blue-200/60 text-slate-400 space-y-4 p-6">
                  <div className="h-20 w-20 rounded-3xl bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2]">
                    <Facebook className="h-10 w-10 fill-[#1877F2]" />
                  </div>
                  <div className="text-center max-w-md">
                    <p className="text-base font-black uppercase tracking-wider text-slate-800">
                      Todas las publicaciones están en el Muro en Vivo
                    </p>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Las publicaciones oficiales de Facebook se visualizan al momento y en tiempo real en la pestaña "Muro en Vivo de Facebook".
                    </p>
                  </div>
                  <Button
                    onClick={() => setActiveFacebookSource('live')}
                    className="rounded-full bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-black uppercase text-xs tracking-wider px-6 shadow-md shadow-[#1877F2]/20 cursor-pointer"
                  >
                    <Facebook className="h-4 w-4 mr-2 fill-white" />
                    Ir al Muro en Vivo de Facebook
                  </Button>
                </div>
              ) : (
                <div className="flex h-96 flex-col items-center justify-center rounded-[3rem] bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400 space-y-4">
                  <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center">
                    <Play className="h-10 w-10 opacity-20" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black uppercase tracking-tighter text-slate-900">Sin contenido</p>
                    <p className="text-sm font-medium">No hay videos ni notas en esta sección del portal aún.</p>
                  </div>
                  <Link to="/">
                    <Button variant="outline" className="rounded-full border-slate-200 font-black text-[10px] uppercase tracking-widest">
                      Volver al inicio
                    </Button>
                  </Link>
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* STUNNING ACTIVE VIDEO PLAYER DIALOG MODAL / LIGHTBOX */}
      <AnimatePresence>
        {selectedYtVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop layer */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedYtVideo(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal wrapper */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-4xl bg-slate-900 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl z-10"
            >
              <div className="absolute top-4 right-4 z-20">
                <button
                  onClick={() => setSelectedYtVideo(null)}
                  className="h-10 w-10 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* YouTube Responsive Video Container */}
              <div className="aspect-video w-full bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedYtVideo.id}?autoplay=1&rel=0`}
                  title={selectedYtVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-none"
                />
              </div>

              {/* Video metadata underlay */}
              <div className="p-6 md:p-8 space-y-4 text-white">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Badge className={selectedYtVideo.isLiveStream ? "bg-red-600 text-white border-none text-[8px] font-black uppercase tracking-wider rounded px-2.5 flex items-center gap-1" : "bg-slate-800 text-slate-300 border-none text-[8px] font-black uppercase tracking-wider rounded px-2.5"}>
                      {selectedYtVideo.isLiveStream && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                      {selectedYtVideo.isLiveStream ? "Transmisión en vivo" : "Video del Canal"}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      YouTube Oficial
                    </span>
                  </div>

                  {(() => {
                    const matchingArticle = rawArticles.find(a => 
                      a.youtubeVideoId === selectedYtVideo.id || 
                      a.videoUrl?.includes(selectedYtVideo.id)
                    );
                    if (!matchingArticle) return null;
                    return (
                      <Link to={`/nota/${matchingArticle.slug}`} onClick={() => setSelectedYtVideo(null)}>
                        <Button size="sm" className="rounded-full bg-[#00AEEF] hover:bg-[#00AEEF]/90 text-white font-black text-[10px] uppercase tracking-wider px-4 shadow-md">
                          <Newspaper className="mr-1.5 h-3.5 w-3.5" /> Ver Artículo Completo
                        </Button>
                      </Link>
                    );
                  })()}
                </div>

                <h2 className="text-lg md:text-2xl font-black uppercase tracking-tight leading-snug">
                  {selectedYtVideo.title}
                </h2>
                <div className="flex items-center gap-2.5 pt-2 border-t border-white/5 text-[10px] text-slate-400 font-black uppercase tracking-widest/10">
                  <Calendar className="h-3.5 w-3.5 text-red-500" />
                  <span>Subido {formatVideoPublished(selectedYtVideo.published)}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PublicLayout>
  );
}
