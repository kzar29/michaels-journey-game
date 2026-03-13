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

    // ── Audio unlock ─────────────────────────────────────────────────────────
    // Chrome/iOS block AudioContext until a real user gesture.
    //
    // Critical ordering issue:
    //   For mouse clicks:  pointerdown fires → Phaser processes it (tries to
    //   start music) → click fires.  If we only listen to "click", the context
    //   is still suspended when Phaser runs.
    //
    // Fix: register on the CAPTURE phase of "pointerdown" and "touchstart".
    // Capture fires BEFORE any bubble-phase handler (including Phaser's own
    // input listener), so the context is always running by the time Phaser
    // tries to play a note.
    //
    // We also start the menu theme here — the user hears music the instant
    // they touch/click anything on the page, not only after pressing START.
    const unlockAudio = () => {
      MusicPlayer.getInstance().unlock();
      audioManager.unlock();
      // Start menu music on the very first interaction if nothing is playing.
      if (!MusicPlayer.getInstance().playing) {
        MusicPlayer.getInstance().start("doctor");
      }
    };

    // capture:true  → fires before any bubbling listener, including Phaser's
    // passive:true  → never calls preventDefault, preserves scroll behaviour
    document.addEventListener("pointerdown", unlockAudio, { capture: true, passive: true });
    document.addEventListener("touchstart",  unlockAudio, { capture: true, passive: true });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      document.removeEventListener("pointerdown", unlockAudio, { capture: true });
      document.removeEventListener("touchstart",  unlockAudio, { capture: true });
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
