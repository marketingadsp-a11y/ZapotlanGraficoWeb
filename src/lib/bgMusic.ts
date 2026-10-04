import { formatAudioStreamUrl } from './audioUrlHelper';

class BackgroundMusicManager {
  private audio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;
  private isPlayingState: boolean = false;
  private isWaitingForGestureState: boolean = false;
  private listeners: Set<(playing: boolean, waiting: boolean) => void> = new Set();
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
        if (!this.audio?.muted) {
          this.isPlayingState = true;
          this.isWaitingForGestureState = false;
          this.notify();
        }
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
        this.isWaitingForGestureState = false;
        this.notify();
      });
    } catch (e) {
      console.error('Failed to initialize Audio element:', e);
    }
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.isPlaying(), this.isWaitingForGestureState);
      } catch (err) {
        console.error('Error in background music listener:', err);
      }
    });
  }

  public subscribe(listener: (playing: boolean, waiting: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isPlaying(), this.isWaitingForGestureState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public isPlaying(): boolean {
    return this.isPlayingState && !!this.audio && !this.audio.muted && !this.audio.paused;
  }

  public isWaitingForGesture(): boolean {
    return this.isWaitingForGestureState;
  }

  public getCurrentUrl(): string | null {
    return this.currentUrl;
  }

  /**
   * Intenta reproducir con sonido. Si el navegador lo bloquea (enlace directo frío),
   * pre-reproduce en silencio para que esté caliente y activa el desbloqueo global
   * en el primer toque/clic en cualquier parte de la pantalla.
   */
  public prepareAndPlay(rawUrl: string): Promise<boolean> {
    if (!rawUrl) return Promise.resolve(false);
    this.initAudio();
    if (!this.audio) return Promise.resolve(false);

    const streamUrl = formatAudioStreamUrl(rawUrl);
    if (!streamUrl) return Promise.resolve(false);

    // Si ya está sonando este stream con sonido activo, no interrumpir
    if (this.currentUrl === streamUrl && !this.audio.paused && !this.audio.muted) {
      this.isPlayingState = true;
      this.isWaitingForGestureState = false;
      this.notify();
      return Promise.resolve(true);
    }

    this.currentUrl = streamUrl;
    if (this.audio.src !== streamUrl) {
      this.audio.src = streamUrl;
      this.audio.load();
    }

    // 1. Intentamos reproducción con sonido directo
    this.audio.muted = false;
    return this.audio
      .play()
      .then(() => {
        this.isPlayingState = true;
        this.isWaitingForGestureState = false;
        this.notify();
        return true;
      })
      .catch((err) => {
        console.warn('Autoplay directo con sonido restringido por el navegador. Activando pre-carga y escucha:', err);
        
        // 2. Pre-reproducir silenciado para calentar el stream inmediatamente
        if (this.audio) {
          this.audio.muted = true;
          this.audio.play().catch(() => {});
        }

        this.isWaitingForGestureState = true;
        this.notify();
        this.setupFallbackUnlock();
        return false;
      });
  }

  /**
   * Desbloqueo universal al primer toque/clic en CUALQUIER elemento o área de la pantalla
   */
  public forceUnlock() {
    if (!this.audio) return;
    this.audio.muted = false;
    this.audio
      .play()
      .then(() => {
        this.isPlayingState = true;
        this.isWaitingForGestureState = false;
        this.notify();
      })
      .catch((e) => {
        console.warn('Error en forceUnlock:', e);
      });
  }

  private setupFallbackUnlock() {
    if (this.unlockListenerAttached || typeof window === 'undefined') return;
    this.unlockListenerAttached = true;

    const cleanup = () => {
      this.unlockListenerAttached = false;
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('touchend', unlock, true);
      window.removeEventListener('click', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      document.removeEventListener('click', unlock, true);
    };

    const unlock = () => {
      if (!this.audio) {
        cleanup();
        return;
      }

      this.audio.muted = false;
      this.audio
        .play()
        .then(() => {
          this.isPlayingState = true;
          this.isWaitingForGestureState = false;
          this.notify();
          cleanup();
        })
        .catch(() => {
          // Si el evento específico no bastó en este navegador (ej. pointerdown en Safari iOS),
          // no limpiamos para que el siguiente click/touchend lo intente.
        });
    };

    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('touchstart', unlock, { capture: true });
    window.addEventListener('touchend', unlock, { capture: true });
    window.addEventListener('click', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('click', unlock, { capture: true });
  }

  public toggle(rawUrl?: string): boolean {
    this.initAudio();
    if (!this.audio) return false;

    if (!this.audio.paused && !this.audio.muted) {
      this.audio.pause();
      this.isPlayingState = false;
      this.notify();
      return false;
    } else {
      if (rawUrl) {
        const streamUrl = formatAudioStreamUrl(rawUrl);
        if (this.audio.src !== streamUrl) {
          this.audio.src = streamUrl;
        }
      }
      this.audio.muted = false;
      this.audio.play().then(() => {
        this.isPlayingState = true;
        this.isWaitingForGestureState = false;
        this.notify();
      }).catch((e) => {
        console.warn('No se pudo reanudar audio:', e);
      });
      return true;
    }
  }

  public pause() {
    if (this.audio) {
      this.audio.pause();
      this.isPlayingState = false;
      this.notify();
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
      this.isPlayingState = false;
      this.isWaitingForGestureState = false;
      this.notify();
    }
  }
}

export const bgMusic = new BackgroundMusicManager();
