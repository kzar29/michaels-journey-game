/**
 * MenuScene
 * ---------
 * The start screen shown when the game first loads and after game over.
 */

import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Background gradient using a rectangle
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Decorative stars (simple random circles)
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(1, 3);
      this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.3, 0.9));
    }

    // Title text
    this.add
      .text(width / 2, height * 0.28, "MICHAEL", {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.12)}px`,
        color: "#ffe84d",
        stroke: "#ff8800",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.40, "JOURNEY", {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.12)}px`,
        color: "#ff6fd8",
        stroke: "#880066",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Subtitle
    this.add
      .text(width / 2, height * 0.52, "🎮 Jump. Survive. Score!", {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.045)}px`,
        color: "#ccccff",
      })
      .setOrigin(0.5);

    // Start button
    const btnBg = this.add
      .rectangle(width / 2, height * 0.66, 200, 54, 0x44bb66)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(width / 2, height * 0.66, "START", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#ffffff",
        stroke: "#226633",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Button hover effects
    btnBg.on("pointerover", () => btnBg.setFillStyle(0x55cc77));
    btnBg.on("pointerout", () => btnBg.setFillStyle(0x44bb66));
    btnBg.on("pointerdown", () => {
      btnBg.setFillStyle(0x33aa55);
      this.time.delayedCall(120, () => this.scene.start("GameScene"));
    });

    // Controls hint
    const controlsText = [
      "Mobile: hold ◀ ▶ zones, tap JUMP",
      "Desktop: A/D or ← → to move, Space/↑ to jump",
    ].join("\n");

    this.add
      .text(width / 2, height * 0.85, controlsText, {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.032)}px`,
        color: "#aaaacc",
        align: "center",
      })
      .setOrigin(0.5);

    // Bounce animation on title
    this.tweens.add({
      targets: [
        this.children.list[3], // MICHAEL text
        this.children.list[4], // JOURNEY text
      ],
      y: "-=8",
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: "Sine.easeInOut",
    });
  }
}
