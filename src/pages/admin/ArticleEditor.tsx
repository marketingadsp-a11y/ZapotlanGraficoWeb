import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, addDoc, collection, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Article } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, ArrowLeft, Image as ImageIcon, Video, Link as LinkIcon, Type, AlignLeft, User, Hash, Upload, Loader2, Settings, Key } from 'lucide-react';
import { getSafeImageUrl, cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { useSettings } from '@/lib/SettingsContext';

export default function ArticleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgbbKey, setImgbbKey] = useState(((import.meta as any).env?.VITE_IMGBB_API_KEY) || localStorage.getItem('imgbb_api_key') || '');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const activeImgbbKey = imgbbKey || settings.imgbbApiKey || '';

  const [formData, setFormData] = useState<Partial<Article>>({
    title: '',
    summary: '',
    content: '',
    categories: ['General'],
    tags: [],
    imageUrl: '',
    videoUrl: '',
    videoAspectRatio: 'horizontal',
    author: 'Cristobal',
    views: 0,
    interactions: 0,
    slug: ''
  });

  const handleFileUpload = async (file: File) => {
    if (!activeImgbbKey) {
      toast.error('Configura tu API Key de ImgBB para habilitar la subida.');
      setShowKeyConfig(true);
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Subiendo imagen a ImgBB...');

    try {
      const uploadForm = new FormData();
      uploadForm.append('image', file);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${activeImgbbKey}`, {
        method: 'POST',
        body: uploadForm,
      });

      const resData = await response.json();

      if (resData.success) {
        const uploadedUrl = resData.data.url;
        setFormData(prev => ({ ...prev, imageUrl: uploadedUrl }));
        toast.success('Imagen subida con éxito', { id: toastId });
      } else {
        throw new Error(resData.error?.message || 'Error al subir la imagen');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Error al subir: ${error.message || 'Verifica tu API Key'}`, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

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
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const saveImgbbKey = (key: string) => {
    const cleanedKey = key.trim();
    setImgbbKey(cleanedKey);
    localStorage.setItem('imgbb_api_key', cleanedKey);
    toast.success('API Key de ImgBB guardada localmente');
    setShowKeyConfig(false);
  };

  useEffect(() => {
    if (id) {
      const fetchArticle = async () => {
        const docSnap = await getDoc(doc(db, 'articles', id));
        if (docSnap.exists()) {
          const data = docSnap.data() as Article;
          setFormData({
            ...data,
            tags: data.tags || [],
            videoAspectRatio: data.videoAspectRatio || 'horizontal'
          });
        }
      };
      fetchArticle();
    } else {
      // Check for imported data
      const importedData = localStorage.getItem('fb_import_data');
      if (importedData) {
        const data = JSON.parse(importedData);
        setFormData(prev => ({
          ...prev,
          title: data.title || '',
          summary: data.summary || '',
          content: data.content || '',
          categories: data.categories || ['General'],
          tags: data.tags || [],
          imageUrl: data.imageUrl || '',
          videoUrl: data.videoUrl || '',
          videoAspectRatio: data.videoAspectRatio || 'horizontal',
          slug: generateSlug(data.title || '')
        }));
        localStorage.removeItem('fb_import_data');
        toast.info('Datos importados de Facebook cargados');
      }
    }
  }, [id]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (id) {
        await updateDoc(doc(db, 'articles', id), {
          ...formData,
          updatedAt: Timestamp.now()
        });
        toast.success('Nota actualizada');
      } else {
        await addDoc(collection(db, 'articles'), {
          ...formData,
          createdAt: Timestamp.now(),
          views: 0,
          interactions: 0
        });
        toast.success('Nota publicada');
      }
      navigate('/admin/articulos');
    } catch (error) {
      toast.error('Error al guardar la nota');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="space-y-0.5">
              <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">
                {id ? 'Editar Nota' : 'Nueva Nota'}
              </h1>
              <p className="text-xs font-medium text-slate-400">Completa los campos para publicar tu contenido.</p>
            </div>
          </div>
          <Button 
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-full bg-[#00AEEF] hover:bg-[#00AEEF]/90 text-white font-black uppercase tracking-widest px-8 shadow-lg shadow-[#00AEEF]/20"
          >
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Guardando...' : id ? 'Actualizar' : 'Publicar'}
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-8 lg:p-10 space-y-8">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                    <Type className="h-3 w-3 text-[#00AEEF]" /> Título de la Noticia
                  </label>
                  <Input 
                    value={formData.title} 
                    onChange={handleTitleChange}
                    className="h-16 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white text-xl font-black tracking-tight transition-colors"
                    placeholder="Escribe un título impactante..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                    <AlignLeft className="h-3 w-3 text-[#ED1C24]" /> Resumen Ejecutivo
                  </label>
                  <Textarea 
                    value={formData.summary} 
                    onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                    className="min-h-[100px] rounded-2xl border-slate-100 bg-slate-50 focus:bg-white p-4 transition-colors resize-none font-medium"
                    placeholder="Un breve resumen que aparecerá en las tarjetas..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                    <AlignLeft className="h-3 w-3 text-[#FFF200]" /> Contenido Principal
                  </label>
                  <div className="relative">
                    <Textarea 
                      value={formData.content} 
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      className="min-h-[500px] rounded-[2rem] border-slate-100 bg-slate-50 focus:bg-white p-8 transition-colors resize-none font-medium leading-relaxed"
                      placeholder="Escribe el cuerpo de la noticia aquí (puedes usar Markdown)..."
                      required
                    />
                    <div className="absolute bottom-4 right-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      Markdown Soportado
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            {/* Metadata Card */}
            <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="border-b border-slate-50 p-6">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Configuración</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    <LinkIcon className="h-3 w-3" /> Slug / URL
                  </label>
                  <Input 
                    value={formData.slug} 
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    className="h-10 rounded-xl border-slate-100 bg-slate-50 font-mono text-[10px]"
                    placeholder="slug-de-la-noticia"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    <Hash className="h-3 w-3" /> Categorías
                  </label>
                  <Input 
                    value={formData.categories?.join(', ')} 
                    onChange={(e) => setFormData(prev => ({ ...prev, categories: e.target.value.split(',').map(c => c.trim()).filter(c => c !== '') }))}
                    className="h-10 rounded-xl border-slate-100 bg-slate-50 text-xs font-bold"
                    placeholder="General, Local, etc."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    <Hash className="h-3 w-3" /> Etiquetas / Hashtags
                  </label>
                  <Input 
                    value={formData.tags?.join(', ')} 
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value.split(',').map(c => c.trim()).filter(c => c !== '') }))}
                    className="h-10 rounded-xl border-slate-100 bg-slate-50 text-xs font-bold"
                    placeholder="clima, policiaca, deporte"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    <User className="h-3 w-3" /> Autor
                  </label>
                  <Input 
                    value={formData.author} 
                    onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                    className="h-10 rounded-xl border-slate-100 bg-slate-50 text-xs font-bold"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Media Card */}
            <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="border-b border-slate-50 p-6">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Multimedia</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      <ImageIcon className="h-3 w-3" /> URL de Imagen Principal
                    </label>
                    <Input 
                      value={formData.imageUrl} 
                      onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                      className="h-10 rounded-xl border-slate-100 bg-slate-50 text-[10px]"
                      placeholder="https://..."
                    />
                  </div>

                  {/* ImgBB Image Upload & Settings Block */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#00AEEF]">
                        Subir Imagen (ImgBB)
                      </span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => setShowKeyConfig(!showKeyConfig)}
                        className={cn(
                          "h-7 w-7 rounded-lg p-0 hover:bg-slate-100 transition-all",
                          activeImgbbKey ? "text-slate-400" : "text-[#ED1C24] animate-pulse"
                        )}
                        title="Configurar API Key de ImgBB"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>

                    {(showKeyConfig || !activeImgbbKey) && (
                      <div className="p-4 rounded-2xl border border-slate-100 bg-slate-100/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-600 uppercase tracking-wider">
                            <Key className="h-3.5 w-3.5 text-[#00AEEF]" />
                            <span>Configura tu API Key de ImgBB</span>
                          </div>
                          {settings.imgbbApiKey && (
                            <span className="text-[8px] font-extrabold uppercase tracking-wider text-green-500 bg-green-50 px-2 py-0.5 rounded-full">
                              Cargada desde Ajustes
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                          Puedes configurar tu API Key globalmente en los <strong>Ajustes del Sitio</strong> para no tener que ingresarla en cada sesión, o poner una clave temporal aquí.
                        </p>
                        <div className="flex gap-2">
                          <Input 
                            type="password"
                            value={imgbbKey}
                            onChange={(e) => setImgbbKey(e.target.value)}
                            placeholder="Ingresa tu API Key..."
                            className="h-8 rounded-xl bg-white border-slate-100 text-[10px] font-mono flex-1"
                          />
                          <Button 
                            type="button"
                            onClick={() => saveImgbbKey(imgbbKey)}
                            className="h-8 px-3 rounded-xl bg-[#00AEEF] hover:bg-[#00AEEF]/90 text-white font-black uppercase text-[9px] tracking-widest"
                          >
                            Guardar
                          </Button>
                        </div>
                      </div>
                    )}

                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={cn(
                        "relative border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[140px]",
                        dragActive ? "border-[#00AEEF] bg-[#00AEEF]/5" : "border-slate-100 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-300"
                      )}
                      onClick={() => document.getElementById('image-upload-input')?.click()}
                    >
                      <input 
                        type="file"
                        id="image-upload-input"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(e.target.files[0]);
                          }
                        }}
                      />
                      
                      {uploading ? (
                        <div className="space-y-3">
                          <Loader2 className="h-8 w-8 text-[#00AEEF] animate-spin mx-auto" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#00AEEF] block animate-pulse">Subiendo...</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center shadow-sm mx-auto text-slate-400">
                            <Upload className="h-5 w-5" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">
                              Arrastra tu archivo aquí
                            </p>
                            <p className="text-[9px] text-slate-400 font-medium">
                              o haz clic para buscar en tu dispositivo
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {formData.imageUrl && (
                    <div className="mt-4 aspect-video overflow-hidden rounded-2xl border border-slate-100 shadow-inner">
                      <img 
                        src={getSafeImageUrl(formData.imageUrl)} 
                        alt="Preview" 
                        className="h-full w-full object-cover animate-fade-in"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      <Video className="h-3 w-3" /> Video (Opcional)
                    </label>
                    <Input 
                      value={formData.videoUrl} 
                      onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                      className="h-10 rounded-xl border-slate-100 bg-slate-50 text-[10px]"
                      placeholder="https://youtube.com/..."
                    />
                  </div>

                  {formData.videoUrl && (
                    <div className="space-y-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                      <label className="text-[9px] font-black uppercase tracking-widest text-[#00AEEF] ml-1 block">
                        Orientación del Video de Facebook o Reels
                      </label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setFormData(prev => ({ ...prev, videoAspectRatio: 'horizontal' }))}
                          className={`flex-1 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            formData.videoAspectRatio === 'horizontal' || !formData.videoAspectRatio
                              ? 'bg-[#00AEEF] text-white shadow-sm'
                              : 'bg-white text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          Horizontal (16:9)
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setFormData(prev => ({ ...prev, videoAspectRatio: 'vertical' }))}
                          className={`flex-1 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            formData.videoAspectRatio === 'vertical'
                              ? 'bg-[#ED1C24] text-white shadow-sm'
                              : 'bg-white text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          Vertical (9:16)
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

