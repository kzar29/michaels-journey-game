/**
 * BootScene
 * ---------
 * Loads all assets before any gameplay begins.
 * Add new assets to ASSET_PATHS in config.ts, then load them here.
 */

import Phaser from "phaser";
import { ASSET_PATHS } from "../config";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    // Show a simple loading bar
    const { width, height } = this.scale;
    const barW = Math.min(300, width * 0.6);
    const bar = this.add
      .graphics()
      .fillStyle(0xffffff, 0.3)
      .fillRect(width / 2 - barW / 2, height / 2 - 10, barW, 20);
    const fill = this.add.graphics();
    const text = this.add
      .text(width / 2, height / 2 + 30, "Loading…", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.load.on("progress", (v: number) => {
      fill
        .clear()
        .fillStyle(0x88ff88, 1)
        .fillRect(width / 2 - barW / 2 + 2, height / 2 - 8, (barW - 4) * v, 16);
    });

    // --- Load player sprite (replace michael.png to change character) ---
    this.load.image("player", ASSET_PATHS.player);

    // --- Load platform image ---
    this.load.image("platform", ASSET_PATHS.platform);

    // --- Load jump sound (optional — gracefully skipped if file is missing) ---
    // To enable: drop your jump.wav into public/assets/audio/jump.wav
    // Then uncomment the line below:
    // this.load.audio("jump", ASSET_PATHS.jumpSound);

    // --- Background image (optional) ---
    // Uncomment and add a bg image to public/assets/background/bg.png to enable:
    // this.load.image("background", ASSET_PATHS.background);
  }

  create() {
    this.scene.start("MenuScene");
  }
}
