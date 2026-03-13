/**
 * GameOverScene — shows final score, prompts for name only if top-3 qualifying, saves to leaderboard.
 */

import Phaser from "phaser";
import { saveScore, isQualifyingForLeaderboard } from "../ScoreStore";

export class GameOverScene extends Phaser.Scene {
  private finalScore: number = 0;

  constructor() {
    super({ key: "GameOverScene" });
  }

  init(data: { score?: number }) {
    this.finalScore = data.score ?? 0;
  }

  create() {
    const { width, height } = this.scale;

    // ── Background image (same as menu) ──
    const bg = this.add.image(width / 2, height / 2, "menu_bg");
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale).setDepth(0);

    // ── Dark overlay ──
    this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.50)
      .setDepth(1);

    const ts = { fontFamily: "monospace", stroke: "#000000", strokeThickness: 5 };

    // ── GAME OVER ──
    this.add
      .text(width / 2, height * 0.11, "GAME OVER", {
        ...ts, fontSize: `${Math.round(width * 0.10)}px`, color: "#ff6b35",
      })
      .setOrigin(0.5).setDepth(2);

    this.add
      .text(width / 2, height * 0.21, "MICHAEL'S JOURNEY", {
        ...ts, fontSize: `${Math.round(width * 0.050)}px`, color: "#ffd166",
      })
      .setOrigin(0.5).setDepth(2);

    // Teal divider
    this.add.graphics()
      .fillStyle(0x00c4aa, 0.7)
      .fillRect(width * 0.20, height * 0.285, width * 0.6, 2)
      .setDepth(2);

    // ── Score ──
    const scoreTxt = this.add
      .text(width / 2, height * 0.34, `Score: ${this.finalScore}`, {
        ...ts, fontSize: `${Math.round(width * 0.09)}px`, color: "#ffd166",
      })
      .setOrigin(0.5).setDepth(2);

    // Pulse
    this.tweens.add({
      targets: scoreTxt, scaleX: 1.06, scaleY: 1.06,
      yoyo: true, repeat: -1, duration: 650, ease: "Sine.easeInOut",
    });

    // ── Fun message ──
    this.add
      .text(width / 2, height * 0.46, this.getScoreMessage(this.finalScore), {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.037)}px`,
        color: "#ffffff",
        stroke: "#000000", strokeThickness: 3,
        align: "center",
        wordWrap: { width: width * 0.85 },
      })
      .setOrigin(0.5).setDepth(2);

    // ── Name input only if score qualifies for top 3 ──
    if (isQualifyingForLeaderboard(this.finalScore)) {
      this.showNameInput();
    } else {
      // Show a "didn't make top 3" note when the board is already full
      if (this.finalScore > 0) {
        this.add.text(width / 2, height * 0.565, "Not top 3 yet — keep going! 💪", {
          fontFamily: "monospace",
          fontSize: `${Math.round(width * 0.032)}px`,
          color: "#88aabb",
          stroke: "#000", strokeThickness: 2,
          align: "center",
        }).setOrigin(0.5).setDepth(3);
      }
      this.showButtons();
    }
  }

  // ── Name input via HTML DOM element ───────────────────────────────────────
  private showNameInput() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height * 0.555, "🏆 TOP 3 — ENTER YOUR NAME!", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffd166",
      stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(3);

    // Semi-transparent input panel
    this.add.rectangle(width / 2, height * 0.68, width * 0.88, height * 0.22, 0x000000, 0.65)
      .setStrokeStyle(2, 0x00c4aa, 0.6)
      .setDepth(3);

    this.add.text(width / 2, height * 0.605, "ENTER YOUR NAME:", {
      fontFamily: "monospace", fontSize: "13px", color: "#ffffff",
      stroke: "#000", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(4);

    const html = `
      <div style="display:flex; flex-direction:column; align-items:center; gap:10px;">
        <input id="mj-inp"
          type="text"
          maxlength="14"
          placeholder="YOUR NAME"
          autocomplete="off"
          style="background:#001133; border:2px solid #00c4aa; color:#ffd166;
                 font-family:monospace; font-size:18px; text-align:center;
                 padding:8px 12px; border-radius:4px; outline:none;
                 width:200px; text-transform:uppercase; box-sizing:border-box;">
        <button id="mj-btn"
          style="background:#ff6b35; border:none; border-radius:4px;
                 color:white; font-family:monospace; font-size:15px;
                 padding:9px 28px; cursor:pointer; letter-spacing:1px;">
          CONFIRM ✓
        </button>
      </div>`;

    const dom = this.add.dom(width / 2, height * 0.695).createFromHTML(html).setDepth(10);

    const inp = dom.node.querySelector("#mj-inp") as HTMLInputElement;
    const btn = dom.node.querySelector("#mj-btn") as HTMLButtonElement;

    this.time.delayedCall(200, () => inp?.focus());

    inp.addEventListener("input", () => {
      const pos = inp.selectionStart ?? inp.value.length;
      inp.value = inp.value.toUpperCase();
      inp.setSelectionRange(pos, pos);
    });

    const submit = () => {
      const name = inp.value.trim();
      if (!name) { inp.focus(); return; }
      saveScore(name, this.finalScore);
      dom.destroy();
      this.showButtons();
    };

    btn.addEventListener("click", submit);
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  }

  // ── RETRY / MENU buttons ──────────────────────────────────────────────────
  private showButtons() {
    const { width, height } = this.scale;

    const retryBg = this.add
      .rectangle(width / 2, height * 0.745, 220, 56, 0xff6b35)
      .setInteractive({ useHandCursor: true }).setDepth(5);

    this.add.text(width / 2, height * 0.745, "RETRY  🏄", {
      fontFamily: "monospace", fontSize: "22px",
      color: "#ffffff", stroke: "#882200", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);

    retryBg.on("pointerover",  () => retryBg.setFillStyle(0xff8c55));
    retryBg.on("pointerout",   () => retryBg.setFillStyle(0xff6b35));
    retryBg.on("pointerdown",  () => {
      retryBg.setFillStyle(0xdd5520);
      this.time.delayedCall(120, () => this.scene.start("AvatarScene"));
    });

    const menuBg = this.add
      .rectangle(width / 2, height * 0.845, 190, 44, 0x0d3b5e)
      .setInteractive({ useHandCursor: true }).setDepth(5);

    this.add.text(width / 2, height * 0.845, "MAIN MENU", {
      fontFamily: "monospace", fontSize: "18px",
      color: "#00c4aa", stroke: "#000000", strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6);

    menuBg.on("pointerover",  () => menuBg.setFillStyle(0x1a5580));
    menuBg.on("pointerout",   () => menuBg.setFillStyle(0x0d3b5e));
    menuBg.on("pointerdown",  () => {
      this.time.delayedCall(100, () => this.scene.start("MenuScene"));
    });
  }

  private getScoreMessage(score: number): string {
    if (score === 0)  return "Bro, even the cactus did better 🌵";
    if (score < 5)    return "The ocean says: try again! 🌊";
    if (score < 10)   return "Not bad, Dr. Michael! 🩺";
    if (score < 20)   return "Getting those gains! 🏋️";
    if (score < 35)   return "Kitesurfing through the sky! 🪁";
    if (score < 50)   return "¡Increíble, amigo! 🇲🇽🔥";
    return "LEYENDA! Michael is unstoppable! 🏆🌊🏄";
  }
}
