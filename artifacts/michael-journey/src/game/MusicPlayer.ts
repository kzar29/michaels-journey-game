/**
 * MusicPlayer.ts
 * --------------
 * Procedural 8-bit chiptune background music using the Web Audio API.
 * Singleton — persists across Phaser scene changes so music never restarts.
 *
 * Usage:
 *   MusicPlayer.getInstance().start();  // begin (or resume) music
 *   MusicPlayer.getInstance().stop();   // pause
 *   MusicPlayer.getInstance().toggle(); // flip state
 */

export class MusicPlayer {
  private static _instance: MusicPlayer | null = null;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private nextNoteTime = 0;
  private currentStep = 0;
  private schedulerTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Note frequencies ───────────────────────────────────────────────────────
  private static readonly N = {
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
    _:  0, // rest
  };

  // ── Tempo ─────────────────────────────────────────────────────────────────
  private static readonly BPM   = 138;
  private static readonly STEP  = 60 / MusicPlayer.BPM / 2; // eighth-note duration (s)

  // ── 16-step melody (square wave) ───────────────────────────────────────────
  private static readonly MELODY = [
    MusicPlayer.N.E5, MusicPlayer.N._,
    MusicPlayer.N.G5, MusicPlayer.N.E5,
    MusicPlayer.N.C5, MusicPlayer.N.E5,
    MusicPlayer.N.G5, MusicPlayer.N._,

    MusicPlayer.N.A5, MusicPlayer.N._,
    MusicPlayer.N.G5, MusicPlayer.N.A5,
    MusicPlayer.N.G5, MusicPlayer.N.E5,
    MusicPlayer.N.D5, MusicPlayer.N._,
  ];

  // ── 16-step bass line (sawtooth, plays on even steps) ────────────────────
  private static readonly BASS = [
    MusicPlayer.N.C3, MusicPlayer.N.C3, MusicPlayer.N.C3, MusicPlayer.N.C3,
    MusicPlayer.N.G3, MusicPlayer.N.G3, MusicPlayer.N.G3, MusicPlayer.N.G3,
    MusicPlayer.N.A3, MusicPlayer.N.A3, MusicPlayer.N.A3, MusicPlayer.N.A3,
    MusicPlayer.N.F3, MusicPlayer.N.F3, MusicPlayer.N.F3, MusicPlayer.N.F3,
  ];

  // ── 16-step hi-hat (noise burst, every other step) ───────────────────────
  private static readonly HIHAT = [
    1, 0, 1, 0, 1, 0, 1, 0,
    1, 0, 1, 0, 1, 0, 1, 0,
  ];

  static getInstance(): MusicPlayer {
    if (!MusicPlayer._instance) MusicPlayer._instance = new MusicPlayer();
    return MusicPlayer._instance;
  }

  private ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.18;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  // Schedules a single oscillator note
  private playTone(
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    volume: number
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

  // Schedules a noise burst (hi-hat simulation)
  private playHihat(startTime: number) {
    if (!this.ctx || !this.masterGain) return;
    const bufSize = this.ctx.sampleRate * 0.04;
    const buffer  = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data    = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const source = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain   = this.ctx.createGain();

    source.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = 6000;
    gain.gain.setValueAtTime(0.08, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(startTime);
    source.stop(startTime + 0.04);
  }

  // Look-ahead scheduler — keeps the audio thread fed
  private schedule() {
    if (!this.ctx || !this.isPlaying) return;

    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      const step = this.currentStep % MusicPlayer.MELODY.length;
      const t    = this.nextNoteTime;
      const dur  = MusicPlayer.STEP;

      // Melody — square wave
      this.playTone(MusicPlayer.MELODY[step], t, dur, "square", 0.35);

      // Bass — sawtooth, plays on every even step
      if (step % 2 === 0) {
        this.playTone(MusicPlayer.BASS[step], t, dur * 2, "sawtooth", 0.45);
      }

      // Hi-hat
      if (MusicPlayer.HIHAT[step]) this.playHihat(t);

      // Kick drum on beats 1 and 3 (steps 0 and 8)
      if (step === 0 || step === 8) {
        this.playTone(80, t, 0.12, "sine", 0.6);
        this.playTone(60, t + 0.05, 0.07, "sine", 0.3);
      }

      this.nextNoteTime += dur;
      this.currentStep++;
    }

    this.schedulerTimer = setTimeout(() => this.schedule(), 25);
  }

  /** Start (or resume) the music. Safe to call multiple times. */
  start() {
    if (this.isPlaying) return;
    this.ensureContext();
    this.isPlaying    = true;
    this.nextNoteTime = this.ctx!.currentTime + 0.05;
    this.schedule();
  }

  /** Pause the music. Calling start() resumes from the same position. */
  stop() {
    this.isPlaying = false;
    if (this.schedulerTimer !== null) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  /** Toggle between playing and stopped. */
  toggle() {
    this.isPlaying ? this.stop() : this.start();
  }

  get playing() { return this.isPlaying; }
}
