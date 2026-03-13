/**
 * MenuScene — "Michael's Journey" themed menu
 */

import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const { width, height } = this.scale;

    // ── Background image (scale to cover full canvas) ──
    const bg = this.add.image(width / 2, height / 2, "menu_bg");
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale).setDepth(0);

    // ── Subtle dark overlay so text stays readable ──
    this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.25)
      .setDepth(1);

    // ── Title ──
    const titleStyle = {
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 5,
    };

    const titleTop = this.add
      .text(width / 2, height * 0.26, "MICHAEL'S", {
        ...titleStyle,
        fontSize: `${Math.round(width * 0.10)}px`,
        color: "#ffd166",
      })
      .setOrigin(0.5)
      .setDepth(2);

    const titleBot = this.add
      .text(width / 2, height * 0.37, "JOURNEY", {
        ...titleStyle,
        fontSize: `${Math.round(width * 0.13)}px`,
        color: "#ff6b35",
      })
      .setOrigin(0.5)
      .setDepth(2);

    // Teal divider
    this.add
      .graphics()
      .fillStyle(0x00c4aa, 0.7)
      .fillRect(width * 0.25, height * 0.46, width * 0.5, 2)
      .setDepth(2);

    // ── Subtitle ──
    this.add
      .text(width / 2, height * 0.51, "🎮  Steer. Bounce. Survive!", {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.043)}px`,
        color: "#00c4aa",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(2);

    // ── START button ──
    const btnBg = this.add
      .rectangle(width / 2, height * 0.63, 210, 56, 0xff6b35)
      .setInteractive({ useHandCursor: true })
      .setDepth(2);

    this.add
      .text(width / 2, height * 0.63, "START  🏄", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#ffffff",
        stroke: "#882200",
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(3);

    btnBg.on("pointerover",  () => btnBg.setFillStyle(0xff8c55));
    btnBg.on("pointerout",   () => btnBg.setFillStyle(0xff6b35));
    btnBg.on("pointerdown",  () => {
      btnBg.setFillStyle(0xdd5520);
      this.time.delayedCall(130, () => this.scene.start("AvatarScene"));
    });

    // ── Controls hint ──
    const hint = [
      "Michael jumps automatically on every platform!",
      "Mobile: tap left / right half to steer",
      "Desktop: A/D or ← → to steer",
    ].join("\n");

    this.add
      .text(width / 2, height * 0.84, hint, {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.030)}px`,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(2);

    // ── Title bounce tween ──
    this.tweens.add({
      targets: [titleTop, titleBot],
      y: "-=7",
      yoyo: true,
      repeat: -1,
      duration: 1000,
      ease: "Sine.easeInOut",
    });
  }
}
