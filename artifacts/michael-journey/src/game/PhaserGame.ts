/**
 * PhaserGame.ts
 * -------------
 * Creates and configures the Phaser game instance.
 * Import this in the React component that hosts the game.
 *
 * To add new scenes, import them here and add to the `scene` array below.
 */

import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { AvatarScene } from "./scenes/AvatarScene";
import { GameScene } from "./scenes/GameScene";
import { GameOverScene } from "./scenes/GameOverScene";

/**
 * Creates a Phaser.Game instance mounted inside the given DOM element.
 * Returns the game so the caller can destroy it on unmount.
 */
export function createPhaserGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO, // WebGL with Canvas fallback
    parent,

    // Responsive sizing: fill the parent container
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 390,   // Design width (iPhone-size portrait canvas)
      height: 844,  // Design height
    },

    // Arcade physics with no global gravity
    // (player gravity is set per-sprite in GameScene)
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false, // set to true to see hitboxes
      },
    },

    // Background colour behind everything
    backgroundColor: "#1a1a2e",

    // All scenes in load order
    scene: [BootScene, MenuScene, AvatarScene, GameScene, GameOverScene],

    // Better pixel rendering for the pixel-art look
    render: {
      pixelArt: true,
      antialias: false,
    },

    // Enable multi-touch for mobile buttons
    input: {
      activePointers: 3,
    },
  };

  return new Phaser.Game(config);
}
