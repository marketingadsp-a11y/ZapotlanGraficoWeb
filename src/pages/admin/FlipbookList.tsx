import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import AdminLayout from '@/components/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Trash2, 
  BookOpen, 
  ExternalLink, 
  Calendar, 
  Eye, 
  Image as ImageIcon,
  Pencil,
  Play,
  Pause,
  Music,
  Upload,
  Loader2,
  X,
  Volume2,
  VolumeX,
  CheckCircle,
  Save,
  Clock
} from 'lucide-react';
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
  autoPlayDefault?: boolean;
  autoPlayInterval?: number;
  audioUrl?: string;
  autoPlayAudio?: boolean;
}

export default function FlipbookList() {
  const navigate = useNavigate();
  const [flipbooks, setFlipbooks] = useState<Flipbook[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editingFlipbook, setEditingFlipbook] = useState<Flipbook | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editAutoPlayDefault, setEditAutoPlayDefault] = useState(false);
  const [editAutoPlayInterval, setEditAutoPlayInterval] = useState(5);
  const [editAudioUrl, setEditAudioUrl] = useState('');
  const [editAutoPlayAudio, setEditAutoPlayAudio] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

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
      console.error("Error loading flipbooks:", error);
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

  const handleOpenEdit = (fb: Flipbook) => {
    setEditingFlipbook(fb);
    setEditTitle(fb.title || '');
    setEditDescription(fb.description || '');
    setEditCoverUrl(fb.coverUrl || '');
    setEditAutoPlayDefault(fb.autoPlayDefault || false);
    setEditAutoPlayInterval(fb.autoPlayInterval || 5);
    setEditAudioUrl(fb.audioUrl || '');
    setEditAutoPlayAudio(fb.autoPlayAudio || false);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('audio') && !file.name.endsWith('.mp3')) {
      toast.error("Por favor selecciona un archivo de audio válido (.mp3, etc.)");
      return;
    }

    setUploadingAudio(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await fetch('/api/upload-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              base64Data
            })
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText.startsWith('<') ? 'Error en el servidor al procesar el archivo' : errText);
          }

          const data = await res.json();
          if (data.success && data.url) {
            setEditAudioUrl(data.url);
            toast.success("Audio MP3 subido correctamente");
          } else {
            throw new Error(data.error || "Fallo en la subida");
          }
        } catch (uploadErr: any) {
          console.error("Upload error:", uploadErr);
          toast.error("Error al subir el audio: " + uploadErr.message);
        } finally {
          setUploadingAudio(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      toast.error("Error al procesar el archivo");
      setUploadingAudio(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlipbook) return;

    if (!editTitle.trim()) {
      toast.error("El título no puede estar vacío");
      return;
    }

    setSavingEdit(true);
    try {
      const docRef = doc(db, 'flipbooks', editingFlipbook.id);
      await updateDoc(docRef, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        coverUrl: editCoverUrl.trim(),
        autoPlayDefault: editAutoPlayDefault,
        autoPlayInterval: Number(editAutoPlayInterval) || 5,
        audioUrl: editAudioUrl.trim(),
        autoPlayAudio: editAutoPlayAudio,
      });

      toast.success("¡Revista actualizada correctamente!");
      setEditingFlipbook(null);
    } catch (err: any) {
      console.error("Error updating flipbook:", err);
      toast.error("Error al actualizar la revista: " + err.message);
    } finally {
      setSavingEdit(false);
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
              Administra tus revistas digitales: configura hojeado automático, música de fondo MP3 y edita información.
            </p>
          </div>
          
          <Button 
            onClick={() => navigate('/admin/flipbooks/nuevo')}
            className="h-14 bg-slate-900 text-white hover:bg-[#00AEEF] rounded-2xl px-6 shadow-lg transition-all font-black text-xs uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nueva Revista (PDF)
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
              className="h-12 bg-slate-900 text-white hover:bg-[#00AEEF] rounded-xl px-5 font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
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
                  <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden flex flex-col justify-between h-full group border border-slate-100 hover:shadow-xl transition-all">
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
                          {fb.pageUrls?.length || 0} Páginas
                        </span>

                        {fb.autoPlayDefault && (
                          <span className="bg-[#FFF200] text-slate-950 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            <Play className="h-2.5 w-2.5 fill-current" />
                            Auto ({fb.autoPlayInterval || 5}s)
                          </span>
                        )}

                        {fb.audioUrl && (
                          <span className="bg-[#00AEEF] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            <Music className="h-2.5 w-2.5" />
                            Audio {fb.autoPlayAudio ? '(Auto)' : ''}
                          </span>
                        )}
                      </div>

                      {/* Floating Link Shortcuts */}
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <Link 
                          to={`/revista/${fb.id}`}
                          target="_blank"
                          className="h-12 w-12 rounded-xl bg-white text-slate-900 hover:bg-[#00AEEF] hover:text-white transition-all flex items-center justify-center shadow-lg cursor-pointer"
                          title="Abrir en pestaña nueva"
                        >
                          <ExternalLink className="h-5 w-5" />
                        </Link>
                        <button 
                          onClick={() => handleOpenEdit(fb)}
                          className="h-12 w-12 rounded-xl bg-white text-slate-900 hover:bg-[#FFF200] hover:text-slate-950 transition-all flex items-center justify-center shadow-lg cursor-pointer"
                          title="Editar revista"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
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
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs">
                          <Eye className="h-4 w-4" />
                          <span>{fb.views || 0} visitas</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(fb)}
                            className="h-10 w-10 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            title="Editar revista"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteFlipbook(fb.id, fb.title)}
                            className="h-10 w-10 text-slate-400 hover:text-[#ED1C24] hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                            title="Eliminar revista"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Edit Magazine Modal Dialog */}
        <AnimatePresence>
          {editingFlipbook && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-[#00AEEF]/10 text-[#00AEEF] flex items-center justify-center">
                      <Pencil className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                        Gestionar Revista
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Edición de datos, auto-play y audio MP3 de fondo
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setEditingFlipbook(null)}
                    className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Body Form */}
                <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-6">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      Título de la Revista / Edición *
                    </label>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Ej. Revista Zapotlán Gráfico - Edición Especial 2026"
                      className="h-12 rounded-xl border-slate-200"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      Descripción o Resumen
                    </label>
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Breve reseña sobre los contenidos de esta edición..."
                      className="rounded-xl border-slate-200 min-h-[80px]"
                    />
                  </div>

                  {/* Cover URL */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      URL de Imagen de Portada
                    </label>
                    <div className="flex gap-3 items-center">
                      <Input
                        value={editCoverUrl}
                        onChange={(e) => setEditCoverUrl(e.target.value)}
                        placeholder="https://..."
                        className="h-12 rounded-xl border-slate-200 flex-1"
                      />
                      {editCoverUrl && (
                        <div className="h-12 w-10 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                          <img src={editCoverUrl} alt="Portada" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECCIÓN 1: MODO AUTO-PLAY (PASE DE PÁGINAS AUTOMÁTICO) */}
                  <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                          <Play className="h-4 w-4 fill-current" />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-slate-900">
                            Auto-Play / Pase de Páginas Automático
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Pasa las páginas solo automáticamente al abrir la revista.
                          </p>
                        </div>
                      </div>

                      {/* Custom Switch Toggle */}
                      <button
                        type="button"
                        onClick={() => setEditAutoPlayDefault(!editAutoPlayDefault)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          editAutoPlayDefault ? 'bg-amber-500' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            editAutoPlayDefault ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {editAutoPlayDefault && (
                      <div className="flex items-center gap-3 pt-2 border-t border-amber-500/10">
                        <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                        <label className="text-xs font-bold text-slate-700">
                          Tiempo por página:
                        </label>
                        <select
                          value={editAutoPlayInterval}
                          onChange={(e) => setEditAutoPlayInterval(Number(e.target.value))}
                          className="h-10 px-3 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-800"
                        >
                          <option value={3}>3 segundos</option>
                          <option value={4}>4 segundos</option>
                          <option value={5}>5 segundos (Recomendado)</option>
                          <option value={6}>6 segundos</option>
                          <option value={8}>8 segundos</option>
                          <option value={10}>10 segundos</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* SECCIÓN 2: AUDIO MP3 DE FONDO */}
                  <div className="p-5 rounded-2xl bg-[#00AEEF]/5 border border-[#00AEEF]/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-[#00AEEF]/10 text-[#00AEEF] flex items-center justify-center">
                          <Music className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider text-slate-900">
                            Audio de Fondo (MP3)
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Música ambiental, narración o audio de la edición.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Audio URL Input & Upload Button */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={editAudioUrl}
                          onChange={(e) => setEditAudioUrl(e.target.value)}
                          placeholder="Pega enlace de audio .mp3 o sube un archivo..."
                          className="h-11 rounded-xl border-slate-200 text-xs flex-1"
                        />
                        <label className="h-11 px-4 rounded-xl bg-slate-900 hover:bg-[#00AEEF] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors shrink-0">
                          {uploadingAudio ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Subiendo...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              <span>Subir MP3</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="audio/*,.mp3"
                            onChange={handleAudioUpload}
                            disabled={uploadingAudio}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Audio Player Preview */}
                      {editAudioUrl && (
                        <div className="pt-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Escuchar audio configurado:
                          </p>
                          <audio controls src={editAudioUrl} className="w-full h-10 rounded-lg" />
                        </div>
                      )}
                    </div>

                    {/* Auto-Play Audio Toggle */}
                    {editAudioUrl && (
                      <div className="flex items-center justify-between pt-3 border-t border-[#00AEEF]/10">
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            ¿Reproducir audio automáticamente al abrir la revista?
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Si está activo, sonará automáticamente (o al primer toque del lector).
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setEditAutoPlayAudio(!editAutoPlayAudio)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            editAutoPlayAudio ? 'bg-[#00AEEF]' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              editAutoPlayAudio ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions Buttons */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditingFlipbook(null)}
                      className="h-12 px-5 rounded-xl font-bold text-xs uppercase text-slate-500 cursor-pointer"
                    >
                      Cancelar
                    </Button>

                    <Button
                      type="submit"
                      disabled={savingEdit}
                      className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-[#00AEEF] text-white font-black text-xs uppercase tracking-wider transition-all gap-2 cursor-pointer shadow-lg"
                    >
                      {savingEdit ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Guardar Cambios</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AdminLayout>
  );
}
