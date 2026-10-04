import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  deleteDoc, 
  updateDoc, 
  doc, 
  writeBatch, 
  addDoc, 
  Timestamp 
} from 'firebase/firestore';
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
  Clock,
  Tag,
  Leaf,
  Utensils,
  Cpu,
  Heart,
  Newspaper,
  Compass,
  Sparkles,
  Link2,
  Share2,
  Copy,
  Folder,
  FolderPlus,
  FolderOpen,
  CheckSquare,
  Square,
  Check,
  FolderArchive,
  Layers,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { formatAudioStreamUrl } from '@/lib/audioUrlHelper';
import { cleanSlug, isMagazineSlugTaken, generateUniqueMagazineSlug } from '@/lib/slugHelper';
import { MAGAZINE_CATEGORIES } from './FlipbookMaker';
import { Flipbook, FlipbookFolder } from '@/types';

export default function FlipbookList() {
  const navigate = useNavigate();
  const [flipbooks, setFlipbooks] = useState<Flipbook[]>([]);
  const [folders, setFolders] = useState<FlipbookFolder[]>([]);
  const [loading, setLoading] = useState(true);

  // Folder filtering & Multi-selection
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('ALL'); // 'ALL' | 'MAIN' | folderName
  const [selectedFlipbookIds, setSelectedFlipbookIds] = useState<string[]>([]);

  // Folder Create/Edit Modal
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderEditingDoc, setFolderEditingDoc] = useState<FlipbookFolder | null>(null);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [folderDescInput, setFolderDescInput] = useState('');
  const [savingFolder, setSavingFolder] = useState(false);

  // Batch Move Modal
  const [isBatchMoveModalOpen, setIsBatchMoveModalOpen] = useState(false);
  const [batchTargetFolder, setBatchTargetFolder] = useState('');
  const [batchCustomFolder, setBatchCustomFolder] = useState('');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Edit Modal State
  const [editingFlipbook, setEditingFlipbook] = useState<Flipbook | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('Cultura');
  const [editCustomCategory, setEditCustomCategory] = useState('');
  const [editFolder, setEditFolder] = useState('');
  const [editCustomFolder, setEditCustomFolder] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editAutoPlayDefault, setEditAutoPlayDefault] = useState(false);
  const [editAutoPlayInterval, setEditAutoPlayInterval] = useState(5);
  const [editAudioUrl, setEditAudioUrl] = useState('');
  const [editAutoPlayAudio, setEditAutoPlayAudio] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  // Load Flipbooks
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

  // Load explicit folders collection
  useEffect(() => {
    const qFolders = query(collection(db, 'flipbook_folders'), orderBy('createdAt', 'desc'));
    const unsubscribeFolders = onSnapshot(qFolders, (snapshot) => {
      const list: FlipbookFolder[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as FlipbookFolder);
      });
      setFolders(list);
    }, (err) => {
      console.error("Error loading flipbook folders:", err);
    });

    return () => unsubscribeFolders();
  }, []);

  // Compute all available folder names combining collection and existing flipbook fields
  const allFolderNames = useMemo(() => {
    const set = new Set<string>();
    folders.forEach(f => {
      if (f.name?.trim()) set.add(f.name.trim());
    });
    flipbooks.forEach(fb => {
      if (fb.folder?.trim()) set.add(fb.folder.trim());
    });
    return Array.from(set).sort();
  }, [folders, flipbooks]);

  // Filtered flipbooks based on active folder filter tab
  const filteredFlipbooks = useMemo(() => {
    if (selectedFolderFilter === 'ALL') {
      return flipbooks;
    }
    if (selectedFolderFilter === 'MAIN') {
      return flipbooks.filter(fb => !fb.folder || fb.folder.trim() === '');
    }
    return flipbooks.filter(
      fb => fb.folder?.trim().toLowerCase() === selectedFolderFilter.trim().toLowerCase()
    );
  }, [flipbooks, selectedFolderFilter]);

  const handleDeleteFlipbook = async (id: string, title: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el periódico "${title}"?`)) {
      try {
        await deleteDoc(doc(db, 'flipbooks', id));
        toast.success(`Periódico "${title}" eliminado con éxito.`);
      } catch (err) {
        console.error("Error deleting: ", err);
        toast.error("No se pudo eliminar el Flipbook.");
      }
    }
  };

  const handleOpenEdit = (fb: Flipbook) => {
    setEditingFlipbook(fb);
    setEditTitle(fb.title || '');
    setEditSlug(fb.slug || cleanSlug(fb.title || ''));
    setEditDescription(fb.description || '');
    const cat = fb.category || 'Cultura';
    const isKnown = MAGAZINE_CATEGORIES.some(c => c.name.toLowerCase() === cat.toLowerCase());
    if (isKnown) {
      setEditCategory(cat);
      setEditCustomCategory('');
    } else {
      setEditCategory('Otro');
      setEditCustomCategory(cat);
    }
    setEditFolder(fb.folder || '');
    setEditCustomFolder('');
    setEditCoverUrl(fb.coverUrl || '');
    setEditAutoPlayDefault(fb.autoPlayDefault || false);
    setEditAutoPlayInterval(fb.autoPlayInterval || 5);
    setEditAudioUrl(fb.audioUrl || '');
    setEditAutoPlayAudio(fb.autoPlayAudio || false);
  };

  const handleRegenerateSlug = async () => {
    if (!editTitle.trim()) {
      toast.error("Ingresa primero un título para generar el enlace");
      return;
    }
    const freshSlug = await generateUniqueMagazineSlug(editTitle.trim(), editingFlipbook?.id);
    setEditSlug(freshSlug);
    toast.success(`Nuevo enlace generado: /losanfitriones/${freshSlug}`);
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
      const finalCategory = (editCategory === 'Otro' ? editCustomCategory : editCategory).trim() || 'Cultura';
      const finalFolder = (editFolder === '__NEW__' ? editCustomFolder : editFolder).trim();
      
      // Asegurar slug limpio y único
      let finalSlug = cleanSlug(editSlug.trim() || editTitle.trim());
      const isTaken = await isMagazineSlugTaken(finalSlug, editingFlipbook.id);
      if (isTaken) {
        finalSlug = await generateUniqueMagazineSlug(finalSlug, editingFlipbook.id);
      }

      const docRef = doc(db, 'flipbooks', editingFlipbook.id);
      await updateDoc(docRef, {
        title: editTitle.trim(),
        slug: finalSlug,
        description: editDescription.trim(),
        category: finalCategory,
        folder: finalFolder,
        coverUrl: editCoverUrl.trim(),
        autoPlayDefault: editAutoPlayDefault,
        autoPlayInterval: Number(editAutoPlayInterval) || 5,
        audioUrl: editAudioUrl.trim(),
        autoPlayAudio: editAutoPlayAudio,
      });

      // If it's a new folder and doesn't exist yet, save doc
      if (finalFolder && !folders.some(f => f.name.toLowerCase() === finalFolder.toLowerCase())) {
        try {
          await addDoc(collection(db, 'flipbook_folders'), {
            name: finalFolder,
            description: '',
            createdAt: Timestamp.now()
          });
        } catch {}
      }

      toast.success("¡Periódico actualizado correctamente!");
      setEditingFlipbook(null);
    } catch (err: any) {
      console.error("Error updating flipbook:", err);
      toast.error("Error al actualizar el periódico: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Selection helpers
  const toggleSelectFlipbook = (id: string) => {
    setSelectedFlipbookIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredFlipbooks.map(fb => fb.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedFlipbookIds.includes(id));
    if (allSelected) {
      setSelectedFlipbookIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedFlipbookIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Batch move execution
  const handleBatchMove = async () => {
    if (selectedFlipbookIds.length === 0) return;
    const target = (batchTargetFolder === '__NEW__' ? batchCustomFolder : batchTargetFolder).trim();
    setIsBatchProcessing(true);
    try {
      const batch = writeBatch(db);
      selectedFlipbookIds.forEach(id => {
        const docRef = doc(db, 'flipbooks', id);
        batch.update(docRef, { folder: target });
      });
      await batch.commit();

      if (target && !folders.some(f => f.name.toLowerCase() === target.toLowerCase())) {
        try {
          await addDoc(collection(db, 'flipbook_folders'), {
            name: target,
            description: '',
            createdAt: Timestamp.now()
          });
        } catch {}
      }

      toast.success(
        target
          ? `Se movieron ${selectedFlipbookIds.length} periódicos a la subcarpeta "${target}"`
          : `Se movieron ${selectedFlipbookIds.length} periódicos a la Sección Principal`
      );
      setSelectedFlipbookIds([]);
      setIsBatchMoveModalOpen(false);
      setBatchTargetFolder('');
      setBatchCustomFolder('');
    } catch (err: any) {
      console.error("Batch move error:", err);
      toast.error("Error al mover periódicos: " + err.message);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  // Create or rename folder
  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = folderNameInput.trim();
    if (!name) {
      toast.error("Ingresa el nombre de la subcarpeta");
      return;
    }

    setSavingFolder(true);
    try {
      if (folderEditingDoc) {
        const oldName = folderEditingDoc.name;
        await updateDoc(doc(db, 'flipbook_folders', folderEditingDoc.id), {
          name,
          description: folderDescInput.trim()
        });

        // Batch update flipbooks with oldName
        const matchingFlipbooks = flipbooks.filter(fb => fb.folder === oldName);
        if (matchingFlipbooks.length > 0) {
          const batch = writeBatch(db);
          matchingFlipbooks.forEach(fb => {
            batch.update(doc(db, 'flipbooks', fb.id), { folder: name });
          });
          await batch.commit();
        }

        toast.success(`Subcarpeta renombrada a "${name}"`);
        if (selectedFolderFilter === oldName) {
          setSelectedFolderFilter(name);
        }
      } else {
        await addDoc(collection(db, 'flipbook_folders'), {
          name,
          description: folderDescInput.trim(),
          createdAt: Timestamp.now()
        });
        toast.success(`Subcarpeta "${name}" creada con éxito`);
        setSelectedFolderFilter(name);
      }

      setIsFolderModalOpen(false);
      setFolderEditingDoc(null);
      setFolderNameInput('');
      setFolderDescInput('');
    } catch (err: any) {
      console.error("Error saving folder:", err);
      toast.error("Error al guardar la subcarpeta: " + err.message);
    } finally {
      setSavingFolder(false);
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folderName: string) => {
    if (window.confirm(`¿Deseas eliminar la subcarpeta "${folderName}"? Las ediciones que contiene no se borrarán; regresarán a la Sección Principal.`)) {
      try {
        const matching = flipbooks.filter(fb => fb.folder === folderName);
        if (matching.length > 0) {
          const batch = writeBatch(db);
          matching.forEach(fb => {
            batch.update(doc(db, 'flipbooks', fb.id), { folder: '' });
          });
          await batch.commit();
        }

        const docToDelete = folders.find(f => f.name.toLowerCase() === folderName.toLowerCase());
        if (docToDelete) {
          await deleteDoc(doc(db, 'flipbook_folders', docToDelete.id));
        }

        toast.success(`Subcarpeta "${folderName}" eliminada y sus ediciones fueron enviadas a la Sección Principal`);
        if (selectedFolderFilter === folderName) {
          setSelectedFolderFilter('ALL');
        }
      } catch (err: any) {
        console.error("Error deleting folder:", err);
        toast.error("Error al eliminar la subcarpeta: " + err.message);
      }
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Periódicos y Ediciones</h1>
            <p className="text-sm font-medium text-slate-500">
              Administra tus periódicos y ediciones digitales: hojeado interactivo, música de fondo MP3 y datos.
            </p>
          </div>
          
          <Button 
            onClick={() => navigate('/admin/flipbooks/nuevo')}
            className="h-14 bg-slate-900 text-white hover:bg-[#00AEEF] rounded-2xl px-6 shadow-lg transition-all font-black text-xs uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nuevo Periódico (PDF)
          </Button>
        </div>

        {/* Navigation & Subfolders Tabs */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-amber-500 fill-amber-500/20" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                Subcarpetas y Colecciones
              </h2>
              <span className="text-xs font-bold text-slate-400">
                ({allFolderNames.length} {allFolderNames.length === 1 ? 'carpeta' : 'carpetas'})
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={() => {
                  setFolderEditingDoc(null);
                  setFolderNameInput('');
                  setFolderDescInput('');
                  setIsFolderModalOpen(true);
                }}
                className="h-9 px-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <FolderPlus className="h-4 w-4 text-amber-600" />
                <span>Nueva Subcarpeta</span>
              </Button>

              {filteredFlipbooks.length > 0 && (
                <Button
                  onClick={handleSelectAllVisible}
                  variant="outline"
                  className="h-9 px-3 rounded-xl border-slate-200 font-bold text-xs text-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckSquare className="h-3.5 w-3.5 text-[#00AEEF]" />
                  <span>
                    {filteredFlipbooks.every(fb => selectedFlipbookIds.includes(fb.id))
                      ? 'Deseleccionar todos'
                      : 'Seleccionar visibles'}
                  </span>
                </Button>
              )}
            </div>
          </div>

          {/* Folder Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {/* Tab: Todos */}
            <button
              type="button"
              onClick={() => setSelectedFolderFilter('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                selectedFolderFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Todos</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                selectedFolderFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {flipbooks.length}
              </span>
            </button>

            {/* Tab: Sección Principal (Sin carpeta) */}
            <button
              type="button"
              onClick={() => setSelectedFolderFilter('MAIN')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                selectedFolderFilter === 'MAIN'
                  ? 'bg-[#00AEEF] text-white shadow-md shadow-sky-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Sección Principal</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                selectedFolderFilter === 'MAIN' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {flipbooks.filter(fb => !fb.folder || fb.folder.trim() === '').length}
              </span>
            </button>

            {/* Tabs for each individual Folder */}
            {allFolderNames.map((folderName) => {
              const count = flipbooks.filter(fb => fb.folder?.toLowerCase() === folderName.toLowerCase()).length;
              const isActive = selectedFolderFilter.toLowerCase() === folderName.toLowerCase();
              const folderDoc = folders.find(f => f.name.toLowerCase() === folderName.toLowerCase());

              return (
                <div
                  key={folderName}
                  className={`inline-flex items-center rounded-xl p-1 shrink-0 border transition-all ${
                    isActive
                      ? 'bg-amber-50 border-amber-300 shadow-sm ring-1 ring-amber-300'
                      : 'bg-slate-100 border-transparent hover:bg-slate-200/80'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedFolderFilter(folderName)}
                    className={`px-3 py-1 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
                      isActive ? 'text-amber-950 font-black' : 'text-slate-700'
                    }`}
                  >
                    <Folder className={`h-3.5 w-3.5 ${isActive ? 'text-amber-600 fill-amber-500/20' : 'text-slate-400'}`} />
                    <span>{folderName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-amber-200 text-amber-950' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {count}
                    </span>
                  </button>

                  {/* Actions for this folder (Edit / Delete) */}
                  <div className="flex items-center border-l border-slate-300/60 ml-1 pl-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFolderEditingDoc(folderDoc || { id: '', name: folderName });
                        setFolderNameInput(folderName);
                        setFolderDescInput(folderDoc?.description || '');
                        setIsFolderModalOpen(true);
                      }}
                      className="p-1 hover:text-amber-700 text-slate-400 rounded-md transition-colors cursor-pointer"
                      title={`Editar nombre de carpeta "${folderName}"`}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folderName);
                      }}
                      className="p-1 hover:text-red-600 text-slate-400 rounded-md transition-colors cursor-pointer"
                      title={`Eliminar carpeta "${folderName}"`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content list or Loading spinner */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white rounded-[2.5rem]">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent"></div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-2">Cargando publicaciones...</p>
          </div>
        ) : filteredFlipbooks.length === 0 ? (
          <div className="py-24 text-center space-y-4 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00AEEF]/5 text-[#00AEEF]">
              <BookOpen className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="font-black text-slate-900 text-sm">
                {selectedFolderFilter === 'ALL' 
                  ? 'No hay periódicos o Flipbooks creados'
                  : selectedFolderFilter === 'MAIN'
                  ? 'No hay periódicos en la Sección Principal'
                  : `No hay periódicos en la subcarpeta "${selectedFolderFilter}"`}
              </p>
              <p className="text-xs font-medium text-slate-400 max-w-sm mx-auto">
                {selectedFolderFilter !== 'ALL'
                  ? 'Puedes seleccionar periódicos desde otra pestaña y moverlos aquí con la barra de acciones.'
                  : 'Carga tu primer PDF hoy para ofrecerle a los lectores una experiencia de lectura interactiva completa.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              {selectedFolderFilter !== 'ALL' && (
                <Button
                  onClick={() => setSelectedFolderFilter('ALL')}
                  variant="outline"
                  className="h-12 rounded-xl px-5 font-black text-xs uppercase tracking-widest cursor-pointer"
                >
                  Ver todas las ediciones
                </Button>
              )}
              <Button
                onClick={() => navigate('/admin/flipbooks/nuevo')}
                className="h-12 bg-slate-900 text-white hover:bg-[#00AEEF] rounded-xl px-5 font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
              >
                Subir nuevo periódico
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredFlipbooks.map((fb, index) => {
                const isSelected = selectedFlipbookIds.includes(fb.id);

                return (
                  <motion.div
                    key={fb.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className={`border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden flex flex-col justify-between h-full group border transition-all relative ${
                      isSelected 
                        ? 'ring-2 ring-[#00AEEF] shadow-lg shadow-sky-500/10' 
                        : 'border-slate-100 hover:shadow-xl'
                    }`}>
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

                        {/* Top-Right: Selection Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectFlipbook(fb.id);
                          }}
                          className={`absolute top-4 right-4 z-20 h-9 w-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md ${
                            isSelected
                              ? 'bg-[#00AEEF] text-white ring-2 ring-white scale-105'
                              : 'bg-slate-900/60 text-white/80 hover:bg-slate-900 hover:text-white backdrop-blur-sm'
                          }`}
                          title={isSelected ? "Deseleccionar edición" : "Seleccionar para mover de carpeta"}
                        >
                          {isSelected ? (
                            <Check className="h-5 w-5 stroke-[3]" />
                          ) : (
                            <Square className="h-5 w-5 opacity-70" />
                          )}
                        </button>
                        
                        {/* Interactive Float Badges (Left) */}
                        <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10 max-w-[70%]">
                          {/* Subfolder Badge */}
                          {fb.folder ? (
                            <span className="bg-amber-500/95 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-sm truncate">
                              <Folder className="h-2.5 w-2.5 fill-current shrink-0" />
                              <span className="truncate">{fb.folder}</span>
                            </span>
                          ) : (
                            <span className="bg-slate-800/80 text-slate-200 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-sm">
                              Sección Principal
                            </span>
                          )}

                          <span className="bg-slate-900/90 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-sm w-fit">
                            {fb.pageUrls?.length || 0} Páginas
                          </span>

                          {fb.autoPlayDefault && (
                            <span className="bg-[#FFF200] text-slate-950 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm w-fit">
                              <Play className="h-2.5 w-2.5 fill-current" />
                              Auto ({fb.autoPlayInterval || 5}s)
                            </span>
                          )}

                          {fb.audioUrl && (
                            <span className="bg-[#00AEEF] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm w-fit">
                              <Music className="h-2.5 w-2.5" />
                              Audio {fb.autoPlayAudio ? '(Auto)' : ''}
                            </span>
                          )}
                        </div>

                        {/* Floating Link Shortcuts */}
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <Link 
                            to={`/losanfitriones/${fb.slug || fb.id}`}
                            target="_blank"
                            className="h-12 w-12 rounded-xl bg-white text-slate-900 hover:bg-[#00AEEF] hover:text-white transition-all flex items-center justify-center shadow-lg cursor-pointer"
                            title="Abrir en pestaña nueva"
                          >
                            <ExternalLink className="h-5 w-5" />
                          </Link>
                          <button 
                            onClick={() => {
                              const url = `${window.location.origin}/losanfitriones/${fb.slug || fb.id}`;
                              navigator.clipboard.writeText(url);
                              toast.success("¡Enlace copiado al portapapeles!");
                            }}
                            className="h-12 w-12 rounded-xl bg-white text-slate-900 hover:bg-[#00AEEF] hover:text-white transition-all flex items-center justify-center shadow-lg cursor-pointer"
                            title="Copiar enlace amigable"
                          >
                            <Share2 className="h-5 w-5" />
                          </button>
                          <button 
                            onClick={() => handleOpenEdit(fb)}
                            className="h-12 w-12 rounded-xl bg-white text-slate-900 hover:bg-[#FFF200] hover:text-slate-950 transition-all flex items-center justify-center shadow-lg cursor-pointer"
                            title="Editar periódico"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* Meta description body */}
                      <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest gap-2">
                            <div className="flex items-center gap-2 text-[#00AEEF]">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {fb.createdAt 
                                  ? format(fb.createdAt.toDate(), "d 'de' MMMM, yyyy", { locale: es }) 
                                  : "N/A"}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[9px] border border-slate-200">
                              {fb.category || 'Cultura'}
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
                          <div className="pt-1 flex items-center gap-1.5 text-[11px] font-mono text-slate-400 truncate">
                            <Link2 className="h-3 w-3 text-[#00AEEF] shrink-0" />
                            <span className="truncate">/losanfitriones/{fb.slug || fb.id}</span>
                          </div>
                        </div>

                        {/* Sub footer stats + Actions */}
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs">
                            <Eye className="h-4 w-4" />
                            <span>{fb.views || 0} visitas</span>
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Quick move to folder button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedFlipbookIds([fb.id]);
                                setBatchTargetFolder(fb.folder || '');
                                setBatchCustomFolder('');
                                setIsBatchMoveModalOpen(true);
                              }}
                              className="h-10 w-10 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                              title="Mover a subcarpeta"
                            >
                              <Folder className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const url = `${window.location.origin}/losanfitriones/${fb.slug || fb.id}`;
                                navigator.clipboard.writeText(url);
                                toast.success("¡Enlace copiado al portapapeles!");
                              }}
                              className="h-10 w-10 text-slate-400 hover:text-[#00AEEF] hover:bg-sky-50 rounded-xl transition-colors cursor-pointer"
                              title="Copiar enlace amigable"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(fb)}
                              className="h-10 w-10 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                              title="Editar periódico"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteFlipbook(fb.id, fb.title)}
                              className="h-10 w-10 text-slate-400 hover:text-[#ED1C24] hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                              title="Eliminar periódico"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* FLOATING ACTION BAR FOR MULTI-SELECTION */}
        <AnimatePresence>
          {selectedFlipbookIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 inset-x-4 max-w-2xl mx-auto z-40 bg-slate-900/95 text-white backdrop-blur-md p-3.5 sm:p-4 rounded-2xl md:rounded-3xl shadow-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5">
                <span className="h-7 px-2.5 rounded-full bg-[#00AEEF] text-white font-black text-xs flex items-center justify-center">
                  {selectedFlipbookIds.length}
                </span>
                <span className="text-xs sm:text-sm font-bold">
                  {selectedFlipbookIds.length === 1 ? 'periódico seleccionado' : 'periódicos seleccionados'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={() => {
                    setBatchTargetFolder('');
                    setBatchCustomFolder('');
                    setIsBatchMoveModalOpen(true);
                  }}
                  className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Folder className="h-4 w-4 fill-slate-950" />
                  <span>Mover a Subcarpeta</span>
                </Button>

                <Button
                  onClick={async () => {
                    if (window.confirm(`¿Mover ${selectedFlipbookIds.length} periódicos a la Sección Principal?`)) {
                      const batch = writeBatch(db);
                      selectedFlipbookIds.forEach(id => {
                        batch.update(doc(db, 'flipbooks', id), { folder: '' });
                      });
                      await batch.commit();
                      toast.success(`${selectedFlipbookIds.length} periódicos movidos a la Sección Principal.`);
                      setSelectedFlipbookIds([]);
                    }
                  }}
                  variant="outline"
                  className="h-10 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border-slate-700 text-xs font-bold cursor-pointer"
                  title="Sacar de subcarpeta y dejar en la sección principal"
                >
                  <Layers className="h-3.5 w-3.5 mr-1" />
                  <span>A Sección Principal</span>
                </Button>

                <Button
                  onClick={() => setSelectedFlipbookIds([])}
                  variant="ghost"
                  className="h-10 w-10 p-0 text-slate-400 hover:text-white rounded-xl cursor-pointer"
                  title="Cancelar selección"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL: BATCH MOVE TO FOLDER */}
        <AnimatePresence>
          {isBatchMoveModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden"
              >
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <Folder className="h-5 w-5 fill-amber-500/20" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">
                        Mover Periódicos
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        {selectedFlipbookIds.length} {selectedFlipbookIds.length === 1 ? 'edición seleccionada' : 'ediciones seleccionadas'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsBatchMoveModalOpen(false)}
                    className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      Selecciona la Subcarpeta Destino
                    </label>
                    <select
                      value={batchTargetFolder}
                      onChange={(e) => setBatchTargetFolder(e.target.value)}
                      className="w-full h-12 px-3.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-800"
                    >
                      <option value="">📂 Sección Principal (Afuera, sin subcarpeta)</option>
                      {allFolderNames.map((name) => (
                        <option key={name} value={name}>
                          📁 {name} ({flipbooks.filter(fb => fb.folder?.toLowerCase() === name.toLowerCase()).length} periódicos)
                        </option>
                      ))}
                      <option value="__NEW__">➕ Crear nueva subcarpeta...</option>
                    </select>
                  </div>

                  {batchTargetFolder === '__NEW__' && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                        Nombre de la nueva subcarpeta
                      </label>
                      <Input
                        value={batchCustomFolder}
                        onChange={(e) => setBatchCustomFolder(e.target.value)}
                        placeholder="Ej. Los Anfitriones 2025"
                        className="h-12 rounded-xl border-amber-300 font-bold text-xs"
                        autoFocus
                      />
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    💡 <strong>En la sección pública:</strong> Los periódicos asignados a una subcarpeta se mostrarán dentro de su respectiva tarjeta/sección coleccionable. Los que estén en la Sección Principal se mostrarán de inmediato en el catálogo exterior.
                  </p>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsBatchMoveModalOpen(false)}
                      className="h-11 px-4 rounded-xl text-xs font-bold uppercase text-slate-500 cursor-pointer"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      disabled={isBatchProcessing || (batchTargetFolder === '__NEW__' && !batchCustomFolder.trim())}
                      onClick={handleBatchMove}
                      className="h-11 px-5 rounded-xl bg-slate-900 hover:bg-[#00AEEF] text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      {isBatchProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Moviendo...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Confirmar y Mover</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: CREATE OR EDIT FOLDER */}
        <AnimatePresence>
          {isFolderModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden"
              >
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <FolderPlus className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">
                        {folderEditingDoc?.id ? 'Renombrar Subcarpeta' : 'Nueva Subcarpeta'}
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Agrupa periódicos y ediciones por año, temporada o evento
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsFolderModalOpen(false);
                      setFolderEditingDoc(null);
                    }}
                    className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveFolder} className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      Nombre de la Subcarpeta *
                    </label>
                    <Input
                      value={folderNameInput}
                      onChange={(e) => setFolderNameInput(e.target.value)}
                      placeholder="Ej. Los Anfitriones 2025"
                      className="h-12 rounded-xl border-slate-200 font-bold"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      Descripción (Opcional)
                    </label>
                    <Textarea
                      value={folderDescInput}
                      onChange={(e) => setFolderDescInput(e.target.value)}
                      placeholder="Breve detalle sobre las ediciones en esta carpeta..."
                      className="rounded-xl border-slate-200 min-h-[70px]"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIsFolderModalOpen(false);
                        setFolderEditingDoc(null);
                      }}
                      className="h-11 px-4 rounded-xl text-xs font-bold uppercase text-slate-500 cursor-pointer"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={savingFolder}
                      className="h-11 px-5 rounded-xl bg-slate-900 hover:bg-[#00AEEF] text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      {savingFolder ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>{folderEditingDoc?.id ? 'Guardar Cambios' : 'Crear Subcarpeta'}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
                        Gestionar Periódico
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Edición de datos, subcarpeta, auto-play y audio MP3 de fondo
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
                      Título del Periódico / Edición *
                    </label>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Ej. Periódico Zapotlán Gráfico - Edición Especial 2026"
                      className="h-12 rounded-xl border-slate-200"
                      required
                    />
                  </div>

                  {/* Subcarpeta / Colección */}
                  <div className="space-y-2 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Folder className="h-3.5 w-3.5 text-amber-600" />
                        Subcarpeta o Colección
                      </label>
                      <span className="text-[10px] font-bold text-amber-700">
                        {editFolder === '__NEW__' ? (editCustomFolder || 'Nueva subcarpeta') : (editFolder || 'Sección Principal')}
                      </span>
                    </div>

                    <select
                      value={editFolder}
                      onChange={(e) => {
                        setEditFolder(e.target.value);
                        if (e.target.value !== '__NEW__') setEditCustomFolder('');
                      }}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-800"
                    >
                      <option value="">📂 Sección Principal (Afuera, sin subcarpeta)</option>
                      {allFolderNames.map((folderName) => (
                        <option key={folderName} value={folderName}>
                          📁 {folderName}
                        </option>
                      ))}
                      <option value="__NEW__">➕ Crear nueva subcarpeta...</option>
                    </select>

                    {editFolder === '__NEW__' && (
                      <Input
                        value={editCustomFolder}
                        onChange={(e) => setEditCustomFolder(e.target.value)}
                        placeholder="Escribe el nombre de la subcarpeta (ej. Los Anfitriones 2025)..."
                        className="h-11 rounded-xl border-amber-300 text-xs font-bold bg-white"
                        autoFocus
                      />
                    )}
                    <p className="text-[10px] text-slate-500">
                      Las ediciones en subcarpetas se mostrarán agrupadas en la sección pública; las que dejes en la Sección Principal se mostrarán de forma directa.
                    </p>
                  </div>

                  {/* Enlace Amigable (Slug URL) */}
                  <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5 text-[#00AEEF]" />
                        Enlace Amigable (Slug)
                      </label>
                      <button
                        type="button"
                        onClick={handleRegenerateSlug}
                        className="text-[10px] font-bold text-[#00AEEF] hover:underline flex items-center gap-1 cursor-pointer"
                        title="Regenerar slug a partir del título"
                      >
                        <Sparkles className="h-3 w-3" />
                        Generar desde título
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400 select-none shrink-0">
                        /losanfitriones/
                      </span>
                      <Input
                        value={editSlug}
                        onChange={(e) => setEditSlug(cleanSlug(e.target.value))}
                        placeholder="ej. edicion-3-2025"
                        className="h-10 rounded-xl border-slate-200 font-mono text-xs font-bold text-slate-800 bg-white"
                      />
                    </div>
                    <p className="text-[10px] font-medium text-slate-400">
                      Este será el link amigable para compartir en WhatsApp, Facebook e Instagram.
                    </p>
                  </div>

                  {/* Categoría Editorial */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Tag className="h-3 w-3 text-[#00AEEF]" />
                        Categoría (Escaparate Público)
                      </label>
                      <span className="text-[10px] font-bold text-slate-500">
                        {editCategory === 'Otro' ? (editCustomCategory || 'Personalizada') : editCategory}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {MAGAZINE_CATEGORIES.map((cat) => {
                        const CatIcon = cat.icon;
                        const isSelected = editCategory === cat.name;
                        return (
                          <button
                            key={cat.name}
                            type="button"
                            onClick={() => {
                              setEditCategory(cat.name);
                              setEditCustomCategory('');
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                              isSelected 
                                ? cat.activeBg + ' border-transparent shadow-md' 
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/70'
                            }`}
                          >
                            <CatIcon className={`h-3 w-3 ${isSelected ? 'text-white' : cat.color}`} />
                            <span>{cat.name}</span>
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setEditCategory('Otro')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          editCategory === 'Otro'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/70'
                        }`}
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Otra</span>
                      </button>
                    </div>

                    {editCategory === 'Otro' && (
                      <Input
                        value={editCustomCategory}
                        onChange={(e) => setEditCustomCategory(e.target.value)}
                        placeholder="Escribe la categoría personalizada..."
                        className="h-10 rounded-xl border-slate-200 text-xs font-bold mt-1"
                        autoFocus
                      />
                    )}
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
                            Pasa las páginas solo automáticamente al abrir el periódico.
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
                          onChange={(e) => {
                            const raw = e.target.value;
                            const formatted = formatAudioStreamUrl(raw);
                            setEditAudioUrl(formatted);
                            if (formatted !== raw && raw.includes('drive.google.com')) {
                              toast.success("Enlace de Google Drive transformado para streaming directo");
                            }
                          }}
                          placeholder="Pega enlace de Google Drive, Dropbox o URL directa .mp3..."
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

                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        Tip: Si usas <strong>Google Drive</strong>, comparte el archivo como <em>&quot;Cualquier persona con el enlace&quot;</em> y pega aquí el link copiado. Se convertirá automáticamente a streaming directo.
                      </p>

                      {/* Audio Player Preview */}
                      {editAudioUrl && (
                        <div className="pt-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Escuchar audio configurado:
                          </p>
                          <audio controls src={formatAudioStreamUrl(editAudioUrl)} className="w-full h-10 rounded-lg" />
                        </div>
                      )}
                    </div>

                    {/* Auto-Play Audio Toggle */}
                    {editAudioUrl && (
                      <div className="flex items-center justify-between pt-3 border-t border-[#00AEEF]/10">
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            ¿Reproducir audio automáticamente al abrir el periódico?
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
