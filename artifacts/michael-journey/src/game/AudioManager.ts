/**
 * AudioManager — synthesised sound effects via Web Audio API.
 * No audio files needed; tones are generated in-browser.
 */

/** Play a 1-sample silent buffer — the only reliable way to unlock
 *  Web Audio on iOS Chrome / Safari inside a user-gesture handler. */
function silentUnlock(ctx: AudioContext) {
  try {
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    src.stop(0.001);
  } catch { /* ignore */ }
}

function makeAudioContext(): AudioContext {
  const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
  return new Ctor() as AudioContext;
}

class AudioManager {
  private ctx: AudioContext | null = null;

  /** Call from ANY direct user-gesture handler (tap / click / touchstart).
   *  Creates the context if needed, resumes it, and plays a silent buffer
   *  so iOS Chrome fully unblocks audio for all subsequent calls. */
  unlock() {
    try {
      if (!this.ctx || this.ctx.state === "closed") {
        this.ctx = makeAudioContext();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      // Silent buffer trick — required on iOS Chrome even after .resume()
      silentUnlock(this.ctx);
    } catch { /* ignore */ }
  }

  private getCtx(): AudioContext | null {
    try {
      if (!this.ctx || this.ctx.state === "closed") {
        this.ctx = makeAudioContext();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // Short boing on each platform land
  playBounce() {
    const ctx = this.getCtx();
    if (!ctx || ctx.state !== "running") return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.09);
  }

  // Ascending arpeggio on level-up
  playLevelUp() {
    const ctx = this.getCtx();
    if (!ctx || ctx.state !== "running") return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.11;
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.start(t);
      osc.stop(t + 0.14);
    });
  }

  // Descending sad tones on game over
  playGameOver() {
    const ctx = this.getCtx();
    if (!ctx || ctx.state !== "running") return;
    const notes = [440, 370, 311, 220];
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }
}

export const audioManager = new AudioManager();
