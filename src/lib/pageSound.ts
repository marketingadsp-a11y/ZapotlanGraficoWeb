// Synthesized realistic paper-turn sound using Web Audio API
// Tuned for high-fidelity on both desktop speakers and mobile smartphone transducers
// Crisp paper friction noise + tactile soft landing thud

class PageSoundEngine {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isUnlocked: boolean = false;

  constructor() {
    const saved = localStorage.getItem('magazine_sound_muted');
    if (saved !== null) {
      this.isMuted = saved === 'true';
    }
  }

  private initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  /**
   * Unlock Web Audio API on mobile devices (iOS Safari & Android Chrome)
   * Must be called during any touchstart / pointerdown / click event stack
   */
  public unlock() {
    this.initContext();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    if (!this.isUnlocked) {
      try {
        // Micro inaudible buffer pulse to trigger iOS/Android hardware audio pipeline
        const buffer = this.audioCtx.createBuffer(1, 1, 22050);
        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioCtx.destination);
        source.start(0);
        this.isUnlocked = true;
      } catch {}
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('magazine_sound_muted', String(muted));
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public playFlip() {
    if (this.isMuted) return;

    try {
      this.initContext();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      const now = this.audioCtx.currentTime;

      // 1. Friction sweep (Paper sliding through air & rubbing against other leaves)
      const bufferSize = Math.floor(this.audioCtx.sampleRate * 0.28); // 280ms duration
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Pink/Brownish noise generation with natural fluttering variance
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.0990460;
        b1 = 0.96300 * b1 + white * 0.2965164;
        b2 = 0.57000 * b2 + white * 1.0526913;
        const flutter = 0.75 + 0.25 * Math.sin((i / bufferSize) * Math.PI * 4);
        output[i] = (b0 + b1 + b2 + white * 0.2) * 0.12 * flutter;
      }

      const noiseSource = this.audioCtx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // Dynamic Bandpass filter that sweeps frequency as page turns
      // Tuned to 3000Hz -> 900Hz to ring crisply on mobile smartphone speakers
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 1.2;
      filter.frequency.setValueAtTime(3000, now);
      filter.frequency.exponentialRampToValueAtTime(900, now + 0.25);

      // Volume envelope for the swish
      const gainNode = this.audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.65, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.28, now + 0.16);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.27);

      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + 0.28);

      // 2. Subtle soft landing "thump" of paper resting down
      const osc = this.audioCtx.createOscillator();
      const oscGain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now + 0.10);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.26);

      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.setValueAtTime(0.0001, now + 0.10);
      oscGain.gain.exponentialRampToValueAtTime(0.16, now + 0.15);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      osc.connect(oscGain);
      oscGain.connect(this.audioCtx.destination);

      osc.start(now + 0.10);
      osc.stop(now + 0.28);

    } catch (e) {
      console.warn("AudioContext play error:", e);
    }
  }
}

export const pageSound = new PageSoundEngine();
