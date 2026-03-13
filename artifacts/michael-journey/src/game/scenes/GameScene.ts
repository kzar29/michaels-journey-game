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

// Platform tint cycle (surfboard / beach / gym / doctor colors)
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

  private touchLeft: boolean  = false;
  private touchRight: boolean = false;

  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private lastLandedPlatform: Phaser.Physics.Arcade.Sprite | null = null;
  private platTintIndex: number = 0;

  private jumpSound?: Phaser.Sound.BaseSound;
  private isDead: boolean = false;

  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Reset
    this.isDead = false;
    this.score  = 0;
    this.elapsed = 0;
    this.scrollSpeed = SCROLL_SPEED_START;
    this.cameraY = 0;
    this.lastLandedPlatform = null;
    this.highestPlatformY   = 0;
    this.platTintIndex      = 0;

    // ── Background: deep ocean sky ──
    const g = this.add.graphics();
    g.fillGradientStyle(0x0a1628, 0x0a1628, 0x0d3b5e, 0x0d3b5e, 1);
    g.fillRect(0, -height * 200, width, height * 202);

    // Warm horizon bands (far below — scroll reveals them)
    for (let band = 0; band < 6; band++) {
      const by = height - 80 - band * height;
      const alpha = 0.07 + band * 0.03;
      g.fillStyle(0xff8c42, alpha);
      g.fillRect(0, by, width, 60);
    }

    // Stars (teal + gold + white)
    for (let i = 0; i < 90; i++) {
      const sx  = Phaser.Math.Between(0, width);
      const sy  = Phaser.Math.Between(-height * 150, height);
      const col = Phaser.Utils.Array.GetRandom([0xffd166, 0x00c4aa, 0xffffff, 0xffe8a1]);
      this.add.circle(sx, sy, Phaser.Math.Between(1, 2), col, Phaser.Math.FloatBetween(0.15, 0.7));
    }

    // Floating thematic text icons in world space
    const worldIcons = [
      { t: "🩺",  x: 0.1,  y: -0.3  },
      { t: "🪁",  x: 0.85, y: -0.6  },
      { t: "🏋️", x: 0.12, y: -1.2  },
      { t: "🌵",  x: 0.88, y: -1.8  },
      { t: "🏄",  x: 0.05, y: -2.5  },
      { t: "🌊",  x: 0.5,  y: -3.0  },
      { t: "🇲🇽", x: 0.82, y: -3.8  },
    ];
    worldIcons.forEach(({ t, x, y }) => {
      this.add
        .text(width * x, height * y, t, { fontSize: "28px" })
        .setOrigin(0.5)
        .setAlpha(0.22);
    });

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

    // ── Player ──
    this.player = this.physics.add.sprite(width / 2, startPlatY - 50, "player");
    this.player.setCollideWorldBounds(false);
    this.player.setGravityY(PHYSICS.gravity);
    this.player.setDepth(10);
    this.player.setScale((height * 0.08) / this.player.height);
    // Warm tint on placeholder sprite
    this.player.setTint(0xffcc88);

    this.cameras.main.setBackgroundColor(0x0a1628);
    this.cameras.main.scrollY = 0;

    // ── Collider → auto-jump ──
    this.physics.add.collider(
      this.player,
      this.platformGroup,
      this.onLandPlatform as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      (_p, _plat) => {
        const p = _p as Phaser.Physics.Arcade.Sprite;
        return p.body!.velocity.y >= 0;
      },
      this
    );

    // ── Input ──
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyA    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD    = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    // ── Mobile controls ──
    this.createMobileControls();

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

    // Auto-scroll up
    this.cameraY -= this.scrollSpeed * dt;
    this.cameras.main.scrollY = this.cameraY;

    // Horizontal steering
    const goLeft  = this.cursors.left.isDown  || this.keyA.isDown || this.touchLeft;
    const goRight = this.cursors.right.isDown || this.keyD.isDown || this.touchRight;

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

    // Death
    if (this.player.y > this.cameraY + height + WORLD.fallMargin) {
      this.handleDeath();
    }

    // HUD speed level
    const lvl = Math.floor(this.elapsed / 10) + 1;
    this.speedText.setText(`🏄 Lv ${lvl}`);
  }

  private spawnPlatform(x: number, y: number, isStart: boolean = false) {
    const plat = this.platformGroup.create(x, y, "platform") as Phaser.Physics.Arcade.Sprite;
    plat.setScale(PLATFORMS.width / plat.width, PLATFORMS.height / plat.height).refreshBody();
    plat.setDepth(5);

    if (isStart) {
      plat.setTint(0xffd166); // golden start platform
    } else {
      // Cycle through themed colors
      plat.setTint(PLATFORM_TINTS[this.platTintIndex % PLATFORM_TINTS.length]);
      this.platTintIndex++;
    }

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

      // Flash white then restore tint
      const prevTint = plat.tintTopLeft;
      plat.setTint(0xffffff);
      this.time.delayedCall(120, () => {
        if (plat.active) plat.setTint(prevTint);
      });
    }
  }

  private createMobileControls() {
    const { width, height } = this.scale;

    // Left zone
    const leftZone = this.add
      .rectangle(width * 0.25, height * 0.75, width * 0.5, height * 0.5, 0xff6b35, 0.04)
      .setScrollFactor(0).setDepth(200).setInteractive();

    this.add
      .text(width * 0.12, height * 0.88, "◀", {
        fontFamily: "monospace", fontSize: "36px", color: "#ff6b35",
      })
      .setScrollFactor(0).setDepth(201).setOrigin(0.5).setAlpha(0.35);

    leftZone.on("pointerdown", () => { this.touchLeft = true; });
    leftZone.on("pointerup",   () => { this.touchLeft = false; });
    leftZone.on("pointerout",  () => { this.touchLeft = false; });

    // Right zone
    const rightZone = this.add
      .rectangle(width * 0.75, height * 0.75, width * 0.5, height * 0.5, 0x00c4aa, 0.04)
      .setScrollFactor(0).setDepth(200).setInteractive();

    this.add
      .text(width * 0.88, height * 0.88, "▶", {
        fontFamily: "monospace", fontSize: "36px", color: "#00c4aa",
      })
      .setScrollFactor(0).setDepth(201).setOrigin(0.5).setAlpha(0.35);

    rightZone.on("pointerdown", () => { this.touchRight = true; });
    rightZone.on("pointerup",   () => { this.touchRight = false; });
    rightZone.on("pointerout",  () => { this.touchRight = false; });
  }

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
