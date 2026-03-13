/**
 * Game.tsx
 * --------
 * React component that hosts the Phaser canvas.
 * Manages the game lifecycle: creates the game on mount, destroys it on unmount.
 *
 * iOS Chrome note: Web Audio can only be unlocked from inside a native DOM
 * gesture event (touchstart / click).  Phaser processes its own pointer events
 * during requestAnimationFrame — which is OUTSIDE the trusted gesture window on
 * iOS.  We therefore attach a native touchstart listener here, before Phaser
 * ever sees the touch, so AudioContext.resume() is called from a real gesture.
 */

import { useEffect, useRef } from "react";
import { createPhaserGame } from "../game/PhaserGame";
import { MusicPlayer } from "../game/MusicPlayer";
import { audioManager } from "../game/AudioManager";
import type Phaser from "phaser";

export default function Game() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    gameRef.current = createPhaserGame(containerRef.current);

    // ── iOS Chrome audio unlock ──────────────────────────────────────────────
    // Fire on every touch so re-suspension (app-switch) is also handled.
    const unlockAudio = () => {
      MusicPlayer.getInstance().unlock();
      audioManager.unlock();
    };

    // Attach to the container AND document so the first touch anywhere works.
    const container = containerRef.current;
    container.addEventListener("touchstart", unlockAudio, { passive: true });
    container.addEventListener("click",      unlockAudio, { passive: true });
    document.addEventListener("touchstart",  unlockAudio, { passive: true });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      container.removeEventListener("touchstart", unlockAudio);
      container.removeEventListener("click",      unlockAudio);
      document.removeEventListener("touchstart",  unlockAudio);
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        overflow: "hidden",
        background: "#1a1a2e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
