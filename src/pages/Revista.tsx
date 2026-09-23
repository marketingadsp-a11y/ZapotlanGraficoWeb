import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import PublicLayout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Calendar, 
  Eye, 
  Image as ImageIcon, 
  ChevronRight, 
  Share2, 
  Sparkles,
  Music,
  BookMarked,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { dataCache } from '@/lib/dataCache';
import Secciones from '@/components/Secciones';
import PromoAd from '@/components/PromoAd';

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

export default function Revista() {
  const [flipbooks, setFlipbooks] = useState<Flipbook[]>(dataCache.flipbooks as Flipbook[]);
  const [loading, setLoading] = useState(!dataCache.hasFetchedFlipbooks);

  useEffect(() => {
    const q = query(collection(db, 'flipbooks'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: Flipbook[] = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() } as Flipbook);
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
      <div className="container mx-auto px-4 py-6 space-y-10">
        {/* Secciones Navigation Bar */}
        <Secciones />

        {/* Publicidad Banner */}
        <PromoAd type="horizontal" className="my-2" />

        {/* ========================================================================= */}
        {/* ESTANTE MODERNO DE REVISTAS */}
        {/* ========================================================================= */}
        <section className="space-y-8">
          
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="h-8 w-1.5 bg-[#00AEEF] rounded-full" />
            <h2 className="text-2xl font-black uppercase tracking-tighter">Ediciones Disponibles</h2>
          </div>

          {/* Estado de carga */}
          {loading ? (
            <div className="py-28 flex flex-col items-center justify-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent shadow-lg shadow-[#00AEEF]/20" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                Cargando revistas...
              </p>
            </div>
          ) : flipbooks.length === 0 ? (
            <div className="py-24 text-center space-y-4 rounded-[3.5rem] bg-slate-50 border-2 border-dashed border-slate-200">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                <BookOpen className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <p className="font-black text-slate-900 text-sm">
                  Próximamente nuevas ediciones
                </p>
                <p className="text-xs font-medium text-slate-400">
                  Estamos digitalizando nuestro archivo histórico. ¡Vuelve pronto!
                </p>
              </div>
            </div>
          ) : (
            /* =============================================================== */
            /* ESTANTE MODERNO / SHOWCASE KIOSK GRID */
            /* =============================================================== */
            <div className="space-y-16">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
                {flipbooks.map((fb, index) => {
                  const isNewest = index === 0;

                  return (
                    <motion.div
                      key={fb.id}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.06 }}
                      className="group flex flex-col"
                    >
                      {/* Enlace al visor de la revista */}
                      <Link to={`/revista/${fb.id}`} className="block">
                        
                        {/* ========================================================= */}
                        {/* OBJETO REVISTA FÍSICA APOYADA EN EL ESTANTE */}
                        {/* ========================================================= */}
                        <div className="relative mb-3 flex justify-center items-end">
                          
                          {/* Sombra de apoyo en la base del estante */}
                          <div className="absolute -bottom-2 w-[85%] h-5 bg-black/40 blur-md rounded-full pointer-events-none transition-all duration-300 group-hover:w-[92%] group-hover:bg-black/60 group-hover:blur-lg" />

                          {/* Volumen de la Revista */}
                          <div className="relative w-full max-w-[280px] aspect-[1/1.42] rounded-r-2xl rounded-l-md overflow-hidden bg-slate-900 shadow-xl border border-slate-700/40 transform transition-all duration-500 ease-out group-hover:-translate-y-4 group-hover:scale-[1.03] group-hover:shadow-[0_25px_35px_-5px_rgba(0,174,239,0.25)] flex items-center justify-center">
                            
                            {/* Borde / Lomo Encuadernado (Efecto Revista Impresa) */}
                            <div className="absolute top-0 bottom-0 left-0 w-3.5 bg-gradient-to-r from-black/80 via-black/30 to-transparent z-20 pointer-events-none" />
                            <div className="absolute top-0 bottom-0 left-3 w-px bg-white/10 z-20 pointer-events-none" />
                            
                            {/* Brillo Satinado Diagonal (Gloss Reflejo de Revista de Quiosco) */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 opacity-60 pointer-events-none z-10 group-hover:opacity-90 transition-opacity" />

                            {/* PORTADA 100% COMPLETA (Sin recortes) */}
                            {fb.coverUrl ? (
                              <div className="w-full h-full p-1 bg-slate-950 flex items-center justify-center">
                                <img
                                  src={fb.coverUrl}
                                  alt={fb.title}
                                  className="w-full h-full object-contain drop-shadow-md select-none"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : (
                              <div className="text-slate-400 flex flex-col items-center gap-2 p-6 text-center">
                                <ImageIcon className="h-10 w-10 text-slate-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                  Portada no disponible
                                </span>
                              </div>
                            )}

                            {/* Badge "NUEVA EDICIÓN" para la última publicación */}
                            {isNewest && (
                              <div className="absolute top-3 left-3 z-30">
                                <span className="px-2.5 py-1 rounded-md bg-[#FFF200] text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-md flex items-center gap-1">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  Nueva Edición
                                </span>
                              </div>
                            )}

                            {/* Badge de Páginas y Audio en la parte superior derecha */}
                            <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-30">
                              <span className="px-2 py-0.5 rounded-md bg-slate-950/85 backdrop-blur-md text-white font-mono font-bold text-[9px] shadow-md border border-white/10">
                                {fb.pageUrls?.length || 0} págs
                              </span>

                              {fb.audioUrl && (
                                <span className="px-2 py-0.5 rounded-md bg-[#00AEEF] text-white font-black text-[8px] uppercase tracking-wider shadow-md flex items-center gap-1">
                                  <Music className="h-2.5 w-2.5" />
                                  MP3
                                </span>
                              )}
                            </div>

                            {/* Overlay interactivo en Hover: "Abrir Revista" */}
                            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex flex-col items-center justify-center gap-3">
                              <span className="h-12 w-12 rounded-full bg-[#00AEEF] text-white flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                <BookOpen className="h-6 w-6 ml-0.5" />
                              </span>
                              <span className="px-3 py-1 rounded-full bg-white text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-lg">
                                Abrir Revista 3D
                              </span>
                            </div>

                          </div>
                        </div>

                        {/* ========================================================= */}
                        {/* REPISA FÍSICA TRIDIMENSIONAL (ESCAPARATE SHELF) */}
                        {/* ========================================================= */}
                        <div className="relative w-full mb-4">
                          {/* Superficie superior del estante con reflejo */}
                          <div className="h-2 w-full bg-gradient-to-r from-slate-200 via-white to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-t-sm shadow-inner" />
                          {/* Borde frontal del estante con sombra */}
                          <div className="h-3 w-full bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 rounded-b-md shadow-md border-t border-white/20" />
                          {/* Sombra proyectada del estante hacia abajo */}
                          <div className="h-3 w-full bg-gradient-to-b from-black/20 to-transparent blur-[1px]" />
                        </div>

                        {/* Metadatos y ficha de la edición */}
                        <div className="space-y-2 px-1">
                          
                          {/* Fecha y Vistas */}
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Calendar className="h-3 w-3 text-[#ED1C24]" />
                              <span>
                                {fb.createdAt 
                                  ? format(fb.createdAt.toDate(), "d MMM, yyyy", { locale: es }) 
                                  : "Edición Digital"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              <span>{fb.views || 0}</span>
                            </div>
                          </div>

                          {/* Título de la Revista */}
                          <h3 className="text-base font-black leading-tight tracking-tight text-slate-900 group-hover:text-[#00AEEF] transition-colors line-clamp-2">
                            {fb.title}
                          </h3>

                          {/* Descripción / Reportaje */}
                          {fb.description && (
                            <p className="text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed">
                              {fb.description}
                            </p>
                          )}

                          {/* Acciones de la Ficha */}
                          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#00AEEF] group-hover:translate-x-0.5 transition-transform">
                              Leer Edición <ChevronRight className="h-3 w-3" />
                            </span>

                            <button
                              type="button"
                              onClick={(e) => handleShare(fb, e)}
                              className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-[#00AEEF] text-slate-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                              title="Compartir Edición"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                        </div>

                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

        </section>
      </div>
    </PublicLayout>
  );
}
