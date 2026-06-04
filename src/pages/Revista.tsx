import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import PublicLayout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'motion/react';
import { BookOpen, Calendar, Eye, Image as ImageIcon, ChevronRight, Share2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

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

import { useSettings } from '@/lib/SettingsContext';
import { dataCache } from '@/lib/dataCache';
import Secciones from '@/components/Secciones';
import PromoAd from '@/components/PromoAd';

export default function Revista() {
  const [flipbooks, setFlipbooks] = useState<any[]>(dataCache.flipbooks);
  const [loading, setLoading] = useState(!dataCache.hasFetchedFlipbooks);

  useEffect(() => {
    const q = query(collection(db, 'flipbooks'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: any[] = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      dataCache.flipbooks = docs;
      dataCache.hasFetchedFlipbooks = true;
      setFlipbooks(docs);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleShare = (fb: Flipbook, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/revista/${fb.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("¡Enlace de la revista copiado al portapapeles!");
    } else {
      toast.error("Tu navegador no soporta el portapapeles.");
    }
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 space-y-16">
        {/* Secciones Grid */}
        <Secciones />

        {/* Banner de Publicidad Interna */}
        <PromoAd type="horizontal" className="my-2" />
        
        {/* Editorial Brand Intro Hero */}
        <div className="relative overflow-hidden rounded-[3.5rem] bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-12 lg:p-20 text-white shadow-2xl">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-80 w-80 rounded-full bg-[#00AEEF]/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-[#ED1C24]/10 blur-3xl" />
          
          <div className="relative grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center gap-3">
                <span className="h-2 w-10 bg-[#ED1C24] rounded-full" />
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#FFF200] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Hemeroteca & Ediciones Digitales
                </p>
              </div>
              <h1 className="text-5xl lg:text-8xl font-black tracking-tighter uppercase leading-none">
                La Revista <br /> <span className="text-[#00AEEF]">Zapotlán Gráfico</span>
              </h1>
              <p className="text-slate-400 font-medium text-sm lg:text-base leading-relaxed max-w-xl">
                Lee nuestras ediciones impresas mensuales, reportajes especiales, catálogos del comercio local y suplementos culturales de forma totalmente interactiva con nuestra experiencia Flipbook de pase de página físico.
              </p>
            </div>
            
            <div className="hidden lg:flex lg:col-span-4 items-center justify-center">
              <motion.div
                initial={{ rotate: -5, y: 15 }}
                animate={{ rotate: 3, y: -5 }}
                transition={{ repeat: Infinity, repeatType: "reverse", duration: 4, ease: "easeInOut" }}
                className="relative bg-white/5 border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-md shadow-2xl"
              >
                <div className="aspect-[3/4] w-52 bg-slate-800 rounded-3xl overflow-hidden shadow-inner border border-white/5 relative">
                  {flipbooks[0]?.coverUrl ? (
                    <img 
                      src={flipbooks[0].coverUrl} 
                      alt="Próxima edición" 
                      className="h-full w-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-500">
                      <BookOpen className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 bg-slate-900/90 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/10">
                    Última Edición
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Magazine Editions Catalog Shelf */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="h-8 w-1.5 bg-[#00AEEF] rounded-full" />
            <h2 className="text-2xl font-black uppercase tracking-tighter">Ediciones Disponibles</h2>
          </div>

          {loading ? (
            <div className="py-24 flex h-64 items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent"></div>
            </div>
          ) : flipbooks.length === 0 ? (
            <div className="py-24 text-center space-y-4 rounded-[3.5rem] bg-slate-50 border-2 border-dashed border-slate-200">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                <BookOpen className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="font-black text-slate-900 text-sm">Próximamente nuevas ediciones</p>
                <p className="text-xs font-medium text-slate-400">
                  Estamos digitalizando nuestro archivo histórico. ¡Ven a visitarnos de nuevo más tarde!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {flipbooks.map((fb, index) => (
                <motion.div
                  key={fb.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="group flex flex-col justify-between"
                >
                  <Link to={`/revista/${fb.id}`} className="block space-y-5">
                    {/* Magazine physical volume card wrapper */}
                    <div className="relative aspect-[3/4] overflow-hidden rounded-[2.5rem] bg-slate-100 shadow-md border border-slate-100/50 flex items-center justify-center group-hover:shadow-2xl transition-all duration-500">
                      
                      {/* Paper crease / shadow binder line for realism */}
                      <div className="absolute top-0 left-0 bottom-0 w-4 bg-gradient-to-r from-black/25 via-black/5 to-transparent z-10" />

                      {fb.coverUrl ? (
                        <img
                          src={fb.coverUrl}
                          alt={fb.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-slate-300 flex flex-col items-center gap-2">
                          <ImageIcon className="h-10 w-10 text-slate-300" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Ver Revista</span>
                        </div>
                      )}

                      {/* Cover Details Overlay */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent p-6 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="h-10 w-10 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg self-end transform translate-y-3 group-hover:translate-y-0 transition-transform">
                          <ChevronRight className="h-5 w-5 ml-0.5" />
                        </span>
                      </div>

                      {/* Header indicators */}
                      <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                        <Badge className="bg-slate-950/80 hover:bg-slate-950 text-white border-none text-[8px] font-black uppercase tracking-widest px-3 py-1 backdrop-blur-md">
                          {fb.pageUrls?.length || 0} Páginas
                        </Badge>
                      </div>
                    </div>

                    {/* Metadata summary */}
                    <div className="space-y-2 px-2">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#ED1C24]" />
                          <span>
                            {fb.createdAt 
                              ? format(fb.createdAt.toDate(), "d MMM, yyyy", { locale: es }) 
                              : "Reciente"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{fb.views || 0} visitas</span>
                        </div>
                      </div>

                      <h3 className="text-xl font-black leading-tight tracking-tight group-hover:text-[#00AEEF] transition-colors line-clamp-2">
                        {fb.title}
                      </h3>
                      
                      {fb.description && (
                        <p className="text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed">
                          {fb.description}
                        </p>
                      )}

                      <div className="pt-3 flex items-center justify-between z-20">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#00AEEF] opacity-0 group-hover:opacity-100 transition-opacity">
                          Leer Edición <ChevronRight className="h-3 w-3" />
                        </div>
                        <button
                          onClick={(e) => handleShare(fb, e)}
                          className="h-8 w-8 rounded-full bg-slate-100 hover:bg-[#FFF200] text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center text-xs"
                          title="Copiar Enlace de Compartir"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PublicLayout>
  );
}
