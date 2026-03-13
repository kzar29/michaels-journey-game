/**
 * Game.tsx
 * --------
 * React component that hosts the Phaser canvas.
 * Manages the game lifecycle: creates the game on mount, destroys it on unmount.
 */

import { useEffect, useRef } from "react";
import { createPhaserGame } from "../game/PhaserGame";
import type Phaser from "phaser";

export default function Game() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // Mount the Phaser game into our container div
    gameRef.current = createPhaserGame(containerRef.current);

    // Cleanup: destroy the game when the component unmounts
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",   // dynamic viewport height (handles mobile browser chrome)
        overflow: "hidden",
        background: "#1a1a2e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Phaser mounts its canvas here */}
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
