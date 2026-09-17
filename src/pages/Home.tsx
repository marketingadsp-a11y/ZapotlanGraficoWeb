import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { Article } from '@/types';
import PublicLayout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'motion/react';
import { getSafeImageUrl } from '@/lib/utils';
import { Play, TrendingUp, Clock, ChevronRight, Newspaper } from 'lucide-react';
import { useSettings } from '@/lib/SettingsContext';
import { dataCache } from '@/lib/dataCache';
import Secciones from '@/components/Secciones';
import PromoAd from '@/components/PromoAd';

export default function Home() {
  const { settings } = useSettings();
  const [articles, setArticles] = useState<Article[]>(dataCache.articles);
  const [loading, setLoading] = useState(!dataCache.hasFetchedArticles);

  useEffect(() => {
    const q = query(
      collection(db, 'articles'),
      orderBy('createdAt', 'desc'),
      limit(24)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
      dataCache.articles = docs;
      dataCache.hasFetchedArticles = true;
      setArticles(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Exclude Facebook articles so they only appear in their dedicated section as requested
  const portalArticles = articles.filter(art => {
    if (!art.categories) return true;
    if (Array.isArray(art.categories)) {
      return !art.categories.some(c => c.trim().toLowerCase() === 'facebook');
    }
    if (typeof art.categories === 'string') {
      return !(art.categories as string).toLowerCase().includes('facebook');
    }
    return true;
  });

  const featured = portalArticles[0];
  const secondary = portalArticles.slice(1, 4);
  const recent = portalArticles.slice(4, 16);

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent"></div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-12 sm:space-y-16 w-full max-w-7xl min-w-0">
        {/* Secciones Grid */}
        <Secciones />

        {/* Hero Section */}
        <section className="grid gap-6 lg:grid-cols-12 min-w-0 w-full">
          {featured && (
            <motion.div 
              className="lg:col-span-8 group relative overflow-hidden rounded-[2rem] bg-slate-900 aspect-[16/10] lg:aspect-auto lg:h-[600px] w-full min-w-0"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <img
                src={getSafeImageUrl(featured.imageUrl)}
                alt={featured.title}
                className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 lg:p-12 space-y-3 sm:space-y-4 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className="bg-[#ED1C24] text-white border-none px-3.5 py-1 text-[10px] font-black uppercase tracking-widest">
                    {featured.categories?.[0] || 'Destacado'}
                  </Badge>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {format(featured.createdAt.toDate(), "d MMM", { locale: es })}
                  </span>
                </div>
                <Link to={`/nota/${featured.slug}`} className="block min-w-0">
                  <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tighter hover:text-[#FFF200] transition-colors break-words [overflow-wrap:anywhere]">
                    {featured.title}
                  </h1>
                </Link>
                <p className="text-slate-300 text-xs sm:text-sm lg:text-lg line-clamp-2 max-w-2xl font-medium break-words [overflow-wrap:anywhere]">
                  {featured.summary}
                </p>
              </div>
            </motion.div>
          )}

          <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6 min-w-0 w-full">
            {secondary.map((article, i) => (
              <motion.div 
                key={article.id}
                className="flex-1 group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white border border-slate-100 p-3.5 sm:p-4 flex gap-3 sm:gap-4 hover:shadow-xl transition-all min-w-0 w-full"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-xl sm:rounded-2xl bg-slate-100">
                  <img
                    src={getSafeImageUrl(article.imageUrl)}
                    alt={article.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex flex-col justify-center space-y-1 min-w-0 flex-1">
                  <Badge variant="outline" className="w-fit text-[8px] font-black uppercase tracking-widest border-slate-100 text-[#00AEEF]">
                    {article.categories?.[0] || 'General'}
                  </Badge>
                  <Link to={`/nota/${article.slug}`} className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-black leading-tight line-clamp-2 group-hover:text-[#ED1C24] transition-colors break-words [overflow-wrap:anywhere]">
                      {article.title}
                    </h3>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Banner de Publicidad Interna */}
        <PromoAd type="horizontal" className="my-2" />

        {/* Latest News Grid */}
        <section className="space-y-6 sm:space-y-8 w-full min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="h-6 sm:h-8 w-1.5 bg-[#ED1C24] rounded-full shrink-0" />
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter truncate">
                Últimas Noticias
              </h2>
            </div>
            <Link to="/categoria/General" className="group flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-[#00AEEF] shrink-0">
              <span>Ver todas</span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid gap-5 sm:gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full min-w-0">
            {recent.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.05, 0.3) }}
                className="min-w-0 w-full flex flex-col"
              >
                <Link
                  to={`/nota/${article.slug}`}
                  className="group flex flex-col h-full bg-white rounded-3xl border border-slate-100/90 p-3.5 sm:p-4 shadow-sm hover:shadow-xl transition-all duration-300 min-w-0 w-full overflow-hidden"
                >
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100 shadow-sm w-full shrink-0">
                    <img
                      src={getSafeImageUrl(article.imageUrl)}
                      alt={article.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {article.videoUrl && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-[#FFF200] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="h-5 w-5 sm:h-6 sm:w-6 text-slate-900 fill-slate-900 ml-0.5" />
                        </div>
                      </div>
                    )}
                    <Badge className="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-slate-900 border-none text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 shadow-sm">
                      {article.categories?.[0] || 'General'}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-between pt-3 space-y-2 min-w-0 w-full">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 min-w-0 flex-wrap">
                        {settings.showAuthor !== false && article.author && (
                          <>
                            <span className="truncate max-w-[130px]">{article.author}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>{format(article.createdAt.toDate(), "d MMM", { locale: es })}</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black leading-snug tracking-tight text-slate-900 group-hover:text-[#00AEEF] transition-colors line-clamp-2 break-words [overflow-wrap:anywhere]">
                        {article.title}
                      </h3>
                      <p className="text-xs sm:text-sm font-medium text-slate-500 line-clamp-2 break-words [overflow-wrap:anywhere] leading-relaxed">
                        {article.summary}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center text-[10px] font-black uppercase tracking-widest text-[#00AEEF] group-hover:text-[#ED1C24] transition-colors gap-1">
                      <span>Leer nota completa</span>
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Newsletter / CTA - Suscriptores */}
        <section className="relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] bg-[#00AEEF] p-6 sm:p-10 lg:p-16 text-white w-full min-w-0">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-[#FFF200]/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-[#ED1C24]/20 blur-3xl pointer-events-none" />
          
          <div className="relative grid lg:grid-cols-2 gap-8 sm:gap-12 items-center min-w-0">
            <div className="space-y-4 sm:space-y-6 min-w-0">
              <h2 className="text-2xl sm:text-4xl lg:text-6xl font-black leading-tight tracking-tighter break-words">
                ÚNETE A NUESTROS <br className="hidden sm:inline" /> <span className="text-[#FFF200]">SUSCRIPTORES</span>
              </h2>
              <p className="text-sm sm:text-lg font-medium opacity-80 max-w-md break-words">
                Apoya al periodismo independiente de Zapotlán el Grande, recibe ediciones especiales y mantente conectado con la comunidad.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full min-w-0">
              <input 
                type="email" 
                placeholder="Tu correo electrónico" 
                className="w-full sm:flex-1 rounded-full bg-white/10 border border-white/20 px-6 py-3.5 sm:px-8 sm:py-4 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#FFF200] text-sm"
              />
              <Button className="rounded-full bg-[#ED1C24] hover:bg-[#ED1C24]/90 text-white font-black uppercase tracking-widest px-8 py-3.5 sm:px-10 sm:py-6 shrink-0 text-xs sm:text-sm">
                Suscribirme
              </Button>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}

