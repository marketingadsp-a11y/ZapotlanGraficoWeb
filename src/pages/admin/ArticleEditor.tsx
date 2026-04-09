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
import { Save, ArrowLeft, Image as ImageIcon, Video, Link as LinkIcon, Type, AlignLeft, User, Hash } from 'lucide-react';
import { getSafeImageUrl } from '@/lib/utils';
import { motion } from 'motion/react';

export default function ArticleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Article>>({
    title: '',
    summary: '',
    content: '',
    categories: ['General'],
    imageUrl: '',
    videoUrl: '',
    author: 'Cristobal',
    views: 0,
    interactions: 0,
    slug: ''
  });

  useEffect(() => {
    if (id) {
      const fetchArticle = async () => {
        const docSnap = await getDoc(doc(db, 'articles', id));
        if (docSnap.exists()) {
          setFormData(docSnap.data() as Article);
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
          imageUrl: data.imageUrl || '',
          videoUrl: data.videoUrl || '',
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
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    <ImageIcon className="h-3 w-3" /> Imagen Principal
                  </label>
                  <Input 
                    value={formData.imageUrl} 
                    onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                    className="h-10 rounded-xl border-slate-100 bg-slate-50 text-[10px]"
                    placeholder="https://..."
                  />
                  {formData.imageUrl && (
                    <div className="mt-4 aspect-video overflow-hidden rounded-2xl border border-slate-100 shadow-inner">
                      <img 
                        src={getSafeImageUrl(formData.imageUrl)} 
                        alt="Preview" 
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>

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
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

