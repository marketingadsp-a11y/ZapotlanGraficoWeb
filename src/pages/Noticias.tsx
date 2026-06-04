import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { Article } from '@/types';
import PublicLayout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { getSafeImageUrl } from '@/lib/utils';
import { Search, Play, Calendar, User, Hash, Grid, Filter } from 'lucide-react';
import { useSettings } from '@/lib/SettingsContext';
import { dataCache } from '@/lib/dataCache';
import Secciones from '@/components/Secciones';

export default function Noticias() {
  const { settings } = useSettings();
  const [articles, setArticles] = useState<Article[]>(dataCache.articles);
  const [loading, setLoading] = useState(!dataCache.hasFetchedArticles);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'articles'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
      dataCache.articles = docs;
      dataCache.hasFetchedArticles = true;
      setArticles(docs);
      setLoading(false);
    }, (err) => {
      console.error("Error loaded all articles:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Compute all unique categories dynamically from database articles
  const categoriesList = React.useMemo(() => {
    const cats = new Set<string>();
    // Default static categories to guarantee presence
    ['Local', 'General', 'Deportes', 'Cultura', 'Policiaca'].forEach(c => cats.add(c));
    articles.forEach(art => {
      if (art.categories && Array.isArray(art.categories)) {
        art.categories.forEach(c => {
          if (c) cats.add(c);
        });
      }
    });
    return ['Todos', ...Array.from(cats)];
  }, [articles]);

  // Compute all unique tags (hashtags) dynamically
  const tagsList = React.useMemo(() => {
    const hashtags = new Set<string>();
    articles.forEach(art => {
      if (art.tags && Array.isArray(art.tags)) {
        art.tags.forEach(t => {
          if (t) hashtags.add(t.trim());
        });
      }
    });
    return Array.from(hashtags).slice(0, 15); // Show top 15 tags
  }, [articles]);

  // Combined Search and Filter Logic
  const filteredArticles = React.useMemo(() => {
    return articles.filter(art => {
      // 1. Search filter
      const matchesSearch = searchQuery.trim() === '' || 
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Array.isArray(art.tags) && art.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

      // 2. Category filter
      const matchesCategory = selectedCategory === 'Todos' || 
        (Array.isArray(art.categories) && art.categories.includes(selectedCategory));

      // 3. Tag (hashtag) filter
      const matchesTag = !selectedTag || 
        (Array.isArray(art.tags) && art.tags.some(t => t.trim() === selectedTag));

      return matchesSearch && matchesCategory && matchesTag;
    });
  }, [articles, searchQuery, selectedCategory, selectedTag]);

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Secciones Grid */}
        <Secciones />
        
        {/* Modern Header Section */}
        <div className="relative overflow-hidden rounded-[3.5rem] bg-slate-900 p-12 lg:p-20 text-white shadow-xl shadow-slate-950/10">
          {/* Neon auras */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-80 w-80 rounded-full bg-[#00AEEF]/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-[#ED1C24]/20 blur-3xl pointer-events-none" />

          <div className="relative max-w-3xl space-y-6">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFF200] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FFF200]"></span>
              </span>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#FFF200]">Periodismo al Instante</p>
            </div>
            <h1 className="text-4xl lg:text-7xl font-black tracking-tighter uppercase leading-none">
              Todas las <span className="text-[#00AEEF]">noticias</span>
            </h1>
            <p className="text-slate-400 font-medium text-sm lg:text-base leading-relaxed">
              Encuentra cada nota publicada en {settings.siteName || 'Zapotlán Gráfico'}, filtrado en tiempo real con nuestra barra inteligente de búsqueda por contenido, categorías o hashtags.
            </p>

            {/* Top Search inputs combo wrapper */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedTag(null); // Clear hashtag filtering if typing manually
                  }}
                  placeholder="Escribe palabras clave, título o hashtags de la nota..."
                  className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:bg-white focus:text-slate-900 focus:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] transition-all font-bold text-xs"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white uppercase text-[9px] font-black tracking-widest bg-white/10 px-2 py-1 rounded"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Categories Navigation & Hashtags Hub */}
        <div className="space-y-6">
          {/* Categories Pill Bar */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2 px-2">
              <Grid className="h-4 w-4 text-[#00AEEF]" />
              <span>Filtrar por Categoría</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedTag(null); // Clear tag filter
                  }}
                  className={`px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                    selectedCategory === cat
                      ? "bg-slate-900 text-white shadow-lg"
                      : "bg-white border border-slate-100 text-slate-500 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Hashtags cloud section */}
          {tagsList.length > 0 && (
            <div className="space-y-2 bg-slate-50 p-4 rounded-3xl border border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2 px-1">
                <Hash className="h-4 w-4 text-[#ED1C24]" />
                <span>Temas Populares (Hashtags)</span>
              </h3>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tagsList.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTag(selectedTag === tag ? null : tag);
                      setSelectedCategory('Todos'); // Reset category
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                      selectedTag === tag
                        ? "bg-[#ED1C24] text-white shadow-sm"
                        : "bg-white text-slate-600 hover:text-[#ED1C24] border border-slate-200/60"
                    }`}
                  >
                    <span>#{tag}</span>
                  </button>
                ))}
                {selectedTag && (
                  <button 
                    onClick={() => setSelectedTag(null)}
                    className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 bg-slate-200 px-3 py-1.5 rounded-xl"
                  >
                    Ver Todos
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Loading / Results Frame */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent"></div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-2">Buscando notas...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <Filter className="h-4 w-4 text-slate-400" />
                <span>Se encontraron {filteredArticles.length} artículos</span>
                {(selectedCategory !== 'Todos' || searchQuery || selectedTag) && (
                  <span className="text-xs bg-[#00AEEF]/10 text-[#00AEEF] px-2.5 py-0.5 rounded-full font-bold">Filtrado</span>
                )}
              </div>
              {(selectedCategory !== 'Todos' || searchQuery || selectedTag) && (
                <button 
                  onClick={() => {
                    setSelectedCategory('Todos');
                    setSelectedTag(null);
                    setSearchQuery('');
                  }}
                  className="text-[10px] font-extrabold uppercase tracking-widest text-[#ED1C24] hover:underline"
                >
                  Restablecer
                </button>
              )}
            </div>

            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filteredArticles.map((article, index) => (
                  <motion.div
                    key={article.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
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
                        <div className="absolute top-4 left-4 flex gap-1 items-center">
                          {article.categories?.map((c, i) => (
                            <Badge key={i} className="bg-white/95 backdrop-blur-md text-slate-900 border-none text-[8px] font-black uppercase tracking-widest px-3">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-3 px-2">
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-[#ED1C24]" />
                            {format(article.createdAt.toDate(), "d MMM, yyyy", { locale: es })}
                          </div>
                          {settings.showAuthor !== false && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-[#00AEEF]" />
                                {article.author}
                              </div>
                            </>
                          )}
                        </div>
                        
                        <h3 className="text-2xl font-black leading-tight tracking-tight group-hover:text-[#00AEEF] transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                        
                        <p className="text-sm font-medium text-slate-500 line-clamp-2 leading-relaxed">
                          {article.summary}
                        </p>
                        
                        {/* Tags display list */}
                        {article.tags && article.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {article.tags.map((t, i) => (
                              <span key={i} className="text-[10px] font-semibold text-slate-400">
                                #{t.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {filteredArticles.length === 0 && !loading && (
          <div className="flex h-96 flex-col items-center justify-center rounded-[3rem] bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400 space-y-4">
            <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center">
              <Search className="h-10 w-10 opacity-20" />
            </div>
            <div className="text-center">
              <p className="text-xl font-black uppercase tracking-tighter text-slate-900">Sin coincidencias</p>
              <p className="text-sm font-medium">No encontramos noticias con el buscador o filtros actuales.</p>
            </div>
            <button
              onClick={() => {
                setSelectedCategory('Todos');
                setSelectedTag(null);
                setSearchQuery('');
              }}
              className="px-6 py-3 rounded-full bg-[#00AEEF] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[#00AEEF]/80 transition-all shadow-sm"
            >
              Ver todas las noticias
            </button>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
