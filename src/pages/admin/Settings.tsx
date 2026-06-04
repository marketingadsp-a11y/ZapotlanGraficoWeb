import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { SiteSettings } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, Image as ImageIcon, Globe, Palette, ShieldCheck, User, Key, Bell, Clock, Facebook, Instagram, Twitter, Youtube, Video, Newspaper, X, Check } from 'lucide-react';
import { DEFAULT_CATEGORIES } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({
    logoUrl: '',
    siteName: 'Zapotlán Gráfico',
    showAuthor: true,
    imgbbApiKey: '',
    subscriptionModalEnabled: false,
    subscriptionModalDelaySeconds: 5,
    subscriptionModalTitle: '¡Recibe Alertas de Noticias!',
    subscriptionModalDescription: 'Suscríbete GRATIS con tu número celular a nuestro canal de notificaciones y entérate antes que nadie de noticias y promociones locales.',
    subscriptionModalTriggerType: 'session',
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    youtubeUrl: '',
    tiktokUrl: '',
    featuredCategories: []
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'config', 'site'));
        if (docSnap.exists()) {
          const data = docSnap.data() as SiteSettings;
          setSettings({
            ...data,
            imgbbApiKey: data.imgbbApiKey || '',
            subscriptionModalEnabled: data.subscriptionModalEnabled ?? false,
            subscriptionModalDelaySeconds: data.subscriptionModalDelaySeconds ?? 5,
            subscriptionModalTitle: data.subscriptionModalTitle || '',
            subscriptionModalDescription: data.subscriptionModalDescription || '',
            subscriptionModalTriggerType: data.subscriptionModalTriggerType || 'session',
            facebookUrl: data.facebookUrl || '',
            instagramUrl: data.instagramUrl || '',
            twitterUrl: data.twitterUrl || '',
            youtubeUrl: data.youtubeUrl || '',
            tiktokUrl: data.tiktokUrl || '',
            featuredCategories: data.featuredCategories || []
          });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'site'), settings);
      toast.success('Ajustes guardados correctamente');
    } catch (error) {
      toast.error('Error al guardar los ajustes');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Ajustes del Sitio</h1>
          <p className="text-sm font-medium text-slate-500">Configura la identidad visual y parámetros globales de tu plataforma.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="border-b border-slate-50 p-8">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#00AEEF]/10 flex items-center justify-center text-[#00AEEF]">
                    <Globe className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Identidad Visual</CardTitle>
                    <CardDescription className="text-xs font-medium text-slate-400">Nombre y logo principal del sitio.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre del Proyecto</label>
                  <Input 
                    value={settings.siteName}
                    onChange={(e) => setSettings(prev => ({ ...prev, siteName: e.target.value }))}
                    className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white text-lg font-black tracking-tight transition-colors"
                    placeholder="Ej. Zapotlán Gráfico"
                    required
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">URL del Logotipo</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input 
                        value={settings.logoUrl}
                        onChange={(e) => setSettings(prev => ({ ...prev, logoUrl: e.target.value }))}
                        placeholder="https://ejemplo.com/logo.png"
                        className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-900">Mostrar Autor</p>
                        <p className="text-[10px] font-medium text-slate-400">¿Quieres que el nombre del autor aparezca en las notas?</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, showAuthor: !prev.showAuthor }))}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        settings.showAuthor ? "bg-[#00AEEF]" : "bg-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          settings.showAuthor ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                  
                  {settings.logoUrl && (
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#00AEEF]/5 to-[#ED1C24]/5 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
                      <div className="relative flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-100 p-12 bg-white/50 backdrop-blur-sm">
                        <img 
                          src={settings.logoUrl} 
                          alt="Logo Preview" 
                          className="max-h-32 object-contain drop-shadow-2xl"
                          referrerPolicy="no-referrer"
                        />
                        <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-300">Vista Previa del Logo</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ImgBB Integration Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="border-b border-slate-50 p-8">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#00AEEF]/10 flex items-center justify-center text-[#00AEEF]">
                    <Key className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Integración de Imágenes (ImgBB)</CardTitle>
                    <CardDescription className="text-xs font-medium text-slate-400">Configura tu API Key para subir imágenes directamente desde el editor de artículos.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">API Key de ImgBB</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input 
                      type="password"
                      value={settings.imgbbApiKey || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, imgbbApiKey: e.target.value }))}
                      placeholder="Ingresa tu API Key de ImgBB..."
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white text-xs font-mono transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed pl-2">
                    Si no tienes una, regístrate de forma gratuita en <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer" className="text-[#00AEEF] underline font-bold hover:text-[#00AEEF]/80">api.imgbb.com</a> para obtener una clave de API. Las imágenes cargadas se almacenarán en tu cuenta de ImgBB.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Modal de Suscripción Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="border-b border-slate-50 p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-[#00AEEF]/10 flex items-center justify-center text-[#00AEEF]">
                      <Bell className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Modal de Suscripción (Promociones & Alertas)</CardTitle>
                      <CardDescription className="text-xs font-medium text-slate-400">Configura la visibilidad del diálogo de captación de celular para tus lectores.</CardDescription>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, subscriptionModalEnabled: !prev.subscriptionModalEnabled }))}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      settings.subscriptionModalEnabled ? "bg-[#00AEEF]" : "bg-slate-200"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        settings.subscriptionModalEnabled ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
              </CardHeader>
              <CardContent className={cn("p-8 space-y-6 transition-all duration-300", !settings.subscriptionModalEnabled && "opacity-40 select-none pointer-events-none")}>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Título del Diálogo</label>
                    <Input 
                      value={settings.subscriptionModalTitle || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, subscriptionModalTitle: e.target.value }))}
                      className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white text-xs font-bold transition-colors"
                      placeholder="Ej. ¡Únete a nuestro canal!"
                      disabled={!settings.subscriptionModalEnabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Frecuencia / Criterio de Activación</label>
                    <div className="flex gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100 h-14 items-center">
                      {[
                        { id: 'session', label: '1 vez por Sesión' },
                        { id: 'always', label: 'Siempre' },
                        { id: 'timer', label: 'Por Tiempo' },
                      ].map((trigger) => (
                        <button
                          key={trigger.id}
                          type="button"
                          onClick={() => setSettings(prev => ({ ...prev, subscriptionModalTriggerType: trigger.id as any }))}
                          disabled={!settings.subscriptionModalEnabled}
                          className={cn(
                            "flex-1 text-[9px] font-black uppercase tracking-widest h-10 rounded-xl transition-all",
                            settings.subscriptionModalTriggerType === trigger.id 
                              ? "bg-slate-900 text-white shadow-md font-bold" 
                              : "text-slate-400 hover:text-slate-700"
                          )}
                        >
                          {trigger.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Texto de Invitación / Descripción</label>
                  <textarea 
                    value={settings.subscriptionModalDescription || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, subscriptionModalDescription: e.target.value }))}
                    className="min-h-[80px] w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white text-xs font-medium transition-colors outline-none focus:ring-1 focus:ring-slate-300 resize-none leading-relaxed"
                    placeholder="Escribe el texto persuasivo para convencer a tus lectores..."
                    disabled={!settings.subscriptionModalEnabled}
                  />
                </div>

                {settings.subscriptionModalTriggerType === 'timer' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Segundos de Retardo al Entrar</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input 
                        type="number"
                        min="1"
                        max="300"
                        value={settings.subscriptionModalDelaySeconds || 5}
                        onChange={(e) => setSettings(prev => ({ ...prev, subscriptionModalDelaySeconds: parseInt(e.target.value) || 5 }))}
                        className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white text-xs font-black transition-colors"
                        disabled={!settings.subscriptionModalEnabled}
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium pl-2">
                      La ventana de suscripción emergerá automáticamente tras transcurrir este número de segundos en la navegación de un usuario regular.
                    </p>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Redes Sociales Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="border-b border-slate-50 p-8">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#00AEEF]/10 flex items-center justify-center text-[#00AEEF]">
                    <Globe className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Redes Sociales</CardTitle>
                    <CardDescription className="text-xs font-medium text-slate-400">Configura los enlaces a tus perfiles oficiales.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Facebook</label>
                    <div className="relative">
                      <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input 
                        value={settings.facebookUrl || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, facebookUrl: e.target.value }))}
                        className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white text-xs transition-colors"
                        placeholder="https://facebook.com/tucanal"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Instagram</label>
                    <div className="relative">
                      <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input 
                        value={settings.instagramUrl || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, instagramUrl: e.target.value }))}
                        className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white text-xs transition-colors"
                        placeholder="https://instagram.com/tuperfil"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Twitter / X</label>
                    <div className="relative">
                      <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input 
                        value={settings.twitterUrl || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, twitterUrl: e.target.value }))}
                        className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white text-xs transition-colors"
                        placeholder="https://twitter.com/tuusuario"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">YouTube (Canal / Videos)</label>
                    <div className="relative">
                      <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input 
                        value={settings.youtubeUrl || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                        className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white text-xs transition-colors"
                        placeholder="https://youtube.com/@mi_canal_ejemplo"
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium pl-2 leading-relaxed">
                      Si pones el enlace de tu canal de YouTube, la sección pública de **"Videos"** cargará e integrará automáticamente todos los videos más recientes subidos a tu canal de forma transparente.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">TikTok</label>
                    <div className="relative">
                      <Video className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <Input 
                        value={settings.tiktokUrl || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, tiktokUrl: e.target.value }))}
                        className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white text-xs transition-colors"
                        placeholder="https://tiktok.com/@tuusuario"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Featured Categories Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="border-b border-slate-50 p-8">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#ED1C24]/10 flex items-center justify-center text-[#ED1C24]">
                    <Newspaper className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Sección de Secciones (Home)</CardTitle>
                    <CardDescription className="text-xs font-medium text-slate-400">Selecciona hasta 15 categorías para mostrar en la cuadrícula de la página principal.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {DEFAULT_CATEGORIES.map((cat) => {
                    const isSelected = settings.featuredCategories?.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          const current = settings.featuredCategories || [];
                          if (isSelected) {
                            setSettings(prev => ({ 
                              ...prev, 
                              featuredCategories: current.filter(c => c !== cat) 
                            }));
                          } else if (current.length < 15) {
                            setSettings(prev => ({ 
                              ...prev, 
                              featuredCategories: [...current, cat] 
                            }));
                          } else {
                            toast.error('Puedes seleccionar un máximo de 15 categorías');
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 rounded-2xl border transition-all text-left",
                          isSelected 
                            ? "bg-[#00AEEF] border-[#00AEEF] text-white shadow-md shadow-[#00AEEF]/20" 
                            : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-300"
                        )}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest">{cat}</span>
                        {isSelected && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
                
                <div className="p-4 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 px-2">Categorías Seleccionadas ({settings.featuredCategories?.length || 0}/15)</h4>
                  <div className="flex flex-wrap gap-2">
                    {settings.featuredCategories?.map((cat) => (
                      <Badge 
                        key={cat} 
                        className="bg-white border-slate-200 text-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2 group"
                      >
                        {cat}
                        <button 
                          type="button" 
                          onClick={() => setSettings(prev => ({ ...prev, featuredCategories: prev.featuredCategories?.filter(c => c !== cat) }))}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {(!settings.featuredCategories || settings.featuredCategories.length === 0) && (
                      <p className="text-[10px] font-medium text-slate-400 italic px-2">No has seleccionado ninguna categoría aún.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Brand Colors Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="border-b border-slate-50 p-8">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#ED1C24]/10 flex items-center justify-center text-[#ED1C24]">
                    <Palette className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Paleta de Marca</CardTitle>
                    <CardDescription className="text-xs font-medium text-slate-400">Colores corporativos aplicados al sistema.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { name: 'Azul Brand', hex: '#00AEEF', bg: 'bg-[#00AEEF]' },
                    { name: 'Rojo Brand', hex: '#ED1C24', bg: 'bg-[#ED1C24]' },
                    { name: 'Amarillo Brand', hex: '#FFF200', bg: 'bg-[#FFF200]' },
                  ].map((color) => (
                    <div key={color.name} className="space-y-2">
                      <div className={cn("h-16 rounded-2xl shadow-inner", color.bg)} />
                      <div className="px-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">{color.name}</p>
                        <p className="text-[10px] font-mono text-slate-400 uppercase">{color.hex}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
              <ShieldCheck className="h-4 w-4" />
              Configuración Protegida
            </div>
            <Button 
              type="submit" 
              disabled={saving}
              className="h-14 rounded-full bg-[#00AEEF] hover:bg-[#00AEEF]/90 text-white font-black uppercase tracking-widest px-10 shadow-lg shadow-[#00AEEF]/20 transition-all active:scale-95"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}

