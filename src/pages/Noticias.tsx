import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import PromoAd from '@/components/PromoAd';

export default function Noticias() {
  const { settings } = useSettings();
  const [articles, setArticles] = useState<Article[]>(dataCache.articles);
  const [loading, setLoading] = useState(!dataCache.hasFetchedArticles);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParam = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Sync searchQuery with URL dynamic params
  useEffect(() => {
    setSearchQuery(searchParam);
  }, [searchParam]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value) {
      setSearchParams({ search: value }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

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
      const isFbArt = Array.isArray(art.categories) 
        ? art.categories.some(c => c.trim().toLowerCase() === 'facebook')
        : typeof art.categories === 'string' && (art.categories as string).toLowerCase().includes('facebook');

      // Exclude Facebook articles when browsing all news, only show when Facebook category is explicitly selected
      if (selectedCategory === 'Todos' && isFbArt) {
        return false;
      }

      // 1. Search filter
      const matchesSearch = searchQuery.trim() === '' || 
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Array.isArray(art.tags) && art.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

      // 2. Category filter
      const matchesCategory = selectedCategory === 'Todos' || 
        (Array.isArray(art.categories) && art.categories.some(c => c.toLowerCase() === selectedCategory.toLowerCase()));

      // 3. Tag (hashtag) filter
      const matchesTag = !selectedTag || 
        (Array.isArray(art.tags) && art.tags.some(t => t.trim() === selectedTag));

      return matchesSearch && matchesCategory && matchesTag;
    });
  }, [articles, searchQuery, selectedCategory, selectedTag]);

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* Secciones Grid */}
        <Secciones />
        
        {/* Buscador de Noticias */}
        <div className="relative max-w-2xl mx-auto w-full">
          <div className="relative flex items-center shadow-sm rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 focus-within:border-[#00AEEF] focus-within:ring-2 focus-within:ring-[#00AEEF]/20 transition-all">
            <Search className="absolute left-4 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => {
                handleSearchChange(e.target.value);
                setSelectedTag(null); // Clear hashtag filtering if typing manually
              }}
              placeholder="Buscar noticias por palabras clave, título o tema..."
              className="w-full h-14 pl-12 pr-24 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none font-medium text-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 uppercase text-[9px] font-black tracking-widest bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                Limpiar
              </button>
            )}
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

        {/* Banner de Publicidad Interna */}
        <PromoAd type="horizontal" className="my-2" />

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
                    handleSearchChange('');
                  }}
                  className="text-[10px] font-extrabold uppercase tracking-widest text-[#ED1C24] hover:underline"
                >
                  Restablecer
                </button>
              )}
            </div>

            <div className="grid gap-6 sm:gap-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
              <AnimatePresence mode="popLayout">
                {filteredArticles.map((article, index) => (
                  <motion.div
                    key={article.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
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
                        <div className="absolute top-4 left-4 flex gap-1 items-center flex-wrap">
                          {article.categories?.map((c, i) => (
                            <Badge key={i} className="bg-white/95 backdrop-blur-md text-slate-900 border-none text-[8px] font-black uppercase tracking-widest px-3 shadow-sm">
                              {c}
                            </Badge>
                          ))}
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
                handleSearchChange('');
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
