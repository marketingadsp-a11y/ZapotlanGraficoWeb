import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { SiteSettings } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, Image as ImageIcon, Globe, Palette, ShieldCheck, User } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({
    logoUrl: '',
    siteName: 'Zapotlán Gráfico',
    showAuthor: true
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'config', 'site'));
        if (docSnap.exists()) {
          setSettings(docSnap.data() as SiteSettings);
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

