/**
 * MenuScene — "Michael's Journey" themed menu with leaderboard.
 */

import Phaser from "phaser";
import { MusicPlayer } from "../MusicPlayer";
import { audioManager } from "../AudioManager";
import { getTopScores } from "../ScoreStore";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    const { width, height } = this.scale;

    // ── Background image ──
    const bg = this.add.image(width / 2, height / 2, "menu_bg");
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale).setDepth(0);

    // ── Subtle dark overlay ──
    this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.25)
      .setDepth(1);

    const ts = {
      fontFamily: "monospace",
      stroke: "#000000",
      strokeThickness: 5,
    };

    // ── Title ──
    const titleTop = this.add
      .text(width / 2, height * 0.22, "MICHAEL'S", {
        ...ts, fontSize: `${Math.round(width * 0.10)}px`, color: "#ffd166",
      })
      .setOrigin(0.5).setDepth(2);

    const titleBot = this.add
      .text(width / 2, height * 0.33, "JOURNEY", {
        ...ts, fontSize: `${Math.round(width * 0.13)}px`, color: "#ff6b35",
      })
      .setOrigin(0.5).setDepth(2);

    // Teal divider
    this.add.graphics()
      .fillStyle(0x00c4aa, 0.7)
      .fillRect(width * 0.25, height * 0.43, width * 0.5, 2)
      .setDepth(2);

    // ── Subtitle ──
    this.add
      .text(width / 2, height * 0.475, "🎮  Steer. Bounce. Survive!", {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.043)}px`,
        color: "#00c4aa",
        stroke: "#000000", strokeThickness: 3,
      })
      .setOrigin(0.5).setDepth(2);

    // ── START button ──
    const btnBg = this.add
      .rectangle(width / 2, height * 0.555, 210, 56, 0xff6b35)
      .setInteractive({ useHandCursor: true }).setDepth(2);

    this.add
      .text(width / 2, height * 0.555, "START  🏄", {
        fontFamily: "monospace", fontSize: "22px",
        color: "#ffffff", stroke: "#882200", strokeThickness: 2,
      })
      .setOrigin(0.5).setDepth(3);

    btnBg.on("pointerover",  () => btnBg.setFillStyle(0xff8c55));
    btnBg.on("pointerout",   () => btnBg.setFillStyle(0xff6b35));
    btnBg.on("pointerdown",  () => {
      btnBg.setFillStyle(0xdd5520);
      // Unlock Web Audio on iOS/Chrome — must happen inside a direct gesture handler
      MusicPlayer.getInstance().unlock();
      audioManager.unlock();
      this.time.delayedCall(130, () => this.scene.start("AvatarScene"));
    });

    // ── Leaderboard panel ──────────────────────────────────────────────────
    this.add
      .rectangle(width / 2, height * 0.725, width * 0.88, height * 0.20, 0x000000, 0.60)
      .setStrokeStyle(1, 0x00c4aa, 0.4)
      .setDepth(2);

    this.add
      .text(width / 2, height * 0.638, "🏆  HIGH SCORES", {
        fontFamily: "monospace", fontSize: "13px",
        color: "#ffd166", stroke: "#000", strokeThickness: 3,
      })
      .setOrigin(0.5).setDepth(3);

    const scores = getTopScores(5);
    if (scores.length === 0) {
      this.add.text(width / 2, height * 0.725, "No scores yet — be first!", {
        fontFamily: "monospace", fontSize: "11px",
        color: "#88aabb", stroke: "#000", strokeThickness: 2,
      }).setOrigin(0.5).setDepth(3);
    } else {
      const rowH  = height * 0.038;
      const startY = height * 0.665;
      scores.forEach((entry, i) => {
        const y    = startY + i * rowH;
        const rank = ["🥇", "🥈", "🥉", "4.", "5."][i];
        const line = `${rank}  ${entry.name.padEnd(10)}  ${entry.score}`;
        const col  = i === 0 ? "#ffd166" : i === 1 ? "#e0e0e0" : i === 2 ? "#ffaa66" : "#99bbcc";
        this.add.text(width / 2, y, line, {
          fontFamily: "monospace",
          fontSize: `${Math.round(width * 0.031)}px`,
          color: col, stroke: "#000", strokeThickness: 2,
        }).setOrigin(0.5).setDepth(3);
      });
    }

    // ── Controls hint ──
    this.add
      .text(width / 2, height * 0.885, "Tap left/right half to steer  •  Desktop: A/D or ←→", {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.026)}px`,
        color: "#aacce8",
        stroke: "#000000", strokeThickness: 2,
        align: "center",
        wordWrap: { width: width * 0.9 },
      })
      .setOrigin(0.5).setDepth(2);

    // ── Title bounce tween ──
    this.tweens.add({
      targets: [titleTop, titleBot],
      y: "-=7",
      yoyo: true, repeat: -1, duration: 1000,
      ease: "Sine.easeInOut",
    });
  }
}
