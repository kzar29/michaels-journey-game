/**
 * GameScene
 * ---------
 * Core gameplay: auto-jumping endless vertical platform runner.
 *
 * HOW IT WORKS:
 *   - The camera scrolls upward automatically at an increasing speed
 *   - Michael auto-jumps every time he lands on a platform
 *   - You only steer left/right
 *   - If Michael falls below the bottom of the screen → Game Over
 *
 * KEY TUNING VARIABLES (all centralized in config.ts):
 *   - PHYSICS.gravity        → how fast the player falls
 *   - PHYSICS.jumpVelocity   → how high the auto-jump goes
 *   - PHYSICS.moveSpeed      → left/right steering speed
 *   - PLATFORMS.minGapY/maxGapY → vertical spacing between platforms
 *   - SCORE.pointsPerPlatform   → score per platform landed on
 */

import Phaser from "phaser";
import { PHYSICS, PLATFORMS, WORLD, SCORE } from "../config";

// How fast the camera scrolls upward at the start (pixels per second)
const SCROLL_SPEED_START = 55;
// How much the scroll speed increases per second of survival
const SCROLL_SPEED_ACCEL = 3;
// Maximum scroll speed cap
const SCROLL_SPEED_MAX = 220;

export class GameScene extends Phaser.Scene {
  // --- Player ---
  private player!: Phaser.Physics.Arcade.Sprite;

  // --- Platforms ---
  private platformGroup!: Phaser.Physics.Arcade.StaticGroup;
  private highestPlatformY: number = 0;

  // --- Camera / scrolling ---
  private cameraY: number = 0;
  private scrollSpeed: number = SCROLL_SPEED_START;
  private elapsed: number = 0; // seconds since game start

  // --- Input ---
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  // --- Mobile controls ---
  private touchLeft: boolean = false;
  private touchRight: boolean = false;

  // --- Score ---
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private lastLandedPlatform: Phaser.Physics.Arcade.Sprite | null = null;

  // --- Audio ---
  private jumpSound?: Phaser.Sound.BaseSound;

  // --- State ---
  private isDead: boolean = false;

  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Reset state
    this.isDead = false;
    this.score = 0;
    this.elapsed = 0;
    this.scrollSpeed = SCROLL_SPEED_START;
    this.cameraY = 0;
    this.lastLandedPlatform = null;
    this.highestPlatformY = 0;

    // --- Background ---
    this.add.rectangle(width / 2, 0, width, height * 400, 0x1a1a2e).setScrollFactor(0);
    for (let i = 0; i < 80; i++) {
      const sx = Phaser.Math.Between(0, width);
      const sy = Phaser.Math.Between(-height * 150, height);
      this.add.circle(sx, sy, Phaser.Math.Between(1, 2), 0xffffff, 0.15);
    }

    // --- Physics world (very tall virtual world) ---
    this.physics.world.setBounds(0, -height * 200, width, height * 201);

    // --- Platform group ---
    this.platformGroup = this.physics.add.staticGroup();

    // --- Starting platform (wide, at the bottom) ---
    const startPlatY = height - 60;
    this.spawnPlatform(width / 2, startPlatY, true);
    this.highestPlatformY = startPlatY;

    // --- Pre-generate platforms upward ---
    let nextY = startPlatY;
    for (let i = 0; i < PLATFORMS.poolSize + 4; i++) {
      const gap = Phaser.Math.Between(PLATFORMS.minGapY, PLATFORMS.maxGapY);
      nextY -= gap;
      this.spawnPlatform(
        Phaser.Math.Between(PLATFORMS.width / 2 + 10, width - PLATFORMS.width / 2 - 10),
        nextY
      );
      this.highestPlatformY = Math.min(this.highestPlatformY, nextY);
    }

    // --- Player ---
    this.player = this.physics.add.sprite(width / 2, startPlatY - 50, "player");
    this.player.setCollideWorldBounds(false);
    this.player.setGravityY(PHYSICS.gravity);
    this.player.setDepth(10);
    const targetH = height * 0.08;
    this.player.setScale(targetH / this.player.height);

    // --- Camera ---
    this.cameras.main.setBackgroundColor(0x1a1a2e);
    this.cameras.main.scrollY = 0;

    // --- Platform collision → auto-jump ---
    this.physics.add.collider(
      this.player,
      this.platformGroup,
      this.onLandPlatform as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      // Only collide from above (landing on top) — ignore side collisions
      (playerObj, _platObj) => {
        const p = playerObj as Phaser.Physics.Arcade.Sprite;
        return p.body!.velocity.y >= 0;
      },
      this
    );

    // --- Keyboard input ---
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    // --- Mobile touch controls (left / right only — no jump button) ---
    this.createMobileControls();

    // --- HUD ---
    this.scoreText = this.add
      .text(12, 12, "Score: 0", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.speedText = this.add
      .text(width - 12, 12, "↑ Speed: 1", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#aaffaa",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setScrollFactor(0)
      .setDepth(100)
      .setOrigin(1, 0);

    // --- Jump sound ---
    if (this.cache.audio.exists("jump")) {
      this.jumpSound = this.sound.add("jump", { volume: 0.4 });
    }

    // Give player a little starting jump so they leave the ground immediately
    this.time.delayedCall(100, () => {
      if (!this.isDead) {
        this.player.setVelocityY(PHYSICS.jumpVelocity);
      }
    });
  }

  update(_time: number, delta: number) {
    if (this.isDead) return;

    const { width, height } = this.scale;
    const dt = delta / 1000; // delta in seconds

    // ---- Increase scroll speed over time ----
    this.elapsed += dt;
    this.scrollSpeed = Math.min(
      SCROLL_SPEED_START + this.elapsed * SCROLL_SPEED_ACCEL,
      SCROLL_SPEED_MAX
    );

    // ---- Scroll camera upward automatically ----
    this.cameraY -= this.scrollSpeed * dt;
    this.cameras.main.scrollY = this.cameraY;

    // ---- Horizontal movement (left/right only) ----
    const movingLeft = this.cursors.left.isDown || this.keyA.isDown || this.touchLeft;
    const movingRight = this.cursors.right.isDown || this.keyD.isDown || this.touchRight;

    if (movingLeft) {
      this.player.setVelocityX(-PHYSICS.moveSpeed);
      this.player.setFlipX(true);
    } else if (movingRight) {
      this.player.setVelocityX(PHYSICS.moveSpeed);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(this.player.body!.velocity.x * 0.75);
    }

    // ---- Horizontal wrap (walk off one edge, appear on the other) ----
    if (this.player.x < -this.player.displayWidth / 2) {
      this.player.x = width + this.player.displayWidth / 2;
    } else if (this.player.x > width + this.player.displayWidth / 2) {
      this.player.x = -this.player.displayWidth / 2;
    }

    // ---- Generate new platforms ahead of the camera ----
    const generateY = this.cameraY - PLATFORMS.generateAheadY;
    while (this.highestPlatformY > generateY) {
      const gap = Phaser.Math.Between(PLATFORMS.minGapY, PLATFORMS.maxGapY);
      const newY = this.highestPlatformY - gap;
      this.spawnPlatform(
        Phaser.Math.Between(PLATFORMS.width / 2 + 10, width - PLATFORMS.width / 2 - 10),
        newY
      );
      this.highestPlatformY = newY;
    }

    // ---- Recycle platforms scrolled below the screen ----
    this.platformGroup.getChildren().forEach((go) => {
      const plat = go as Phaser.Physics.Arcade.Sprite;
      if (plat.y > this.cameraY + height + 100) {
        plat.destroy();
      }
    });

    // ---- Death: player scrolled below the screen bottom ----
    if (this.player.y > this.cameraY + height + WORLD.fallMargin) {
      this.handleDeath();
    }

    // ---- HUD updates ----
    const speedLevel = Math.floor(this.elapsed / 10) + 1;
    this.speedText.setText(`↑ Speed: ${speedLevel}`);
  }

  // --- Spawn a platform ---
  private spawnPlatform(x: number, y: number, isStart: boolean = false) {
    const plat = this.platformGroup.create(x, y, "platform") as Phaser.Physics.Arcade.Sprite;
    plat.setScale(PLATFORMS.width / plat.width, PLATFORMS.height / plat.height).refreshBody();
    plat.setDepth(5);
    if (isStart) plat.setTint(0xffdd88);
    return plat;
  }

  // --- Auto-jump: fires every time the player lands on a platform ---
  private onLandPlatform(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    platform: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const plat = platform as Phaser.Physics.Arcade.Sprite;

    // Auto-jump immediately
    this.player.setVelocityY(PHYSICS.jumpVelocity);
    this.jumpSound?.play();

    // Score: only count new platforms
    if (plat !== this.lastLandedPlatform) {
      this.lastLandedPlatform = plat;
      this.score += SCORE.pointsPerPlatform;
      this.scoreText.setText(`Score: ${this.score}`);

      // Visual flash
      plat.setTint(0xffffaa);
      this.time.delayedCall(150, () => {
        if (plat.active) plat.clearTint();
      });
    }
  }

  // --- Mobile left/right touch zones (no jump button needed) ---
  private createMobileControls() {
    const { width, height } = this.scale;

    // Left half
    const leftZone = this.add
      .rectangle(width * 0.25, height * 0.75, width * 0.5, height * 0.5, 0xffffff, 0.04)
      .setScrollFactor(0)
      .setDepth(200)
      .setInteractive();

    this.add
      .text(width * 0.15, height * 0.88, "◀", {
        fontFamily: "monospace",
        fontSize: "36px",
        color: "#ffffff",
      })
      .setScrollFactor(0)
      .setDepth(201)
      .setOrigin(0.5)
      .setAlpha(0.3);

    leftZone.on("pointerdown", () => { this.touchLeft = true; });
    leftZone.on("pointerup", () => { this.touchLeft = false; });
    leftZone.on("pointerout", () => { this.touchLeft = false; });

    // Right half
    const rightZone = this.add
      .rectangle(width * 0.75, height * 0.75, width * 0.5, height * 0.5, 0xffffff, 0.04)
      .setScrollFactor(0)
      .setDepth(200)
      .setInteractive();

    this.add
      .text(width * 0.85, height * 0.88, "▶", {
        fontFamily: "monospace",
        fontSize: "36px",
        color: "#ffffff",
      })
      .setScrollFactor(0)
      .setDepth(201)
      .setOrigin(0.5)
      .setAlpha(0.3);

    rightZone.on("pointerdown", () => { this.touchRight = true; });
    rightZone.on("pointerup", () => { this.touchRight = false; });
    rightZone.on("pointerout", () => { this.touchRight = false; });
  }

  // --- Game over ---
  private handleDeath() {
    if (this.isDead) return;
    this.isDead = true;
    this.player.setVelocity(0, 0);
    this.player.setGravityY(0);
    this.time.delayedCall(400, () => {
      this.scene.start("GameOverScene", { score: this.score });
    });
  }
}
