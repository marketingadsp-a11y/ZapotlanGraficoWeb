import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, BookOpen, ExternalLink, RefreshCw, Calendar, Eye, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

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

export default function FlipbookList() {
  const navigate = useNavigate();
  const [flipbooks, setFlipbooks] = useState<Flipbook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'flipbooks'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Flipbook[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Flipbook);
      });
      setFlipbooks(items);
      setLoading(false);
    }, (error) => {
      console.error("Error loaded flipbooks:", error);
      toast.error("Error al cargar la lista de Flipbooks.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteFlipbook = async (id: string, title: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente la revista "${title}"?`)) {
      try {
        await deleteDoc(doc(db, 'flipbooks', id));
        toast.success(`Revista "${title}" eliminada con éxito.`);
      } catch (err) {
        console.error("Error deleting: ", err);
        toast.error("No se pudo eliminar el Flipbook.");
      }
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Revistas y Ediciones</h1>
            <p className="text-sm font-medium text-slate-500">
              Crea revistas en formato Flipbook interactivo subiendo un archivo PDF para la sección digital /revista.
            </p>
          </div>
          
          <Button 
            onClick={() => navigate('/admin/flipbooks/nuevo')}
            className="h-14 bg-slate-900 text-white hover:bg-[#00AEEF] rounded-2xl px-6 shadow-lg transition-all font-black text-xs uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Nuevo Flipbook
          </Button>
        </div>

        {/* Content list or Loading spinner */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white rounded-[2.5rem]">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent"></div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-2">Cargando publicaciones...</p>
          </div>
        ) : flipbooks.length === 0 ? (
          <div className="py-24 text-center space-y-4 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00AEEF]/5 text-[#00AEEF]">
              <BookOpen className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="font-black text-slate-900 text-sm">No hay revistas o Flipbooks creados</p>
              <p className="text-xs font-medium text-slate-400 max-w-sm mx-auto">
                Carga tu primer PDF hoy para ofrecerle a los lectores del periódico una experiencia de lectura real de revista impresa.
              </p>
            </div>
            <Button
              onClick={() => navigate('/admin/flipbooks/nuevo')}
              className="h-12 bg-slate-900 text-white hover:bg-[#00AEEF] rounded-xl px-5 font-black text-xs uppercase tracking-widest transition-all"
            >
              Hacer mi primera revista
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {flipbooks.map((fb, index) => (
                <motion.div
                  key={fb.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden flex flex-col justify-between h-full group border border-slate-55">
                    {/* Cover Photo */}
                    <div className="relative aspect-[4/5] bg-slate-50 shrink-0 overflow-hidden">
                      {fb.coverUrl ? (
                        <img 
                          src={fb.coverUrl} 
                          alt={fb.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                          <ImageIcon className="h-8 w-8" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Sin Portada</span>
                        </div>
                      )}
                      
                      {/* Interactive Float Badges */}
                      <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                        <span className="bg-slate-900/90 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-sm">
                          {fb.pageUrls?.length || 0} Hojas
                        </span>
                      </div>

                      {/* Floating Link Shortcuts */}
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <Link 
                          to={`/revista/${fb.id}`}
                          target="_blank"
                          className="h-12 w-12 rounded-xl bg-white text-slate-900 hover:bg-[#FFF200] hover:text-slate-900 transition-all flex items-center justify-center shadow-lg"
                        >
                          <ExternalLink className="h-5 w-5" />
                        </Link>
                      </div>
                    </div>

                    {/* Meta description body */}
                    <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#00AEEF]">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {fb.createdAt 
                              ? format(fb.createdAt.toDate(), "d 'de' MMMM, yyyy", { locale: es }) 
                              : "N/A"}
                          </span>
                        </div>
                        <h2 className="text-base font-black text-slate-800 tracking-tight leading-snug line-clamp-2">
                          {fb.title}
                        </h2>
                        {fb.description && (
                          <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1 leading-relaxed">
                            {fb.description}
                          </p>
                        )}
                      </div>

                      {/* Sub footer stats + Actions */}
                      <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs">
                          <Eye className="h-4 w-4" />
                          <span>{fb.views || 0} visitas</span>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteFlipbook(fb.id, fb.title)}
                          className="h-10 w-10 text-slate-400 hover:text-brand-red hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
