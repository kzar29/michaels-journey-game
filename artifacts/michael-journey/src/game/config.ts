/**
 * =============================================
 * MICHAEL JOURNEY - GAME CONFIGURATION
 * =============================================
 *
 * This is the central config file for the game.
 * Edit values here to tweak gameplay feel without touching the scene logic.
 *
 * HOW TO REPLACE ASSETS:
 *   - Player sprite:  drop your PNG into public/assets/player/michael.png
 *   - Platform image: drop your PNG into public/assets/platform/platform.png
 *   - Jump sound:     drop your WAV into public/assets/audio/jump.wav
 *   - Background:     drop your PNG into public/assets/background/bg.png
 *
 * All paths below are relative to the public/ folder.
 */

export const ASSET_PATHS = {
  player:     "assets/player/michael.png",
  platform:   "assets/platform/platform.png",
  jumpSound:  "assets/audio/jump.wav",
  background: "assets/background/bg.png",
} as const;

/**
 * PHYSICS & MOVEMENT
 * ------------------
 * Tweak these to change how the game feels.
 */
export const PHYSICS = {
  /** How fast the player falls (pixels per second squared). Higher = heavier gravity. */
  gravity: 800,

  /** Upward velocity applied when jumping. More negative = higher jump. */
  jumpVelocity: -600,

  /** Left/right movement speed in pixels per second. */
  moveSpeed: 280,
} as const;

/**
 * PLATFORM GENERATION
 * --------------------
 * Controls how platforms are placed.
 */
export const PLATFORMS = {
  /** Minimum vertical gap between platforms (pixels). */
  minGapY: 90,

  /** Maximum vertical gap between platforms (pixels). */
  maxGapY: 140,

  /** Width of each platform (pixels). */
  width: 170,

  /** Height of each platform (pixels). */
  height: 20,

  /** How many platforms to keep in the pool at once. */
  poolSize: 12,

  /** How many pixels above the visible top to start generating new platforms. */
  generateAheadY: 100,
} as const;

/**
 * CAMERA / WORLD
 * ---------------
 */
export const WORLD = {
  /** The world scrolls up when the player reaches this fraction of the screen height. */
  scrollThresholdFactor: 0.4,

  /** Extra pixels to push the world down when game over (so player falls fully off screen). */
  fallMargin: 100,
} as const;

/**
 * SCORE
 * ------
 * Score increments by 1 each time the player lands on a new platform.
 * There is no multiplier in the MVP — each platform = 1 point.
 */
export const SCORE = {
  pointsPerPlatform: 1,
} as const;
