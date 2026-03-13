/**
 * AudioManager — synthesised sound effects via Web Audio API.
 * No audio files needed; tones are generated in-browser.
 */

class AudioManager {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext | null {
    try {
      if (!this.ctx || this.ctx.state === "closed") {
        this.ctx = new AudioContext();
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  // Short boing on each platform land
  playBounce() {
    const ctx = this.getCtx();
    if (!ctx) return;
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
    if (!ctx) return;
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
    if (!ctx) return;
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
