import { useEffect, useRef } from 'react';
import { useSettings } from '@/lib/SettingsContext';
import { syncFacebookPostsToArticles } from '@/lib/facebookSync';
import { toast } from 'sonner';

export default function FacebookAutoSync() {
  const { settings } = useSettings();
  const hasTriggeredRef = useRef(false);

  const facebookUrl = settings.facebookUrl || 'https://www.facebook.com/zapotlan.grafico';
  const autoSyncEnabled = settings.autoSyncFacebook !== false;

  useEffect(() => {
    if (!autoSyncEnabled || !facebookUrl) return;

    const performSync = async () => {
      try {
        const result = await syncFacebookPostsToArticles(facebookUrl, false);
        if (result.success && result.addedCount > 0) {
          toast.success(
            `Se ${result.addedCount === 1 ? 'sincronizó 1 nueva publicación' : `sincronizaron ${result.addedCount} nuevas publicaciones`} de Facebook`,
            {
              description: 'Disponible en la sección exclusiva de Facebook.',
              duration: 5000,
            }
          );
        }
      } catch (err) {
        console.warn('Background Facebook sync notice:', err);
      }
    };

    if (!hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      // Slight delay after initial mount
      const initialTimer = setTimeout(() => {
        performSync();
      }, 3500);

      // Periodic check every 5 minutes while user has page open
      const interval = setInterval(() => {
        performSync();
      }, 5 * 60 * 1000);

      return () => {
        clearTimeout(initialTimer);
        clearInterval(interval);
      };
    }
  }, [facebookUrl, autoSyncEnabled]);

  return null;
}
