import { formatAudioStreamUrl } from './audioUrlHelper';

class BackgroundMusicManager {
  private audio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;
  private isPlayingState: boolean = false;
  private listeners: Set<(playing: boolean) => void> = new Set();
  private pendingUrl: string | null = null;
  private unlockListenerAttached: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudio();
    }
  }

  private initAudio() {
    if (this.audio) return;
    try {
      this.audio = new Audio();
      this.audio.loop = true;
      this.audio.preload = 'auto';

      this.audio.addEventListener('play', () => {
        this.isPlayingState = true;
        this.notify();
      });

      this.audio.addEventListener('pause', () => {
        this.isPlayingState = false;
        this.notify();
      });

      this.audio.addEventListener('ended', () => {
        this.isPlayingState = false;
        this.notify();
      });

      this.audio.addEventListener('error', (e) => {
        console.warn('BackgroundMusic audio element error:', e);
        this.isPlayingState = false;
        this.notify();
      });
    } catch (e) {
      console.error('Failed to initialize Audio element:', e);
    }
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.isPlayingState);
      } catch (err) {
        console.error('Error in background music listener:', err);
      }
    });
  }

  public subscribe(listener: (playing: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isPlayingState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public isPlaying(): boolean {
    return this.isPlayingState;
  }

  public getCurrentUrl(): string | null {
    return this.currentUrl;
  }

  /**
   * Disparar reproducción durante el gesto del usuario (clic en la tarjeta del periódico)
   * o al montar el visor si ya hay activación.
   */
  public prepareAndPlay(rawUrl: string): Promise<boolean> {
    if (!rawUrl) return Promise.resolve(false);
    this.initAudio();
    if (!this.audio) return Promise.resolve(false);

    const streamUrl = formatAudioStreamUrl(rawUrl);
    if (!streamUrl) return Promise.resolve(false);

    // Si ya está reproduciendo este mismo stream, aseguramos estado
    if (this.currentUrl === streamUrl && !this.audio.paused) {
      this.isPlayingState = true;
      this.notify();
      return Promise.resolve(true);
    }

    this.currentUrl = streamUrl;
    if (this.audio.src !== streamUrl) {
      this.audio.src = streamUrl;
      this.audio.load();
    }

    return this.audio
      .play()
      .then(() => {
        this.isPlayingState = true;
        this.pendingUrl = null;
        this.notify();
        return true;
      })
      .catch((err) => {
        console.warn('Autoplay bloqueado por política del navegador. Esperando interacción...', err);
        this.pendingUrl = streamUrl;
        this.setupFallbackUnlock();
        return false;
      });
  }

  /**
   * Listener global de rescate para navegadores con política estricta de reproducción (cold load)
   */
  private setupFallbackUnlock() {
    if (this.unlockListenerAttached || typeof window === 'undefined') return;
    this.unlockListenerAttached = true;

    const unlock = () => {
      if (this.audio && this.pendingUrl) {
        this.audio.play().then(() => {
          this.isPlayingState = true;
          this.pendingUrl = null;
          this.notify();
        }).catch(() => {});
      }
      this.unlockListenerAttached = false;
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('click', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };

    window.addEventListener('pointerdown', unlock, { capture: true, once: true });
    window.addEventListener('touchstart', unlock, { capture: true, once: true });
    window.addEventListener('click', unlock, { capture: true, once: true });
    window.addEventListener('keydown', unlock, { capture: true, once: true });
  }

  public toggle(rawUrl?: string): boolean {
    this.initAudio();
    if (!this.audio) return false;

    if (!this.audio.paused) {
      this.audio.pause();
      return false;
    } else {
      if (rawUrl) {
        const streamUrl = formatAudioStreamUrl(rawUrl);
        if (this.audio.src !== streamUrl) {
          this.audio.src = streamUrl;
        }
      }
      this.audio.play().catch((e) => {
        console.warn('No se pudo reanudar audio:', e);
      });
      return true;
    }
  }

  public pause() {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
  }

  public stop() {
    if (this.audio) {
      this.audio.pause();
      try {
        this.audio.currentTime = 0;
        this.audio.removeAttribute('src');
        this.audio.load();
      } catch {}
      this.currentUrl = null;
      this.pendingUrl = null;
      this.isPlayingState = false;
      this.notify();
    }
  }
}

export const bgMusic = new BackgroundMusicManager();
