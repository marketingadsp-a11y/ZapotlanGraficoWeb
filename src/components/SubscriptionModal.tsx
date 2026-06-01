import React, { useEffect, useState } from 'react';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useSettings } from '@/lib/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Phone, User as UserIcon, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';

export default function SubscriptionModal() {
  const { settings } = useSettings();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // If modal is not enabled globally, do nothing
    if (!settings.subscriptionModalEnabled) return;

    // Skip modal on administrator console routes
    if (location.pathname.startsWith('/admin')) {
      setIsOpen(false);
      return;
    }

    const triggerType = settings.subscriptionModalTriggerType || 'session';
    const delaySecs = settings.subscriptionModalDelaySeconds || 5;

    // Check if user is already registered in this local browser
    const isSubscribedLocally = localStorage.getItem('zg_subscribed') === 'true';
    
    // Only bypass if not 'always' -- 'always' is a persistent prompt
    if (triggerType !== 'always') {
      if (isSubscribedLocally) return;
    }

    const showPopup = () => {
      setIsOpen(true);
    };

    if (triggerType === 'session') {
      const hasSeenThisSession = sessionStorage.getItem('zg_sub_modal_seen') === 'true';
      if (!hasSeenThisSession) {
        // Show after a minor initial page load breathing room (e.g., 2.5 seconds)
        const timer = setTimeout(() => {
          showPopup();
          sessionStorage.setItem('zg_sub_modal_seen', 'true');
        }, 2500);
        return () => clearTimeout(timer);
      }
    } else if (triggerType === 'timer') {
      const timer = setTimeout(() => {
        showPopup();
      }, delaySecs * 1000);
      return () => clearTimeout(timer);
    } else if (triggerType === 'always') {
      // Unconditionally show on page load / navigation after a ultra-brief delay
      const timer = setTimeout(() => {
        showPopup();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [settings, location.pathname]);

  const handleClose = () => {
    setIsOpen(false);
    // Mark dismissal timestamp to prevent aggressive overlays under other conditions
    localStorage.setItem('zg_sub_modal_dismissed_time', Date.now().toString());
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    const cleanName = name.trim();
    const cleanPhone = phoneNumber.replace(/\D/g, ''); // numerical digits only

    if (!cleanName) {
      toast.error('Por favor ingresa tu nombre completo.');
      return;
    }

    if (cleanPhone.length !== 10) {
      toast.error('El número celular debe constar exactamente de 10 dígitos.');
      return;
    }

    setLoading(true);

    try {
      // Check if phone number is already subscribed
      const subscribersRef = collection(db, 'subscribers');
      const q = query(subscribersRef, where('phoneNumber', '==', cleanPhone));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast.info('Este número celular ya se encuentra registrado. ¡Gracias por tu suscripción!');
        localStorage.setItem('zg_subscribed', 'true');
        setIsOpen(false);
        setLoading(false);
        return;
      }

      // Add subscriber
      await addDoc(subscribersRef, {
        name: cleanName,
        phoneNumber: cleanPhone,
        createdAt: Timestamp.now()
      });

      // Save success state locally
      localStorage.setItem('zg_subscribed', 'true');
      setSuccess(true);
      toast.success('¡Suscripción realizada con éxito!');
      
      // Auto-close success message after some seconds
      setTimeout(() => {
        setIsOpen(false);
        // Reset form
        setName('');
        setPhoneNumber('');
        setSuccess(false);
      }, 3500);

    } catch (error) {
      console.error("Error subscribing:", error);
      toast.error('Error al realizar el registro. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/10 bg-white p-8 shadow-2xl md:p-10"
          >
            {/* Close Button */}
            <button 
              onClick={handleClose}
              className="absolute right-6 top-6 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Glowing Brand Gradient Aura */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-2 bg-gradient-to-r from-[#00AEEF] via-[#FFF200] to-[#ED1C24] rounded-full blur-[2px]" />

            {!success ? (
              <div className="space-y-6">
                <div className="text-center space-y-3">
                  {settings.logoUrl ? (
                    <div className="mx-auto flex h-16 w-auto max-w-[200px] items-center justify-center py-1">
                      <img 
                        src={settings.logoUrl} 
                        alt="Logo" 
                        className="max-h-12 max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00AEEF]/10 text-[#00AEEF] animate-bounce">
                      <Bell className="h-6 w-6" />
                    </div>
                  )}
                  <h2 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                    {settings.subscriptionModalTitle || '¡Recibe Notificaciones Recientes!'}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">
                    {settings.subscriptionModalDescription || 'Regístrate para mantenerte al día con las noticias de última hora, reportajes especiales y promociones exclusivas de comercios asociados.'}
                  </p>
                </div>

                <form onSubmit={handleSubscribe} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
                      Nombre Completo
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Escribe tu nombre..."
                        className="h-12 w-full pl-11 pr-4 rounded-xl border border-slate-100 bg-slate-50 text-base md:text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#00AEEF]/20 focus:border-[#00AEEF] transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#00AEEF] pl-1 flex items-center justify-between">
                      <span>Número Celular (10 dígitos)</span>
                      {phoneNumber.length > 0 && phoneNumber.replace(/\D/g, '').length !== 10 && (
                        <span className="text-[8px] font-bold text-[#ED1C24] normal-case bg-red-50 px-2 py-0.5 rounded-full">
                          Faltan {10 - phoneNumber.replace(/\D/g, '').length} dígitos
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <input 
                        type="tel" 
                        required
                        maxLength={15}
                        value={phoneNumber}
                        onChange={(e) => {
                          // Clean to only allow digits and standard spaces/dashes
                          const cleaned = e.target.value.replace(/[^\d\s\-\(\)]/g, '');
                          setPhoneNumber(cleaned);
                        }}
                        placeholder="Ej. 341 123 4567"
                        className="h-12 w-full pl-11 pr-4 rounded-xl border border-slate-100 bg-slate-50 text-base md:text-sm font-mono font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#00AEEF]/20 focus:border-[#00AEEF] transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] hover:bg-[#00AEEF] transition-all duration-300 active:scale-95 shadow-md flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      'Suscribirme Ahora'
                    )}
                  </button>

                  <p className="text-[9px] text-center text-slate-400 font-medium leading-normal">
                    * Tu número está seguro con nosotros. No enviamos spam y puedes desuscribirte en cualquier momento.
                  </p>
                </form>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-4"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-green-500 shadow-sm border border-green-100">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">¡Suscripción Confirmada!</h3>
                  <p className="text-xs font-bold text-[#00AEEF] uppercase tracking-widest leading-none">
                    ¡Gracias, {name.split(' ')[0]}!
                  </p>
                </div>
                <p className="text-xs font-medium text-slate-500 leading-relaxed px-4">
                  Te has registrado correctamente para recibir las últimas actualizaciones de <strong>{settings.siteName || 'Zapotlán Gráfico'}</strong> directamente en tu móvil.
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
