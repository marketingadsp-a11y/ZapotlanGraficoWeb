import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Newspaper, Lock, User, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { useSettings } from '@/lib/SettingsContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      toast.success('Bienvenido, Cristobal');
      navigate('/admin/dashboard');
    } else {
      toast.error('Credenciales incorrectas');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 h-96 w-96 rounded-full bg-[#00AEEF]/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-[#ED1C24]/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden">
          <CardHeader className="space-y-4 text-center p-10 pb-6">
            <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-xl rotate-3">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="h-12 w-12 object-contain" />
              ) : (
                <Newspaper className="h-10 w-10" />
              )}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-black tracking-tighter uppercase text-slate-900">
                {settings.siteName || 'ADMIN PANEL'}
              </CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Ingresa tus credenciales
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-10 pt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Usuario</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input
                      placeholder="cristobal_admin"
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-colors"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-colors"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest shadow-xl transition-all active:scale-95"
              >
                Acceder al Panel
              </Button>
              
              <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
                <ShieldCheck className="h-3 w-3" />
                Acceso Seguro SSL
              </div>
            </form>
          </CardContent>
        </Card>
        
        <p className="mt-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
          &copy; {new Date().getFullYear()} {settings.siteName} • Todos los derechos reservados
        </p>
      </motion.div>
    </div>
  );
}

