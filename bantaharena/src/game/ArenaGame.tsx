import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { BattleScene } from "./scenes/BattleScene";

export function ArenaGame() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) {
      return;
    }

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      backgroundColor: "#090b10",
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
          fixedStep: true,
          fps: 60,
          debug: false
        }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 960,
        height: 540
      },
      scene: [BattleScene],
      render: {
        antialias: true,
        pixelArt: false
      }
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div className="arena-canvas" ref={hostRef} />;
}
