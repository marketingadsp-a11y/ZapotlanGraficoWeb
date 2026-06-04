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
import { motion } from 'motion/react';
import { getSafeImageUrl, cn } from '@/lib/utils';
import { Play, Calendar, User, ChevronRight } from 'lucide-react';
import { useSettings } from '@/lib/SettingsContext';
import { dataCache } from '@/lib/dataCache';

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
      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* Header */}
        <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 p-12 lg:p-20 text-white">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-64 w-64 rounded-full bg-[#00AEEF]/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-[#ED1C24]/20 blur-3xl" />
          
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-1 w-8 bg-[#FFF200] rounded-full" />
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#FFF200]">Explorar Categoría</p>
            </div>
            <h1 className="text-5xl lg:text-8xl font-black tracking-tighter uppercase">{category}</h1>
            <p className="text-slate-400 font-medium max-w-xl">
              Mantente al día con las últimas noticias y reportajes exclusivos de la sección de {category} en la región.
            </p>
          </div>
        </div>

        {/* Dynamic Subcategories Filtering Tabs */}
        {categoryMeta && categoryMeta.subcategories && categoryMeta.subcategories.length > 0 && (
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
              <Calendar className="h-10 w-10 opacity-20" />
            </div>
            <div className="text-center">
              <p className="text-xl font-black uppercase tracking-tighter text-slate-900">Sin contenido</p>
              <p className="text-sm font-medium">No hay noticias en esta categoría aún.</p>
            </div>
            <Link to="/">
              <Button variant="outline" className="rounded-full border-slate-200 font-black text-[10px] uppercase tracking-widest">
                Volver al inicio
              </Button>
            </Link>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

