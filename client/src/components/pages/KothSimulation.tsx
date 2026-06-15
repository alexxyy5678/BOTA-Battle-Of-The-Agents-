import React, { useEffect, useState, useRef } from 'react';
import { arenaAgentAvatar } from '@/lib/arenaAgentAvatars';

export type AgentData = {
  id: string;
  name: string;
  avatarUrl: string;
};

interface KothSimulationProps {
  agents: AgentData[];
}

type AgentState = AgentData & {
  x: number;
  y: number;
  health: number;
  isDead: boolean;
  action: 'idle' | 'moving' | 'shooting';
  targetX?: number;
  targetY?: number;
};

type Bullet = {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  createdAt: number;
};

type Explosion = {
  id: string;
  x: number;
  y: number;
  createdAt: number;
};

export default function KothSimulation({ agents }: KothSimulationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<{
    agents: AgentState[];
    bullets: Bullet[];
    explosions: Explosion[];
  }>({
    agents: agents.map((a, i) => ({
      ...a,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      health: 100,
      isDead: false,
      action: 'idle',
    })),
    bullets: [],
    explosions: [],
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const interval = setInterval(() => {
      setGameState((prev) => {
        let newBullets = [...prev.bullets];
        let newExplosions = [...prev.explosions];
        let newAgents = [...prev.agents];

        // Process bullets and explosions
        const now = Date.now();
        newBullets = newBullets.filter((b) => now - b.createdAt < 600);
        newExplosions = newExplosions.filter((e) => now - e.createdAt < 800);

        // Process agents
        newAgents = newAgents.map((agent) => {
          if (agent.isDead) return agent;

          // 10% chance to take damage randomly to simulate being hit
          let newHealth = agent.health;
          if (Math.random() < 0.15) {
            newHealth -= Math.floor(Math.random() * 15) + 5;
            if (newHealth <= 0) {
              newExplosions.push({
                id: `exp_${Date.now()}_${agent.id}`,
                x: agent.x,
                y: agent.y,
                createdAt: now,
              });
              return { ...agent, health: 0, isDead: true, action: 'idle' };
            }
          }

          // Decide action
          const r = Math.random();
          if (r < 0.3) {
            // Shoot
            const aliveTargets = newAgents.filter((a) => !a.isDead && a.id !== agent.id);
            if (aliveTargets.length > 0) {
              const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
              newBullets.push({
                id: `bullet_${now}_${agent.id}`,
                startX: agent.x,
                startY: agent.y,
                endX: target.x,
                endY: target.y,
                createdAt: now,
              });
              return { ...agent, health: newHealth, action: 'shooting' };
            }
          } else if (r < 0.8) {
            // Move
            return {
              ...agent,
              health: newHealth,
              action: 'moving',
              x: Math.max(5, Math.min(95, agent.x + (Math.random() * 20 - 10))),
              y: Math.max(5, Math.min(95, agent.y + (Math.random() * 20 - 10))),
            };
          }

          // Idle
          return { ...agent, health: newHealth, action: 'idle' };
        });

        return { agents: newAgents, bullets: newBullets, explosions: newExplosions };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
      {/* Draw Agents */}
      {gameState.agents.map((agent) => {
        if (agent.isDead) return null;

        return (
          <div
            key={agent.id}
            className="absolute transition-all duration-1000 ease-linear flex flex-col items-center justify-center pointer-events-auto"
            style={{
              left: `${agent.x}%`,
              top: `${agent.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Overhead Healthbar */}
            <div className="w-12 h-1.5 bg-black/60 rounded-full mb-1 overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${agent.health}%`,
                  backgroundColor: agent.health > 60 ? '#a9ff26' : agent.health > 30 ? '#ffd33d' : '#ff3f37',
                }}
              />
            </div>
            
            {/* Agent Avatar */}
            <div className="relative w-16 h-16 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-contain" />
              {agent.action === 'shooting' && (
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full blur-md" />
              )}
            </div>
            
            <span className="mt-1 text-[10px] font-black text-white px-1.5 py-0.5 bg-black/50 rounded drop-shadow-md">
              {agent.name}
            </span>
          </div>
        );
      })}

      {/* Draw Bullets */}
      {gameState.bullets.map((bullet) => {
        // Calculate angle
        const dx = bullet.endX - bullet.startX;
        const dy = bullet.endY - bullet.startY;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
          <div
            key={bullet.id}
            className="absolute w-8 h-8 pointer-events-none origin-center"
            style={{
              transform: `translate(-50%, -50%) rotate(${angle}deg)`,
              animation: `bulletFly_${bullet.id} 0.4s linear forwards`,
            }}
          >
            <style>{`
              @keyframes bulletFly_${bullet.id} {
                0% { left: ${bullet.startX}%; top: ${bullet.startY}%; }
                100% { left: ${bullet.endX}%; top: ${bullet.endY}%; }
              }
            `}</style>
            <img src="/2dgame/gui/assets_bullet/500 Bullet 24x24 Free/Part 1 Free.gif" alt="bullet" className="w-full h-full object-contain drop-shadow-[0_0_8px_#ffcc00]" />
          </div>
        );
      })}

      {/* Draw Explosions */}
      {gameState.explosions.map((explosion) => (
        <div
          key={explosion.id}
          className="absolute w-24 h-24 pointer-events-none"
          style={{
            left: `${explosion.x}%`,
            top: `${explosion.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Fallback styling for explosion using the bullet explosion gif */}
          <img src="/2dgame/gui/assets_slash/48x48 Shader Slash/Free/1.png" alt="explosion" className="w-full h-full object-contain animate-ping" />
        </div>
      ))}
    </div>
  );
}
