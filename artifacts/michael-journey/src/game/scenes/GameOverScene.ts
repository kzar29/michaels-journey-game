/**
 * GameOverScene — Michael's Journey
 */

import Phaser from "phaser";

export class GameOverScene extends Phaser.Scene {
  private finalScore: number = 0;

  constructor() {
    super({ key: "GameOverScene" });
  }

  init(data: { score?: number }) {
    this.finalScore = data.score ?? 0;
  }

  create() {
    const { width, height } = this.scale;

    // ── Background image (same as menu) ──
    const bg = this.add.image(width / 2, height / 2, "menu_bg");
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale).setDepth(0);

    // ── Dark overlay for readability ──
    this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.45)
      .setDepth(1);

    const ts = {
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 5,
    };

    // ── GAME OVER ──
    this.add
      .text(width / 2, height * 0.13, "GAME OVER", {
        ...ts,
        fontSize: `${Math.round(width * 0.10)}px`,
        color: "#ff6b35",
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(width / 2, height * 0.24, "MICHAEL'S JOURNEY", {
        ...ts,
        fontSize: `${Math.round(width * 0.055)}px`,
        color: "#ffd166",
      })
      .setOrigin(0.5)
      .setDepth(2);

    // Teal divider
    this.add
      .graphics()
      .fillStyle(0x00c4aa, 0.7)
      .fillRect(width * 0.25, height * 0.315, width * 0.5, 2)
      .setDepth(2);

    // ── Score ──
    const scoreTxt = this.add
      .text(width / 2, height * 0.38, `Score: ${this.finalScore}`, {
        ...ts,
        fontSize: `${Math.round(width * 0.09)}px`,
        color: "#ffd166",
      })
      .setOrigin(0.5)
      .setDepth(2);

    // ── Fun message ──
    this.add
      .text(width / 2, height * 0.52, this.getScoreMessage(this.finalScore), {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.040)}px`,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
        align: "center",
        wordWrap: { width: width * 0.85 },
      })
      .setOrigin(0.5)
      .setDepth(2);

    // ── RETRY button ──
    const retryBg = this.add
      .rectangle(width / 2, height * 0.66, 220, 56, 0xff6b35)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);

    this.add
      .text(width / 2, height * 0.66, "RETRY  🏄", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#ffffff",
        stroke: "#882200",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(3);

    retryBg.on("pointerover",  () => retryBg.setFillStyle(0xff8c55));
    retryBg.on("pointerout",   () => retryBg.setFillStyle(0xff6b35));
    retryBg.on("pointerdown",  () => {
      retryBg.setFillStyle(0xdd5520);
      this.time.delayedCall(120, () => this.scene.start("AvatarScene"));
    });

    // ── MAIN MENU button ──
    const menuBg = this.add
      .rectangle(width / 2, height * 0.78, 190, 44, 0x0d3b5e)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);

    this.add
      .text(width / 2, height * 0.78, "MAIN MENU", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#00c4aa",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(3);

    menuBg.on("pointerover",  () => menuBg.setFillStyle(0x1a5580));
    menuBg.on("pointerout",   () => menuBg.setFillStyle(0x0d3b5e));
    menuBg.on("pointerdown",  () => {
      this.time.delayedCall(100, () => this.scene.start("MenuScene"));
    });

    // Pulse on score
    this.tweens.add({
      targets: scoreTxt,
      scaleX: 1.06, scaleY: 1.06,
      yoyo: true, repeat: -1, duration: 650,
      ease: "Sine.easeInOut",
    });
  }

  private getScoreMessage(score: number): string {
    if (score === 0)  return "Bro, even the cactus did better 🌵";
    if (score < 5)    return "The ocean says: try again! 🌊";
    if (score < 10)   return "Not bad, Dr. Michael! 🩺";
    if (score < 20)   return "Getting those gains! 🏋️";
    if (score < 35)   return "Kitesurfing through the sky! 🪁";
    if (score < 50)   return "¡Increíble, amigo! 🇲🇽🔥";
    return "LEYENDA! Michael is unstoppable! 🏆🌊🏄";
  }
}
