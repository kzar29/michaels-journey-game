/**
 * MenuScene — "Michael's Journey" themed menu
 * Theme: Mexico sunset · Ocean kitesurfing · Gym · Doctor
 */

import Phaser from "phaser";

// Michael's palette
const C = {
  bgDeep:     0x0a1628,
  ocean:      0x0d3b5e,
  teal:       0x00c4aa,
  coral:      0xff6b35,
  gold:       0xffd166,
  pink:       0xff6fd8,
  sand:       0xffe8a1,
  white:      0xffffff,
};

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const { width, height } = this.scale;
    const g = this.add.graphics();

    // ── Sky gradient (deep ocean night → warm sunset horizon) ──
    g.fillGradientStyle(C.bgDeep, C.bgDeep, C.ocean, C.ocean, 1);
    g.fillRect(0, 0, width, height);

    // ── Warm horizon glow ──
    const horizonY = height * 0.72;
    g.fillGradientStyle(0xff8c42, 0xff8c42, C.bgDeep, C.bgDeep, 0, 0, 0.35, 0.35);
    g.fillRect(0, horizonY - 60, width, 120);

    // ── Ocean waves ──
    g.lineStyle(2, C.teal, 0.5);
    for (let i = 0; i < 4; i++) {
      const wy = horizonY + i * 22;
      g.beginPath();
      for (let x = 0; x <= width; x += 8) {
        const y = wy + Math.sin((x / width) * Math.PI * 4 + i) * 5;
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.strokePath();
    }

    // ── Stars / particles ──
    for (let i = 0; i < 45; i++) {
      const sx = Phaser.Math.Between(0, width);
      const sy = Phaser.Math.Between(0, height * 0.65);
      const r  = Phaser.Math.Between(1, 2);
      const col = Phaser.Utils.Array.GetRandom([C.gold, C.teal, C.white, C.sand]);
      this.add.circle(sx, sy, r, col, Phaser.Math.FloatBetween(0.3, 0.9));
    }

    // ── Floating theme icons (emoji labels) ──
    const icons = [
      { t: "🏄",  x: 0.10, y: 0.14 },
      { t: "🩺",  x: 0.88, y: 0.10 },
      { t: "🏋️", x: 0.08, y: 0.55 },
      { t: "🌵",  x: 0.90, y: 0.62 },
      { t: "🌊",  x: 0.50, y: 0.74 },
      { t: "🪁",  x: 0.78, y: 0.22 },
      { t: "🇲🇽", x: 0.15, y: 0.34 },
    ];
    icons.forEach(({ t, x, y }) => {
      this.add
        .text(width * x, height * y, t, { fontSize: "22px" })
        .setOrigin(0.5)
        .setAlpha(0.55);
    });

    // ── Moon / sun ──
    this.add.circle(width * 0.82, height * 0.13, 28, C.gold, 0.9);
    this.add.circle(width * 0.82, height * 0.13, 22, 0xffecaa, 0.7);

    // ── Title ──
    const titleStyle = {
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 4,
    };

    this.add
      .text(width / 2, height * 0.26, "MICHAEL'S", {
        ...titleStyle,
        fontSize: `${Math.round(width * 0.10)}px`,
        color: "#ffd166",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.37, "JOURNEY", {
        ...titleStyle,
        fontSize: `${Math.round(width * 0.13)}px`,
        color: "#ff6b35",
      })
      .setOrigin(0.5);

    // Thin teal divider
    g.fillStyle(C.teal, 0.6);
    g.fillRect(width * 0.25, height * 0.46, width * 0.5, 2);

    // ── Subtitle ──
    this.add
      .text(width / 2, height * 0.51, "🎮  Steer. Bounce. Survive!", {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.043)}px`,
        color: "#00c4aa",
      })
      .setOrigin(0.5);

    // ── START button ──
    const btnBg = this.add
      .rectangle(width / 2, height * 0.63, 210, 56, 0xff6b35)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width / 2, height * 0.63, "START  🏄", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#ffffff",
        stroke: "#882200",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    btnBg.on("pointerover",  () => btnBg.setFillStyle(0xff8c55));
    btnBg.on("pointerout",   () => btnBg.setFillStyle(0xff6b35));
    btnBg.on("pointerdown",  () => {
      btnBg.setFillStyle(0xdd5520);
      this.time.delayedCall(130, () => this.scene.start("GameScene"));
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
        color: "#aacce8",
        align: "center",
      })
      .setOrigin(0.5);

    // Subtle bounce on title
    const titleObjs = [this.children.list[8], this.children.list[9]];
    this.tweens.add({
      targets: titleObjs,
      y: "-=7",
      yoyo: true,
      repeat: -1,
      duration: 1000,
      ease: "Sine.easeInOut",
    });
  }
}
