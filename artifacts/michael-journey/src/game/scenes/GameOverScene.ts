/**
 * GameOverScene
 * -------------
 * Displayed when the player falls off-screen.
 * Shows the final score and a Restart button.
 */

import Phaser from "phaser";

export class GameOverScene extends Phaser.Scene {
  private finalScore: number = 0;

  constructor() {
    super({ key: "GameOverScene" });
  }

  // init() is called before create() and receives data passed from GameScene
  init(data: { score?: number }) {
    this.finalScore = data.score ?? 0;
  }

  create() {
    const { width, height } = this.scale;

    // Dark overlay background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

    // Stars
    for (let i = 0; i < 40; i++) {
      this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(1, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.1, 0.5)
      );
    }

    // Game Over title
    this.add
      .text(width / 2, height * 0.22, "GAME OVER", {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.1)}px`,
        color: "#ff4466",
        stroke: "#880022",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Score display
    this.add
      .text(width / 2, height * 0.42, `Score: ${this.finalScore}`, {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.08)}px`,
        color: "#ffe84d",
        stroke: "#886600",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Fun message based on score
    const msg = this.getScoreMessage(this.finalScore);
    this.add
      .text(width / 2, height * 0.55, msg, {
        fontFamily: "monospace",
        fontSize: `${Math.round(width * 0.042)}px`,
        color: "#aaccff",
        align: "center",
        wordWrap: { width: width * 0.85 },
      })
      .setOrigin(0.5);

    // Restart button
    const btnBg = this.add
      .rectangle(width / 2, height * 0.70, 200, 54, 0xdd4455)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width / 2, height * 0.70, "RESTART", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#ffffff",
        stroke: "#881122",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    btnBg.on("pointerover", () => btnBg.setFillStyle(0xee5566));
    btnBg.on("pointerout", () => btnBg.setFillStyle(0xdd4455));
    btnBg.on("pointerdown", () => {
      btnBg.setFillStyle(0xbb3344);
      this.time.delayedCall(120, () => this.scene.start("GameScene"));
    });

    // Menu button
    const menuBg = this.add
      .rectangle(width / 2, height * 0.81, 180, 44, 0x334466)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width / 2, height * 0.81, "MAIN MENU", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#aaccff",
      })
      .setOrigin(0.5);

    menuBg.on("pointerover", () => menuBg.setFillStyle(0x445588));
    menuBg.on("pointerout", () => menuBg.setFillStyle(0x334466));
    menuBg.on("pointerdown", () => {
      this.time.delayedCall(100, () => this.scene.start("MenuScene"));
    });

    // Entrance animation for title
    const title = this.children.list[2] as Phaser.GameObjects.Text;
    this.tweens.add({
      targets: title,
      scaleX: 1.05,
      scaleY: 1.05,
      yoyo: true,
      repeat: -1,
      duration: 700,
      ease: "Sine.easeInOut",
    });
  }

  // Returns a funny comment based on the player's score
  private getScoreMessage(score: number): string {
    if (score === 0) return "You didn't even try… 👀";
    if (score < 5) return "Keep practicing, Michael! 💪";
    if (score < 10) return "Not bad! Getting the hang of it 🙂";
    if (score < 20) return "Nice moves! ✨";
    if (score < 35) return "You're on fire! 🔥";
    if (score < 50) return "Incredible! Michael is unstoppable! 🚀";
    return "LEGENDARY! 🏆 The sky can't stop Michael!";
  }
}
