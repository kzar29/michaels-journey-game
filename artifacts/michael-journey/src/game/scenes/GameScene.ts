/**
 * GameScene — Michael's Journey core gameplay
 * Theme: Mexico sunset · Ocean · Gym · Doctor
 *
 * HOW IT WORKS:
 *   - Camera scrolls upward automatically (speeds up over time)
 *   - Michael auto-jumps every time he lands on a platform
 *   - Steer left/right only
 *   - Fall below the screen → Game Over
 *
 * KEY TUNING (config.ts):
 *   PHYSICS.gravity / jumpVelocity / moveSpeed
 *   PLATFORMS.minGapY / maxGapY
 *   SCORE.pointsPerPlatform
 */

import Phaser from "phaser";
import { PHYSICS, PLATFORMS, WORLD, SCORE } from "../config";

const SCROLL_SPEED_START = 55;
const SCROLL_SPEED_ACCEL = 3;
const SCROLL_SPEED_MAX   = 220;

const PLATFORM_TINTS = [
  0x00c4aa, // teal (ocean)
  0xff6b35, // coral (sunset)
  0xffd166, // gold (sand/beach)
  0x44cc88, // green (cactus/gym)
  0x55aaff, // sky blue (kite)
];

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platformGroup!: Phaser.Physics.Arcade.StaticGroup;
  private highestPlatformY: number = 0;

  private cameraY: number = 0;
  private scrollSpeed: number = SCROLL_SPEED_START;
  private elapsed: number = 0;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  // --- Mobile: track which screen halves have active touches ---
  // Uses a Set of pointer IDs so multi-touch works correctly
  private leftPointers: Set<number>  = new Set();
  private rightPointers: Set<number> = new Set();

  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private lastLandedPlatform: Phaser.Physics.Arcade.Sprite | null = null;
  private platTintIndex: number = 0;

  private bgTile!: Phaser.GameObjects.TileSprite;
  private jumpSound?: Phaser.Sound.BaseSound;
  private isDead: boolean = false;

  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Reset
    this.isDead        = false;
    this.score         = 0;
    this.elapsed       = 0;
    this.scrollSpeed   = SCROLL_SPEED_START;
    this.cameraY       = 0;
    this.lastLandedPlatform = null;
    this.highestPlatformY   = 0;
    this.platTintIndex      = 0;
    this.leftPointers.clear();
    this.rightPointers.clear();

    // ── Resolve avatar & matching background ──
    const avatarKey = this.registry.get("selectedAvatar") ?? "avatar_doctor";
    const BG_MAP: Record<string, string> = {
      avatar_doctor:   "bg_doctor",
      avatar_gym:      "bg_gym",
      avatar_vacation: "bg_vacation",
      avatar_wingfoil: "bg_wingfoil",
    };
    const bgKey = BG_MAP[avatarKey] ?? "bg_doctor";

    // ── Themed tile background (parallax-scrolled in update()) ──
    // The source images are 256 px wide; tileScaleX stretches them to fill the canvas.
    this.bgTile = this.add
      .tileSprite(0, 0, width, height, bgKey)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-1);
    this.bgTile.tileScaleX = width / 256;

    // ── Physics world ──
    this.physics.world.setBounds(0, -height * 200, width, height * 201);

    // ── Platforms ──
    this.platformGroup = this.physics.add.staticGroup();

    const startPlatY = height - 60;
    this.spawnPlatform(width / 2, startPlatY, true);
    this.highestPlatformY = startPlatY;

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

    // ── Player — use the avatarKey already resolved above ──
    this.player = this.physics.add.sprite(width / 2, startPlatY - 50, avatarKey);
    this.player.setCollideWorldBounds(false);
    this.player.setGravityY(PHYSICS.gravity);
    this.player.setDepth(10);
    this.player.setScale((height * 0.11) / this.player.height);

    this.cameras.main.setBackgroundColor(0x0a1628);
    this.cameras.main.scrollY = 0;

    // ── Platform collision → auto-jump ──
    this.physics.add.collider(
      this.player,
      this.platformGroup,
      this.onLandPlatform as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      (_p) => {
        const p = _p as Phaser.Physics.Arcade.Sprite;
        return p.body!.velocity.y >= 0;
      },
      this
    );

    // ── Keyboard input ──
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyA    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    // ── Mobile touch controls ──
    // Track pointer down/move/up globally so HOLDING works, not just tapping
    this.input.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      this.registerPointer(ptr);
    });
    this.input.on("pointermove", (ptr: Phaser.Input.Pointer) => {
      if (ptr.isDown) {
        // Pointer may have crossed the midpoint — move it to the correct side
        this.unregisterPointer(ptr);
        this.registerPointer(ptr);
      }
    });
    this.input.on("pointerup", (ptr: Phaser.Input.Pointer) => {
      this.unregisterPointer(ptr);
    });
    this.input.on("pointercancel", (ptr: Phaser.Input.Pointer) => {
      this.unregisterPointer(ptr);
    });

    // ── Mobile control UI (visual only — input is handled globally above) ──
    this.createMobileControlsUI();

    // ── HUD ──
    this.scoreText = this.add
      .text(12, 12, "Score: 0", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#ffd166",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.speedText = this.add
      .text(width - 12, 12, "🏄 Lv 1", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#00c4aa",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setScrollFactor(0)
      .setDepth(100)
      .setOrigin(1, 0);

    // ── Jump sound ──
    if (this.cache.audio.exists("jump")) {
      this.jumpSound = this.sound.add("jump", { volume: 0.4 });
    }

    // Initial launch jump
    this.time.delayedCall(100, () => {
      if (!this.isDead) this.player.setVelocityY(PHYSICS.jumpVelocity);
    });
  }

  // Called when the scene shuts down — clean up listeners
  shutdown() {
    this.input.off("pointerdown");
    this.input.off("pointermove");
    this.input.off("pointerup");
    this.input.off("pointercancel");
  }

  // --- Register a pointer in the left or right set based on x position ---
  private registerPointer(ptr: Phaser.Input.Pointer) {
    const { width } = this.scale;
    if (ptr.x < width / 2) {
      this.leftPointers.add(ptr.id);
    } else {
      this.rightPointers.add(ptr.id);
    }
  }

  private unregisterPointer(ptr: Phaser.Input.Pointer) {
    this.leftPointers.delete(ptr.id);
    this.rightPointers.delete(ptr.id);
  }

  update(_time: number, delta: number) {
    if (this.isDead) return;

    const { width, height } = this.scale;
    const dt = delta / 1000;

    // Speed ramp
    this.elapsed += dt;
    this.scrollSpeed = Math.min(
      SCROLL_SPEED_START + this.elapsed * SCROLL_SPEED_ACCEL,
      SCROLL_SPEED_MAX
    );

    // Auto-scroll
    this.cameraY -= this.scrollSpeed * dt;
    this.cameras.main.scrollY = this.cameraY;

    // Parallax-scroll the background at 60% of camera speed
    this.bgTile.tilePositionY = -this.cameraY * 0.6;

    // --- Steering ---
    const goLeft  = this.cursors.left.isDown  || this.keyA.isDown || this.leftPointers.size > 0;
    const goRight = this.cursors.right.isDown || this.keyD.isDown || this.rightPointers.size > 0;

    if (goLeft) {
      this.player.setVelocityX(-PHYSICS.moveSpeed);
      this.player.setFlipX(true);
    } else if (goRight) {
      this.player.setVelocityX(PHYSICS.moveSpeed);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(this.player.body!.velocity.x * 0.75);
    }

    // Horizontal wrap
    if (this.player.x < -this.player.displayWidth / 2) {
      this.player.x = width + this.player.displayWidth / 2;
    } else if (this.player.x > width + this.player.displayWidth / 2) {
      this.player.x = -this.player.displayWidth / 2;
    }

    // Generate platforms ahead
    const genY = this.cameraY - PLATFORMS.generateAheadY;
    while (this.highestPlatformY > genY) {
      const gap  = Phaser.Math.Between(PLATFORMS.minGapY, PLATFORMS.maxGapY);
      const newY = this.highestPlatformY - gap;
      this.spawnPlatform(
        Phaser.Math.Between(PLATFORMS.width / 2 + 10, width - PLATFORMS.width / 2 - 10),
        newY
      );
      this.highestPlatformY = newY;
    }

    // Recycle old platforms
    this.platformGroup.getChildren().forEach((go) => {
      const plat = go as Phaser.Physics.Arcade.Sprite;
      if (plat.y > this.cameraY + height + 100) plat.destroy();
    });

    // Death check
    if (this.player.y > this.cameraY + height + WORLD.fallMargin) {
      this.handleDeath();
    }

    // HUD
    const lvl = Math.floor(this.elapsed / 10) + 1;
    this.speedText.setText(`🏄 Lv ${lvl}`);
  }

  private spawnPlatform(x: number, y: number, isStart: boolean = false) {
    const plat = this.platformGroup.create(x, y, "platform") as Phaser.Physics.Arcade.Sprite;
    plat.setScale(PLATFORMS.width / plat.width, PLATFORMS.height / plat.height).refreshBody();
    plat.setDepth(5);
    plat.setTint(isStart ? 0xffd166 : PLATFORM_TINTS[this.platTintIndex++ % PLATFORM_TINTS.length]);
    return plat;
  }

  private onLandPlatform(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    platform: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const plat = platform as Phaser.Physics.Arcade.Sprite;

    // Auto-jump
    this.player.setVelocityY(PHYSICS.jumpVelocity);
    this.jumpSound?.play();

    // Score
    if (plat !== this.lastLandedPlatform) {
      this.lastLandedPlatform = plat;
      this.score += SCORE.pointsPerPlatform;
      this.scoreText.setText(`Score: ${this.score}`);

      const prevTint = plat.tintTopLeft;
      plat.setTint(0xffffff);
      this.time.delayedCall(120, () => {
        if (plat.active) plat.setTint(prevTint);
      });
    }
  }

  // --- Visual-only left/right indicators for mobile ---
  private createMobileControlsUI() {
    const { width, height } = this.scale;

    // Semi-transparent arrows — pure visual hints
    this.add
      .text(width * 0.10, height * 0.88, "◀", {
        fontFamily: "monospace",
        fontSize: "40px",
        color: "#ff6b35",
      })
      .setScrollFactor(0)
      .setDepth(201)
      .setOrigin(0.5)
      .setAlpha(0.30);

    this.add
      .text(width * 0.90, height * 0.88, "▶", {
        fontFamily: "monospace",
        fontSize: "40px",
        color: "#00c4aa",
      })
      .setScrollFactor(0)
      .setDepth(201)
      .setOrigin(0.5)
      .setAlpha(0.30);

    // Thin centre divider line
    this.add
      .graphics()
      .lineStyle(1, 0xffffff, 0.06)
      .lineBetween(width / 2, height * 0.70, width / 2, height);
  }

  private handleDeath() {
    if (this.isDead) return;
    this.isDead = true;
    this.leftPointers.clear();
    this.rightPointers.clear();
    this.player.setVelocity(0, 0);
    this.player.setGravityY(0);
    this.time.delayedCall(400, () => {
      this.scene.start("GameOverScene", { score: this.score });
    });
  }
}
