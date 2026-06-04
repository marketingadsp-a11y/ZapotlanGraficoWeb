import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Ad } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Edit, 
  Calendar, 
  Link as LinkIcon, 
  Eye, 
  Archive, 
  Upload, 
  MousePointerClick, 
  Check, 
  X, 
  Image as ImageIcon,
  Clock,
  ToggleLeft
} from 'lucide-react';
import { useSettings } from '@/lib/SettingsContext';

const DEFAULT_AD_FORM: Partial<Ad> = {
  title: '',
  imageUrl: '',
  linkUrl: '',
  type: 'horizontal',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ahead
  isActive: true,
  isArchived: false,
};

export default function Publicidad() {
  const { settings } = useSettings();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'expired' | 'archived'>('all');

  // Form states
  const [formData, setFormData] = useState<Partial<Ad>>(DEFAULT_AD_FORM);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [imgbbKey, setImgbbKey] = useState(((import.meta as any).env?.VITE_IMGBB_API_KEY) || localStorage.getItem('imgbb_api_key') || '');
  const [showKeyConfig, setShowKeyConfig] = useState(false);

  const activeImgbbKey = imgbbKey || settings.imgbbApiKey || '';

  const fetchAds = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'ads'));
      const list: Ad[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Ad);
      });
      // Sort by creation date
      list.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dateB - dateA;
      });
      setAds(list);
    } catch (error) {
      console.error("Error fetching advertisements:", error);
      toast.error("Error al cargar los anuncios de publicidad.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!activeImgbbKey) {
      toast.error('Configura tu API Key de ImgBB para habilitar la subida.');
      setShowKeyConfig(true);
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Subiendo imagen de banner...');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim() || !formData.imageUrl?.trim()) {
      toast.error('El título y la imagen son requeridos.');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      imageUrl: formData.imageUrl.trim(),
      linkUrl: formData.linkUrl?.trim() || '',
      type: formData.type || 'horizontal',
      startDate: formData.startDate || new Date().toISOString().split('T')[0],
      endDate: formData.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: formData.isActive ?? true,
      isArchived: formData.isArchived ?? false,
      clicks: editingAd ? (editingAd.clicks || 0) : 0,
      createdAt: editingAd ? (editingAd.createdAt || Timestamp.now()) : Timestamp.now(),
    };

    try {
      const docId = editingAd ? editingAd.id : Math.random().toString(36).substring(2, 11);
      await setDoc(doc(db, 'ads', docId), payload, { merge: true });
      
      toast.success(editingAd ? 'Publicidad actualizada con éxito' : 'Publicidad registrada con éxito');
      setFormData(DEFAULT_AD_FORM);
      setEditingAd(null);
      fetchAds();
    } catch (error) {
      console.error("Error saving ad:", error);
      toast.error('Error al guardar el anuncio.');
    }
  };

  const handleEditClick = (ad: Ad) => {
    setEditingAd(ad);
    setFormData(ad);
  };

  const handleCancelEdit = () => {
    setEditingAd(null);
    setFormData(DEFAULT_AD_FORM);
  };

  const handleToggleActive = async (ad: Ad) => {
    try {
      await updateDoc(doc(db, 'ads', ad.id), {
        isActive: !ad.isActive
      });
      toast.success(ad.isActive ? 'Anuncio pausado' : 'Anuncio activado');
      fetchAds();
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar estado.');
    }
  };

  const handleToggleArchive = async (ad: Ad) => {
    try {
      await updateDoc(doc(db, 'ads', ad.id), {
        isArchived: !ad.isArchived
      });
      toast.success(ad.isArchived ? 'Anuncio restaurado de archivo' : 'Anuncio archivado');
      fetchAds();
    } catch (error) {
      console.error(error);
      toast.error('Error al archivar.');
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (window.confirm('¿Estás seguro de eliminar este anuncio permanentemente?')) {
      try {
        await deleteDoc(doc(db, 'ads', adId));
        toast.success('Anuncio eliminado.');
        fetchAds();
      } catch (error) {
        console.error(error);
        toast.error('Error al eliminar anuncio.');
      }
    }
  };

  // Helper date function
  const isExpired = (ad: Ad) => {
    const todayStr = new Date().toISOString().split('T')[0];
    return ad.endDate < todayStr;
  };

  // Filter logic
  const filteredAds = ads.filter(ad => {
    if (activeTab === 'archived') return ad.isArchived;
    if (ad.isArchived) return false; // Ignore archived in other tabs
    
    if (activeTab === 'active') return ad.isActive && !isExpired(ad);
    if (activeTab === 'expired') return isExpired(ad);
    return true; // 'all'
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Banner with general Info */}
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Publicidad Interna</h1>
          <p className="text-sm font-medium text-slate-500">
            Crea, edita y monitorea los banners publicitarios que se muestran de manera alternada en la web pública.
          </p>
        </div>

        {/* API Key warning bar for ImgBB */}
        {!activeImgbbKey && (
          <div className="bg-orange-50 border border-orange-100 text-orange-800 text-xs font-bold p-4 rounded-2xl flex items-center justify-between gap-4">
            <span>⚠️ No has configurado la API Key de ImgBB. Para subir directamente las imágenes de banner en lugar de copiar URLs, agrega tu API Key.</span>
            <Button 
              size="sm" 
              onClick={() => setShowKeyConfig(prev => !prev)}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[10px] font-black uppercase px-3"
            >
              Configurar Key
            </Button>
          </div>
        )}

        {showKeyConfig && (
          <Card className="border-none shadow-sm bg-white rounded-3xl p-5 space-y-3">
            <div className="space-y-1">
              <h3 className="text-xs font-black uppercase text-slate-900">API Key de ImgBB Temporal</h3>
              <p className="text-[10px] text-slate-400">Guárdata temporalmente para subir archivos en esta sesión.</p>
            </div>
            <div className="flex gap-2">
              <Input 
                value={imgbbKey}
                onChange={(e) => {
                  setImgbbKey(e.target.value);
                  localStorage.setItem('imgbb_api_key', e.target.value);
                }}
                placeholder="Pega tu API Key de ImgBB aquí..."
                className="h-10 rounded-xl text-xs font-bold border-slate-100 bg-slate-50 flex-1"
              />
              <Button 
                onClick={() => setShowKeyConfig(false)}
                className="rounded-xl bg-slate-900 text-white font-black text-xs px-4"
              >
                Cerrar
              </Button>
            </div>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Form Creator / Editor */}
          <div className="lg:col-span-5">
            <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden sticky top-28">
              <CardHeader className="border-b border-slate-50 p-6">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  {editingAd ? (
                    <>
                      <Edit className="h-5 w-5 text-orange-500 animate-pulse" /> Editar Banner
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 text-orange-500" /> Crear Banner Publicitario
                    </>
                  )}
                </CardTitle>
                <CardDescription className="text-xs font-medium text-slate-400">
                  {editingAd ? 'Edita los datos del banner seleccionado.' : 'Publica un nuevo banner temporal en el portal.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Title / Description */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Campaña / Cliente</label>
                    <Input 
                      placeholder="Ej. Barbería El Elegante - Descuento Junio"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="h-11 rounded-xl border-slate-100 bg-slate-50 text-xs font-bold"
                      required
                    />
                  </div>

                  {/* Format Banner Style */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Formato de Banner (Tamaño)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type: 'horizontal' }))}
                        className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all ${
                          formData.type === 'horizontal' 
                            ? 'border-orange-500 bg-orange-50/50 text-orange-950 shadow-sm' 
                            : 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-500'
                        }`}
                      >
                        <span className="text-xs font-black uppercase tracking-wider">Horizontal / Landscape</span>
                        <div className="h-4 w-full bg-slate-300 rounded border-2 border-dashed border-slate-400/50" />
                        <span className="text-[9px] font-medium text-slate-400">Ideal para secciones completas (Home).</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type: 'square' }))}
                        className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all ${
                          formData.type === 'square' 
                            ? 'border-orange-500 bg-orange-50/50 text-orange-950 shadow-sm' 
                            : 'border-slate-100 bg-slate-50 hover:bg-slate-100 text-slate-500'
                        }`}
                      >
                        <span className="text-xs font-black uppercase tracking-wider">Cuadrado / Square</span>
                        <div className="h-10 w-10 bg-slate-300 rounded border-2 border-dashed border-slate-400/50 self-start" />
                        <span className="text-[9px] font-medium text-slate-400">Perfecto para barras laterales.</span>
                      </button>
                    </div>
                  </div>

                  {/* Banner image URL and uploader */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Imagen del Banner</label>
                    
                    {formData.imageUrl && (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 p-2 group">
                        <img 
                          src={formData.imageUrl} 
                          alt="Ad Banner Preview" 
                          className={`object-cover rounded-xl w-full ${
                            formData.type === 'horizontal' ? 'aspect-[5/1] h-12' : 'aspect-square max-w-[120px]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                          className="absolute top-3 right-3 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    {!formData.imageUrl && (
                      <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                          dragActive 
                            ? 'border-orange-500 bg-orange-50/30' 
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                        onClick={() => document.getElementById('ad-file-upload')?.click()}
                      >
                        <input 
                          id="ad-file-upload" 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(e.target.files[0]);
                            }
                          }}
                        />
                        <div className="flex flex-col items-center gap-1">
                          <Upload className={`h-8 w-8 text-slate-400 ${uploading ? 'animate-bounce' : ''}`} />
                          <span className="text-xs font-bold text-slate-700">Arrastra una imagen o selecciónala</span>
                          <span className="text-[9px] font-medium text-slate-400">Formatos recomendados: JPG o PNG. Máx 3MB.</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-1">
                      <Input 
                        placeholder="O ingresa la URL de la imagen aquí..."
                        value={formData.imageUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                        className="h-9 rounded-xl border-slate-100 bg-slate-50 text-[10px] font-bold"
                      />
                    </div>
                  </div>

                  {/* Link Url redirection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Enlace de Destino (URL o Sección Interna)</label>
                    <Input 
                      placeholder="Ej. https://mi-barberia.com o /categoria/cultura"
                      value={formData.linkUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, linkUrl: e.target.value }))}
                      className="h-11 rounded-xl border-slate-100 bg-slate-50 text-xs font-bold"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, linkUrl: '/' }))}
                        className="bg-slate-50 hover:bg-slate-100 text-[10px] font-black uppercase px-2 py-1 rounded-lg border border-slate-200/50 text-slate-600 cursor-pointer"
                      >
                        Página de Inicio
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, linkUrl: '/revista' }))}
                        className="bg-slate-50 hover:bg-slate-100 text-[10px] font-black uppercase px-2 py-1 rounded-lg border border-slate-200/50 text-slate-600 cursor-pointer"
                      >
                        Revista Impresa
                      </button>
                    </div>
                  </div>

                  {/* Active Duration Dates */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Duración Activa</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400">Fecha de Inicio</span>
                        <Input 
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                          className="h-10 rounded-xl text-xs font-bold border-slate-100 bg-slate-50"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-400">Fecha de Fin</span>
                        <Input 
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                          className="h-10 rounded-xl text-xs font-bold border-slate-100 bg-slate-50"
                        />
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium mt-1">El banner dejará de mostrarse automáticamente después del día final configurado.</p>
                  </div>

                  {/* Active Toggle Switch */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900">Estado Inicial</span>
                      <p className="text-[9px] text-slate-400">¿Debería estar disponible inmediatamente?</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        formData.isActive ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          formData.isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      type="submit" 
                      className="flex-1 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest shadow-lg shadow-slate-100"
                    >
                      Guardar Anuncio
                    </Button>
                    {editingAd && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleCancelEdit}
                        className="rounded-full border-slate-200 text-slate-500 font-black uppercase tracking-widest"
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* List Column */}
          <div className="lg:col-span-7 space-y-4">
            {/* Toolbar section with tabs */}
            <div className="bg-slate-100/80 backdrop-blur p-1 rounded-2xl flex gap-1 border border-slate-200/40">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 py-2 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`flex-1 py-2 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === 'active' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Activos
              </button>
              <button
                onClick={() => setActiveTab('expired')}
                className={`flex-1 py-2 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === 'expired' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Expirados
              </button>
              <button
                onClick={() => setActiveTab('archived')}
                className={`flex-1 py-2 text-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === 'archived' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Archivados
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20 bg-white rounded-[2.5rem] shadow-sm">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
              </div>
            ) : filteredAds.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-sm p-8 space-y-4">
                <Megaphone className="h-12 w-12 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-500">No hay anuncios para mostrar en esta pestaña.</p>
                <p className="text-xs text-slate-400">Usa el formulario de la izquierda para registrar anunciantes.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredAds.map((ad) => {
                  const expired = isExpired(ad);
                  const isCurrentActive = ad.isActive && !expired && !ad.isArchived;

                  return (
                    <Card key={ad.id} className="border-none shadow-sm bg-white rounded-3xl overflow-hidden group">
                      <CardContent className="p-5 flex gap-4 items-start">
                        {/* Poster Thumbnail */}
                        <div className="shrink-0 relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 w-24 h-24 flex items-center justify-center">
                          <img 
                            src={ad.imageUrl} 
                            alt={ad.title} 
                            className="object-cover w-full h-full hover:scale-110 transition-transform duration-500"
                          />
                          <Badge className={`absolute top-1.5 left-1.5 text-[8px] font-black uppercase rounded px-1.5 py-0.5 ${
                            ad.type === 'horizontal' ? 'bg-blue-500 text-white' : 'bg-indigo-500 text-white'
                          }`}>
                            {ad.type === 'horizontal' ? 'H' : 'C'}
                          </Badge>
                        </div>

                        {/* Content description */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-xs font-black uppercase text-slate-900 tracking-tight leading-tight block truncate pr-1">
                              {ad.title}
                            </span>
                            
                            {/* Badging state */}
                            {ad.isArchived && (
                              <Badge className="bg-slate-100 text-slate-500 text-[8px] uppercase tracking-widest rounded px-1.5 py-0 font-bold border-none">Archivado</Badge>
                            )}
                            {!ad.isArchived && expired && (
                              <Badge className="bg-red-50 text-red-500 text-[8px] uppercase tracking-widest rounded px-1.5 py-0 font-bold border border-red-100/50">Expirado</Badge>
                            )}
                            {!ad.isArchived && !expired && !ad.isActive && (
                              <Badge className="bg-yellow-50 text-yellow-500 text-[8px] uppercase tracking-widest rounded px-1.5 py-0 font-bold border border-yellow-100/50">Pausado</Badge>
                            )}
                            {isCurrentActive && (
                              <Badge className="bg-emerald-50 text-emerald-600 text-[8px] uppercase tracking-widest rounded px-1.5 py-0 font-black border border-emerald-100/50 flex items-center gap-1 animate-pulse">
                                <span className="h-1 w-1 rounded-full bg-emerald-500" /> Al Aire
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-1 text-slate-500 text-[10px] font-bold">
                            <p className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{ad.startDate} al {ad.endDate}</span>
                            </p>
                            {ad.linkUrl && (
                              <p className="flex items-center gap-1.5 text-slate-400 hover:text-[#00AEEF] truncate">
                                <LinkIcon className="h-3 w-3 shrink-0" />
                                <span className="truncate">{ad.linkUrl}</span>
                              </p>
                            )}
                          </div>

                          {/* Analytics counter */}
                          <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                              <span className="flex items-center gap-1 text-slate-500">
                                <MousePointerClick className="h-3.5 w-3.5 text-orange-500 shrink-0" /> {ad.clicks || 0} clics
                              </span>
                            </div>

                            {/* Control switches and actions */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleToggleActive(ad)}
                                disabled={ad.isArchived}
                                className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border transition-all ${
                                  ad.isActive 
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                    : 'bg-slate-50 border-slate-200 text-slate-400'
                                }`}
                              >
                                {ad.isActive ? 'Pausar' : 'Activar'}
                              </button>

                              <button
                                onClick={() => handleToggleArchive(ad)}
                                className="h-7 w-7 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center cursor-pointer"
                                title={ad.isArchived ? 'Desarchivar' : 'Archivar'}
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => handleEditClick(ad)}
                                className="h-7 w-7 rounded-lg border border-slate-200 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors flex items-center justify-center cursor-pointer"
                                title="Editar"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteAd(ad.id)}
                                className="h-7 w-7 rounded-lg border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
