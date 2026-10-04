import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/firebase';
import { collection, addDoc, Timestamp, onSnapshot, query, getDocs, limit } from 'firebase/firestore';
import { useSettings } from '@/lib/SettingsContext';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Upload, 
  BookOpen, 
  Eye, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  FileCode,
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  Play,
  Music,
  Clock,
  Tag,
  Leaf,
  Utensils,
  Cpu,
  Heart,
  Newspaper,
  Compass,
  Folder,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { formatAudioStreamUrl } from '@/lib/audioUrlHelper';
import { generateUniqueMagazineSlug } from '@/lib/slugHelper';

export const MAGAZINE_CATEGORIES = [
  { name: 'Cultura', icon: Leaf, color: 'text-emerald-600', activeBg: 'bg-emerald-500 text-white shadow-emerald-500/25', border: 'border-emerald-200' },
  { name: 'Gastronomía', icon: Utensils, color: 'text-amber-600', activeBg: 'bg-amber-500 text-white shadow-amber-500/25', border: 'border-amber-200' },
  { name: 'Tecnología', icon: Cpu, color: 'text-blue-600', activeBg: 'bg-blue-600 text-white shadow-blue-500/25', border: 'border-blue-200' },
  { name: 'Salud y Bienestar', icon: Heart, color: 'text-rose-500', activeBg: 'bg-rose-500 text-white shadow-rose-500/25', border: 'border-rose-200' },
  { name: 'Actualidad', icon: Newspaper, color: 'text-sky-600', activeBg: 'bg-sky-500 text-white shadow-sky-500/25', border: 'border-sky-200' },
  { name: 'Viajes', icon: Compass, color: 'text-cyan-600', activeBg: 'bg-cyan-600 text-white shadow-cyan-500/25', border: 'border-cyan-200' },
  { name: 'Naturaleza', icon: Leaf, color: 'text-green-600', activeBg: 'bg-green-600 text-white shadow-green-500/25', border: 'border-green-200' },
];

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export default function FlipbookMaker() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  
  // ImgBB Key logic
  const activeImgbbKey = settings.imgbbApiKey || localStorage.getItem('imgbb_api_key') || '';

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Cultura');
  const [customCategory, setCustomCategory] = useState('');
  const [folder, setFolder] = useState('');
  const [customFolder, setCustomFolder] = useState('');
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [coverUrl, setCoverUrl] = useState('');
  const [autoPlayDefault, setAutoPlayDefault] = useState(false);
  const [autoPlayInterval, setAutoPlayInterval] = useState(5);
  const [audioUrl, setAudioUrl] = useState('');
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  
  // PDF JS & Processing states
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [totalPagesCount, setTotalPagesCount] = useState(0);
  const [currentPageNum, setCurrentPageNum] = useState(0);
  const [uploadedPageUrls, setUploadedPageUrls] = useState<string[]>([]);
  const [imgbbErrorLog, setImgbbErrorLog] = useState('');

  // Drag and drop state
  const [dragActive, setDragActive] = useState(false);

  // Load existing subfolders on mount
  useEffect(() => {
    const unsubFolders = onSnapshot(collection(db, 'flipbook_folders'), (snap) => {
      const names = new Set<string>();
      snap.forEach(d => {
        if (d.data().name?.trim()) names.add(d.data().name.trim());
      });
      getDocs(query(collection(db, 'flipbooks'), limit(150))).then(fbSnap => {
        fbSnap.forEach(d => {
          if (d.data().folder?.trim()) names.add(d.data().folder.trim());
        });
        setAvailableFolders(Array.from(names).sort());
      }).catch(() => {
        setAvailableFolders(Array.from(names).sort());
      });
    }, (err) => {
      console.warn("Could not load folders:", err);
    });
    return () => unsubFolders();
  }, []);

  // Load PDF.js from CDN dynamically to keep build extremely clean and reliable
  useEffect(() => {
    if (window.pdfjsLib) {
      setPdfJsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      // Configure worker
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      setPdfJsLoaded(true);
    };
    script.onerror = () => {
      toast.error('Error al cargar la librería de renderizado PDF.');
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const pdfFile = droppedFiles.find(f => f.type === 'application/pdf');
      if (pdfFile) {
        setFile(pdfFile);
        setImageFiles([]);
        toast.success(`Archivo PDF seleccionado: ${pdfFile.name}`);
      } else {
        const validImages = droppedFiles.filter(f => f.type.startsWith('image/'));
        if (validImages.length > 0) {
          validImages.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
          setImageFiles(validImages);
          setFile(null);
          toast.success(`${validImages.length} imágenes de páginas seleccionadas en resolución completa original.`);
        } else {
          toast.error('Solo se permite subir archivos en formato PDF o imágenes (JPG, PNG, WebP).');
        }
      }
    }
  };

  const handleChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const pdfFile = selectedFiles.find(f => f.type === 'application/pdf');
      if (pdfFile) {
        setFile(pdfFile);
        setImageFiles([]);
        toast.success(`Archivo PDF seleccionado: ${pdfFile.name}`);
      } else {
        const validImages = selectedFiles.filter(f => f.type.startsWith('image/'));
        if (validImages.length > 0) {
          validImages.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
          setImageFiles(validImages);
          setFile(null);
          toast.success(`${validImages.length} imágenes de páginas seleccionadas en resolución completa original.`);
        } else {
          toast.error('Solo se permite subir archivos en formato PDF o imágenes (JPG, PNG, WebP).');
        }
      }
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const audioFile = e.target.files?.[0];
    if (!audioFile) return;

    if (!audioFile.type.includes('audio') && !audioFile.name.endsWith('.mp3')) {
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
              filename: audioFile.name,
              base64Data
            })
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText.startsWith('<') ? 'Error en el servidor al procesar el archivo' : errText);
          }

          const data = await res.json();
          if (data.success && data.url) {
            setAudioUrl(data.url);
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
      reader.readAsDataURL(audioFile);
    } catch (err: any) {
      console.error(err);
      toast.error("Error al procesar el archivo");
      setUploadingAudio(false);
    }
  };

  // Convert PDF Canvas to Blob to upload to ImgBB with Ultra-HD fidelity
  const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas conversion to blob failed'));
      }, 'image/jpeg', 0.98); // 98% quality JPEG preserves full text clarity
    });
  };

  // Subir imagen individual a ImgBB
  const uploadPageToImgBB = async (imageBlob: Blob, pageNum: number): Promise<string> => {
    const uploadForm = new FormData();
    uploadForm.append('image', imageBlob);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${activeImgbbKey}`, {
        method: 'POST',
        body: uploadForm
      });

      if (!response.ok) {
        throw new Error(`Código HTTP: ${response.status}`);
      }

      const result = await response.json();
      if (result && result.data) {
        const directUrl = result.data.image?.url || result.data.url;
        if (directUrl) return directUrl;
      }
      throw new Error("ImgBB no retornó una URL de imagen válida.");
    } catch (err: any) {
      console.error(`Error de subida para página ${pageNum}:`, err);
      throw err;
    }
  };

  const handleProcessAndCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Por favor escribe un título para el Flipbook.');
      return;
    }

    if (!file && imageFiles.length === 0) {
      toast.error('Selecciona un archivo PDF o imágenes de las páginas.');
      return;
    }

    if (!activeImgbbKey) {
      toast.error('Se requiere la API Key de ImgBB para convertir y alojar las páginas del PDF. Configúrala en Ajustes.');
      return;
    }

    setProcessing(true);
    setUploadedPageUrls([]);
    setImgbbErrorLog('');

    try {
      const pageUrlsList: string[] = [];
      let currentCoverUrl = '';

      // CASE 1: DIRECT HIGH-RESOLUTION IMAGES (100% full original resolution, no re-encoding)
      if (imageFiles.length > 0) {
        const totalPages = imageFiles.length;
        setTotalPagesCount(totalPages);
        setCurrentStep(`Preparando subida de ${totalPages} páginas en resolución completa original...`);
        toast.info(`Iniciando subida de ${totalPages} páginas en resolución 100% nativa...`);

        for (let i = 1; i <= totalPages; i++) {
          const imgFile = imageFiles[i - 1];
          setCurrentPageNum(i);
          setCurrentStep(`Subiendo página ${i}/${totalPages} (${imgFile.name}) en resolución original...`);

          const uploadedUrl = await uploadPageToImgBB(imgFile, i);
          pageUrlsList.push(uploadedUrl);

          if (i === 1) {
            currentCoverUrl = uploadedUrl;
          }
          setUploadedPageUrls([...pageUrlsList]);
        }
      } 
      // CASE 2: PDF DOCUMENT CONVERTED AT ULTRA-HD PRINT RESOLUTION (~4000px)
      else if (file) {
        if (!pdfJsLoaded || !window.pdfjsLib) {
          toast.error('La librería PDF.js todavía se está cargando. Espera un momento.');
          setProcessing(false);
          return;
        }

        setCurrentStep('Abriendo archivo PDF...');
        const arrayBuffer = await file.arrayBuffer();
        const typedArray = new Uint8Array(arrayBuffer);
        const pdfjsLib = window.pdfjsLib;

        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        const totalPages = pdf.numPages;
        setTotalPagesCount(totalPages);

        setCurrentStep(`PDF cargado con éxito. Procesando ${totalPages} páginas en Ultra-HD...`);
        toast.info(`Iniciando conversión Ultra-HD de ${totalPages} páginas...`);

        for (let i = 1; i <= totalPages; i++) {
          setCurrentPageNum(i);
          setCurrentStep(`Renderizando en Ultra-HD página ${i}/${totalPages}...`);

          const page = await pdf.getPage(i);
          const baseViewport = page.getViewport({ scale: 1.0 });
          const maxDimension = Math.max(baseViewport.width, baseViewport.height);
          // Scale factor targeting ~3800px-4000px print-grade resolution (scale 3.5x to 4.5x)
          let optimalScale = 3800 / maxDimension;
          if (optimalScale < 3.5) optimalScale = 3.5;
          if (optimalScale > 4.5) optimalScale = 4.5;

          const viewport = page.getViewport({ scale: optimalScale });

          const canvas = document.createElement('canvas');
          canvas.height = Math.round(viewport.height);
          canvas.width = Math.round(viewport.width);

          const context = canvas.getContext('2d', { alpha: false });
          if (!context) {
            throw new Error("Could not initialize 2D canvas context");
          }
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = 'high';

          await page.render({ canvasContext: context, viewport: viewport }).promise;

          setCurrentStep(`Comprimiendo página ${i}/${totalPages} en Ultra-HD (98% calidad)...`);
          const blob = await canvasToBlob(canvas);

          setCurrentStep(`Subiendo página ${i}/${totalPages} a ImgBB en alta resolución...`);
          const uploadedUrl = await uploadPageToImgBB(blob, i);
          pageUrlsList.push(uploadedUrl);

          if (i === 1) {
            currentCoverUrl = uploadedUrl;
          }
          setUploadedPageUrls([...pageUrlsList]);
        }
      }

          // Complete uploading step, save to database
          setCurrentStep('Páginas subidas con éxito. Creando publicación en base de datos...');
          
          const publicationSlug = await generateUniqueMagazineSlug(title.trim());

          const finalCategory = (category === 'Otro' ? customCategory : category).trim() || 'Cultura';
          const finalFolder = (folder === '__NEW__' ? customFolder : folder).trim();

          const newFlipbookDoc = {
            title: title.trim(),
            description: description.trim(),
            category: finalCategory,
            folder: finalFolder,
            coverUrl: coverUrl || currentCoverUrl,
            pageUrls: pageUrlsList,
            slug: publicationSlug,
            createdAt: Timestamp.now(),
            views: 0,
            autoPlayDefault,
            autoPlayInterval: Number(autoPlayInterval) || 5,
            audioUrl: audioUrl.trim(),
            autoPlayAudio
          };

          const docRef = await addDoc(collection(db, 'flipbooks'), newFlipbookDoc);

          if (finalFolder && !availableFolders.some(f => f.toLowerCase() === finalFolder.toLowerCase())) {
            try {
              await addDoc(collection(db, 'flipbook_folders'), {
                name: finalFolder,
                description: '',
                createdAt: Timestamp.now()
              });
            } catch {}
          }

          toast.success('¡Flipbook / Periódico publicado correctamente!');
          navigate('/admin/flipbooks');
        } catch (err: any) {
          console.error("Processing failed: ", err);
          setImgbbErrorLog(err.message || String(err));
          toast.error('Ocurrió un error al procesar o subir las páginas: ' + (err.message || String(err)));
        } finally {
          setProcessing(false);
        }
      };

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Header link */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/admin/flipbooks')}
            className="h-10 w-10 rounded-xl hover:bg-slate-100 transition-all text-slate-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Publicar Nuevo Periódico (Flipbook)</h1>
            <p className="text-xs text-slate-400 font-medium font-bold uppercase tracking-widest text-[#00AEEF]">Flipbook Automático por Conversión PDF</p>
          </div>
        </div>

        {!activeImgbbKey && (
          <div className="p-6 bg-red-50 border border-red-100 rounded-[2rem] flex flex-col md:flex-row items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-red-100 text-brand-red flex items-center justify-center shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-wide leading-normal">Se requiere API Key de ImgBB</p>
              <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">
                Este conversor genera imágenes individuales por página y necesita subirlas a la web. Configura tu API Key global de ImgBB en los <strong>Ajustes del Sitio</strong> para habilitar esta funcionalidad de forma nativa.
              </p>
              <Button 
                onClick={() => navigate('/admin/ajustes')}
                className="mt-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest px-4 py-2 hover:bg-slate-800"
              >
                Configurar Clave Ahora
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleProcessAndCreate} className="grid md:grid-cols-3 gap-8">
          {/* Main Info Fields */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-2">Título del Periódico / Edición</label>
                <Input 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Periódico Zapotlán Gráfico - Edición Junio 2026"
                  className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white text-xs font-bold font-sans transition-colors"
                  disabled={processing}
                />
              </div>

              {/* Categoría Editorial */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pl-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <Tag className="h-3 w-3 text-[#00AEEF]" />
                    Categoría del Periódico (Escaparate Público)
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">
                    Seleccionada: <strong className="text-slate-900">{category === 'Otro' ? (customCategory || 'Personalizada') : category}</strong>
                  </span>
                </div>

                {/* Chips de categorías temáticas */}
                <div className="flex flex-wrap gap-2">
                  {MAGAZINE_CATEGORIES.map((cat) => {
                    const CatIcon = cat.icon;
                    const isSelected = category === cat.name;
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => {
                          setCategory(cat.name);
                          setCustomCategory('');
                        }}
                        disabled={processing}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                          isSelected 
                            ? cat.activeBg + ' border-transparent shadow-md' 
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/70'
                        }`}
                      >
                        <CatIcon className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : cat.color}`} />
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}

                  {/* Opción Otro / Personalizada */}
                  <button
                    type="button"
                    onClick={() => setCategory('Otro')}
                    disabled={processing}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                      category === 'Otro'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/70'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Otra categoría</span>
                  </button>
                </div>

                {/* Input si seleccionó 'Otro' */}
                {category === 'Otro' && (
                  <div className="pt-1">
                    <Input
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Escribe el nombre de tu categoría personalizada..."
                      className="h-12 rounded-xl border-slate-200 bg-white text-xs font-bold"
                      disabled={processing}
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Subcarpeta / Colección */}
              <div className="space-y-3 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-1.5">
                    <Folder className="h-4 w-4 text-amber-600" />
                    Subcarpeta o Colección (Opcional)
                  </label>
                  <span className="text-[10px] font-bold text-amber-700">
                    {folder === '__NEW__' ? (customFolder || 'Nueva subcarpeta') : (folder || 'Sección Principal')}
                  </span>
                </div>

                <select
                  value={folder}
                  onChange={(e) => {
                    setFolder(e.target.value);
                    if (e.target.value !== '__NEW__') setCustomFolder('');
                  }}
                  disabled={processing}
                  className="w-full h-12 px-3.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-800"
                >
                  <option value="">📂 Sección Principal (Afuera, sin subcarpeta)</option>
                  {availableFolders.map((fName) => (
                    <option key={fName} value={fName}>
                      📁 {fName}
                    </option>
                  ))}
                  <option value="__NEW__">➕ Crear nueva subcarpeta...</option>
                </select>

                {folder === '__NEW__' && (
                  <div className="pt-1">
                    <Input
                      value={customFolder}
                      onChange={(e) => setCustomFolder(e.target.value)}
                      placeholder="Escribe el nombre de la subcarpeta (ej. Los Anfitriones 2025)..."
                      className="h-12 rounded-xl border-amber-300 font-bold text-xs bg-white"
                      disabled={processing}
                      autoFocus
                    />
                  </div>
                )}

                <p className="text-[9px] text-slate-500 font-medium pl-1 leading-normal">
                  Si seleccionas una subcarpeta (ej. <strong>&quot;Los Anfitriones 2025&quot;</strong>), este periódico quedará guardado dentro de esa carpeta. Si lo dejas en Sección Principal, estará afuera en el catálogo general.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-2">Descripción o Editorial de Edición</label>
                <Textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Escribe un breve resumen de los temas de portada, reportajes de esta edición impresa o catálogo anual..."
                  className="min-h-[120px] rounded-2xl border-slate-100 bg-slate-50 focus:bg-white text-xs font-medium resize-none leading-relaxed p-4"
                  disabled={processing}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-2">Imagen de Portada Alternativa (Opcional)</label>
                <div className="relative">
                  <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                  <Input 
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="Dejar vacío para usar la página 1 del PDF como portada"
                    className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white text-xs font-bold transition-colors"
                    disabled={processing}
                  />
                </div>
                <p className="text-[9px] text-slate-400 font-medium pl-2 leading-normal">
                  De forma predeterminada, la primera hoja extraída del PDF se usará como portada en la sección de periódicos pública.
                </p>
              </div>

              {/* MODO PLAY AUTOMÁTICO */}
              <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <Play className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Paso de Páginas Automático (Modo Play)
                      </p>
                      <p className="text-[11px] text-slate-500">
                        ¿Iniciar el periódico pasando hojas automáticamente por defecto?
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAutoPlayDefault(!autoPlayDefault)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoPlayDefault ? 'bg-amber-500' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        autoPlayDefault ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {autoPlayDefault && (
                  <div className="flex items-center gap-3 pt-2 border-t border-amber-500/10">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                    <label className="text-xs font-bold text-slate-700">
                      Tiempo por página:
                    </label>
                    <select
                      value={autoPlayInterval}
                      onChange={(e) => setAutoPlayInterval(Number(e.target.value))}
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

              {/* AUDIO MP3 DE FONDO */}
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
                      value={audioUrl}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const formatted = formatAudioStreamUrl(raw);
                        setAudioUrl(formatted);
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
                  {audioUrl && (
                    <div className="pt-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Escuchar audio configurado:
                      </p>
                      <audio controls src={formatAudioStreamUrl(audioUrl)} className="w-full h-10 rounded-lg" />
                    </div>
                  )}
                </div>

                {/* Auto-Play Audio Toggle */}
                {audioUrl && (
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
                      onClick={() => setAutoPlayAudio(!autoPlayAudio)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoPlayAudio ? 'bg-[#00AEEF]' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          autoPlayAudio ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>
            </Card>

            {/* Drop PDF or Images Container */}
            <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-8">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-2">
                    Carga de Periódico (PDF o Imágenes)
                  </span>
                  
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                      "border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center transition-all cursor-pointer relative",
                      dragActive ? "border-[#00AEEF] bg-[#00AEEF]/5 scale-98" : "border-slate-200 hover:border-slate-300",
                      file || imageFiles.length > 0 ? "bg-emerald-50/10 border-emerald-200" : ""
                    )}
                  >
                    <input 
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleChangeFile}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      disabled={processing}
                    />

                    {file ? (
                      <div className="text-center space-y-4">
                        <div className="mx-auto h-16 w-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <FileText className="h-8 w-8" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-black text-slate-900 max-w-sm truncate">{file.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB • PDF Listo para Ultra-HD (300 DPI)
                          </p>
                        </div>
                        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-600">
                          Hacer clic o arrastrar para cambiar
                        </span>
                      </div>
                    ) : imageFiles.length > 0 ? (
                      <div className="text-center space-y-4">
                        <div className="mx-auto h-16 w-16 bg-[#00AEEF]/10 text-[#00AEEF] rounded-2xl flex items-center justify-center shadow-lg">
                          <Layers className="h-8 w-8" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-black text-slate-900">
                            {imageFiles.length} páginas seleccionadas
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                            {(imageFiles.reduce((acc, curr) => acc + curr.size, 0) / (1024 * 1024)).toFixed(2)} MB • Resolución 100% original
                          </p>
                        </div>
                        <span className="inline-flex rounded-full bg-[#00AEEF]/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[#00AEEF]">
                          Hacer clic o arrastrar para cambiar
                        </span>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="mx-auto h-16 w-16 bg-slate-50 text-slate-400 rounded-3xl flex items-center justify-center group-hover:scale-105 transition-all">
                          <Upload className="h-8 w-8 text-slate-400" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-black text-slate-900 leading-snug">Arrastra tu PDF o páginas JPG/PNG aquí</p>
                          <p className="text-xs text-slate-500 font-medium">Soporta documento PDF o selección múltiple de páginas en resolución completa</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action and Conversion Status View */}
          <div className="space-y-6">
            <Card className="border-none shadow-sm bg-slate-900 text-white rounded-[2.5rem] overflow-hidden p-8 flex flex-col justify-between min-h-[300px]">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#FFF200] shadow-md shadow-[#FFF200]/10">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Conversor Flipbook</h3>
                  <h2 className="text-lg font-black tracking-tight leading-snug">Publicación Digital con Experiencia de Periódico Real</h2>
                </div>
                <p className="text-[11px] font-medium leading-relaxed text-slate-400">
                  Subir un PDF convierte automáticamente cada página en imagen de alta resolución para que tus lectores experimenten el giro físico de hojas en el modo visor.
                </p>
              </div>

              <div className="pt-8">
                <Button
                  type="submit"
                  disabled={processing || (!file && imageFiles.length === 0) || !activeImgbbKey}
                  className="w-full h-14 rounded-2xl bg-white text-slate-900 hover:bg-[#00AEEF] hover:text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-slate-900" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4" />
                      Convertir y Publicar
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Conversion Processing Board */}
            <AnimatePresence>
              {processing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="border-none shadow-lg bg-slate-950 text-white rounded-[2.5rem] overflow-hidden p-6 space-y-4 border border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-[#00AEEF]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#00AEEF]">Procesamiento Activo</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 uppercase font-black bg-white/5 px-2 py-0.5 rounded-full">
                        Página {currentPageNum} de {totalPagesCount}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-black tracking-wide leading-snug text-slate-200">
                        {currentStep}
                      </p>
                      {totalPagesCount > 0 && (
                        <div className="relative w-full h-2 rounded-full overflow-hidden bg-slate-800">
                          <motion.div 
                            className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#00AEEF] via-[#FFF200] to-[#ED1C24]"
                            style={{ 
                              width: `${(currentPageNum / totalPagesCount) * 100}%` 
                            }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Progress details */}
                    <div className="pt-2 border-t border-slate-900 text-[10px] font-semibold text-slate-400 space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span>Páginas procesadas:</span>
                        <span className="text-white font-bold">{currentPageNum} / {totalPagesCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Imágenes cargadas:</span>
                        <span className="text-emerald-400 font-bold">{uploadedPageUrls.length} exitosas</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Log Block */}
            {imgbbErrorLog && (
              <Card className="border border-red-200 bg-red-50 p-6 rounded-[2rem] text-brand-red space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest">Error técnico detallado:</p>
                <p className="text-xs font-semibold leading-relaxed font-mono select-all bg-white p-3 rounded-lg border border-red-100 overflow-auto max-h-32">
                  {imgbbErrorLog}
                </p>
                <p className="text-[9px] text-slate-400 mt-2">
                  * Tip: Verifica la conexión a Internet o asegura que tu API Key de ImgBB tiene suficiente espacio disponible y es correcta.
                </p>
              </Card>
            )}
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
