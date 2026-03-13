/**
 * GameScene
 * ---------
 * Core gameplay: endless vertical platform jumping.
 *
 * KEY TUNING VARIABLES (all centralized in config.ts):
 *   - PHYSICS.gravity        → how fast the player falls
 *   - PHYSICS.jumpVelocity   → how high the player jumps
 *   - PHYSICS.moveSpeed      → left/right movement speed
 *   - PLATFORMS.minGapY/maxGapY → spacing between platforms
 *   - SCORE.pointsPerPlatform   → score per platform landed
 */

import Phaser from "phaser";
import { PHYSICS, PLATFORMS, WORLD, SCORE } from "../config";

export class GameScene extends Phaser.Scene {
  // --- Player ---
  private player!: Phaser.Physics.Arcade.Sprite;

  // --- Platforms ---
  private platformGroup!: Phaser.Physics.Arcade.StaticGroup;
  private highestPlatformY: number = 0; // tracks topmost generated platform

  // --- Camera / scrolling ---
  private cameraY: number = 0; // current camera offset in world units

  // --- Input ---
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
  };

  // --- Mobile controls ---
  private touchLeft: boolean = false;
  private touchRight: boolean = false;
  private touchJump: boolean = false;

  // --- Score ---
  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private lastLandedPlatform: Phaser.Physics.Arcade.Sprite | null = null;

  // --- Audio ---
  private jumpSound?: Phaser.Sound.BaseSound;

  // --- State ---
  private isDead: boolean = false;

  // World height (virtual, platforms extend upward into negative Y)
  private readonly VIRTUAL_HEIGHT: number;

  constructor() {
    super({ key: "GameScene" });
    this.VIRTUAL_HEIGHT = 0; // computed in create
  }

  create() {
    const { width, height } = this.scale;

    // --- Background ---
    this.add.rectangle(width / 2, 0, width, height * 400, 0x1a1a2e).setScrollFactor(0);
    // Subtle dot pattern for depth
    for (let i = 0; i < 80; i++) {
      const sx = Phaser.Math.Between(0, width);
      const sy = Phaser.Math.Between(-height * 100, height);
      this.add.circle(sx, sy, Phaser.Math.Between(1, 2), 0xffffff, 0.15);
    }

    // --- Physics world bounds (very tall virtual world) ---
    this.physics.world.setBounds(0, -height * 200, width, height * 201);

    // --- Platform group ---
    this.platformGroup = this.physics.add.staticGroup();

    // --- Starting platform (ground) ---
    const startPlatY = height - 60;
    this.spawnPlatform(width / 2, startPlatY, true);
    this.highestPlatformY = startPlatY;

    // --- Generate initial set of platforms upward ---
    let nextY = startPlatY;
    for (let i = 0; i < PLATFORMS.poolSize; i++) {
      const gap = Phaser.Math.Between(PLATFORMS.minGapY, PLATFORMS.maxGapY);
      nextY -= gap;
      this.spawnPlatform(
        Phaser.Math.Between(PLATFORMS.width / 2 + 10, width - PLATFORMS.width / 2 - 10),
        nextY
      );
      this.highestPlatformY = Math.min(this.highestPlatformY, nextY);
    }

    // --- Player ---
    this.player = this.physics.add.sprite(width / 2, startPlatY - 60, "player");
    this.player.setCollideWorldBounds(false); // we handle death manually
    this.player.setGravityY(PHYSICS.gravity);
    this.player.setDepth(10);
    // Scale player to a reasonable size on screen
    const targetPlayerH = height * 0.08;
    const scale = targetPlayerH / this.player.height;
    this.player.setScale(scale);

    // --- Camera (we scroll the world manually via setScrollFactor on UI) ---
    this.cameras.main.setBackgroundColor(0x1a1a2e);

    // --- Collider: player ↔ platforms ---
    this.physics.add.collider(
      this.player,
      this.platformGroup,
      this.onLandPlatform as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    // --- Input (keyboard) ---
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    };

    // --- Mobile touch controls ---
    this.createMobileControls();

    // --- Score display (fixed to camera) ---
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

    // --- Jump sound ---
    if (this.cache.audio.exists("jump")) {
      this.jumpSound = this.sound.add("jump", { volume: 0.4 });
    }

    // --- Camera starts at bottom ---
    this.cameraY = 0;
    this.cameras.main.scrollY = 0;
  }

  update() {
    if (this.isDead) return;

    const { width, height } = this.scale;
    const onGround = this.player.body!.blocked.down;

    // ---- Horizontal movement ----
    const movingLeft =
      this.cursors.left.isDown ||
      this.wasd.left.isDown ||
      this.touchLeft;
    const movingRight =
      this.cursors.right.isDown ||
      this.wasd.right.isDown ||
      this.touchRight;

    if (movingLeft) {
      this.player.setVelocityX(-PHYSICS.moveSpeed);
      this.player.setFlipX(true);
    } else if (movingRight) {
      this.player.setVelocityX(PHYSICS.moveSpeed);
      this.player.setFlipX(false);
    } else {
      // Smooth deceleration
      this.player.setVelocityX(this.player.body!.velocity.x * 0.75);
    }

    // ---- Wrap horizontally (Doodle Jump style) ----
    if (this.player.x < -this.player.displayWidth / 2) {
      this.player.x = width + this.player.displayWidth / 2;
    } else if (this.player.x > width + this.player.displayWidth / 2) {
      this.player.x = -this.player.displayWidth / 2;
    }

    // ---- Jump ----
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.up) ||
      this.touchJump;

    if (jumpPressed && onGround) {
      this.player.setVelocityY(PHYSICS.jumpVelocity);
      this.jumpSound?.play();
      this.touchJump = false; // consume the tap
    } else if (this.touchJump && !onGround) {
      // Don't consume touchJump if we're not on the ground — let it persist until landing
      // Actually, reset it so repeated taps don't queue: already handled by pointerdown
    }

    // ---- Camera scrolling ----
    // Camera follows player upward (but never scrolls downward)
    const screenY = this.player.y - this.cameraY;
    const scrollThreshold = height * WORLD.scrollThresholdFactor;
    if (screenY < scrollThreshold) {
      this.cameraY = this.player.y - scrollThreshold;
    }
    this.cameras.main.scrollY = this.cameraY;

    // ---- Generate new platforms ahead ----
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

    // ---- Recycle platforms that fell too far below screen ----
    this.platformGroup.getChildren().forEach((go) => {
      const plat = go as Phaser.Physics.Arcade.Sprite;
      if (plat.y > this.cameraY + height + 80) {
        plat.destroy();
      }
    });

    // ---- Death check: player falls below screen ----
    if (this.player.y > this.cameraY + height + WORLD.fallMargin) {
      this.handleDeath();
    }
  }

  // --- Spawn a single platform at (x, y) ---
  private spawnPlatform(x: number, y: number, isStart: boolean = false) {
    const plat = this.platformGroup.create(
      x,
      y,
      "platform"
    ) as Phaser.Physics.Arcade.Sprite;

    // Scale platform to config width
    const scale = PLATFORMS.width / plat.width;
    plat.setScale(scale, PLATFORMS.height / plat.height).refreshBody();
    plat.setDepth(5);

    // Mark starting platform visually
    if (isStart) {
      plat.setTint(0xffdd88);
    }

    return plat;
  }

  // --- Called when player lands on a platform ---
  private onLandPlatform(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    platform: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const plat = platform as Phaser.Physics.Arcade.Sprite;
    // Only count new platforms (not the same one bounced on repeatedly)
    if (plat !== this.lastLandedPlatform) {
      this.lastLandedPlatform = plat;
      this.score += SCORE.pointsPerPlatform;
      this.scoreText.setText(`Score: ${this.score}`);

      // Brief tint flash for feedback
      plat.setTint(0xffffaa);
      this.time.delayedCall(150, () => {
        if (plat.active) plat.clearTint();
      });
    }
  }

  // --- Create mobile touch buttons ---
  private createMobileControls() {
    const { width, height } = this.scale;

    // Left zone (bottom-left third)
    const leftZone = this.add
      .rectangle(width * 0.2, height * 0.82, width * 0.38, height * 0.32, 0xffffff, 0.06)
      .setScrollFactor(0)
      .setDepth(200)
      .setInteractive();

    this.add
      .text(width * 0.2, height * 0.82, "◀", {
        fontFamily: "monospace",
        fontSize: "32px",
        color: "#ffffff",
        alpha: 0.5,
      })
      .setScrollFactor(0)
      .setDepth(201)
      .setOrigin(0.5)
      .setAlpha(0.4);

    leftZone.on("pointerdown", () => { this.touchLeft = true; });
    leftZone.on("pointerup", () => { this.touchLeft = false; });
    leftZone.on("pointerout", () => { this.touchLeft = false; });

    // Right zone (bottom-right third)
    const rightZone = this.add
      .rectangle(width * 0.6, height * 0.82, width * 0.38, height * 0.32, 0xffffff, 0.06)
      .setScrollFactor(0)
      .setDepth(200)
      .setInteractive();

    this.add
      .text(width * 0.6, height * 0.82, "▶", {
        fontFamily: "monospace",
        fontSize: "32px",
        color: "#ffffff",
      })
      .setScrollFactor(0)
      .setDepth(201)
      .setOrigin(0.5)
      .setAlpha(0.4);

    rightZone.on("pointerdown", () => { this.touchRight = true; });
    rightZone.on("pointerup", () => { this.touchRight = false; });
    rightZone.on("pointerout", () => { this.touchRight = false; });

    // Jump button (bottom-center)
    const jumpBtn = this.add
      .rectangle(width / 2, height * 0.91, 120, 44, 0x44bb66, 0.7)
      .setScrollFactor(0)
      .setDepth(200)
      .setInteractive();

    this.add
      .text(width / 2, height * 0.91, "JUMP", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffffff",
      })
      .setScrollFactor(0)
      .setDepth(201)
      .setOrigin(0.5);

    jumpBtn.on("pointerdown", () => {
      this.touchJump = true;
      jumpBtn.setFillStyle(0x55dd88, 0.9);
    });
    jumpBtn.on("pointerup", () => {
      jumpBtn.setFillStyle(0x44bb66, 0.7);
    });
    jumpBtn.on("pointerout", () => {
      jumpBtn.setFillStyle(0x44bb66, 0.7);
    });
  }

  // --- Handle player death ---
  private handleDeath() {
    if (this.isDead) return;
    this.isDead = true;

    // Stop all movement
    this.player.setVelocity(0, 0);
    this.player.setGravityY(0);

    // Brief pause then go to GameOver
    this.time.delayedCall(500, () => {
      this.scene.start("GameOverScene", { score: this.score });
    });
  }
}
