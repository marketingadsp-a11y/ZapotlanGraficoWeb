import { useEffect, useRef } from 'react';
import { useSettings } from '@/lib/SettingsContext';
import { syncYouTubeVideosToArticles } from '@/lib/youtubeSync';
import { toast } from 'sonner';

export default function YouTubeAutoSync() {
  const { settings } = useSettings();
  const hasTriggeredRef = useRef(false);

  const youtubeUrl = settings.youtubeUrl || 'https://www.youtube.com/@ZapotlánGraficoMX';
  const autoSyncEnabled = settings.autoSyncYouTube !== false;

  useEffect(() => {
    if (!autoSyncEnabled || !youtubeUrl) return;

    const performSync = async (isInitial = false) => {
      try {
        const result = await syncYouTubeVideosToArticles(youtubeUrl, false);
        if (result.success && result.addedCount > 0) {
          toast.success(
            `Se ${result.addedCount === 1 ? 'agregó' : 'agregaron'} ${result.addedCount} ${result.addedCount === 1 ? 'nuevo video' : 'nuevos videos'} de YouTube a Noticias`,
            {
              description: 'Los nuevos videos y transmisiones ahora están disponibles como artículos.',
              duration: 5000,
            }
          );
        }
      } catch (err) {
        // Silent catch for background worker
        console.warn('Background YouTube sync notice:', err);
      }
    };

    // Run once after app mounts
    if (!hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      // Slight delay so initial page data can render first smoothly
      const initialTimer = setTimeout(() => {
        performSync(true);
      }, 1500);

      // Periodically check every 5 minutes while user has page open
      const interval = setInterval(() => {
        performSync(false);
      }, 5 * 60 * 1000);

      return () => {
        clearTimeout(initialTimer);
        clearInterval(interval);
      };
    }
  }, [youtubeUrl, autoSyncEnabled]);

  return null;
}
