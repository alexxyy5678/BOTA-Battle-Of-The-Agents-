export type ArenaSide = "left" | "right";

export type FighterClass = "striker" | "tank" | "frost" | "trickster" | "blaster";

export interface FighterStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  crit: number;
  range: number;
  cooldown: number;
}

export interface NftFighter {
  id: string;
  name: string;
  collection: string;
  image: string;
  className: FighterClass;
  traits: string[];
  stats: FighterStats;
}

export type BattleEvent =
  | {
      kind: "spawn";
      t: number;
      side: ArenaSide;
      hp: number;
      x: number;
      y: number;
    }
  | {
      kind: "move";
      t: number;
      side: ArenaSide;
      x: number;
      y: number;
      facing: ArenaSide;
    }
  | {
      kind: "attack";
      t: number;
      side: ArenaSide;
      target: ArenaSide;
      damage: number;
      crit: boolean;
      ability?: string;
    }
  | {
      kind: "damage";
      t: number;
      side: ArenaSide;
      amount: number;
      hp: number;
      crit: boolean;
      blocked: number;
    }
  | {
      kind: "ability";
      t: number;
      side: ArenaSide;
      ability: string;
      target?: ArenaSide;
    }
  | {
      kind: "shield";
      t: number;
      side: ArenaSide;
      amount: number;
      shield: number;
    }
  | {
      kind: "ko";
      t: number;
      side: ArenaSide;
      by: ArenaSide;
    }
  | {
      kind: "battle-end";
      t: number;
      winner: ArenaSide;
      reason: "ko" | "timeout";
    };

export interface BattleResult {
  id: string;
  seed: string;
  auditHash: string;
  left: NftFighter;
  right: NftFighter;
  events: BattleEvent[];
  winner: ArenaSide;
  reason: "ko" | "timeout";
  durationMs: number;
  finalHp: Record<ArenaSide, number>;
}

export interface PredictionLedger {
  left: number;
  right: number;
}
