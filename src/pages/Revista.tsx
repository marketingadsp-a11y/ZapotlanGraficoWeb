import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import PublicLayout from '@/components/Layout';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Share2, 
  Sparkles,
  ArrowRight,
  Bookmark,
  Leaf,
  Cpu,
  Heart,
  Utensils,
  Newspaper,
  Compass,
  Image as ImageIcon
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
  category?: string;
}

// Helper para asignar categoría, icono, colores y frase inferior estilo showcase editorial
const getMagazineTheme = (fb: Flipbook, index: number) => {
  const text = `${fb.category || ''} ${fb.title} ${fb.description || ''}`.toLowerCase();

  if (text.includes('naturaleza') || text.includes('medio ambiente') || text.includes('ecolog') || text.includes('bosque') || text.includes('planeta') || text.includes('tierra')) {
    return {
      name: 'Naturaleza',
      icon: Leaf,
      color: 'text-emerald-600',
      tagline: 'Un planeta, mil maravillas'
    };
  }
  if (text.includes('tecnolog') || text.includes('digital') || text.includes('innovac') || text.includes('ia') || text.includes('futuro') || text.includes('sistema')) {
    return {
      name: 'Tecnología',
      icon: Cpu,
      color: 'text-blue-600',
      tagline: 'El futuro está en tus manos'
    };
  }
  if (text.includes('salud') || text.includes('bienestar') || text.includes('cuerpo') || text.includes('mente') || text.includes('deporte') || text.includes('vida')) {
    return {
      name: 'Salud y Bienestar',
      icon: Heart,
      color: 'text-rose-500',
      tagline: 'Pequeños hábitos, grandes cambios'
    };
  }
  if (text.includes('sabor') || text.includes('comida') || text.includes('cocina') || text.includes('gastronom') || text.includes('receta')) {
    return {
      name: 'Gastronomía',
      icon: Utensils,
      color: 'text-amber-600',
      tagline: 'Recetas que inspiran'
    };
  }
  if (text.includes('noticia') || text.includes('actual') || text.includes('politica') || text.includes('mundo') || text.includes('informacion')) {
    return {
      name: 'Actualidad',
      icon: Newspaper,
      color: 'text-sky-600',
      tagline: 'Noticias que importan'
    };
  }
  if (text.includes('viaje') || text.includes('turismo') || text.includes('destino') || text.includes('aventura') || text.includes('mundo') || text.includes('sur')) {
    return {
      name: 'Viajes',
      icon: Compass,
      color: 'text-cyan-600',
      tagline: 'El mundo te espera'
    };
  }
  if (text.includes('cultura') || text.includes('arte') || text.includes('historia') || text.includes('tradicion')) {
    return {
      name: 'Cultura',
      icon: Leaf,
      color: 'text-emerald-600',
      tagline: 'Tradición y memoria viva'
    };
  }

  // Temas predefinidos ordenados armónicamente idénticos a la imagen de muestra
  const presets = [
    { name: 'Cultura', icon: Leaf, color: 'text-emerald-600', tagline: 'Un planeta, mil maravillas' },
    { name: 'Tecnología', icon: Cpu, color: 'text-blue-600', tagline: 'El futuro está en tus manos' },
    { name: 'Salud y Bienestar', icon: Heart, color: 'text-rose-500', tagline: 'Pequeños hábitos, grandes cambios' },
    { name: 'Gastronomía', icon: Utensils, color: 'text-amber-600', tagline: 'Recetas que inspiran' },
    { name: 'Actualidad', icon: Newspaper, color: 'text-sky-600', tagline: 'Noticias que importan' },
    { name: 'Viajes', icon: Compass, color: 'text-cyan-600', tagline: 'El mundo te espera' },
  ];

  return presets[index % presets.length];
};

export default function Revista() {
  const [flipbooks, setFlipbooks] = useState<Flipbook[]>(dataCache.flipbooks as Flipbook[]);
  const [loading, setLoading] = useState(!dataCache.hasFetchedFlipbooks);

  // Guardados / Favoritos en LocalStorage
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('saved_magazines');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

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

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSavedIds(prev => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter(x => x !== id) : [...prev, id];
      try {
        localStorage.setItem('saved_magazines', JSON.stringify(updated));
      } catch {}
      if (exists) {
        toast.info("Revista eliminada de tus guardados");
      } else {
        toast.success("¡Revista guardada en tus favoritos!");
      }
      return updated;
    });
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-6 space-y-10">
        {/* Secciones Navigation Bar */}
        <Secciones />

        {/* Publicidad Banner */}
        <PromoAd type="horizontal" className="my-2" />

        {/* ========================================================================= */}
        {/* ESCAPARATE MODERNO DE REVISTAS */}
        {/* ========================================================================= */}
        <section className="space-y-8">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 bg-[#00AEEF] rounded-full" />
              <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                Ediciones Disponibles
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {flipbooks.length} {flipbooks.length === 1 ? 'edición' : 'ediciones'}
            </span>
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
            /* GRID ESTILO ESCAPARATE EDITORIAL (2 COLUMNAS COMO LA IMAGEN)   */
            /* =============================================================== */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
              {flipbooks.map((fb, index) => {
                const isNewest = index === 0;
                const theme = getMagazineTheme(fb, index);
                const CategoryIcon = theme.icon;
                const isSaved = savedIds.includes(fb.id);

                return (
                  <motion.div
                    key={fb.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="group bg-white dark:bg-slate-900 rounded-2xl md:rounded-[1.35rem] border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.12)] hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-300 p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-5 items-stretch relative overflow-hidden"
                  >
                    {/* COLUMNA IZQUIERDA: Portada de la Revista */}
                    <Link
                      to={`/revista/${fb.id}`}
                      className="relative w-full sm:w-[150px] md:w-[165px] lg:w-[175px] shrink-0 aspect-[1/1.34] rounded-xl overflow-hidden shadow-md shadow-slate-950/15 group-hover:shadow-xl transition-all duration-300 bg-slate-950 block"
                    >
                      {/* Portada */}
                      {fb.coverUrl ? (
                        <img
                          src={fb.coverUrl}
                          alt={fb.title}
                          className="w-full h-full object-cover select-none transition-transform duration-500 group-hover:scale-[1.03]"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-slate-500 text-center bg-slate-900">
                          <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Sin Portada</span>
                        </div>
                      )}

                      {/* Lomo editorial y sombra lateral encuadernada */}
                      <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/50 via-black/15 to-transparent pointer-events-none z-10" />
                      <div className="absolute inset-y-0 left-2.5 w-px bg-white/15 pointer-events-none z-10" />

                      {/* Brillo satinado diagonal */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none z-10 opacity-70 group-hover:opacity-100 transition-opacity" />

                      {/* Badge Nueva Edición (si es la más reciente) */}
                      {isNewest && (
                        <div className="absolute top-2.5 left-2.5 z-20">
                          <span className="px-2 py-0.5 rounded-md bg-[#FFF200] text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-md flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5" />
                            Nuevo
                          </span>
                        </div>
                      )}

                      {/* Frase / Tagline inferior sobre la portada */}
                      <div className="absolute inset-x-0 bottom-0 p-3 pt-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-15 pointer-events-none">
                        <p className="text-white text-xs sm:text-[13px] font-bold leading-tight drop-shadow-md">
                          {theme.tagline}
                        </p>
                      </div>
                    </Link>

                    {/* COLUMNA DERECHA: Datos de la Revista */}
                    <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                      
                      {/* Cabecera de contenido */}
                      <div>
                        {/* Categoría con Icono */}
                        <div className="flex items-center gap-1.5 text-xs font-semibold mb-1">
                          <CategoryIcon className={`h-4 w-4 ${theme.color}`} />
                          <span className={`font-bold ${theme.color}`}>
                            {theme.name}
                          </span>
                        </div>

                        {/* Título de la Revista */}
                        <Link to={`/revista/${fb.id}`}>
                          <h3 className="text-slate-950 dark:text-white font-extrabold text-lg sm:text-xl tracking-tight leading-snug line-clamp-1 group-hover:text-[#007aff] transition-colors">
                            {fb.title}
                          </h3>
                        </Link>

                        {/* Descripción */}
                        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed line-clamp-3 mt-1.5 font-normal">
                          {fb.description || 'Descubre los reportajes, artículos y contenidos exclusivos en esta edición digital.'}
                        </p>
                      </div>

                      {/* Barra Inferior de Acciones */}
                      <div className="flex items-center justify-between mt-4 pt-2">
                        {/* Botón Azul Leer */}
                        <Link
                          to={`/revista/${fb.id}`}
                          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#007aff] hover:bg-[#0062cc] active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all"
                        >
                          <span>Leer</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>

                        {/* Botones de acción derecha (Compartir & Guardar/Bookmark) */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleShare(fb, e)}
                            className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Compartir enlace"
                          >
                            <Share2 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => toggleBookmark(fb.id, e)}
                            className="p-2 rounded-full text-slate-400 hover:text-[#007aff] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={isSaved ? "Guardado en tus favoritos" : "Guardar revista"}
                          >
                            <Bookmark 
                              className={`h-5 w-5 transition-transform active:scale-90 ${
                                isSaved 
                                  ? "fill-[#007aff] text-[#007aff]" 
                                  : "stroke-[1.75]"
                              }`} 
                            />
                          </button>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

        </section>
      </div>
    </PublicLayout>
  );
}
