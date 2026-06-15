import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GridEngine } from 'grid-engine';
import KothScene from '../../game/scenes/KothScene';

interface AgentData {
  id: string;
  name: string;
  avatarUrl: string;
}

interface Props {
  agents: AgentData[];
}

export default function KothPhaserEngine({ agents }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: '100%',
      height: '100%',
      parent: containerRef.current,
      transparent: true, // we can keep the React background or use Phaser background
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0, x: 0 },
        },
      },
      plugins: {
        scene: [
          {
            key: 'gridEngine',
            plugin: GridEngine,
            mapping: 'gridEngine',
          },
        ],
      },
      scene: [KothScene],
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // Sync agents via CustomEvent bridge
  useEffect(() => {
    // We delay the sync slightly to ensure the scene has booted
    const timer = setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('update-koth-agents', { detail: agents })
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [agents]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 z-0 w-full h-full pointer-events-none"
      style={{ overflow: 'hidden' }}
    />
  );
}
