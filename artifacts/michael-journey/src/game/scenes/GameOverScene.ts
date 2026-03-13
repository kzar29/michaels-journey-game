/**
 * GameOverScene — Michael's Journey
 * Themed: Mexico sunset · Ocean · Gym · Doctor
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
    const g = this.add.graphics();

    // ── Sunset background ──
    g.fillGradientStyle(0x0a1628, 0x0a1628, 0x3d1000, 0x3d1000, 1);
    g.fillRect(0, 0, width, height);

    // Horizon glow
    g.fillGradientStyle(0xff6b35, 0xff6b35, 0x0a1628, 0x0a1628, 0.5, 0.5, 0, 0);
    g.fillRect(0, height * 0.55, width, height * 0.45);

    // Stars
    for (let i = 0; i < 50; i++) {
      const col = Phaser.Utils.Array.GetRandom([0xffd166, 0x00c4aa, 0xffffff]);
      this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height * 0.6),
        Phaser.Math.Between(1, 2),
        col,
        Phaser.Math.FloatBetween(0.2, 0.7)
      );
    }

    // Moon
    this.add.circle(width * 0.80, height * 0.10, 26, 0xffd166, 0.85);
    this.add.circle(width * 0.80, height * 0.10, 20, 0xffecaa, 0.6);

    // Floating icons
    const icons = [
      { t: "🏄", x: 0.08, y: 0.60 },
      { t: "🩺", x: 0.88, y: 0.15 },
      { t: "🏋️",x: 0.10, y: 0.30 },
      { t: "🌵", x: 0.88, y: 0.55 },
    ];
    icons.forEach(({ t, x, y }) =>
      this.add.text(width * x, height * y, t, { fontSize: "24px" }).setOrigin(0.5).setAlpha(0.45)
    );

    // ── GAME OVER ──
    this.add
      .text(width / 2, height * 0.13, "GAME OVER", {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.10)}px`,
        color: "#ff6b35",
        stroke: "#3d1000",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.24, "MICHAEL'S JOURNEY", {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.055)}px`,
        color: "#ffd166",
        stroke: "#3d1000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Thin divider
    g.fillStyle(0x00c4aa, 0.6);
    g.fillRect(width * 0.25, height * 0.315, width * 0.5, 2);

    // ── Score ──
    this.add
      .text(width / 2, height * 0.38, `Score: ${this.finalScore}`, {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.09)}px`,
        color: "#ffd166",
        stroke: "#3d1000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // ── Fun message ──
    this.add
      .text(width / 2, height * 0.52, this.getScoreMessage(this.finalScore), {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.040)}px`,
        color: "#aae8ff",
        align: "center",
        wordWrap: { width: width * 0.85 },
      })
      .setOrigin(0.5);

    // ── RESTART button ──
    const restartBg = this.add
      .rectangle(width / 2, height * 0.66, 220, 56, 0xff6b35)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width / 2, height * 0.66, "RETRY  🏄", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#ffffff",
        stroke: "#882200",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    restartBg.on("pointerover",  () => restartBg.setFillStyle(0xff8c55));
    restartBg.on("pointerout",   () => restartBg.setFillStyle(0xff6b35));
    restartBg.on("pointerdown",  () => {
      restartBg.setFillStyle(0xdd5520);
      this.time.delayedCall(120, () => this.scene.start("AvatarScene"));
    });

    // ── MENU button ──
    const menuBg = this.add
      .rectangle(width / 2, height * 0.78, 190, 44, 0x0d3b5e)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width / 2, height * 0.78, "MAIN MENU", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#00c4aa",
      })
      .setOrigin(0.5);

    menuBg.on("pointerover",  () => menuBg.setFillStyle(0x1a5580));
    menuBg.on("pointerout",   () => menuBg.setFillStyle(0x0d3b5e));
    menuBg.on("pointerdown",  () => {
      this.time.delayedCall(100, () => this.scene.start("MenuScene"));
    });

    // Pulse on score
    this.tweens.add({
      targets: this.children.list[9], // score text
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
