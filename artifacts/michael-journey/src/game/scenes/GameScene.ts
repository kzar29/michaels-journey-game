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
import { audioManager } from "../AudioManager";

// Speed and gap values per level (level 0 = easiest, capped at last entry)
const LEVEL_DURATION  = 10; // seconds per level step
const LEVEL_SPEEDS    = [55,  75,  100, 130, 165, 200, 220];
const LEVEL_MIN_GAPS  = [108, 114, 120, 130, 138, 148, 158];
const LEVEL_MAX_GAPS  = [165, 175, 188, 200, 215, 228, 245];
// Jump velocity scales up with scroll speed so the player always has
// ~120px of effective upward clearance relative to the moving camera.
// Formula: V = 2S + sqrt(4S² + 2·g·120)  where g=800
const LEVEL_JUMPS     = [600, 630,  700, 790, 900, 1010, 1080];

const PLAT_MAP: Record<string, string> = {
  avatar_doctor:   "plat_doctor",
  avatar_gym:      "plat_gym",
  avatar_vacation: "plat_vacation",
  avatar_wingfoil: "plat_wingfoil",
};

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platformGroup!: Phaser.Physics.Arcade.StaticGroup;
  private highestPlatformY: number = 0;

  private cameraY: number = 0;
  private scrollSpeed: number = LEVEL_SPEEDS[0];
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
  private platKey: string = "plat_doctor";

  private bgTile!: Phaser.GameObjects.TileSprite;
  private jumpSound?: Phaser.Sound.BaseSound;
  private isDead: boolean = false;

  // Level / difficulty
  private currentLevel: number = 0;
  private currentMinGap: number = LEVEL_MIN_GAPS[0];
  private currentMaxGap: number = LEVEL_MAX_GAPS[0];
  private currentJumpVelocity: number = -LEVEL_JUMPS[0];

  // Doctor animation state
  private isDoctorAnim = false;
  private docAnimState = "";

  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    const { width, height } = this.scale;

    // Reset
    this.isDead        = false;
    this.score         = 0;
    this.elapsed       = 0;
    this.scrollSpeed   = LEVEL_SPEEDS[0];
    this.cameraY       = 0;
    this.lastLandedPlatform = null;
    this.highestPlatformY   = 0;
    this.isDoctorAnim       = false;
    this.docAnimState       = "";
    this.currentLevel         = 0;
    this.currentMinGap        = LEVEL_MIN_GAPS[0];
    this.currentMaxGap        = LEVEL_MAX_GAPS[0];
    this.currentJumpVelocity  = -LEVEL_JUMPS[0];
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
    this.platKey = PLAT_MAP[avatarKey] ?? "plat_doctor";

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

    // ── Player — doctor uses animated spritesheet, others use static sprite ──
    this.isDoctorAnim = avatarKey === "avatar_doctor";
    const playerKey   = this.isDoctorAnim ? "doc_anim" : avatarKey;

    this.player = this.physics.add.sprite(width / 2, startPlatY - 50, playerKey);
    this.player.setCollideWorldBounds(false);
    this.player.setGravityY(PHYSICS.gravity);
    this.player.setDepth(10);
    // Doctor frames are 308×1024 with transparent headroom — boost scale slightly
    const scaleH = this.isDoctorAnim ? height * 0.14 : height * 0.12;
    this.player.setScale(scaleH / this.player.height);

    // ── Doctor animations (recreate each scene start so frame changes take effect) ──
    if (this.isDoctorAnim) {
      ["doc_jump", "doc_fall", "doc_land"].forEach(k => {
        if (this.anims.exists(k)) this.anims.remove(k);
      });
      // Frame guide (new green-screen spritesheet):
      //  0 = standing idle   1 = crouch/land
      //  2 = jump ascending  3 = falling / peak
      //  4 = thumbs up
      this.anims.create({
        key:       "doc_jump",
        frames:    this.anims.generateFrameNumbers("doc_anim", { frames: [2, 3] }),
        frameRate: 8,
        repeat:    -1,
      });
      this.anims.create({
        key:       "doc_fall",
        frames:    this.anims.generateFrameNumbers("doc_anim", { frames: [3] }),
        frameRate: 1,
        repeat:    0,
      });
      this.anims.create({
        key:       "doc_land",
        // crouch → thumbs-up → idle — brief celebratory flash on every landing
        frames:    this.anims.generateFrameNumbers("doc_anim", { frames: [1, 4, 0] }),
        frameRate: 14,
        repeat:    0,
      });
      // When doc_land finishes, release control back to the velocity-based state machine
      this.player.on("animationcomplete-doc_land", () => {
        this.docAnimState = "";
      });

      this.player.play("doc_jump");
      this.docAnimState = "jump";
    }

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
      if (!this.isDead) this.player.setVelocityY(this.currentJumpVelocity);
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

    // Level-based difficulty step-up
    this.elapsed += dt;
    const maxIdx  = LEVEL_SPEEDS.length - 1;
    const newLvl  = Math.min(Math.floor(this.elapsed / LEVEL_DURATION), maxIdx);
    if (newLvl !== this.currentLevel) {
      this.currentLevel         = newLvl;
      this.currentMinGap        = LEVEL_MIN_GAPS[newLvl];
      this.currentMaxGap        = LEVEL_MAX_GAPS[newLvl];
      this.scrollSpeed          = LEVEL_SPEEDS[newLvl];
      this.currentJumpVelocity  = -LEVEL_JUMPS[newLvl];
      this.showLevelUp(newLvl + 1);
    }

    // Auto-scroll camera upward
    this.cameraY -= this.scrollSpeed * dt;

    // If player jumps above the top 30% of the screen, pull the camera up with them
    const playerScreenY = this.player.y - this.cameraY;
    if (playerScreenY < height * 0.30) {
      this.cameraY = this.player.y - height * 0.30;
    }

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

    // Horizontal clamp — keep player fully on screen
    const halfW = this.player.displayWidth / 2;
    if (this.player.x < halfW) {
      this.player.x = halfW;
      if ((this.player.body as Phaser.Physics.Arcade.Body).velocity.x < 0)
        this.player.setVelocityX(0);
    } else if (this.player.x > width - halfW) {
      this.player.x = width - halfW;
      if ((this.player.body as Phaser.Physics.Arcade.Body).velocity.x > 0)
        this.player.setVelocityX(0);
    }

    // ── Doctor animation: switch frames based on vertical velocity ──
    if (this.isDoctorAnim && this.docAnimState !== "land") {
      const vy    = (this.player.body as Phaser.Physics.Arcade.Body).velocity.y;
      const state = vy < 0 ? "jump" : "fall";
      if (state !== this.docAnimState) {
        this.docAnimState = state;
        this.player.play(state === "jump" ? "doc_jump" : "doc_fall", true);
      }
    }

    // Generate platforms ahead (gaps grow each level)
    const genY = this.cameraY - PLATFORMS.generateAheadY;
    while (this.highestPlatformY > genY) {
      const gap  = Phaser.Math.Between(this.currentMinGap, this.currentMaxGap);
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
    this.speedText.setText(`🏄 Lv ${this.currentLevel + 1}`);
  }

  private showLevelUp(level: number) {
    audioManager.playLevelUp();
    const { width, height } = this.scale;
    const txt = this.add
      .text(width / 2, height * 0.42, `LEVEL ${level}! ⚡`, {
        fontFamily: "monospace",
        fontSize: "30px",
        color: "#ffd166",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);

    this.tweens.add({
      targets: txt,
      alpha: 0,
      y: height * 0.30,
      duration: 1400,
      ease: "Power2",
      onComplete: () => txt.destroy(),
    });
  }

  private spawnPlatform(x: number, y: number, _isStart: boolean = false) {
    const plat = this.platformGroup.create(x, y, this.platKey) as Phaser.Physics.Arcade.Sprite;
    // Scale to PLATFORMS.width; cap display height so platforms stay flat-ish
    const naturalH = (plat.height / plat.width) * PLATFORMS.width;
    const displayH = Math.min(naturalH, 56);
    plat.setScale(PLATFORMS.width / plat.width, displayH / plat.height).refreshBody();
    plat.setDepth(5);
    return plat;
  }

  private onLandPlatform(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    platform: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const plat = platform as Phaser.Physics.Arcade.Sprite;

    // Auto-jump (velocity scales with level to stay playable at high speeds)
    this.player.setVelocityY(this.currentJumpVelocity);
    this.jumpSound?.play();
    audioManager.playBounce();

    // Doctor land animation — brief crouch flash before jump anim takes over
    if (this.isDoctorAnim) {
      this.docAnimState = "land";
      this.player.play("doc_land", true);
      // update() will switch to "jump" once vy goes negative (~next frame)
    }

    // Score
    if (plat !== this.lastLandedPlatform) {
      this.lastLandedPlatform = plat;
      this.score += SCORE.pointsPerPlatform;
      this.scoreText.setText(`Score: ${this.score}`);

      plat.setAlpha(0.45);
      this.time.delayedCall(110, () => {
        if (plat.active) plat.setAlpha(1);
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
    audioManager.playGameOver();
    this.time.delayedCall(400, () => {
      this.scene.start("GameOverScene", { score: this.score });
    });
  }
}
