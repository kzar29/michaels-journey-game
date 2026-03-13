/**
 * AvatarScene.ts
 * --------------
 * Character-selection screen.
 * Left / right arrows (or tap left / right half) cycle through the four
 * Michael costumes.  "LET'S GO!" starts the game with the chosen avatar.
 */

import Phaser from "phaser";
import { MusicPlayer, MusicTheme } from "../MusicPlayer";

// Maps each avatar to its musical theme
const AVATAR_THEME: Record<string, MusicTheme> = {
  avatar_doctor:   "doctor",
  avatar_gym:      "gym",
  avatar_vacation: "mexican",
  avatar_wingfoil: "beach",
};

interface AvatarDef {
  key:     string;
  name:    string;
  emoji:   string;
  tagline: string;
  color:   number;
}

const AVATARS: AvatarDef[] = [
  {
    key:     "avatar_doctor",
    name:    "DR. MICHAEL",
    emoji:   "🩺",
    tagline: "Saves lives AND platforms",
    color:   0x00c4aa,
  },
  {
    key:     "avatar_gym",
    name:    "GYM BRO MICHAEL",
    emoji:   "💪",
    tagline: "Never skips leg day (or a platform)",
    color:   0xff6b35,
  },
  {
    key:     "avatar_vacation",
    name:    "VACATIONER MICHAEL",
    emoji:   "🌴",
    tagline: "Good vibes only, bro",
    color:   0xffd166,
  },
  {
    key:     "avatar_wingfoil",
    name:    "WINGFOIL MICHAEL",
    emoji:   "🪁",
    tagline: "Above the waves, above the clouds",
    color:   0x06d6a0,
  },
];

const BG      = 0x0a1628;
const STAR_C  = 0x00c4aa;
const TEXT_W  = "#ffffff";
const TEXT_G  = "#00c4aa";

export class AvatarScene extends Phaser.Scene {
  private current   = 0;
  private sprites:  Phaser.GameObjects.Image[]      = [];
  private nameTxt!: Phaser.GameObjects.Text;
  private tagTxt!:  Phaser.GameObjects.Text;
  private dots:     Phaser.GameObjects.Arc[]        = [];
  private glowRect!: Phaser.GameObjects.Rectangle;
  private floatTween?: Phaser.Tweens.Tween;
  private isTransitioning = false;
  private spriteBaseY = 0;

  constructor() { super({ key: "AvatarScene" }); }

  create() {
    const { width: W, height: H } = this.scale;

    // ── Reset per-visit state (scene is reused across visits) ─────────────────
    this.sprites          = [];
    this.dots             = [];
    this.current          = 0;
    this.isTransitioning  = false;
    this.floatTween       = undefined;

    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, BG);
    this.addStars(W, H);

    // ── Back to Main Menu ─────────────────────────────────────────────────────
    const backBg = this.add.rectangle(W * 0.14, H * 0.045, 90, 34, 0x000000, 0.4)
      .setInteractive({ useHandCursor: true }).setDepth(20);
    this.add.text(W * 0.14, H * 0.045, "← MENU", {
      fontFamily: "monospace", fontSize: "11px", color: "#00c4aa",
      stroke: "#000", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(21);
    backBg.on("pointerover", () => backBg.setFillStyle(0x003344, 0.7));
    backBg.on("pointerout",  () => backBg.setFillStyle(0x000000, 0.4));
    backBg.on("pointerdown", () => {
      MusicPlayer.getInstance().stop();
      this.scene.start("MenuScene");
    });

    // ── Title ─────────────────────────────────────────────────────────────────
    this.add.text(W / 2, H * 0.07, "WHO IS MICHAEL TODAY?", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize:   "13px",
      color:      TEXT_W,
      align:      "center",
      wordWrap:   { width: W * 0.85 },
    }).setOrigin(0.5);

    // ── Glow card behind the sprite ───────────────────────────────────────────
    this.glowRect = this.add.rectangle(W / 2, H * 0.41, W * 0.62, H * 0.52, 0x00c4aa, 0.08)
      .setStrokeStyle(2, 0x00c4aa, 0.5);

    // ── All sprites (stacked; only active one visible) ────────────────────────
    this.spriteBaseY = H * 0.41;
    AVATARS.forEach((av, i) => {
      const img = this.add.image(W / 2, this.spriteBaseY, av.key);
      const maxH = H * 0.48;
      const maxW = W * 0.55;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      img.setScale(scale).setAlpha(i === 0 ? 1 : 0).setDepth(5);
      this.sprites.push(img);
    });

    // ── Avatar name ───────────────────────────────────────────────────────────
    this.nameTxt = this.add.text(W / 2, H * 0.69, "", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize:   "13px",
      color:      TEXT_G,
      align:      "center",
    }).setOrigin(0.5).setDepth(10);

    // ── Tagline ───────────────────────────────────────────────────────────────
    this.tagTxt = this.add.text(W / 2, H * 0.75, "", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize:   "8px",
      color:      "#ffd166",
      align:      "center",
      wordWrap:   { width: W * 0.82 },
    }).setOrigin(0.5).setDepth(10);

    // ── Dot indicators ────────────────────────────────────────────────────────
    const dotSpacing = 20;
    const dotStartX  = W / 2 - ((AVATARS.length - 1) * dotSpacing) / 2;
    AVATARS.forEach((_, i) => {
      const dot = this.add.circle(dotStartX + i * dotSpacing, H * 0.82, 5, 0x444466)
        .setDepth(10);
      this.dots.push(dot);
    });

    // ── Navigation arrows ─────────────────────────────────────────────────────
    this.makeArrow(W * 0.1, H * 0.41, "◀", () => this.shift(-1));
    this.makeArrow(W * 0.9, H * 0.41, "▶", () => this.shift(+1));

    // ── Keyboard support ──────────────────────────────────────────────────────
    this.input.keyboard?.on("keydown-LEFT",  () => this.shift(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.shift(+1));
    this.input.keyboard?.on("keydown-ENTER", () => this.launch());

    // ── Swipe / touch support (whole screen tap zones) ────────────────────────
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      const inButton = p.y > H * 0.85;
      if (inButton) return;
      if (p.x < W * 0.3)       this.shift(-1);
      else if (p.x > W * 0.7)  this.shift(+1);
    });

    // ── LET'S GO button ───────────────────────────────────────────────────────
    this.makeLetsGoButton(W, H);

    // ── Start music with theme matching the first avatar ─────────────────────
    const initialTheme = AVATAR_THEME[AVATARS[0].key] ?? "doctor";
    MusicPlayer.getInstance().start(initialTheme);

    // Initialise display for index 0
    this.updateDisplay(0, false);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private addStars(W: number, H: number) {
    for (let i = 0; i < 55; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H);
      const r = Phaser.Math.FloatBetween(1, 2.5);
      this.add.circle(x, y, r, STAR_C, Phaser.Math.FloatBetween(0.2, 0.7));
    }
  }

  private makeArrow(x: number, y: number, label: string, cb: () => void) {
    const bg = this.add.rectangle(x, y, 44, 44, 0xffffff, 0).setDepth(20).setInteractive();
    const txt = this.add.text(x, y, label, {
      fontFamily: "'Press Start 2P', monospace",
      fontSize:   "22px",
      color:      TEXT_W,
    }).setOrigin(0.5).setDepth(21);

    bg.on("pointerover", () => { txt.setColor(TEXT_G); });
    bg.on("pointerout",  () => { txt.setColor(TEXT_W); });
    bg.on("pointerup",   () => { txt.setColor(TEXT_G); cb(); });
  }

  private makeLetsGoButton(W: number, H: number) {
    const bw = W * 0.6;
    const bh = 52;
    const bx = W / 2;
    const by = H * 0.9;
    const bg = this.add.rectangle(bx, by, bw, bh, 0xff6b35).setDepth(20).setInteractive()
      .setStrokeStyle(2, 0xffd166);
    const txt = this.add.text(bx, by, "LET'S GO! 🚀", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize:   "13px",
      color:      TEXT_W,
    }).setOrigin(0.5).setDepth(21);

    // Pulse animation
    this.tweens.add({
      targets:   bg,
      scaleX:    1.04,
      scaleY:    1.04,
      duration:  700,
      yoyo:      true,
      repeat:    -1,
      ease:      "Sine.easeInOut",
    });

    bg.on("pointerover", () => { bg.setFillStyle(0xff8c5a); });
    bg.on("pointerout",  () => { bg.setFillStyle(0xff6b35); });
    bg.on("pointerup",   () => { this.launch(); });
    txt.on("pointerup",  () => { this.launch(); }).setInteractive();
  }

  private shift(dir: -1 | 1) {
    if (this.isTransitioning) return;
    const next = (this.current + dir + AVATARS.length) % AVATARS.length;
    this.transitionTo(next, dir);
  }

  private transitionTo(next: number, dir: -1 | 1) {
    if (this.isTransitioning || next === this.current) return;
    this.isTransitioning = true;

    const { width: W } = this.scale;
    const outSprite = this.sprites[this.current];
    const inSprite  = this.sprites[next];

    const slideOut = dir * -W;
    const slideIn  = dir * W;

    // Stop the current float tween
    this.floatTween?.stop();

    // Slide out current
    this.tweens.add({
      targets:  outSprite,
      x:        outSprite.x + slideOut,
      alpha:    0,
      duration: 220,
      ease:     "Cubic.easeIn",
      onComplete: () => { outSprite.setAlpha(0).setX(W / 2).setY(this.spriteBaseY); },
    });

    // Slide in next from the opposite side
    inSprite.setX(W / 2 - slideOut).setY(this.spriteBaseY).setAlpha(0);
    this.tweens.add({
      targets:  inSprite,
      x:        W / 2,
      alpha:    1,
      duration: 220,
      ease:     "Cubic.easeOut",
      onComplete: () => {
        this.current = next;
        this.isTransitioning = false;
        this.updateDisplay(next, true);
      },
    });
  }

  private updateDisplay(index: number, animate: boolean) {
    const av = AVATARS[index];

    // Name + tagline
    const nameStr = `${av.emoji} ${av.name} ${av.emoji}`;
    if (animate) {
      this.nameTxt.setAlpha(0).setText(nameStr);
      this.tagTxt.setAlpha(0).setText(av.tagline);
      this.tweens.add({ targets: [this.nameTxt, this.tagTxt], alpha: 1, duration: 200 });
    } else {
      this.nameTxt.setText(nameStr);
      this.tagTxt.setText(av.tagline);
    }

    // Glow card colour
    this.tweens.addCounter({
      from:     0,
      to:       1,
      duration: 300,
      onUpdate: (t) => {
        const v = t?.getValue() ?? 0;
        this.glowRect.setStrokeStyle(2, av.color, 0.5 + v * 0.3);
        this.glowRect.setFillStyle(av.color, 0.05 + v * 0.06);
      },
    });

    // Dots
    this.dots.forEach((d, i) => {
      d.setFillStyle(i === index ? av.color : 0x444466);
      d.setScale(i === index ? 1.4 : 1);
    });

    // Save selection to Phaser registry for GameScene to read
    this.registry.set("selectedAvatar", av.key);

    // Switch background music to match this avatar's theme
    const theme = AVATAR_THEME[av.key] ?? "doctor";
    MusicPlayer.getInstance().switchTheme(theme);

    // Floating animation on the active sprite
    this.floatTween = this.tweens.add({
      targets:  this.sprites[index],
      y:        this.sprites[index].y - 12,
      duration: 900,
      yoyo:     true,
      repeat:   -1,
      ease:     "Sine.easeInOut",
    });
  }

  private launch() {
    this.input.enabled = false;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("GameScene");
    });
  }
}
