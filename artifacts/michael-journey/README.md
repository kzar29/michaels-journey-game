# Michael Journey

A cute, funny endless vertical platform jumper built with Phaser.js + React + Vite.

## How to Replace Assets

Drop your files into these locations — the game will load them automatically:

| Asset | Path | Notes |
|-------|------|-------|
| Player sprite | `public/assets/player/michael.png` | PNG with transparent background. Any size works — the game auto-scales it. |
| Platform image | `public/assets/platform/platform.png` | PNG, ideally wider than tall (e.g. 100×20px) |
| Jump sound | `public/assets/audio/jump.wav` | WAV or MP3. Also uncomment the `load.audio` line in `src/game/scenes/BootScene.ts` |
| Background | `public/assets/background/bg.png` | Optional. Uncomment the `load.image` line in `BootScene.ts` to enable |

## Tuning Gameplay

All key values live in one file: **`src/game/config.ts`**

| Setting | Variable | Default | Effect |
|---------|----------|---------|--------|
| Gravity | `PHYSICS.gravity` | `800` | Higher = falls faster |
| Jump height | `PHYSICS.jumpVelocity` | `-600` | More negative = higher jump |
| Move speed | `PHYSICS.moveSpeed` | `280` | px/second left/right |
| Min platform gap | `PLATFORMS.minGapY` | `90` | px between platforms (vertical) |
| Max platform gap | `PLATFORMS.maxGapY` | `140` | px between platforms (vertical) |
| Points per platform | `SCORE.pointsPerPlatform` | `1` | Score increment per new platform |

## Controls

**Desktop:**
- `A` / `←` — move left
- `D` / `→` — move right
- `Space` / `↑` / `W` — jump

**Mobile:**
- Left zone (bottom-left) — hold to move left
- Right zone (bottom-right) — hold to move right
- JUMP button (center-bottom) — tap to jump

## Project Structure

```
src/
  game/
    config.ts          ← All tuning values and asset paths live here
    PhaserGame.ts      ← Phaser game setup and scene registration
    scenes/
      BootScene.ts     ← Asset loading
      MenuScene.ts     ← Start screen
      GameScene.ts     ← Core gameplay loop
      GameOverScene.ts ← Score display + restart
  pages/
    Game.tsx           ← React component that hosts the Phaser canvas
public/
  assets/
    player/            ← Drop michael.png here
    platform/          ← Drop platform.png here
    audio/             ← Drop jump.wav here
    background/        ← Drop bg.png here (optional)
```
