import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Facebook, Loader2, ArrowRight, CheckCircle2, Type as TypeIcon, Sparkles, Info } from 'lucide-react';
import { extractFacebookContent, formatManualContent } from '@/lib/gemini';
import { toast } from 'sonner';
import { getSafeImageUrl, cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';

export default function FBImporter() {
  const [url, setUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [importMode, setImportMode] = useState<'url' | 'manual'>('url');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const navigate = useNavigate();

  const handleProcess = async () => {
    setLoading(true);
    try {
      let data;
      if (importMode === 'url') {
        if (!url) return;
        data = await extractFacebookContent(url);
      } else {
        if (!manualText) return;
        data = await formatManualContent(manualText);
      }

      if (!data.title && !data.content) {
        toast.error('Facebook bloqueó el acceso automático. Por favor, usa la opción "Texto Manual" y pega la descripción de la publicación.');
        setImportMode('manual');
      } else {
        setPreview(data);
        toast.success('Contenido procesado con éxito');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Error al procesar el contenido');
      
      if (importMode === 'url') {
        toast.info('Prueba usando la opción "Texto Manual"');
        setImportMode('manual');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    localStorage.setItem('fb_import_data', JSON.stringify(preview));
    navigate('/admin/articulos/nuevo?import=fb');
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#00AEEF]">
            <Sparkles className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">IA Power</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Importador Inteligente</h1>
          <p className="text-sm font-medium text-slate-500">Convierte publicaciones de Facebook en notas profesionales en segundos.</p>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
          <Button 
            variant="ghost"
            onClick={() => setImportMode('url')}
            className={cn(
              "rounded-xl px-6 font-black text-[10px] uppercase tracking-widest transition-all",
              importMode === 'url' ? "bg-white text-[#00AEEF] shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Facebook className="mr-2 h-4 w-4" />
            Por Enlace
          </Button>
          <Button 
            variant="ghost"
            onClick={() => setImportMode('manual')}
            className={cn(
              "rounded-xl px-6 font-black text-[10px] uppercase tracking-widest transition-all",
              importMode === 'manual' ? "bg-white text-[#00AEEF] shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <TypeIcon className="mr-2 h-4 w-4" />
            Texto Manual
          </Button>
        </div>

        <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 lg:p-12">
            <div className="space-y-6">
              <AnimatePresence mode="wait">
                {importMode === 'url' ? (
                  <motion.div 
                    key="url"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Enlace de Facebook</label>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                          <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#00AEEF]" />
                          <Input 
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://www.facebook.com/reel/..."
                            className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-colors"
                          />
                        </div>
                        <Button 
                          onClick={handleProcess} 
                          disabled={loading || !url}
                          className="h-14 px-8 rounded-2xl bg-[#00AEEF] hover:bg-[#00AEEF]/90 text-white font-black uppercase tracking-widest shadow-lg shadow-[#00AEEF]/20"
                        >
                          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Procesar Enlace'}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="manual"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Descripción de la Publicación</label>
                      <Textarea 
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                        placeholder="Pega aquí el texto de la publicación de Facebook..."
                        className="min-h-[200px] rounded-[2rem] border-slate-100 bg-slate-50 focus:bg-white p-6 transition-colors resize-none"
                      />
                    </div>
                    <Button 
                      onClick={handleProcess} 
                      disabled={loading || !manualText}
                      className="w-full h-14 rounded-2xl bg-[#00AEEF] hover:bg-[#00AEEF]/90 text-white font-black uppercase tracking-widest shadow-lg shadow-[#00AEEF]/20"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="mr-2 h-5 w-5" />}
                      Procesar Texto con IA
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {preview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="border-b border-slate-50 p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-black uppercase tracking-tighter text-slate-900">Vista Previa de IA</CardTitle>
                    <CardDescription className="text-xs font-medium">Revisa la información extraída antes de editar.</CardDescription>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-500">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid gap-8 lg:grid-cols-2">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Título Generado</p>
                      <p className="text-lg font-black text-slate-900 leading-tight">{preview.title}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resumen Ejecutivo</p>
                      <p className="text-sm font-medium text-slate-600 leading-relaxed">{preview.summary}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categorías Sugeridas</p>
                      <div className="flex flex-wrap gap-2">
                        {preview.categories?.map((cat: string) => (
                          <Badge key={cat} variant="secondary" className="bg-[#00AEEF]/10 text-[#00AEEF] border-none text-[10px] font-black uppercase tracking-widest px-3 py-1">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    {preview.imageUrl && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Imagen / Miniatura</p>
                        <div className="relative aspect-video rounded-[2rem] overflow-hidden border border-slate-100">
                          <img 
                            src={getSafeImageUrl(preview.imageUrl)} 
                            className="h-full w-full object-cover" 
                            alt="Preview"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    )}
                    {preview.tags && preview.tags.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hashtags Detectados</p>
                        <div className="flex flex-wrap gap-2">
                          {preview.tags.map((tag: string) => (
                            <span key={tag} className="text-[10px] font-black text-[#ED1C24] bg-[#ED1C24]/5 px-3 py-1 rounded-full uppercase tracking-widest">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <Button 
                  onClick={handleCreate}
                  className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest shadow-xl"
                >
                  Confirmar y Abrir Editor <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="rounded-[2rem] bg-slate-50 border border-slate-100 p-8 flex gap-6 items-start">
          <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-[#FFF200] shrink-0 shadow-sm">
            <Info className="h-6 w-6 fill-[#FFF200] text-slate-900" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Consejos de Importación</h4>
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-[11px] font-medium text-slate-500">
              <li className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-[#00AEEF]" /> La IA analiza el contexto para generar títulos.</li>
              <li className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-[#ED1C24]" /> Se extraen hashtags como etiquetas.</li>
              <li className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-[#FFF200]" /> Sugiere categorías automáticamente.</li>
              <li className="flex items-center gap-2"><div className="h-1 w-1 rounded-full bg-slate-900" /> Todo es editable antes de publicar.</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

