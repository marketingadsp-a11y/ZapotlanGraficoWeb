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

export default function Home() {
  const { settings } = useSettings();
  const [articles, setArticles] = useState<Article[]>(dataCache.articles);
  const [loading, setLoading] = useState(!dataCache.hasFetchedArticles);

  useEffect(() => {
    const q = query(
      collection(db, 'articles'),
      orderBy('createdAt', 'desc'),
      limit(12)
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

  const featured = articles[0];
  const secondary = articles.slice(1, 4);
  const recent = articles.slice(4);

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
      <div className="container mx-auto px-4 py-8 space-y-16">
        {/* Secciones Grid */}
        <Secciones />

        {/* Hero Section */}
        <section className="grid gap-6 lg:grid-cols-12">
          {featured && (
            <motion.div 
              className="lg:col-span-8 group relative overflow-hidden rounded-[2rem] bg-slate-900 aspect-[16/10] lg:aspect-auto lg:h-[600px]"
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
              <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12 space-y-4">
                <div className="flex items-center gap-3">
                  <Badge className="bg-[#ED1C24] text-white border-none px-4 py-1 text-[10px] font-black uppercase tracking-widest">
                    {featured.categories?.[0] || 'Destacado'}
                  </Badge>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60 flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {format(featured.createdAt.toDate(), "d MMM", { locale: es })}
                  </span>
                </div>
                <Link to={`/nota/${featured.slug}`}>
                  <h1 className="text-3xl lg:text-5xl font-black text-white leading-tight tracking-tighter hover:text-[#FFF200] transition-colors">
                    {featured.title}
                  </h1>
                </Link>
                <p className="text-slate-300 text-sm lg:text-lg line-clamp-2 max-w-2xl font-medium">
                  {featured.summary}
                </p>
              </div>
            </motion.div>
          )}

          <div className="lg:col-span-4 flex flex-col gap-6">
            {secondary.map((article, i) => (
              <motion.div 
                key={article.id}
                className="flex-1 group relative overflow-hidden rounded-3xl bg-white border border-slate-100 p-4 flex gap-4 hover:shadow-xl transition-all"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                  <img
                    src={getSafeImageUrl(article.imageUrl)}
                    alt={article.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex flex-col justify-center space-y-1">
                  <Badge variant="outline" className="w-fit text-[8px] font-black uppercase tracking-widest border-slate-100 text-[#00AEEF]">
                    {article.categories?.[0] || 'General'}
                  </Badge>
                  <Link to={`/nota/${article.slug}`}>
                    <h3 className="text-sm font-black leading-tight line-clamp-2 group-hover:text-[#ED1C24] transition-colors">
                      {article.title}
                    </h3>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Latest News Grid */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 bg-[#ED1C24] rounded-full" />
              <h2 className="text-2xl font-black uppercase tracking-tighter">Últimas Noticias</h2>
            </div>
            <Link to="/categoria/General" className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-[#00AEEF]">
              Ver todas <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/nota/${article.slug}`} className="group block space-y-4">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem] bg-slate-100 shadow-sm">
                    <img
                      src={getSafeImageUrl(article.imageUrl)}
                      alt={article.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {article.videoUrl && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full bg-[#FFF200] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="h-6 w-6 text-slate-900 fill-slate-900 ml-1" />
                        </div>
                      </div>
                    )}
                    <Badge className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-slate-900 border-none text-[8px] font-black uppercase tracking-widest">
                      {article.categories?.[0] || 'General'}
                    </Badge>
                  </div>
                  <div className="space-y-2 px-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {settings.showAuthor !== false && (
                        <>
                          <span>{article.author}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{format(article.createdAt.toDate(), "d MMM", { locale: es })}</span>
                    </div>
                    <h3 className="text-xl font-black leading-tight tracking-tight group-hover:text-[#00AEEF] transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 line-clamp-2">
                      {article.summary}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
        {/* Newsletter / CTA */}
        <section className="relative overflow-hidden rounded-[3rem] bg-[#00AEEF] p-8 lg:p-16 text-white">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-64 w-64 rounded-full bg-[#FFF200]/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-[#ED1C24]/20 blur-3xl" />
          
          <div className="relative grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl lg:text-6xl font-black leading-none tracking-tighter">
                MANTENTE <br /> <span className="text-[#FFF200]">INFORMADO</span>
              </h2>
              <p className="text-lg font-medium opacity-80 max-w-md">
                Recibe las noticias más importantes de Zapotlán el Grande directamente en tu correo.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="email" 
                placeholder="Tu correo electrónico" 
                className="flex-1 rounded-full bg-white/10 border border-white/20 px-8 py-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#FFF200]"
              />
              <Button className="rounded-full bg-[#ED1C24] hover:bg-[#ED1C24]/90 text-white font-black uppercase tracking-widest px-10 py-6">
                Suscribirme
              </Button>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}

