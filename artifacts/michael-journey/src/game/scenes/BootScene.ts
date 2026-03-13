/**
 * BootScene
 * ---------
 * Loads all assets before any gameplay begins.
 *
 * PLAYER SPRITES:
 *   Key "avatar_doctor"   → public/assets/player/michael_doctor.png
 *   Key "avatar_gym"      → public/assets/player/michael_gym.png
 *   Key "avatar_vacation" → public/assets/player/michael_vacation.png
 *   Key "avatar_wingfoil" → public/assets/player/michael_wingfoil.png
 *
 * To add a new avatar later:
 *   1. Drop your PNG into public/assets/player/
 *   2. Add a load.image() call below with a new key
 *   3. Add it to the avatar selection screen
 *
 * AUDIO:
 *   Drop jump.wav into public/assets/audio/ and uncomment the load.audio line.
 */

import Phaser from "phaser";

// ── Asset paths (change here to swap assets globally) ──────────────────────
const ASSETS = {
  menuBg:   "assets/menu_bg.png",
  doctor:   "assets/player/michael_doctor.png",
  gym:      "assets/player/michael_gym.png",
  vacation: "assets/player/michael_vacation.png",
  wingfoil: "assets/player/michael_wingfoil.png",
  bgDoctor:   "assets/bg/bg_doctor.png",
  bgGym:      "assets/bg/bg_gym.png",
  bgVacation: "assets/bg/bg_vacation.png",
  bgWingfoil: "assets/bg/bg_wingfoil.png",
  platDoctor:   "assets/platform/plat_doctor.png",
  platGym:      "assets/platform/plat_gym.png",
  platVacation: "assets/platform/plat_vacation.png",
  platWingfoil: "assets/platform/plat_wingfoil.png",
  doctorAnim:   "assets/player/michael_doctor_anim.png",
  gymAnim:      "assets/player/michael_gym_anim.png",
  jump:     "assets/audio/jump.wav",
} as const;

// ── Which avatar is active by default ──────────────────────────────────────
export const DEFAULT_AVATAR = "doctor";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    const { width, height } = this.scale;

    // Loading bar
    const barW = Math.min(300, width * 0.6);
    this.add
      .graphics()
      .fillStyle(0xffffff, 0.15)
      .fillRect(width / 2 - barW / 2, height / 2 - 10, barW, 20);

    const fill = this.add.graphics();
    this.add
      .text(width / 2, height / 2 + 32, "Loading Michael's Journey…", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#00c4aa",
      })
      .setOrigin(0.5);

    this.load.on("progress", (v: number) => {
      fill
        .clear()
        .fillStyle(0xff6b35, 1)
        .fillRect(width / 2 - barW / 2 + 2, height / 2 - 8, (barW - 4) * v, 16);
    });

    // --- Menu background ---
    this.load.image("menu_bg", ASSETS.menuBg);

    // --- All four avatar sprites ---
    this.load.image("avatar_doctor",   ASSETS.doctor);
    this.load.image("avatar_gym",      ASSETS.gym);
    this.load.image("avatar_vacation", ASSETS.vacation);
    this.load.image("avatar_wingfoil", ASSETS.wingfoil);

    // --- Avatar-themed game backgrounds ---
    this.load.image("bg_doctor",   ASSETS.bgDoctor);
    this.load.image("bg_gym",      ASSETS.bgGym);
    this.load.image("bg_vacation", ASSETS.bgVacation);
    this.load.image("bg_wingfoil", ASSETS.bgWingfoil);

    // --- Doctor animation spritesheet (5 frames × 308px wide) ---
    this.load.spritesheet("doc_anim", ASSETS.doctorAnim, {
      frameWidth:  308,
      frameHeight: 1024,
    });

    // --- Gym animation spritesheet (5 frames × 308px wide) ---
    this.load.spritesheet("gym_anim", ASSETS.gymAnim, {
      frameWidth:  308,
      frameHeight: 1024,
    });

    // --- Themed platforms (one per avatar) ---
    this.load.image("plat_doctor",   ASSETS.platDoctor);
    this.load.image("plat_gym",      ASSETS.platGym);
    this.load.image("plat_vacation", ASSETS.platVacation);
    this.load.image("plat_wingfoil", ASSETS.platWingfoil);

    // --- Jump sound (uncomment when you add jump.wav) ---
    // this.load.audio("jump", ASSETS.jump);
  }

  create() {
    // Set default avatar on first load; preserve selection across restarts
    if (!this.game.registry.has("selectedAvatar")) {
      this.game.registry.set("selectedAvatar", `avatar_${DEFAULT_AVATAR}`);
    }
    this.scene.start("MenuScene");
  }
}
