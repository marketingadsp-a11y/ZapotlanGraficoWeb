import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
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
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

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
  const [file, setFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState('');
  
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        toast.success(`Archivo seleccionado: ${droppedFile.name}`);
      } else {
        toast.error('Solo se permite subir archivos en formato PDF.');
      }
    }
  };

  const handleChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        toast.success(`Archivo seleccionado: ${selectedFile.name}`);
      } else {
        toast.error('Solo se permite subir archivos en formato PDF.');
      }
    }
  };

  // Convert PDF Canvas to Blob to upload to ImgBB
  const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas conversion to blob failed'));
      }, 'image/jpeg', 0.9); // 90% quality JPEG is crisp and small
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
      if (result && result.data && result.data.url) {
        return result.data.url;
      } else {
        throw new Error("ImgBB no retornó una URL de imagen válida.");
      }
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

    if (!file) {
      toast.error('Selecciona un archivo PDF.');
      return;
    }

    if (!activeImgbbKey) {
      toast.error('Se requiere la API Key de ImgBB para convertir y alojar las páginas del PDF. Configúrala en Ajustes.');
      return;
    }

    if (!pdfJsLoaded || !window.pdfjsLib) {
      toast.error('La librería PDF.js todavía se está cargando. Espera un momento.');
      return;
    }

    setProcessing(true);
    setUploadedPageUrls([]);
    setImgbbErrorLog('');

    try {
      setCurrentStep('Abriendo archivo PDF...');
      const fileReader = new FileReader();
      
      fileReader.onload = async function() {
        try {
          const typedArray = new Uint8Array(this.result as ArrayBuffer);
          const pdfjsLib = window.pdfjsLib;
          
          // Load document
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          const totalPages = pdf.numPages;
          setTotalPagesCount(totalPages);
          
          setCurrentStep(`PDF cargado con éxito. Procesando ${totalPages} páginas...`);
          toast.info(`Iniciando conversión de ${totalPages} páginas a Flipbook...`);

          const pageUrlsList: string[] = [];
          let currentCoverUrl = '';

          // Loop each page dynamically
          for (let i = 1; i <= totalPages; i++) {
            setCurrentPageNum(i);
            setCurrentStep(`Renderizando e interpretando página ${i}/${totalPages}...`);

            // Get page viewport
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // High res 2.0 scale for perfect letter reading

            // Create offscreen canvas for rendering
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (!context) {
              throw new Error("Could not initialize 2D canvas context");
            }

            // Render PDF page to canvas
            await page.render({ canvasContext: context, viewport: viewport }).promise;

            // Submit step: Convert to JPEG blob
            setCurrentStep(`Comprimiendo y preparando página ${i}/${totalPages}...`);
            const blob = await canvasToBlob(canvas);

            // Submit step: Upload to ImgBB
            setCurrentStep(`Subiendo página ${i}/${totalPages} a ImgBB...`);
            const uploadedUrl = await uploadPageToImgBB(blob, i);
            pageUrlsList.push(uploadedUrl);

            // First page acts automatically as the cover!
            if (i === 1) {
              currentCoverUrl = uploadedUrl;
            }

            // Update local tracking array
            setUploadedPageUrls([...pageUrlsList]);
          }

          // Complete uploading step, save to database
          setCurrentStep('Páginas subidas con éxito. Creando publicación en base de datos...');
          
          const publicationSlug = title
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');

          const newFlipbookDoc = {
            title: title.trim(),
            description: description.trim(),
            coverUrl: coverUrl || currentCoverUrl,
            pageUrls: pageUrlsList,
            slug: publicationSlug + '-' + Math.floor(Math.random() * 1000),
            createdAt: Timestamp.now(),
            views: 0
          };

          const docRef = await addDoc(collection(db, 'flipbooks'), newFlipbookDoc);
          toast.success('¡Flipbook / Revista publicado correctamente!');
          navigate('/admin/flipbooks');

        } catch (innerErr: any) {
          console.error("Internal processing failed: ", innerErr);
          setImgbbErrorLog(innerErr.message || String(innerErr));
          toast.error('Ocurrió un error al procesar el PDF o subir las imágenes.');
        } finally {
          setProcessing(false);
        }
      };

      fileReader.onerror = function() {
        toast.error('Error al leer el archivo PDF.');
        setProcessing(false);
      };

      // Read as buffer
      fileReader.readAsArrayBuffer(file);

    } catch (outerErr: any) {
      console.error(outerErr);
      setProcessing(false);
      toast.error('Error al inicializar la tarea del conversor.');
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
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Publicar Nueva Revista (Flipbook)</h1>
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
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-2">Título de la Revista/Edición</label>
                <Input 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Revista Zapotlán Gráfico - Edición Junio 2026"
                  className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white text-xs font-bold font-sans transition-colors"
                  disabled={processing}
                />
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
                  De forma predeterminada, la primera hoja extraída del PDF se usará como portada en la sección de revistas pública.
                </p>
              </div>
            </Card>

            {/* Drop PDF Container */}
            <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-8">
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-2">Carga de Documento PDF</span>
                  
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                      "border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center transition-all cursor-pointer relative",
                      dragActive ? "border-[#00AEEF] bg-[#00AEEF]/5 scale-98" : "border-slate-200 hover:border-slate-300",
                      file ? "bg-emerald-50/10 border-emerald-200" : ""
                    )}
                  >
                    <input 
                      type="file"
                      accept=".pdf"
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
                            {(file.size / (1024 * 1024)).toFixed(2)} MB • PDF Listo
                          </p>
                        </div>
                        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-600">
                          Hacer clic o arrastrar para cambiar
                        </span>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="mx-auto h-16 w-16 bg-slate-50 text-slate-400 rounded-3xl flex items-center justify-center group-hover:scale-105 transition-all">
                          <Upload className="h-8 w-8 text-slate-400" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-black text-slate-900 leading-snug">Arrastra tu archivo PDF aquí</p>
                          <p className="text-xs text-slate-500 font-medium">o haz clic para explorar en tu carpeta local</p>
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
                  <h2 className="text-lg font-black tracking-tight leading-snug">Publicación Digital con Experiencia de Revista Real</h2>
                </div>
                <p className="text-[11px] font-medium leading-relaxed text-slate-400">
                  Subir un PDF convierte automáticamente cada página en imagen de alta resolución para que tus lectores experimenten el giro físico de hojas en el modo visor.
                </p>
              </div>

              <div className="pt-8">
                <Button
                  type="submit"
                  disabled={processing || !file || !activeImgbbKey}
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
