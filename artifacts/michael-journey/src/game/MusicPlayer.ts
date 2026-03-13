/**
 * MusicPlayer.ts  —  Multi-theme procedural chiptune engine
 * -----------------------------------------------------------
 * Four distinct 8-bit soundscapes, one per Michael:
 *
 *   "doctor"  → calm hospital jingle (sine, BPM 72)
 *   "beach"   → tropical reggae      (triangle, BPM 100)
 *   "mexican" → fast mariachi        (square, BPM 148)
 *   "gym"     → heavy EDM pump-up    (sawtooth, BPM 158)
 *
 * Singleton — persists across all Phaser scene changes.
 * Call switchTheme() to change live; music restarts immediately.
 */

export type MusicTheme = "doctor" | "beach" | "mexican" | "gym";

// ── Note frequencies ──────────────────────────────────────────────────────────
const N = {
  _: 0,
  // Bass octave
  A2: 110.00, D3: 146.83, E3: 164.81, F3: 174.61,
  G3: 196.00, A3: 220.00, B3: 246.94, C3: 130.81,
  // Mid octave
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  G4: 392.00, A4: 440.00, B4: 493.88,
  // High octave
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
  G5: 783.99, A5: 880.00, B5: 987.77,
};

interface ThemeConfig {
  bpm:        number;
  melody:     number[];       // 16 eighth-note steps
  bass:       number[];       // 16 entries — only even steps played
  hihat:      number[];       // 16 entries — 1 = play hat, 0 = rest
  kicks:      number[];       // step indices where kick fires
  melWave:    OscillatorType;
  bassWave:   OscillatorType;
  melVol:     number;
  bassVol:    number;
  masterVol:  number;
}

const THEMES: Record<MusicTheme, ThemeConfig> = {

  // ── Doctor — soft hospital jingle, C-major, sine waves ─────────────────────
  doctor: {
    bpm:  72,
    melody: [
      N.C5, N._,  N.E5, N._,
      N.G5, N._,  N.E5, N._,
      N.F5, N._,  N.D5, N._,
      N.E5, N._,  N.C5, N._,
    ],
    bass: [
      N.C3, N._, N.C3, N._,
      N.G3, N._, N.G3, N._,
      N.F3, N._, N.F3, N._,
      N.G3, N._, N.G3, N._,
    ],
    hihat:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], // every 4 steps, gentle
    kicks:  [0, 8],
    melWave:  "sine",
    bassWave: "sine",
    melVol:   0.45,
    bassVol:  0.35,
    masterVol: 0.13,
  },

  // ── Beach — tropical reggae, G-major, triangle waves ────────────────────────
  beach: {
    bpm: 100,
    melody: [
      N.G4, N.A4, N.B4, N._,
      N.D5, N._,  N.B4, N.A4,
      N.G4, N.A4, N.B4, N.D5,
      N.E5, N.D5, N.B4, N._,
    ],
    bass: [
      N.G3, N._, N.G3, N._,
      N.C3, N._, N.C3, N._,
      N.D3, N._, N.D3, N._,
      N.C3, N._, N.C3, N._,
    ],
    hihat:  [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0], // off-beat (reggae feel)
    kicks:  [0, 8],
    melWave:  "triangle",
    bassWave: "triangle",
    melVol:   0.40,
    bassVol:  0.45,
    masterVol: 0.16,
  },

  // ── Mexican — fast mariachi, La-Bamba-ish, square waves ─────────────────────
  mexican: {
    bpm: 148,
    melody: [
      N.A4, N.G4, N.F4, N.G4,
      N.A4, N._,  N.C5, N.B4,
      N.A4, N.G4, N.F4, N.G4,
      N.A4, N.C5, N.D5, N._,
    ],
    bass: [
      N.C3, N._, N.F3, N._,
      N.G3, N._, N.G3, N._,
      N.C3, N._, N.F3, N._,
      N.G3, N._, N.C3, N._,
    ],
    hihat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], // every other step, festive
    kicks:  [0, 4, 8, 12],                          // every beat = marcato
    melWave:  "square",
    bassWave: "sawtooth",
    melVol:   0.38,
    bassVol:  0.50,
    masterVol: 0.20,
  },

  // ── Gym — heavy EDM pump-up, A-minor pentatonic, sawtooth ────────────────────
  gym: {
    bpm: 158,
    melody: [
      N.E5, N.E5, N.G5, N._,
      N.E5, N._,  N.A5, N.G5,
      N.E5, N.E5, N.G5, N._,
      N.E5, N.A5, N.B5, N._,
    ],
    bass: [
      N.A2, N._, N.A2, N._,
      N.A2, N._, N.A2, N._,
      N.D3, N._, N.D3, N._,
      N.E3, N._, N.A2, N._,
    ],
    hihat:  [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1], // every step, driving
    kicks:  [0, 4, 8, 12],                          // 4-on-the-floor
    melWave:  "sawtooth",
    bassWave: "sawtooth",
    melVol:   0.35,
    bassVol:  0.55,
    masterVol: 0.22,
  },
};

// ── Singleton player ──────────────────────────────────────────────────────────
export class MusicPlayer {
  private static _instance: MusicPlayer | null = null;

  private ctx:        AudioContext | null = null;
  private masterGain: GainNode    | null = null;

  private isPlaying   = false;
  private theme: MusicTheme = "doctor";
  private nextNoteTime = 0;
  private currentStep  = 0;
  private schedulerTimer: ReturnType<typeof setTimeout> | null = null;

  static getInstance(): MusicPlayer {
    if (!MusicPlayer._instance) {
      MusicPlayer._instance = new MusicPlayer();
      // Re-resume the AudioContext whenever the page becomes visible again
      // (iOS suspends all AudioContexts when the browser goes to background).
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          MusicPlayer._instance?.resumeIfNeeded();
        }
      });
    }
    return MusicPlayer._instance;
  }

  /** Resume the context and restart the scheduler if it stalled. */
  resumeIfNeeded() {
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") {
      this.ctx.resume().then(() => {
        // If music should be playing but the scheduler died, restart it.
        if (this.isPlaying && !this.schedulerTimer) {
          this.nextNoteTime = this.ctx!.currentTime + 0.05;
          this.schedule();
        }
      }).catch(() => {});
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Switch to a new theme. If music is playing it restarts immediately. */
  switchTheme(theme: MusicTheme) {
    if (theme === this.theme && this.isPlaying) return;
    const wasPlaying = this.isPlaying;
    this._stop();
    this.theme = theme;
    if (wasPlaying) this._start();
  }

  /** Start (or resume) music with the current theme. */
  start(theme?: MusicTheme) {
    if (theme && theme !== this.theme) {
      this._stop();
      this.theme = theme;
    }
    if (!this.isPlaying) this._start();
  }

  /** Stop the music. */
  stop() { this._stop(); }

  /** Toggle play/stop. */
  toggle() { this.isPlaying ? this._stop() : this._start(); }

  get playing() { return this.isPlaying; }
  get currentTheme() { return this.theme; }

  /**
   * Call this from ANY direct user-gesture handler (tap / click).
   * iOS/Chrome block AudioContext until a gesture has fired —
   * pre-creating and resuming the context here guarantees music
   * will play when start() is later called from a scene transition.
   */
  unlock() {
    try {
      const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!this.ctx || this.ctx.state === "closed") {
        this.ctx = new Ctor() as AudioContext;
        this.masterGain = null;
      }
      const ctx = this.ctx;
      const playSilent = () => {
        try {
          const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.start(0);
          src.stop(0.001);
        } catch { /* ignore */ }
      };
      if (ctx.state === "suspended") {
        // Resume first; once running, play the silent buffer to fully prime iOS.
        ctx.resume().then(playSilent).catch(() => {});
      } else {
        playSilent();
      }
      // If music should be playing but was interrupted, restart the scheduler.
      if (this.isPlaying && !this.schedulerTimer && ctx.state === "running") {
        this.nextNoteTime = ctx.currentTime + 0.05;
        this.schedule();
      }
    } catch { /* ignore */ }
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private ensureContext() {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = null; // force gain node rebuild on new context
    }
    const cfg = THEMES[this.theme];
    if (!this.masterGain || this.masterGain.gain.value !== cfg.masterVol) {
      const gain = this.ctx.createGain();
      gain.gain.value = cfg.masterVol;
      gain.connect(this.ctx.destination);
      this.masterGain = gain;
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  }

  private _start() {
    this.ensureContext();
    this.isPlaying   = true;
    this.currentStep = 0;
    if (this.ctx!.state === "running") {
      this.nextNoteTime = this.ctx!.currentTime + 0.05;
      this.schedule();
    } else {
      // Context is still suspended (resume() is async).
      // Wait for it to actually start, then begin scheduling.
      this.ctx!.resume().then(() => {
        if (this.isPlaying) {
          this.nextNoteTime = this.ctx!.currentTime + 0.05;
          this.schedule();
        }
      }).catch(() => {});
    }
  }

  private _stop() {
    this.isPlaying = false;
    if (this.schedulerTimer !== null) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  // Schedules a single oscillator note into the audio graph
  private playTone(
    freq: number, startTime: number, duration: number,
    type: OscillatorType, volume: number
  ) {
    if (!this.ctx || !this.masterGain || freq === 0) return;
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.88);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  // White-noise hi-hat burst
  private playHihat(startTime: number) {
    if (!this.ctx || !this.masterGain) return;
    const bufSize = this.ctx.sampleRate * 0.04;
    const buffer  = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data    = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src    = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain   = this.ctx.createGain();

    src.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = 7000;
    gain.gain.setValueAtTime(0.07, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(startTime);
    src.stop(startTime + 0.04);
  }

  // Kick drum (sine frequency-drop)
  private playKick(startTime: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc  = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, startTime);
    osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.08);
    gain.gain.setValueAtTime(0.7, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + 0.15);
  }

  // Look-ahead scheduler (keeps audio thread fed ~150 ms ahead)
  private schedule() {
    if (!this.ctx || !this.isPlaying) return;

    const cfg  = THEMES[this.theme];
    const step_dur = 60 / cfg.bpm / 2; // eighth-note duration

    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      const step = this.currentStep % cfg.melody.length;
      const t    = this.nextNoteTime;

      // Melody
      this.playTone(cfg.melody[step], t, step_dur, cfg.melWave, cfg.melVol);

      // Bass (every even step, held for two steps)
      if (step % 2 === 0) {
        this.playTone(cfg.bass[step], t, step_dur * 2, cfg.bassWave, cfg.bassVol);
      }

      // Hi-hat
      if (cfg.hihat[step]) this.playHihat(t);

      // Kick drum
      if (cfg.kicks.includes(step)) this.playKick(t);

      this.nextNoteTime += step_dur;
      this.currentStep++;
    }

    this.schedulerTimer = setTimeout(() => this.schedule(), 25);
  }
}
