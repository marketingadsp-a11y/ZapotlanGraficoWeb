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
import { Play, Calendar, User, ChevronRight, Youtube, Video, X, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { useSettings } from '@/lib/SettingsContext';
import { dataCache } from '@/lib/dataCache';
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

  const isVideosCategory = category.trim().toLowerCase() === 'videos';

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
        const contentType = response.headers.get("content-type") || "";
        
        if (!response.ok) {
          let errorMsg = "El portal no pudo sincronizar los videos en este momento.";
          if (contentType.includes("application/json")) {
            try {
              const errData = await response.json();
              if (errData && errData.error) {
                errorMsg = errData.error === "Could not find a YouTube Channel ID for the provided URL."
                  ? "No se pudo encontrar el identificador del canal de YouTube. Revisa que el enlace sea correcto."
                  : errData.error;
                if (errData.details) {
                  errorMsg += ` (${errData.details})`;
                }
              }
            } catch (e) {
              // Ignore decoding error
            }
          } else {
            console.error("Non-JSON error response from API:", await response.text());
          }
          throw new Error(errorMsg);
        }

        if (!contentType.includes("application/json")) {
          throw new Error("Respuesta inválida del servidor (formato no soportado).");
        }
        
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setYtVideos(data.videos || []);
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

        {/* Header */}
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-6 lg:p-10 text-white shadow-lg">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-44 w-44 rounded-full bg-[#00AEEF]/25 blur-2xl" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 h-44 w-44 rounded-full bg-[#ED1C24]/20 blur-2xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-6 bg-[#FFF200] rounded-full" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFF200]">Sección</p>
              </div>
              <h1 className="text-3xl lg:text-5xl font-black tracking-tighter uppercase">{category}</h1>
              <p className="text-xs text-slate-400 font-medium max-w-xl">
                {isVideosCategory && settings.youtubeUrl
                  ? "Disfruta de la programación en video de nuestro canal y reportajes especiales de la región."
                  : `Últimas noticias y reportajes exclusivos de la sección de ${category} en la región.`}
              </p>
            </div>

            {/* Embed Subscribe stats/badge if Youtube is configured */}
            {isVideosCategory && settings.youtubeUrl && (
              <a 
                href={settings.youtubeUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="bg-red-600 hover:bg-red-700 text-white text-[10px] uppercase font-black tracking-widest px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-red-600/20 active:scale-95 transition-all self-start md:self-auto cursor-pointer"
              >
                <Youtube className="h-4 w-4 fill-white shrink-0" />
                Suscribirse al canal
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

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
        {(!isVideosCategory || activeVideoSource === 'portal') && categoryMeta && categoryMeta.subcategories && categoryMeta.subcategories.length > 0 && (
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

        {/* PRIMARY DISPLAY VIEWPORT (YouTube channel vs Portal dynamic layout routing) */}
        {isVideosCategory && activeVideoSource === 'youtube' ? (
          // YouTube Channel Videos section rendering
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Videos en Vivo del Canal</h2>
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
            ) : ytVideos.length === 0 ? (
              <div className="py-20 text-center bg-slate-50 rounded-[2.5rem] p-8 space-y-4">
                <Youtube className="h-12 w-12 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-500">No se encontraron videos activos en este canal.</p>
                <p className="text-xs text-slate-400">Comprueba si el canal de YouTube contiene publicaciones recientes.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {ytVideos.map((video, idx) => (
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
                      
                      <Badge className="absolute bottom-3 right-3 bg-black/75 backdrop-blur border-none text-[8px] font-black uppercase rounded px-2">
                        Canal oficial
                      </Badge>
                    </div>

                    <div className="space-y-1.5 px-1.5">
                      <h3 className="text-base font-black leading-tight text-slate-900 group-hover:text-red-600 transition-colors line-clamp-2">
                        {video.title}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-red-500" />
                        {video.published ? format(new Date(video.published), "d 'de' MMMM, yyyy", { locale: es }) : 'Subido recientemente'}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
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
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                  {currentArticles.map((article, index) => (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                    >
                      <Link to={`/nota/${article.slug}`} className="group block space-y-5">
                        <div className="relative aspect-[16/10] overflow-hidden rounded-[2.5rem] bg-slate-100 shadow-sm border border-slate-100">
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
                            <Badge className="bg-white/90 backdrop-blur-md text-slate-900 border-none text-[8px] font-black uppercase tracking-widest px-3">
                              {category}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-3 px-2">
                          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 text-[#ED1C24]" />
                              {format(article.createdAt.toDate(), "d MMM, yyyy", { locale: es })}
                            </div>
                            {settings.showAuthor !== false && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3 w-3 text-[#00AEEF]" />
                                  {article.author}
                                </div>
                              </>
                            )}
                          </div>
                          <h3 className="text-2xl font-black leading-tight tracking-tight group-hover:text-[#00AEEF] transition-colors line-clamp-2">
                            {article.title}
                          </h3>
                          <p className="text-sm font-medium text-slate-500 line-clamp-2">
                            {article.summary}
                          </p>
                          <div className="pt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#ED1C24] opacity-0 group-hover:opacity-100 transition-opacity">
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
              <div className="p-6 md:p-8 space-y-3 text-white">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-600 text-white border-none text-[8px] font-black uppercase tracking-wider rounded px-2.5">
                    Live Feed
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    YouTube
                  </span>
                </div>
                <h2 className="text-lg md:text-2xl font-black uppercase tracking-tight leading-snug">
                  {selectedYtVideo.title}
                </h2>
                <div className="flex items-center gap-2.5 pt-2 border-t border-white/5 text-[10px] text-slate-400 font-black uppercase tracking-widest/10">
                  <Calendar className="h-3.5 w-3.5 text-red-500" />
                  <span>Subido el {selectedYtVideo.published ? format(new Date(selectedYtVideo.published), "d 'de' MMMM, yyyy", { locale: es }) : 'Recientemente'}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PublicLayout>
  );
}
