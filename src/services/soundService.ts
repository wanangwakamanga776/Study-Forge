/**
 * Sound Service for Focus Forge
 * Uses Web Audio API to synthesize UI sounds without external assets.
 */

class SoundService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private hasInteracted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const handleInteraction = () => {
        this.hasInteracted = true;
        this.init();
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
      };
      window.addEventListener('click', handleInteraction);
      window.addEventListener('keydown', handleInteraction);
      window.addEventListener('touchstart', handleInteraction);
    }
  }

  private init() {
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {
          // Ignore resume errors
        });
      }
    } catch (e) {
      console.warn('Failed to initialize AudioContext:', e);
      this.ctx = null;
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    if (!this.enabled || !this.hasInteracted) return;
    
    try {
      this.init();
      if (!this.ctx || this.ctx.state !== 'running') return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Failed to play tone:', e);
    }
  }

  playClick() {
    this.playTone(800, 'sine', 0.1, 0.05);
  }

  playSuccess() {
    const now = this.ctx?.currentTime || 0;
    this.playTone(523.25, 'sine', 0.5, 0.1); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.5, 0.1), 100); // E5
    setTimeout(() => this.playTone(783.99, 'sine', 0.5, 0.1), 200); // G5
  }

  playSmelt() {
    // Metallic clink
    this.playTone(1200, 'square', 0.05, 0.02);
    setTimeout(() => this.playTone(400, 'sine', 0.2, 0.05), 20);
  }

  playLevelUp() {
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    freqs.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.6, 0.1), i * 150);
    });
  }

  playTimerEnd() {
    const now = this.ctx?.currentTime || 0;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.playTone(440, 'sawtooth', 0.3, 0.05);
        setTimeout(() => this.playTone(880, 'sawtooth', 0.3, 0.05), 150);
      }, i * 600);
    }
  }

  playTick() {
    this.playTone(150, 'sine', 0.05, 0.01);
  }

  playAnvilClink() {
    // Sharp metallic impact
    this.playTone(2500, 'square', 0.03, 0.03);
    setTimeout(() => this.playTone(800, 'sine', 0.15, 0.04), 10);
  }

  playError() {
    this.playTone(150, 'sawtooth', 0.3, 0.05);
    setTimeout(() => this.playTone(100, 'sawtooth', 0.3, 0.05), 100);
  }
}

export const soundService = new SoundService();
