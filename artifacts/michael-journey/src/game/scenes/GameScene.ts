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
  private lastPlatformX: number = 0;

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

  // Animated character state ("doc" | "gym" | "vacation" | "" for static sprites)
  private animPrefix    = "";
  private charAnimState = "";

  // Per-platform behaviour data (only entries for special platforms)
  private platformData: Map<
    Phaser.Physics.Arcade.Sprite,
    { vx: number; vanishes: boolean }
  > = new Map();

  // Tracks when the player last bounced — prevents head-hit collider from
  // firing on the same platform the player just jumped off.
  private lastBounceTime: number = 0;

  // Character size selection (persisted across games)
  private charSizeKey: "S" | "M" | "L" = "M";
  // Fraction of screen height the character sprite should fill
  private static readonly SIZE_FRACTIONS: Record<string, number> = {
    S: 0.13,
    M: 0.20,
    L: 0.28,
  };
  private sizeButtons: Phaser.GameObjects.Text[] = [];

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
    this.lastPlatformX      = 0;
    this.animPrefix         = "";
    this.charAnimState      = "";
    this.platformData.clear();
    this.currentLevel         = 0;
    this.currentMinGap        = LEVEL_MIN_GAPS[0];
    this.currentMaxGap        = LEVEL_MAX_GAPS[0];
    this.currentJumpVelocity  = -LEVEL_JUMPS[0];
    this.leftPointers.clear();
    this.rightPointers.clear();
    this.sizeButtons          = [];
    this.lastBounceTime       = 0;

    // Load persisted size preference (default M)
    const saved = localStorage.getItem("michael_char_size");
    if (saved === "S" || saved === "M" || saved === "L") {
      this.charSizeKey = saved;
    } else {
      this.charSizeKey = "M";
    }

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

    // ── Player — doctor & gym use animated spritesheets, others use static ──
    if      (avatarKey === "avatar_doctor")   this.animPrefix = "doc";
    else if (avatarKey === "avatar_gym")      this.animPrefix = "gym";
    else if (avatarKey === "avatar_vacation") this.animPrefix = "vacation";
    else if (avatarKey === "avatar_wingfoil") this.animPrefix = "wingfoil";
    else                                      this.animPrefix = "";

    const playerKey = this.animPrefix ? `${this.animPrefix}_anim` : avatarKey;

    this.player = this.physics.add.sprite(width / 2, startPlatY - 50, playerKey);
    this.player.setCollideWorldBounds(false);
    this.player.setGravityY(PHYSICS.gravity);
    this.player.setDepth(10);
    this.applyCharSize();

    // ── Animated character setup (doc / gym share identical 5-frame layout) ──
    // Frame guide:  0=idle  1=crouch  2=jump-up  3=falling  4=thumbs-up
    if (this.animPrefix) {
      const p = this.animPrefix;
      [p+"_jump", p+"_fall", p+"_land"].forEach(k => {
        if (this.anims.exists(k)) this.anims.remove(k);
      });
      this.anims.create({
        key:       p+"_jump",
        frames:    this.anims.generateFrameNumbers(p+"_anim", { frames: [2, 3] }),
        frameRate: 8,
        repeat:    -1,
      });
      this.anims.create({
        key:       p+"_fall",
        frames:    this.anims.generateFrameNumbers(p+"_anim", { frames: [3] }),
        frameRate: 1,
        repeat:    0,
      });
      this.anims.create({
        key:       p+"_land",
        frames:    this.anims.generateFrameNumbers(p+"_anim", { frames: [1, 4, 0] }),
        frameRate: 14,
        repeat:    0,
      });
      this.player.on(`animationcomplete-${p}_land`, () => {
        this.charAnimState = "";
      });
      this.player.play(p+"_jump");
      this.charAnimState = "jump";
    }

    this.cameras.main.setBackgroundColor(0x0a1628);
    this.cameras.main.scrollY = 0;

    // ── Platform collision ────────────────────────────────────────────────────
    // Two distinct cases handled by a single collider:
    //   • Falling (vy ≥ 0)  → land on platform top and auto-jump
    //   • Rising  (vy < 0)  → head hits platform bottom; bounce back down
    //
    // A 180 ms grace period after each bounce prevents the collider from
    // immediately firing on the platform that was just left.
    this.physics.add.collider(
      this.player,
      this.platformGroup,
      (playerGO, platformGO) => {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        if (body.velocity.y >= 0) {
          this.onLandPlatform(
            playerGO  as Phaser.Types.Physics.Arcade.GameObjectWithBody,
            platformGO as Phaser.Types.Physics.Arcade.GameObjectWithBody
          );
        } else {
          // Head hit — redirect player downward at ~35 % of upward speed
          body.setVelocityY(Math.abs(body.velocity.y) * 0.35 + 40);
        }
      },
      (playerGO) => {
        const body = (playerGO as Phaser.Physics.Arcade.Sprite)
          .body as Phaser.Physics.Arcade.Body;
        const vy = body.velocity.y;
        if (vy >= 0) return true; // always allow landing
        // Rising: allow head-hit only after the grace period
        return (this.time.now - this.lastBounceTime) > 180;
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

    // ── Size picker (S / M / L) ──
    this.createSizePicker(width);

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
    // Ignore taps in the top HUD strip (SIZE buttons and score live there)
    if (ptr.y < 40) return;
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

    // ── Animated character: switch frames based on vertical velocity ──
    if (this.animPrefix && this.charAnimState !== "land") {
      const p     = this.animPrefix;
      const vy    = (this.player.body as Phaser.Physics.Arcade.Body).velocity.y;
      const state = vy < 0 ? "jump" : "fall";
      if (state !== this.charAnimState) {
        this.charAnimState = state;
        this.player.play(state === "jump" ? p+"_jump" : p+"_fall", true);
      }
    }

    // Generate platforms ahead (gaps grow each level)
    const genY  = this.cameraY - PLATFORMS.generateAheadY;
    while (this.highestPlatformY > genY) {
      const gap  = Phaser.Math.Between(this.currentMinGap, this.currentMaxGap);
      const newY = this.highestPlatformY - gap;

      // Enforce a minimum horizontal jump so the player can never camp the centre.
      // Try up to 20 random positions; keep the best one (furthest from last).
      const margin     = PLATFORMS.width / 2 + 15;
      const minHorizDist = Math.floor(width * 0.28); // ~28% of screen width
      let bestX = Phaser.Math.Between(margin, width - margin);
      for (let t = 0; t < 20; t++) {
        const candidate = Phaser.Math.Between(margin, width - margin);
        if (Math.abs(candidate - this.lastPlatformX) >= minHorizDist) {
          bestX = candidate;
          break;
        }
        if (Math.abs(candidate - this.lastPlatformX) > Math.abs(bestX - this.lastPlatformX)) {
          bestX = candidate;
        }
      }
      this.lastPlatformX = bestX;
      this.spawnPlatform(bestX, newY);
      this.highestPlatformY = newY;
    }

    // Move sliding platforms
    const slideMargin = 70;
    this.platformData.forEach((data, plat) => {
      if (!plat.active || data.vx === 0) return;
      plat.x += data.vx * dt;
      if (plat.x < slideMargin) { plat.x = slideMargin; data.vx = Math.abs(data.vx); }
      if (plat.x > width - slideMargin) { plat.x = width - slideMargin; data.vx = -Math.abs(data.vx); }
      (plat.body as Phaser.Physics.Arcade.StaticBody).reset(plat.x, plat.y);
    });

    // Recycle old platforms
    this.platformGroup.getChildren().forEach((go) => {
      const plat = go as Phaser.Physics.Arcade.Sprite;
      if (plat.y > this.cameraY + height + 100) {
        this.platformData.delete(plat);
        plat.destroy();
      }
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

  private spawnPlatform(x: number, y: number, isStart: boolean = false) {
    // Decide platform variant based on current level (not applied to the starting platform)
    let platW: number = PLATFORMS.width; // 110 px default
    let vx       = 0;
    let vanishes = false;
    let tint: number | null = null;

    if (!isStart) {
      // Level 3+ : 35 % chance of a narrower platform (80 px)
      if (this.currentLevel >= 3 && Math.random() < 0.35) platW = 80;

      // Level 4+ : 40 % chance of a left-right sliding platform
      if (this.currentLevel >= 4 && Math.random() < 0.40) {
        const spd = 50 + this.currentLevel * 10;
        vx   = Math.random() < 0.5 ? spd : -spd;
        tint = 0xffdd44; // golden yellow — "this thing moves"
      }

      // Level 5+ : 25 % chance of a vanishing platform (disappears after landing)
      if (this.currentLevel >= 5 && Math.random() < 0.25) {
        vanishes = true;
        tint     = tint ?? 0xff7733; // orange if not already coloured
      }
    }

    const plat = this.platformGroup.create(x, y, this.platKey) as Phaser.Physics.Arcade.Sprite;
    const naturalH = (plat.height / plat.width) * platW;
    const displayH = Math.min(naturalH, 56);
    plat.setScale(platW / plat.width, displayH / plat.height).refreshBody();
    plat.setDepth(5);
    if (tint !== null) plat.setTint(tint);

    if (vx !== 0 || vanishes) {
      this.platformData.set(plat, { vx, vanishes });
    }
    return plat;
  }

  private onLandPlatform(
    _player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    platform: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const plat = platform as Phaser.Physics.Arcade.Sprite;

    // Auto-jump (velocity scales with level to stay playable at high speeds)
    this.player.setVelocityY(this.currentJumpVelocity);
    this.lastBounceTime = this.time.now; // grace-period clock for head-hit collider
    this.jumpSound?.play();
    audioManager.playBounce();

    // Land animation — brief crouch → thumbs-up flash for animated characters
    if (this.animPrefix) {
      this.charAnimState = "land";
      this.player.play(this.animPrefix + "_land", true);
    }

    // Vanishing platform — flash red then destroy
    const pd = this.platformData.get(plat);
    if (pd?.vanishes) {
      plat.setTint(0xff2222);
      this.time.delayedCall(260, () => {
        if (plat.active) {
          this.platformData.delete(plat);
          plat.destroy();
        }
      });
    }

    // Score
    if (plat !== this.lastLandedPlatform) {
      this.lastLandedPlatform = plat;
      this.score += SCORE.pointsPerPlatform;
      this.scoreText.setText(`Score: ${this.score}`);

      if (!pd?.vanishes) {
        plat.setAlpha(0.45);
        this.time.delayedCall(110, () => {
          if (plat.active) plat.setAlpha(1);
        });
      }
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

  // ── Size picker UI ──────────────────────────────────────────────────────────
  private createSizePicker(width: number) {
    const labels: Array<"S" | "M" | "L"> = ["S", "M", "L"];
    const btnW  = 30;
    const gap   = 6;
    const totalW = labels.length * btnW + (labels.length - 1) * gap;
    const startX = width / 2 - totalW / 2 + btnW / 2;
    const y      = 16;

    // Label on the left
    this.add.text(startX - btnW - 6, y + 1, "SIZE", {
      fontFamily: "monospace",
      fontSize:   "10px",
      color:      "#aaaaaa",
      stroke:     "#000000",
      strokeThickness: 2,
    }).setScrollFactor(0).setDepth(100).setOrigin(1, 0);

    labels.forEach((label, i) => {
      const x = startX + i * (btnW + gap);

      // Button background
      const bg = this.add.rectangle(x, y + 9, btnW, 20, 0x000000, 0.55)
        .setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });

      const isActive = label === this.charSizeKey;
      const txt = this.add.text(x, y + 9, label, {
        fontFamily: "monospace",
        fontSize:   "12px",
        color:      isActive ? "#ffd166" : "#888888",
        stroke:     "#000000",
        strokeThickness: 2,
      }).setScrollFactor(0).setDepth(101).setOrigin(0.5);

      if (isActive) bg.setStrokeStyle(1, 0xffd166, 0.8);

      this.sizeButtons.push(txt);

      bg.on("pointerdown", () => {
        if (this.isDead) return;
        this.setCharSize(label);
      });
    });
  }

  /** Resize the player sprite to match the current charSizeKey. */
  private applyCharSize() {
    const { height } = this.scale;
    const fraction = GameScene.SIZE_FRACTIONS[this.charSizeKey] ?? 0.20;
    const targetH  = height * fraction;
    this.player.setScale(targetH / this.player.height);
    // Body must be recalculated after every scale change (setSize uses frame coords
    // multiplied by current scale, so calling after setScale gives correct world size).
    this.applyPlayerBody();
  }

  /**
   * Tighten the physics body so it matches the actual visible character rather
   * than the full (transparent-padded) sprite frame.
   *
   * Animated spritesheets (308 × 1024 per frame):
   *   The green-screened character fills roughly the centre 36 % of the width
   *   and rows 22 %–90 % of the height.
   *
   * Static avatar images:
   *   Characters are closer to full-frame, so slightly looser bounds.
   *
   * setSize / setOffset take UN-SCALED frame-pixel values; Phaser multiplies them
   * by the current scaleX/Y internally, so world body size = frame value × scale.
   */
  private applyPlayerBody() {
    const body   = this.player.body as Phaser.Physics.Arcade.Body;
    const frameW = this.player.width;   // un-scaled texture width
    const frameH = this.player.height;  // un-scaled texture height

    if (this.animPrefix) {
      // Animated spritesheet: 308 × 1024 frame
      // Character body (not wings/arms) ≈ 36 % wide, 68 % tall
      // starting at ~22 % from top (head) down to ~90 % (feet)
      const bW  = frameW * 0.36;
      const bH  = frameH * 0.68;
      const oX  = (frameW - bW) / 2;   // centre horizontally
      const oY  = frameH * 0.22;        // head starts here
      body.setSize(bW, bH);
      body.setOffset(oX, oY);
    } else {
      // Static avatar image: character fills most of the frame
      const bW  = frameW * 0.55;
      const bH  = frameH * 0.78;
      const oX  = (frameW - bW) / 2;
      const oY  = frameH * 0.08;
      body.setSize(bW, bH);
      body.setOffset(oX, oY);
    }
  }

  /** Switch to a new size, update the sprite and the button highlights. */
  private setCharSize(key: "S" | "M" | "L") {
    this.charSizeKey = key;
    localStorage.setItem("michael_char_size", key);
    this.applyCharSize();

    // Refresh button highlight colours
    const labels: Array<"S" | "M" | "L"> = ["S", "M", "L"];
    this.sizeButtons.forEach((txt, i) => {
      const active = labels[i] === key;
      txt.setColor(active ? "#ffd166" : "#888888");
    });
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
