'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWallets } from '@privy-io/react-auth';
import {
  ChevronRight,
  Copy,
  Flame,
  Share2,
  Swords,
  Timer,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { arenaAgentAvatar } from '@/lib/arenaAgentAvatars';
import { getBattleTimeRemainingSeconds } from '@/lib/bantahbro/battleTiming';
import {
  executeOnchainEscrowStakeTx,
  type OnchainRuntimeConfig,
  type OnchainTokenSymbol,
} from '@/lib/onchainEscrow';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getFarcasterShareUrl, getTwitterShareUrl, shareBotaChallenge } from '@/utils/sharing';
import type { AppSection } from '@/app/page';
import { MessageSquare, Twitter, Globe2 } from 'lucide-react';
import type { AgentBattle, AgentBattleFeed, AgentBattleSide } from '@/types/agentBattle';
import type {
  AgentBattleP2PPool,
  AgentBattleP2PHistoryPosition,
  AgentBattleP2PStakeResponse,
} from '@shared/agentBattleP2P';
import type {
  BotaAgentChallengePredictionPool,
  BotaAgentChallengePredictionPosition,
  BotaAgentChallengePredictionStakeResponse,
} from '@shared/botaAgentChallengePrediction';
import type { BotaArenaBattleRecord } from '@shared/botaArenaBattleRecord';

type ChallengeTab = 'callouts' | 'live' | 'mine';
type ChallengeFilter =
  | 'all'
  | 'agent-battles'
  | 'callouts'
  | 'high-stakes'
  | 'ending-soon'
  | 'live'
  | 'ended'
  | 'winners'
  | 'losers';

interface ChallengePageProps {
  onNavigate?: (section: AppSection) => void;
  onOpenBattle?: (battleId: string) => void;
}

const OPEN_BATTLE_SNAPSHOT_STORAGE_KEY = 'bantahbro:arena-open-battle-snapshot';

function storeOpenBattleSnapshot(battle: AgentBattle) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      OPEN_BATTLE_SNAPSHOT_STORAGE_KEY,
      JSON.stringify({
        battleId: battle.id,
        battle,
        createdAt: Date.now(),
      }),
    );
  } catch {
    // Private/mobile storage can fail; the URL battle id still drives navigation.
  }
}

type BantCreditStatsResponse = {
  token: 'BantCredit';
  lifetimeEarned: number;
  currentAggregate: number;
  currentUserPoints: number;
  currentAgentPoints: number;
  onchainMintedBantCredits?: number;
  onchainClaimableBantCredits?: number;
  onchainClaimableCount?: number;
  earnedFromTransactions: number;
  userCount: number;
  agentCount: number;
  rewardTransactionCount: number;
  basis: string;
  updatedAt: string;
};

type AgentPvpChallenge = {
  id: string;
  challengeCode: string;
  status: 'pending' | 'accepted' | 'scheduled' | 'live' | 'resolved' | 'expired' | 'cancelled';
  matchType: 'arena' | 'degen_vs';
  visibility: 'public' | 'private';
  predictionEnabled: boolean;
  stakeAmount: number;
  stakeCurrency: string;
  message: string | null;
  challengerAgent: {
    id: string;
    name: string;
    avatarUrl: string | null;
    rank: number | null;
    league: string;
    record: string;
    title: string;
    tokenSymbol: string | null;
  };
  opponentAgent: {
    id: string;
    name: string;
    avatarUrl: string | null;
    rank: number | null;
    league: string;
    record: string;
    title: string;
    tokenSymbol: string | null;
  };
  expiresAt: string;
  scheduledAt: string | null;
  viewerRole: 'challenger' | 'opponent' | 'spectator';
  challengeUrl: string;
  shareCaption: string;
  source?: 'web' | 'telegram' | 'twitter';
};

type AgentPvpChallengeFeed = {
  challenges: AgentPvpChallenge[];
  updatedAt: string;
};

type AgentBattleP2PHistoryFeed = {
  positions: AgentBattleP2PHistoryPosition[];
  updatedAt: string;
};

type BotaAgentChallengePredictionPositionsFeed = {
  positions: BotaAgentChallengePredictionPosition[];
  updatedAt: string;
};

type ArenaBattleRecordsFeed = {
  records: BotaArenaBattleRecord[];
  updatedAt: string;
};

type ChallengeBetSelection = {
  battle: AgentBattle;
  side: AgentBattleSide;
  pick: 'YES' | 'NO';
} | null;

type AgentPvpPredictionSelection = {
  challenge: AgentPvpChallenge;
  pick: 'YES' | 'NO';
} | null;

const tabs: Array<{ id: ChallengeTab; label: string }> = [
  { id: 'live', label: 'Live Battles' },
  { id: 'callouts', label: 'Pending Challenges' },
  { id: 'mine', label: 'My Challenges' },
];

const filters: Array<{ id: ChallengeFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'agent-battles', label: 'Agent Battles' },
  { id: 'callouts', label: 'Call-Outs' },
  { id: 'high-stakes', label: 'High Stakes' },
  { id: 'ending-soon', label: 'Ending Soon' },
  { id: 'live', label: 'Live' },
  { id: 'ended', label: 'Ended' },
  { id: 'winners', label: 'Winners' },
  { id: 'losers', label: 'Losers' },
];

function formatCompactNumber(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN)) return '0';
  return new Intl.NumberFormat('en', {
    notation: Number(value) >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: Number(value) >= 10000 ? 1 : 0,
  }).format(Number(value));
}

function formatUsd(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN) || Number(value) <= 0) return '$0';
  return `$${new Intl.NumberFormat('en', {
    notation: Number(value) >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: Number(value) >= 10000 ? 1 : 0,
  }).format(Number(value))}`;
}

function formatSignedPercent(value: number | null | undefined) {
  if (!Number.isFinite(value ?? NaN)) return '0%';
  const numeric = Number(value);
  return `${numeric > 0 ? '+' : ''}${numeric.toLocaleString(undefined, { maximumFractionDigits: Math.abs(numeric) >= 10 ? 0 : 1 })}%`;
}

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function getWalletAddress(wallets: unknown[]) {
  const firstWallet = wallets.find((wallet) => typeof (wallet as { address?: unknown })?.address === 'string') as
    | { address?: string }
    | undefined;
  return firstWallet?.address || '';
}

function shortAddress(address: string) {
  if (!address) return 'No wallet';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function secondsUntil(value: string | null | undefined) {
  if (!value) return 0;
  return Math.max(0, Math.floor((new Date(value).getTime() - Date.now()) / 1000));
}

function battleTimeRemaining(battle: AgentBattle, nowMs = Date.now()) {
  return getBattleTimeRemainingSeconds(battle.endsAt, battle.timeRemainingSeconds, nowMs);
}

function battleVolume(battle: AgentBattle) {
  return battle.sides.reduce((total, side) => total + Number(side.volumeH24 || 0), 0);
}

function battleLiquidity(battle: AgentBattle) {
  return battle.sides.reduce((total, side) => total + Number(side.liquidityUsd || 0), 0);
}

function leadingSide(battle: AgentBattle) {
  return battle.sides.find((side) => side.id === battle.leadingSideId) || battle.sides[0];
}

function trailingSide(battle: AgentBattle) {
  const leader = leadingSide(battle);
  return battle.sides.find((side) => side.id !== leader.id) || battle.sides[1] || leader;
}

function sideImage(side: AgentBattleSide, className: string) {
  const avatarClassName = className
    .replace(/\bobject-contain\b/g, 'object-cover')
    .replace(/\bp-0\.5\b/g, 'p-0')
    .replace(/\bbg-muted\b/g, 'bg-muted/30');

  return (
    <img
      src={arenaAgentAvatar(`${side.agentName}:${side.id}`)}
      alt={`${side.agentName || side.label} avatar`}
      className={avatarClassName}
      loading="lazy"
    />
  );
}

function challengeQuestion(battle: AgentBattle) {
  const leader = leadingSide(battle);
  return `Will ${leader.agentName} hold the lead?`;
}

function matchesFilter(battle: AgentBattle, filter: ChallengeFilter, nowMs = Date.now()) {
  if (filter === 'all' || filter === 'agent-battles') return true;
  if (filter === 'live') return battle.status === 'live';
  if (filter === 'ending-soon') return battleTimeRemaining(battle, nowMs) <= 120;
  if (filter === 'high-stakes') return battleVolume(battle) >= 500000;
  return false;
}

function isResultFilter(filter: ChallengeFilter) {
  return filter === 'ended' || filter === 'winners' || filter === 'losers';
}

function isEndedP2PPosition(position: AgentBattleP2PHistoryPosition) {
  return ['won', 'lost', 'unmatched', 'cancelled', 'failed'].includes(position.resultStatus);
}

function isEndedPvpPosition(position: BotaAgentChallengePredictionPosition) {
  return Boolean(position.winnerSide) || ['settled', 'cancelled', 'failed'].includes(position.escrowStatus);
}

function matchesMyP2PFilter(position: AgentBattleP2PHistoryPosition, filter: ChallengeFilter) {
  if (filter === 'winners') return position.resultStatus === 'won';
  if (filter === 'losers') return position.resultStatus === 'lost';
  if (filter === 'ended') return isEndedP2PPosition(position);
  if (filter === 'live') return position.resultStatus === 'live';
  if (filter === 'high-stakes') return Number(position.stakeAmount || 0) >= 100;
  if (filter === 'ending-soon') return !isEndedP2PPosition(position) && secondsUntil(position.roundEndsAt) <= 6 * 60 * 60;
  if (filter === 'callouts') return false;
  return true;
}

function matchesMyPvpPredictionFilter(position: BotaAgentChallengePredictionPosition, filter: ChallengeFilter) {
  const resolved = Boolean(position.winnerSide);
  if (filter === 'winners') return resolved && position.winnerSide === position.side;
  if (filter === 'losers') return resolved && position.winnerSide !== position.side;
  if (filter === 'ended') return isEndedPvpPosition(position);
  if (filter === 'live') return !isEndedPvpPosition(position);
  if (filter === 'high-stakes') return Number(position.stakeAmount || 0) >= 100;
  if (filter === 'agent-battles') return false;
  return true;
}

function isEndedPvpChallenge(challenge: AgentPvpChallenge) {
  return ['resolved', 'expired', 'cancelled'].includes(challenge.status);
}

function matchesPvpChallengeFilter(challenge: AgentPvpChallenge, filter: ChallengeFilter) {
  if (filter === 'winners' || filter === 'losers') return false;
  if (filter === 'ended') return isEndedPvpChallenge(challenge);
  if (filter === 'live') return ['accepted', 'scheduled', 'live'].includes(challenge.status);
  if (filter === 'high-stakes') return challenge.stakeAmount >= 100;
  if (filter === 'ending-soon') return challenge.status === 'pending' && secondsUntil(challenge.expiresAt) <= 6 * 60 * 60;
  return filter === 'all' || filter === 'callouts' || filter === 'agent-battles';
}

function EmptyState({ tab, filter = 'all' }: { tab: ChallengeTab; filter?: ChallengeFilter }) {
  const copy =
    filter === 'ended'
      ? 'Ended battles will appear here after Arena records or resolved call-outs are stored.'
      : filter === 'winners'
        ? 'Winning slips and recorded Arena winners will appear here after results settle.'
        : filter === 'losers'
          ? 'Losing slips and recorded Arena losers will appear here after results settle.'
          : tab === 'callouts'
      ? 'No direct call-outs are loaded yet.'
      : tab === 'friends'
        ? 'Friend challenges will appear here.'
        : tab === 'mine'
          ? 'Your challenge slips will appear here after you join.'
          : 'No live challenge cards are available right now.';

  return (
    <div className="rounded border border-dashed border-border bg-card p-6 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary">
        <Swords size={18} />
      </div>
      <div className="text-sm font-black text-foreground">No cards yet</div>
      <div className="mt-1 text-xs text-muted-foreground">{copy}</div>
    </div>
  );
}

function MyJoinedBattleCard({ position }: { position: AgentBattleP2PHistoryPosition }) {
  const tone =
    position.resultStatus === 'won'
      ? 'border-green-500/30 bg-green-500/10 text-green-500'
      : position.resultStatus === 'lost'
        ? 'border-red-500/30 bg-red-500/10 text-red-500'
        : position.resultStatus === 'live'
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground';
  const statusLabel = position.resultStatus.replace(/_/g, ' ');
  return (
    <article className="rounded border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded border px-2 py-1 text-[10px] font-black uppercase ${tone}`}>
          {statusLabel}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground">
          {formatCountdown(secondsUntil(position.roundEndsAt))} left
        </span>
      </div>
      <div className="mt-2 truncate text-sm font-black text-foreground">{position.battleTitle}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">
        Picked {position.sideLabel}
        {position.opponentSideLabel ? ` vs ${position.opponentSideLabel}` : ''}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1 text-[10px]">
        <MiniMetric label="Stake" value={`${formatCompactNumber(position.stakeAmount)} ${position.stakeCurrency}`} compact />
        <MiniMetric label="Escrow" value={position.escrowStatus.replace(/_/g, ' ')} compact />
        <MiniMetric
          label="Earned"
          value={position.earnedAmount === null ? '-' : `${formatCompactNumber(position.earnedAmount)} ${position.stakeCurrency}`}
          compact
        />
      </div>
    </article>
  );
}

function MyPvpPredictionCard({ position }: { position: BotaAgentChallengePredictionPosition }) {
  const resolved = Boolean(position.winnerSide);
  const didWin = resolved ? position.winnerSide === position.side : null;
  const tone =
    didWin === true
      ? 'border-green-500/30 bg-green-500/10 text-green-500'
      : didWin === false
        ? 'border-red-500/30 bg-red-500/10 text-red-500'
        : position.escrowStatus === 'escrow_locked'
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground';
  const statusLabel =
    didWin === true ? 'won' : didWin === false ? 'lost' : position.escrowStatus.replace(/_/g, ' ');

  return (
    <article className="rounded border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded border px-2 py-1 text-[10px] font-black uppercase ${tone}`}>
          PvP {statusLabel}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground">{position.side}</span>
      </div>
      <div className="mt-2 truncate text-sm font-black text-foreground">{position.sideAgentName}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">Challenge {position.challengeCode}</div>
      <div className="mt-3 grid grid-cols-3 gap-1 text-[10px]">
        <MiniMetric label="Stake" value={`${formatCompactNumber(position.stakeAmount)} ${position.stakeCurrency}`} compact />
        <MiniMetric label="Escrow" value={position.escrowStatus.replace(/_/g, ' ')} compact />
        <MiniMetric
          label="Payout"
          value={position.payoutAmount === null ? '-' : `${formatCompactNumber(position.payoutAmount)} ${position.stakeCurrency}`}
          compact
        />
      </div>
    </article>
  );
}

type ArenaRecordSideView = {
  id: string;
  name: string;
  label: string;
  imageUrl: string | null;
  confidence: number | null;
  health: number | null;
  maxHealth: number | null;
};

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringFrom(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function numberFrom(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function recordArray(value: unknown) {
  return Array.isArray(value) ? value.map(objectValue).filter((item) => Object.keys(item).length > 0) : [];
}

function recordMetadataName(record: BotaArenaBattleRecord, kind: 'winner' | 'loser') {
  const metadata = objectValue(record.metadata);
  return stringFrom(metadata, kind === 'winner' ? ['winnerName', 'winner'] : ['loserName', 'loser']);
}

function recordSideView(record: BotaArenaBattleRecord, kind: 'winner' | 'loser'): ArenaRecordSideView {
  const sideId = kind === 'winner' ? record.winnerSideId : record.loserSideId;
  const agentId = kind === 'winner' ? record.winnerAgentId : record.loserAgentId;
  const wantedIds = new Set([sideId, agentId].filter(Boolean).map((value) => String(value).toLowerCase()));
  const snapshot = objectValue(record.battleSnapshot);
  const snapshotSide =
    recordArray(snapshot.sides).find((side) =>
      [side.id, side.agentId, side.sourceAgentId].some((value) => wantedIds.has(String(value || '').toLowerCase())),
    ) || {};
  const fighter =
    recordArray(record.fighters).find((side) =>
      [side.id, side.agentId, side.sourceAgentId, side.sideId].some((value) => wantedIds.has(String(value || '').toLowerCase())),
    ) || {};

  const name =
    recordMetadataName(record, kind) ||
    stringFrom(snapshotSide, ['agentName', 'name', 'label']) ||
    stringFrom(fighter, ['name', 'agentName', 'label']) ||
    String(sideId || agentId || (kind === 'winner' ? 'Winner' : 'Loser'));
  const label =
    stringFrom(snapshotSide, ['label', 'tokenSymbol', 'sourcePlatform']) ||
    stringFrom(fighter, ['teamLabel', 'label', 'archetype']) ||
    (kind === 'winner' ? 'Winner' : 'Loser');
  const imageUrl =
    stringFrom(snapshotSide, ['avatarUrl', 'imageUrl', 'coverImageUrl', 'logoUrl', 'profileImageUrl']) ||
    stringFrom(fighter, ['avatarUrl', 'imageUrl', 'coverImageUrl', 'logoUrl', 'profileImageUrl']) ||
    null;

  return {
    id: String(sideId || agentId || name),
    name,
    label,
    imageUrl,
    confidence: numberFrom(snapshotSide, ['confidence', 'score']) ?? numberFrom(fighter, ['confidence', 'score']),
    health: numberFrom(fighter, ['health']),
    maxHealth: numberFrom(fighter, ['maxHealth']),
  };
}

function resultAvatar(side: ArenaRecordSideView, tone: 'winner' | 'loser') {
  if (side.imageUrl) {
    return (
      <img
        src={side.imageUrl}
        alt={`${side.name} avatar`}
        className="h-10 w-10 rounded border border-border bg-muted object-cover"
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded border text-xs font-black ${
        tone === 'winner'
          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-500'
          : 'border-rose-500/40 bg-rose-500/15 text-rose-500'
      }`}
    >
      {side.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function ResultSideBlock({
  side,
  tone,
  label,
}: {
  side: ArenaRecordSideView;
  tone: 'winner' | 'loser';
  label: string;
}) {
  const healthText =
    side.health !== null && side.maxHealth !== null
      ? `${formatCompactNumber(side.health)}/${formatCompactNumber(side.maxHealth)} HP`
      : side.confidence !== null
        ? `${formatCompactNumber(side.confidence)} confidence`
        : side.label;

  return (
    <div className="min-w-0 rounded border border-border bg-background p-2">
      <div className="flex items-center gap-2">
        {resultAvatar(side, tone)}
        <div className="min-w-0">
          <div
            className={`text-[9px] font-black uppercase ${
              tone === 'winner' ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {label}
          </div>
          <div className="truncate text-sm font-black text-foreground">{side.name}</div>
          <div className="truncate text-[10px] font-bold text-muted-foreground">{side.label}</div>
        </div>
      </div>
      <div className="mt-2 truncate rounded bg-muted/40 px-2 py-1 text-[10px] font-bold text-muted-foreground">
        {healthText}
      </div>
    </div>
  );
}

function ArenaResultCard({
  record,
  filter,
}: {
  record: BotaArenaBattleRecord;
  filter: ChallengeFilter;
}) {
  const winner = recordSideView(record, 'winner');
  const loser = recordSideView(record, 'loser');
  const primary = filter === 'losers' ? loser : winner;
  const secondary = filter === 'losers' ? winner : loser;
  const primaryTone = filter === 'losers' ? 'loser' : 'winner';
  const secondaryTone = filter === 'losers' ? 'winner' : 'loser';
  const resolvedAt = record.resolvedAt || record.endedAt || record.updatedAt || record.createdAt;

  return (
    <article className="rounded border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded bg-primary/10 px-2 py-1 text-[10px] font-black uppercase text-primary">
          Ended Battle
        </span>
        {record.metadata && (record.metadata as any).soulDrainAmount && (
          <span className="rounded bg-purple-500/10 px-2 py-1 text-[10px] font-black uppercase text-purple-500 flex items-center gap-1">
            Soul Drain <span className="font-bold">{(record.metadata as any).soulDrainAmount} BC</span>
          </span>
        )}
        <span className="text-[10px] font-bold text-muted-foreground ml-auto">
          {resolvedAt ? new Date(resolvedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recorded'}
        </span>
      </div>
      <div className="mt-2 truncate text-sm font-black text-foreground">{record.title}</div>
      <div className="mt-1 truncate text-[11px] font-bold text-muted-foreground">
        {record.status === 'draw' ? 'Draw result' : `${winner.name} defeated ${loser.name}`}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <ResultSideBlock side={primary} tone={primaryTone} label={primaryTone === 'winner' ? 'Winner' : 'Loser'} />
        <div className="hidden rounded bg-background px-2 py-1 text-[10px] font-black text-primary sm:block">VS</div>
        <ResultSideBlock side={secondary} tone={secondaryTone} label={secondaryTone === 'winner' ? 'Winner' : 'Loser'} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1 text-[10px]">
        <MiniMetric label="Rounds" value={formatCompactNumber(record.rounds)} compact />
        <MiniMetric label="Spectators" value={formatCompactNumber(record.spectators)} compact />
        <MiniMetric label="Rail" value={record.provider.replace(/-/g, ' ')} compact />
      </div>
      
      {/* V2 Battle Logs Indicator */}
      {record.metadata && (record.metadata as any).toolsFired && (record.metadata as any).toolsFired.length > 0 && (
        <div className="mt-3 rounded border border-border bg-background p-2">
          <div className="text-[9px] font-black uppercase text-muted-foreground mb-1 flex items-center justify-between">
            <span>Combat Tools Fired</span>
            <span className="text-primary">V2 Mechanics</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(record.metadata as any).toolsFired.slice(0, 3).map((tool: any, idx: number) => (
              <span key={idx} className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold text-foreground">
                {tool.name || tool}
              </span>
            ))}
            {(record.metadata as any).toolsFired.length > 3 && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                +{(record.metadata as any).toolsFired.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          window.location.href = `/bota?section=battles&record=${encodeURIComponent(record.id)}`;
        }}
        className="mt-3 w-full rounded bg-primary px-3 py-2 text-[10px] font-black uppercase text-primary-foreground transition hover:opacity-90"
      >
        View Record
      </button>
    </article>
  );
}

function FeaturedChallenge({
  battle,
  onOpenBattle,
}: {
  battle: AgentBattle | null;
  onOpenBattle?: (battleId: string) => void;
}) {
  if (!battle) {
    return (
      <div className="rounded border border-border bg-card p-4">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const left = battle.sides[0];
  const right = battle.sides[1];
  const leader = leadingSide(battle);

  return (
    <section className="overflow-hidden rounded border border-primary/30 bg-card">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_15rem]">
        <button
          type="button"
          onClick={() => onOpenBattle?.(battle.id)}
          className="group min-w-0 p-2 text-left transition hover:bg-primary/5 sm:p-3"
        >
          <div className="mb-1.5 flex items-center gap-2 sm:mb-2">
            <span className="inline-flex items-center gap-1 rounded bg-destructive px-1.5 py-0.5 text-[9px] font-black uppercase text-white sm:px-2 sm:py-1 sm:text-[10px]">
              <Flame size={10} className="sm:h-3 sm:w-3" /> Trending Challenge
            </span>
            <span className="text-[10px] font-bold text-muted-foreground sm:text-xs">{formatCountdown(battleTimeRemaining(battle))} left</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2">
            <AgentPosterLite side={left} align="left" />
            <div className="rounded border border-border bg-background px-2 py-1 text-xs font-black text-primary sm:px-3 sm:text-sm">VS</div>
            <AgentPosterLite side={right} align="right" />
          </div>
          <div className="mt-1 truncate text-[11px] font-black text-foreground sm:mt-2 sm:text-sm">{challengeQuestion(battle)}</div>
          <div className="mt-0.5 hidden text-[11px] text-muted-foreground sm:line-clamp-1 sm:text-xs">
            {leader.agentName} leads {leader.confidence}% with {formatUsd(battleVolume(battle))} in live volume.
          </div>
        </button>
        <div className="border-t border-border bg-muted/20 p-1 sm:p-2 lg:border-l lg:border-t-0 lg:p-3">
          <div className="flex items-center gap-1.5 sm:block">
            <div className="grid min-w-0 flex-1 grid-cols-3 gap-1 text-[9px] font-black text-foreground sm:hidden">
              <span className="truncate rounded border border-border bg-background px-1.5 py-1">{formatUsd(battleVolume(battle))}</span>
              <span className="truncate rounded border border-border bg-background px-1.5 py-1">{formatCompactNumber(battle.spectators)}</span>
              <span className="truncate rounded border border-border bg-background px-1.5 py-1">{battle.confidenceSpread}% gap</span>
            </div>
            <div className="hidden grid-cols-4 gap-1 text-xs sm:grid lg:grid-cols-2 lg:gap-2">
              <MiniMetric label="Volume" value={formatUsd(battleVolume(battle))} compact />
              <MiniMetric label="Participants" value={formatCompactNumber(battle.spectators)} compact />
              <MiniMetric label="Liquidity" value={formatUsd(battleLiquidity(battle))} compact />
              <MiniMetric label="Gap" value={`${battle.confidenceSpread}%`} compact />
            </div>
            <button
              type="button"
              onClick={() => onOpenBattle?.(battle.id)}
              className="flex shrink-0 items-center justify-center gap-1 rounded bg-primary px-2 py-1 text-[9px] font-black text-primary-foreground transition hover:opacity-90 sm:mt-2 sm:w-full sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs"
            >
              <span className="sm:hidden">View</span>
              <span className="hidden sm:inline">View Challenge</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function AgentPosterLite({ side, align }: { side: AgentBattleSide; align: 'left' | 'right' }) {
  return (
    <div className={`flex min-w-0 items-center gap-1.5 sm:block ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <div className={`flex shrink-0 ${align === 'right' ? 'justify-end' : 'justify-start'} sm:mb-1.5`}>
        {sideImage(side, 'h-6 w-6 rounded border border-border bg-muted object-cover sm:h-12 sm:w-12 lg:h-14 lg:w-14')}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[11px] font-black text-foreground sm:text-sm">{side.agentName}</div>
        <div className="hidden truncate text-[10px] font-bold text-primary sm:block sm:text-xs">{side.label}</div>
        <div className="mt-0.5 hidden truncate text-[9px] text-muted-foreground sm:block sm:text-[10px]">
          Rank #{Math.max(1, Math.round(100 - side.score / 2))} | {formatSignedPercent(side.priceChangeH24)}
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded border border-border bg-background ${compact ? 'p-1.5' : 'p-2'}`}>
      <div className={`${compact ? 'text-[8px]' : 'text-[10px]'} truncate font-bold uppercase tracking-wide text-muted-foreground`}>{label}</div>
      <div className={`${compact ? 'mt-0.5 text-[11px]' : 'mt-1 text-sm'} truncate font-black text-foreground`}>{value}</div>
    </div>
  );
}

function AgentCalloutCard({
  challenge,
  onAccept,
  onPickPrediction,
  isAccepting = false,
}: {
  challenge: AgentPvpChallenge;
  onAccept?: (challengeCode: string) => void;
  onPickPrediction?: (challenge: AgentPvpChallenge, pick: 'YES' | 'NO') => void;
  isAccepting?: boolean;
}) {
  const isPending = challenge.status === 'pending';
  const secondsToScheduled = secondsUntil(challenge.scheduledAt);
  const countdown = isPending ? formatCountdown(secondsUntil(challenge.expiresAt)) : formatCountdown(secondsToScheduled);
  const isMatchStarted = challenge.status === 'scheduled' && secondsToScheduled <= 0;
  const statusLabel = isPending ? 'Pending Acceptance' : isMatchStarted ? 'Live in Arena' : challenge.status === 'scheduled' ? 'Fight Scheduled' : challenge.status;
  const canAccept = isPending && challenge.viewerRole !== 'challenger';
  const { toast } = useToast();
  const [notifiedStarted, setNotifiedStarted] = useState(false);

  useEffect(() => {
    if (isMatchStarted && !notifiedStarted) {
      setNotifiedStarted(true);
      toast({
        title: "Match Started!",
        description: `Opponent found. Your match ${challenge.challengerAgent.name} vs ${challenge.opponentAgent.name} has begun.`,
      });
    }
  }, [isMatchStarted, notifiedStarted, challenge.challengerAgent.name, challenge.opponentAgent.name, toast]);
  const predictionOpen = challenge.predictionEnabled && ['accepted', 'scheduled'].includes(challenge.status);
  const share = shareBotaChallenge(
    challenge.challengeCode,
    `${challenge.challengerAgent.name} vs ${challenge.opponentAgent.name}`,
    `${challenge.challengerAgent.name} challenged ${challenge.opponentAgent.name} for ${formatCompactNumber(challenge.stakeAmount)} ${challenge.stakeCurrency}.`,
  );
  const openShareUrl = (url: string) => {
    if (typeof window === 'undefined') return;
    window.open(url, '_blank', 'noopener,noreferrer,width=640,height=640');
  };

  return (
    <article className="overflow-hidden rounded border border-border bg-card">
      <div className="border-b border-border bg-muted/20 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-2 py-1 text-[10px] font-black uppercase text-primary">
              <Swords size={11} /> Agent Callout
            </span>
            {challenge.source === 'telegram' ? (
              <span className="flex items-center gap-1 rounded bg-[#0088cc]/10 px-1.5 py-1 text-[9px] font-black uppercase text-[#0088cc]">
                <MessageSquare size={10} /> TG
              </span>
            ) : challenge.source === 'twitter' ? (
              <span className="flex items-center gap-1 rounded bg-foreground/10 px-1.5 py-1 text-[9px] font-black uppercase text-foreground">
                <Twitter size={10} /> X
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-1 text-[9px] font-black uppercase text-muted-foreground">
                <Globe2 size={10} /> Web
              </span>
            )}
          </div>
          <span className="rounded bg-background px-2 py-1 text-[10px] font-black uppercase text-muted-foreground">
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <CalloutAgentFace agent={challenge.challengerAgent} />
          <div className="rounded border border-border bg-background px-2 py-1 text-xs font-black text-primary">VS</div>
          <CalloutAgentFace agent={challenge.opponentAgent} align="right" />
        </div>

        {challenge.message ? (
          <div className="mt-3 rounded border border-border bg-background px-3 py-2 text-xs font-bold text-foreground">
            "{challenge.message}"
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-3 gap-1 text-[10px]">
          <MiniMetric label="Stake" value={`${formatCompactNumber(challenge.stakeAmount)} ${challenge.stakeCurrency}`} compact />
          <MiniMetric label="Market" value={predictionOpen ? 'Open' : challenge.predictionEnabled ? 'Waiting' : 'Private'} compact />
          <MiniMetric label={isPending ? 'Expires' : 'Starts'} value={countdown} compact />
        </div>

        {challenge.predictionEnabled ? (
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onPickPrediction?.(challenge, 'YES')}
              disabled={!predictionOpen}
              className="rounded bg-emerald-500 px-2 py-1.5 text-[10px] font-black uppercase text-white transition hover:bg-emerald-400 disabled:bg-muted disabled:text-muted-foreground"
            >
              YES {challenge.challengerAgent.name}
            </button>
            <button
              type="button"
              onClick={() => onPickPrediction?.(challenge, 'NO')}
              disabled={!predictionOpen}
              className="rounded bg-rose-500 px-2 py-1.5 text-[10px] font-black uppercase text-white transition hover:bg-rose-400 disabled:bg-muted disabled:text-muted-foreground"
            >
              NO {challenge.opponentAgent.name}
            </button>
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-2">
          {isMatchStarted ? (
            <a
              href="/bota?section=battles"
              className="flex-1 inline-flex items-center justify-center rounded bg-emerald-500 px-3 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-emerald-400 active:scale-95"
            >
              Match Started! Join Battle
            </a>
          ) : (
            <button
              type="button"
              onClick={() => onAccept?.(challenge.challengeCode)}
              disabled={!canAccept || isAccepting}
              className="flex-1 rounded bg-primary px-3 py-2 text-xs font-black text-primary-foreground transition hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground"
            >
              {isAccepting ? 'Accepting...' : canAccept ? 'Accept Challenge' : challenge.viewerRole === 'challenger' ? 'Awaiting Rival' : 'View Challenge'}
            </button>
          )}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => openShareUrl(getTwitterShareUrl(share.shareData))}
            className="inline-flex items-center justify-center gap-1 rounded border border-border bg-background px-2 py-1.5 text-[10px] font-black text-foreground transition hover:bg-muted"
          >
            <Share2 size={11} />
            X
          </button>
          <button
            type="button"
            onClick={() => openShareUrl(getFarcasterShareUrl(share.shareData))}
            className="inline-flex items-center justify-center gap-1 rounded border border-border bg-background px-2 py-1.5 text-[10px] font-black text-foreground transition hover:bg-muted"
          >
            <Share2 size={11} />
            FC
          </button>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(share.shareUrl)}
            className="inline-flex items-center justify-center gap-1 rounded border border-border bg-background px-2 py-1.5 text-[10px] font-black text-foreground transition hover:bg-muted"
          >
            <Copy size={11} />
            Copy
          </button>
        </div>
      </div>
    </article>
  );
}

function CalloutAgentFace({
  agent,
  align = 'left',
}: {
  agent: AgentPvpChallenge['challengerAgent'];
  align?: 'left' | 'right';
}) {
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
      <div className={`mb-1 flex ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        <img
          src={agent.avatarUrl || arenaAgentAvatar(agent.id)}
          alt=""
          className="h-11 w-11 rounded border border-border bg-muted/30 object-cover object-center p-0"
        />
      </div>
      <div className="truncate text-xs font-black text-foreground">{agent.name}</div>
      <div className="truncate text-[10px] font-bold text-muted-foreground">
        {agent.rank ? `Rank #${agent.rank}` : agent.league} | {agent.record}
      </div>
    </div>
  );
}

function ChallengeCard({
  battle,
  onOpenBattle,
  onPickSide,
}: {
  battle: AgentBattle;
  onOpenBattle?: (battleId: string) => void;
  onPickSide?: (battle: AgentBattle, side: AgentBattleSide, pick: 'YES' | 'NO') => void;
}) {
  const left = battle.sides[0];
  const right = battle.sides[1];
  const leader = leadingSide(battle);
  const trailer = trailingSide(battle);
  const seconds = battleTimeRemaining(battle);

  return (
    <article className="overflow-hidden rounded border border-border bg-card transition hover:border-primary/50">
      <button type="button" onClick={() => onOpenBattle?.(battle.id)} className="block w-full p-1.5 text-left sm:p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-destructive sm:text-[10px]">
              <Swords size={10} /> LIVE
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground sm:text-[10px]">
            <Timer size={10} /> {formatCountdown(seconds)}
          </span>
        </div>

        <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
          <FighterFace side={left} />
          <div className="rounded border border-border bg-background px-1.5 py-0.5 text-center text-[10px] font-black text-primary">VS</div>
          <FighterFace side={right} align="right" />
        </div>

        <div className="hidden truncate text-[11px] font-black text-foreground sm:mt-1.5 sm:block sm:text-xs">
          {challengeQuestion(battle)}
        </div>

        <div className="mt-1.5 flex h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-emerald-500" style={{ width: `${Math.max(4, Math.min(96, leader.confidence))}%` }} />
          <div className="h-full flex-1 bg-rose-500" />
        </div>
      </button>

      <div className="grid grid-cols-[auto_auto_1fr_1fr] items-center gap-1 px-1.5 pb-1.5 text-[9px] font-black sm:px-2 sm:pb-2 sm:text-[10px]">
        <button
          type="button"
          onClick={() => onPickSide?.(battle, leader, 'YES')}
          className="rounded bg-emerald-500 px-1.5 py-1 text-center text-white transition hover:bg-emerald-400 active:scale-[0.98]"
        >
          YES {leader.confidence}%
        </button>
        <button
          type="button"
          onClick={() => onPickSide?.(battle, trailer, 'NO')}
          className="rounded bg-rose-500 px-1.5 py-1 text-center text-white transition hover:bg-rose-400 active:scale-[0.98]"
        >
          NO {trailer.confidence}%
        </button>
        <span className="truncate rounded bg-background px-1.5 py-1 text-center text-muted-foreground">{formatCompactNumber(battle.spectators)}</span>
        <span className="truncate rounded bg-background px-1.5 py-1 text-center text-muted-foreground">{formatUsd(battleVolume(battle))}</span>
      </div>
    </article>
  );
}

function ChallengeBattleBetModal({
  selection,
  amount,
  pool,
  walletAddress,
  escrowTokenSymbol,
  isAuthenticated,
  isSubmitting,
  onAmountChange,
  onClose,
  onLogin,
  onSubmit,
}: {
  selection: ChallengeBetSelection;
  amount: string;
  pool?: AgentBattleP2PPool | null;
  walletAddress: string;
  escrowTokenSymbol: OnchainTokenSymbol;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  onAmountChange: (value: string) => void;
  onClose: () => void;
  onLogin: () => void;
  onSubmit: () => void;
}) {
  const numericAmount = Number(amount || 0);
  const canSubmit = Number.isFinite(numericAmount) && numericAmount > 0;
  const sidePool = selection ? pool?.sides.find((side) => side.sideId === selection.side.id) : null;
  const opponentPool = selection ? pool?.sides.find((side) => side.sideId !== selection.side.id) : null;

  return (
    <Dialog open={Boolean(selection)} onOpenChange={(open) => !open && onClose()}>
      {selection && (
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[340px] rounded border border-border bg-card p-3 text-card-foreground shadow-2xl sm:max-w-[360px]">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-sm font-black uppercase">
              {selection.pick} Prediction
            </DialogTitle>
            <DialogDescription className="text-[11px] leading-tight text-muted-foreground">
              Pick a side for this current Challenge battle. The Arena opens from the card title/fighters.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 rounded border border-border bg-muted/30 p-2">
            <div className="flex items-center gap-2">
              {sideImage(selection.side, 'h-10 w-10 shrink-0 rounded border border-border bg-muted/30 object-cover')}
              <div className="min-w-0">
                <div className="truncate text-xs font-black uppercase text-foreground">
                  {selection.side.agentName}
                </div>
                <div className="text-[10px] font-bold text-muted-foreground">
                  {selection.pick} - {selection.side.confidence}% pressure
                </div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] font-bold">
              <div className="rounded bg-background px-2 py-1">
                <div className="text-muted-foreground">This side</div>
                <div className="text-foreground">
                  {(sidePool?.totalStake || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} {escrowTokenSymbol}
                </div>
              </div>
              <div className="rounded bg-background px-2 py-1">
                <div className="text-muted-foreground">Other side</div>
                <div className="text-foreground">
                  {(opponentPool?.totalStake || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} {escrowTokenSymbol}
                </div>
              </div>
            </div>
          </div>

          <label className="mt-2 block text-[10px] font-black uppercase text-muted-foreground">
            Stake amount
          </label>
          <div className="mt-1 flex items-center rounded border border-border bg-background px-2 py-1.5">
            <input
              value={amount}
              onChange={(event) => onAmountChange(event.target.value.replace(/[^\d.]/g, ''))}
              inputMode="decimal"
              className="min-w-0 flex-1 bg-transparent text-sm font-black text-foreground outline-none"
              placeholder="50"
            />
            <span className="text-xs font-black text-muted-foreground">{escrowTokenSymbol}</span>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1">
            {['25', '50', '100'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onAmountChange(preset)}
                className="rounded border border-border bg-background px-2 py-1.5 text-[10px] font-black text-muted-foreground transition hover:text-foreground"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-1.5 rounded bg-background px-2 py-1.5 text-[10px] font-bold text-muted-foreground">
            <Wallet size={12} />
            <span>{isAuthenticated ? shortAddress(walletAddress) : 'Sign in to place this prediction'}</span>
          </div>

          <button
            type="button"
            onClick={isAuthenticated ? onSubmit : onLogin}
            disabled={isAuthenticated && (!canSubmit || isSubmitting)}
            className="mt-2 w-full rounded bg-primary px-3 py-2 text-xs font-black uppercase text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {!isAuthenticated ? 'Sign in to bet' : isSubmitting ? 'Locking...' : `Place ${selection.pick} Bet`}
          </button>
        </DialogContent>
      )}
    </Dialog>
  );
}

function AgentChallengePredictionModal({
  selection,
  amount,
  pool,
  walletAddress,
  escrowTokenSymbol,
  isAuthenticated,
  isSubmitting,
  onAmountChange,
  onClose,
  onLogin,
  onSubmit,
}: {
  selection: AgentPvpPredictionSelection;
  amount: string;
  pool?: BotaAgentChallengePredictionPool | null;
  walletAddress: string;
  escrowTokenSymbol: OnchainTokenSymbol;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  onAmountChange: (value: string) => void;
  onClose: () => void;
  onLogin: () => void;
  onSubmit: () => void;
}) {
  const numericAmount = Number(amount || 0);
  const canSubmit = Number.isFinite(numericAmount) && numericAmount > 0 && pool?.status === 'betting_open';
  const sidePool = selection ? pool?.sides.find((side) => side.side === selection.pick) : null;
  const otherPool = selection ? pool?.sides.find((side) => side.side !== selection.pick) : null;
  const selectedAgent =
    selection?.pick === 'YES'
      ? selection.challenge.challengerAgent
      : selection?.challenge.opponentAgent;
  const rivalAgent =
    selection?.pick === 'YES'
      ? selection.challenge.opponentAgent
      : selection?.challenge.challengerAgent;

  return (
    <Dialog open={Boolean(selection)} onOpenChange={(open) => !open && onClose()}>
      {selection && selectedAgent && rivalAgent ? (
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[340px] rounded border border-border bg-card p-3 text-card-foreground shadow-2xl sm:max-w-[360px]">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-sm font-black uppercase">
              {selection.pick} PvP Prediction
            </DialogTitle>
            <DialogDescription className="text-[11px] leading-tight text-muted-foreground">
              {selection.pick} means {selectedAgent.name} wins this scheduled agent callout.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 rounded border border-border bg-muted/30 p-2">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <CalloutAgentFace agent={selectedAgent} />
              <div className="rounded border border-border bg-background px-2 py-1 text-[10px] font-black text-primary">VS</div>
              <CalloutAgentFace agent={rivalAgent} align="right" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] font-bold">
              <div className="rounded bg-background px-2 py-1">
                <div className="text-muted-foreground">Your side</div>
                <div className="text-foreground">
                  {(sidePool?.totalStake || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} {escrowTokenSymbol}
                </div>
              </div>
              <div className="rounded bg-background px-2 py-1">
                <div className="text-muted-foreground">Other side</div>
                <div className="text-foreground">
                  {(otherPool?.totalStake || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} {escrowTokenSymbol}
                </div>
              </div>
            </div>
            {pool?.closeReason ? (
              <div className="mt-2 rounded bg-background px-2 py-1 text-[10px] font-bold text-muted-foreground">
                {pool.closeReason}
              </div>
            ) : null}
          </div>

          <label className="mt-2 block text-[10px] font-black uppercase text-muted-foreground">
            Stake amount
          </label>
          <div className="mt-1 flex items-center rounded border border-border bg-background px-2 py-1.5">
            <input
              value={amount}
              onChange={(event) => onAmountChange(event.target.value.replace(/[^\d.]/g, ''))}
              inputMode="decimal"
              className="min-w-0 flex-1 bg-transparent text-sm font-black text-foreground outline-none"
              placeholder="50"
            />
            <span className="text-xs font-black text-muted-foreground">{escrowTokenSymbol}</span>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1">
            {['25', '50', '100'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onAmountChange(preset)}
                className="rounded border border-border bg-background px-2 py-1.5 text-[10px] font-black text-muted-foreground transition hover:text-foreground"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-1.5 rounded bg-background px-2 py-1.5 text-[10px] font-bold text-muted-foreground">
            <Wallet size={12} />
            <span>{isAuthenticated ? shortAddress(walletAddress) : 'Sign in to place this prediction'}</span>
          </div>

          <button
            type="button"
            onClick={isAuthenticated ? onSubmit : onLogin}
            disabled={isAuthenticated && (!canSubmit || isSubmitting)}
            className="mt-2 w-full rounded bg-primary px-3 py-2 text-xs font-black uppercase text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {!isAuthenticated ? 'Sign in to bet' : isSubmitting ? 'Locking...' : `Place ${selection.pick} Bet`}
          </button>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function LiveAgentCell({ side }: { side: AgentBattleSide }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {sideImage(side, 'h-8 w-8 shrink-0 rounded border border-border bg-muted object-cover')}
      <div className="min-w-0">
        <div className="truncate text-xs font-black text-foreground">{side.agentName}</div>
        <div className="truncate text-[10px] font-bold text-muted-foreground">{side.label}</div>
      </div>
    </div>
  );
}

function ConfidenceCell({ side, tone }: { side: AgentBattleSide; tone: 'left' | 'right' }) {
  const barClass = tone === 'left' ? 'bg-emerald-500' : 'bg-rose-500';

  return (
    <div className="min-w-[7rem]">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-bold text-muted-foreground">{side.label}</span>
        <span className="text-xs font-black text-foreground">{side.confidence}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.max(4, Math.min(100, side.confidence))}%` }} />
      </div>
    </div>
  );
}

function LiveBattleTable({
  battles,
  onOpenBattle,
}: {
  battles: AgentBattle[];
  onOpenBattle?: (battleId: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded border border-border bg-card">
      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full min-w-[860px] border-collapse text-left text-xs">
          <thead className="border-b border-border bg-muted/30 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-12 px-3 py-3">#</th>
              <th className="px-3 py-3">Live Battle</th>
              <th className="px-3 py-3">Timer</th>
              <th className="px-3 py-3">Volume</th>
              <th className="px-3 py-3">Watching</th>
              <th className="px-3 py-3">Leader</th>
              <th className="px-3 py-3">Left</th>
              <th className="px-3 py-3">Right</th>
              <th className="px-3 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {battles.map((battle, index) => {
              const left = battle.sides[0];
              const right = battle.sides[1];
              const leader = leadingSide(battle);
              const seconds = battleTimeRemaining(battle);

              return (
                <tr key={battle.id} className="border-b border-border/70 transition last:border-b-0 hover:bg-primary/5">
                  <td className="px-3 py-3 align-middle text-sm font-black text-muted-foreground">{index + 1}</td>
                  <td className="px-3 py-3 align-middle">
                    <div className="grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <LiveAgentCell side={left} />
                      <span className="rounded bg-background px-2 py-1 text-[10px] font-black text-primary">VS</span>
                      <LiveAgentCell side={right} />
                    </div>
                    <div className="mt-1 truncate text-[10px] font-bold text-muted-foreground">{challengeQuestion(battle)}</div>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span className="inline-flex items-center gap-1 rounded bg-background px-2 py-1 font-black text-foreground">
                      <Timer size={11} /> {formatCountdown(seconds)}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle font-black text-foreground">{formatUsd(battleVolume(battle))}</td>
                  <td className="px-3 py-3 align-middle font-black text-foreground">{formatCompactNumber(battle.spectators)}</td>
                  <td className="px-3 py-3 align-middle">
                    <div className="truncate font-black text-foreground">{leader.agentName}</div>
                    <div className="text-[10px] font-bold text-primary">{leader.confidence}% confidence</div>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <ConfidenceCell side={left} tone="left" />
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <ConfidenceCell side={right} tone="right" />
                  </td>
                  <td className="px-3 py-3 text-right align-middle">
                    <button
                      type="button"
                      onClick={() => onOpenBattle?.(battle.id)}
                      className="rounded bg-primary px-3 py-2 text-[10px] font-black text-primary-foreground transition hover:opacity-90"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FighterFace({ side, align = 'left' }: { side: AgentBattleSide; align?: 'left' | 'right' }) {
  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <div className="shrink-0">
        {sideImage(side, 'h-6 w-6 rounded border border-border bg-muted object-cover sm:h-7 sm:w-7')}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[10px] font-black text-foreground sm:text-[11px]">{side.agentName}</div>
        <div className="hidden truncate text-[10px] font-bold text-primary sm:block">{side.label}</div>
      </div>
    </div>
  );
}

function MyChallengesPanel({
  battles,
  bantCreditStats,
  isLoading = false,
  isBantCreditLoading = false,
}: {
  battles: AgentBattle[];
  bantCreditStats?: BantCreditStatsResponse | null;
  isLoading?: boolean;
  isBantCreditLoading?: boolean;
}) {
  const liveCount = battles.filter((battle) => battle.status === 'live').length;
  const stats = [
    ['Open', '0'],
    ['Live', String(liveCount)],
    ['Won', '0'],
    ['Lost', '0'],
    ['BantCredit', isBantCreditLoading ? '...' : formatCompactNumber(bantCreditStats?.currentAggregate || 0)],
    ['BANTC minted', isBantCreditLoading ? '...' : formatCompactNumber(bantCreditStats?.onchainMintedBantCredits || 0)],
  ];

  return (
    <section className="shrink-0 rounded border border-border bg-card p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-foreground">
        <Trophy size={15} className="text-primary" /> My Challenges
      </div>
      <div className="space-y-2 text-xs">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-8 w-full" />)
          : stats.map(([label, value]) => <MyStat key={label} label={label} value={value} />)}
      </div>
    </section>
  );
}

function MyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded bg-background px-2 py-2">
      <span className="font-bold text-muted-foreground">{label}</span>
      <span className="font-black text-foreground">{value}</span>
    </div>
  );
}

function ChallengeStatsPanel({ battles, isLoading = false }: { battles: AgentBattle[]; isLoading?: boolean }) {
  const liveBattles = battles.filter((battle) => battle.status === 'live');
  const totalVolume = battles.reduce((total, battle) => total + battleVolume(battle), 0);
  const totalSpectators = battles.reduce((total, battle) => total + battle.spectators, 0);
  const stats: Array<{ icon: typeof Swords; label: string; value: string }> = [
    { icon: Swords, label: 'Open Challenges', value: formatCompactNumber(battles.length) },
    { icon: Wallet, label: 'Battle Volume', value: formatUsd(totalVolume) },
    { icon: Flame, label: 'Live Battles', value: formatCompactNumber(liveBattles.length) },
    { icon: Users, label: 'Active Challengers', value: formatCompactNumber(totalSpectators) },
  ];

  return (
    <section className="shrink-0 rounded border border-border bg-card p-3">
      <div className="mb-3 text-sm font-black text-foreground">Challenge Stats</div>
      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)
          : stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded bg-background px-2 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded bg-primary/10 text-primary">
                    <Icon size={14} />
                  </span>
                  <span className="truncate text-xs font-bold text-muted-foreground">{label}</span>
                </span>
                <span className="shrink-0 text-sm font-black text-foreground">{value}</span>
              </div>
            ))}
      </div>
    </section>
  );
}

function ChallengeSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded border border-border bg-card p-4">
          <Skeleton className="mb-4 h-5 w-32" />
          <div className="grid grid-cols-3 items-center gap-2">
            <Skeleton className="h-20 rounded" />
            <Skeleton className="h-8 rounded" />
            <Skeleton className="h-20 rounded" />
          </div>
          <Skeleton className="mt-4 h-16 rounded" />
          <Skeleton className="mt-3 h-20 rounded" />
        </div>
      ))}
    </div>
  );
}

function LiveBattleTableSkeleton() {
  return (
    <div className="overflow-hidden rounded border border-border bg-card">
      <div className="space-y-0">
        <div className="grid grid-cols-[3rem_1.8fr_0.7fr_0.8fr_0.8fr_1fr] gap-3 border-b border-border bg-muted/30 px-3 py-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-3 w-full" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[3rem_1.8fr_0.7fr_0.8fr_0.8fr_1fr] gap-3 border-b border-border/70 px-3 py-3 last:border-b-0">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChallengePage({ onOpenBattle }: ChallengePageProps) {
  const queryClient = useQueryClient();
  const { isAuthenticated, login } = useAuth();
  const { wallets } = useWallets();
  const walletAddress = getWalletAddress(wallets as unknown[]);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ChallengeTab>('live');
  const [activeFilter, setActiveFilter] = useState<ChallengeFilter>('all');
  const [betSelection, setBetSelection] = useState<ChallengeBetSelection>(null);
  const [pvpPredictionSelection, setPvpPredictionSelection] = useState<AgentPvpPredictionSelection>(null);
  const [betAmount, setBetAmount] = useState('50');
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const { data: battleFeed, isLoading, isError } = useQuery<AgentBattleFeed>({
    queryKey: ['/api/bantahbro/agent-battles/live', { limit: '50' }],
    staleTime: 1_000,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    retry: 2,
    placeholderData: (previousData) => previousData,
  });
  const { data: arenaRecordFeed, isLoading: isArenaRecordsLoading } = useQuery<ArenaBattleRecordsFeed>({
    queryKey: ['/api/bantahbro/arena/battle-records', { limit: '50' }],
    queryFn: () => apiRequest('GET', '/api/bantahbro/arena/battle-records?limit=50'),
    staleTime: 5_000,
    refetchInterval: 15_000,
    retry: 2,
    placeholderData: (previousData) => previousData,
  });
  const { data: myP2PPositions, isLoading: isMyP2PPositionsLoading } = useQuery<AgentBattleP2PHistoryFeed>({
    queryKey: ['/api/bantahbro/agent-battles/p2p/positions/my', { limit: '50' }],
    queryFn: () => apiRequest('GET', '/api/bantahbro/agent-battles/p2p/positions/my?limit=50'),
    enabled: isAuthenticated,
    staleTime: 2_000,
    refetchInterval: 10_000,
    retry: 1,
    placeholderData: (previousData) => previousData,
  });
  const { data: pvpChallengeFeed, isLoading: isPvpLoading } = useQuery<AgentPvpChallengeFeed>({
    queryKey: ['/api/bantahbro/agent-challenges', { limit: '30', status: 'all' }],
    staleTime: 5_000,
    refetchInterval: 20_000,
    retry: 2,
    placeholderData: (previousData) => previousData,
  });
  const { data: myPvpPredictions, isLoading: isMyPvpPredictionsLoading } = useQuery<BotaAgentChallengePredictionPositionsFeed>({
    queryKey: ['/api/bantahbro/agent-challenges/prediction/positions/my', { limit: '50' }],
    queryFn: () => apiRequest('GET', '/api/bantahbro/agent-challenges/prediction/positions/my?limit=50'),
    enabled: isAuthenticated,
    staleTime: 2_000,
    refetchInterval: 10_000,
    retry: 1,
    placeholderData: (previousData) => previousData,
  });
  const { data: myPvpChallengeFeed, isLoading: isMyPvpLoading } = useQuery<AgentPvpChallengeFeed>({
    queryKey: ['/api/bantahbro/agent-challenges', { limit: '50', status: 'all', mine: 'true' }],
    queryFn: () => apiRequest('GET', '/api/bantahbro/agent-challenges?limit=50&status=all&mine=true'),
    enabled: isAuthenticated,
    staleTime: 5_000,
    refetchInterval: 20_000,
    retry: 2,
    placeholderData: (previousData) => previousData,
  });
  const acceptChallengeMutation = useMutation({
    mutationFn: async (challengeCode: string) =>
      apiRequest('POST', `/api/bantahbro/agent-challenges/${encodeURIComponent(challengeCode)}/accept`, {
        scheduledDelayMinutes: 30,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bantahbro/agent-challenges'] });
      toast({ title: 'Challenge accepted', description: 'The fight is scheduled and ready for hype.' });
    },
    onError: (mutationError) => {
      toast({
        title: 'Could not accept',
        description: mutationError instanceof Error ? mutationError.message : 'Challenge acceptance failed.',
        variant: 'destructive',
      });
    },
  });
  const selectedBattleP2PUrl = betSelection?.battle?.id
    ? `/api/bantahbro/agent-battles/${encodeURIComponent(betSelection.battle.id)}/p2p/${isAuthenticated ? 'my' : 'pool'}`
    : null;
  const { data: selectedP2PPool } = useQuery<AgentBattleP2PPool>({
    queryKey: ['/api/bantahbro/agent-battles/p2p/pool', betSelection?.battle?.id || 'none', isAuthenticated ? 'my' : 'public'],
    queryFn: () => apiRequest('GET', selectedBattleP2PUrl || ''),
    enabled: Boolean(selectedBattleP2PUrl),
    staleTime: 1_000,
    refetchInterval: betSelection ? 5_000 : false,
    retry: 1,
  });
  const selectedPvpPredictionUrl = pvpPredictionSelection?.challenge?.challengeCode
    ? `/api/bantahbro/agent-challenges/${encodeURIComponent(pvpPredictionSelection.challenge.challengeCode)}/prediction/${isAuthenticated ? 'my' : 'pool'}`
    : null;
  const { data: selectedPvpPredictionPool } = useQuery<BotaAgentChallengePredictionPool>({
    queryKey: [
      '/api/bantahbro/agent-challenges/prediction/pool',
      pvpPredictionSelection?.challenge?.challengeCode || 'none',
      isAuthenticated ? 'my' : 'public',
    ],
    queryFn: () => apiRequest('GET', selectedPvpPredictionUrl || ''),
    enabled: Boolean(selectedPvpPredictionUrl),
    staleTime: 1_000,
    refetchInterval: pvpPredictionSelection ? 5_000 : false,
    retry: 1,
  });
  const { data: onchainConfig } = useQuery<OnchainRuntimeConfig>({
    queryKey: ['/api/onchain/config'],
    queryFn: () => apiRequest('GET', '/api/onchain/config'),
    enabled: Boolean(betSelection || pvpPredictionSelection),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
  const escrowTokenSymbol = (selectedP2PPool?.escrowTokenSymbol || onchainConfig?.defaultToken || 'USDC') as OnchainTokenSymbol;
  const escrowChainId = Number(selectedP2PPool?.escrowChainId || onchainConfig?.defaultChainId || 0);
  const escrowChain = onchainConfig?.chains?.[String(escrowChainId)];
  const escrowReady =
    onchainConfig?.contractEnabled === true && escrowChain?.escrowSupportsChallengeLock === true;
  const pvpEscrowTokenSymbol = (selectedPvpPredictionPool?.escrowTokenSymbol || onchainConfig?.defaultToken || 'USDC') as OnchainTokenSymbol;
  const pvpEscrowChainId = Number(selectedPvpPredictionPool?.escrowChainId || onchainConfig?.defaultChainId || 0);
  const pvpEscrowChain = onchainConfig?.chains?.[String(pvpEscrowChainId)];
  const pvpEscrowReady =
    onchainConfig?.contractEnabled === true && pvpEscrowChain?.escrowSupportsChallengeLock === true;
  const placeBetMutation = useMutation<AgentBattleP2PStakeResponse, Error>({
    mutationFn: async () => {
      if (!betSelection) {
        throw new Error('Pick YES or NO first.');
      }
      if (!isAuthenticated) {
        throw new Error('Sign in to place this prediction.');
      }

      const stakeAmount = Number(betAmount || 0);
      if (!Number.isFinite(stakeAmount) || stakeAmount <= 0) {
        throw new Error('Stake amount must be greater than zero.');
      }

      const ticket = await apiRequest(
        'POST',
        `/api/bantahbro/agent-battles/${encodeURIComponent(betSelection.battle.id)}/p2p/stake`,
        {
          sideId: betSelection.side.id,
          stakeAmount,
          stakeCurrency: escrowTokenSymbol,
          walletAddress: walletAddress || undefined,
        },
      );

      if (!escrowReady) {
        return ticket;
      }
      if (!wallets?.length) {
        throw new Error('Connect a Privy wallet to lock this stake.');
      }

      const escrowChallengeId = Number(ticket?.position?.escrowChallengeId || ticket?.pool?.escrowChallengeId);
      const ticketToken = (ticket?.position?.escrowTokenSymbol || ticket?.pool?.escrowTokenSymbol || escrowTokenSymbol) as OnchainTokenSymbol;
      const ticketChainId = Number(ticket?.position?.escrowChainId || ticket?.pool?.escrowChainId || escrowChainId);
      if (!Number.isInteger(escrowChallengeId) || escrowChallengeId <= 0) {
        throw new Error('Battle escrow round could not be reserved.');
      }

      const escrowTx = await executeOnchainEscrowStakeTx({
        wallets: wallets as any,
        preferredWalletAddress: walletAddress || null,
        onchainConfig,
        chainId: ticketChainId,
        challengeId: escrowChallengeId,
        tokenSymbol: ticketToken,
        amount: betAmount,
      });

      const locked = await apiRequest(
        'POST',
        `/api/bantahbro/agent-battles/p2p/positions/${encodeURIComponent(ticket.position.id)}/escrow`,
        {
          walletAddress: escrowTx.walletAddress,
          escrowTxHash: escrowTx.escrowTxHash,
        },
      );

      return {
        ...ticket,
        position: locked?.position || ticket.position,
        message: `${betAmount} ${ticketToken} locked for ${betSelection.pick}.`,
      };
    },
    onSuccess: (response) => {
      const pick = betSelection?.pick || 'YES';
      setBetSelection(null);
      queryClient.invalidateQueries({ queryKey: ['/api/bantahbro/agent-battles/live'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bantahbro/agent-battles/p2p/pool'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bantahbro/agent-battles/p2p/positions/my'] });
      toast({
        title: `${pick} bet placed`,
        description: response.message || 'Your prediction ticket is in for this Challenge battle.',
      });
    },
    onError: (mutationError) => {
      toast({
        title: 'Bet failed',
        description: mutationError.message,
        variant: 'destructive',
      });
    },
  });
  const placePvpPredictionMutation = useMutation<BotaAgentChallengePredictionStakeResponse, Error>({
    mutationFn: async () => {
      if (!pvpPredictionSelection) {
        throw new Error('Pick YES or NO first.');
      }
      if (!isAuthenticated) {
        throw new Error('Sign in to place this prediction.');
      }

      const stakeAmount = Number(betAmount || 0);
      if (!Number.isFinite(stakeAmount) || stakeAmount <= 0) {
        throw new Error('Stake amount must be greater than zero.');
      }

      const challengeCode = pvpPredictionSelection.challenge.challengeCode;
      const ticket = await apiRequest(
        'POST',
        `/api/bantahbro/agent-challenges/${encodeURIComponent(challengeCode)}/prediction/stake`,
        {
          side: pvpPredictionSelection.pick,
          stakeAmount,
          stakeCurrency: pvpEscrowTokenSymbol,
          walletAddress: walletAddress || undefined,
        },
      );

      if (!pvpEscrowReady) {
        return ticket;
      }
      if (!wallets?.length) {
        throw new Error('Connect a Privy wallet to lock this stake.');
      }

      const escrowChallengeId = Number(ticket?.position?.escrowChallengeId || ticket?.pool?.escrowChallengeId);
      const ticketToken = (ticket?.position?.escrowTokenSymbol || ticket?.pool?.escrowTokenSymbol || pvpEscrowTokenSymbol) as OnchainTokenSymbol;
      const ticketChainId = Number(ticket?.position?.escrowChainId || ticket?.pool?.escrowChainId || pvpEscrowChainId);
      if (!Number.isInteger(escrowChallengeId) || escrowChallengeId <= 0) {
        throw new Error('PvP prediction escrow market could not be reserved.');
      }

      const escrowTx = await executeOnchainEscrowStakeTx({
        wallets: wallets as any,
        preferredWalletAddress: walletAddress || null,
        onchainConfig,
        chainId: ticketChainId,
        challengeId: escrowChallengeId,
        tokenSymbol: ticketToken,
        amount: betAmount,
      });

      const locked = await apiRequest(
        'POST',
        `/api/bantahbro/agent-challenges/prediction/positions/${encodeURIComponent(ticket.position.id)}/escrow`,
        {
          walletAddress: escrowTx.walletAddress,
          escrowTxHash: escrowTx.escrowTxHash,
        },
      );

      return {
        ...ticket,
        position: locked?.position || ticket.position,
        message: `${betAmount} ${ticketToken} locked for ${pvpPredictionSelection.pick}.`,
      };
    },
    onSuccess: (response) => {
      const pick = pvpPredictionSelection?.pick || 'YES';
      setPvpPredictionSelection(null);
      queryClient.invalidateQueries({ queryKey: ['/api/bantahbro/agent-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bantahbro/agent-challenges/prediction/pool'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bantahbro/agent-challenges/prediction/positions/my'] });
      toast({
        title: `${pick} PvP bet placed`,
        description: response.message || 'Your PvP prediction ticket is active.',
      });
    },
    onError: (mutationError) => {
      toast({
        title: 'PvP bet failed',
        description: mutationError.message,
        variant: 'destructive',
      });
    },
  });

  const battles = battleFeed?.battles || [];
  const handleOpenArenaBattle = useCallback(
    (battleId: string) => {
      const selectedBattle = battles.find((battle) => battle.id === battleId);
      if (selectedBattle) {
        storeOpenBattleSnapshot(selectedBattle);
      }
      onOpenBattle?.(battleId);
    },
    [battles, onOpenBattle],
  );
  const pvpChallenges = activeTab === 'mine'
    ? myPvpChallengeFeed?.challenges || []
    : pvpChallengeFeed?.challenges || [];
  const arenaRecords = arenaRecordFeed?.records || [];
  const myJoinedPositions = useMemo(
    () => (myP2PPositions?.positions || []).filter((position) => matchesMyP2PFilter(position, activeFilter)),
    [activeFilter, myP2PPositions?.positions],
  );
  const myJoinedPvpPredictions = useMemo(
    () =>
      (myPvpPredictions?.positions || []).filter((position) =>
        matchesMyPvpPredictionFilter(position, activeFilter),
      ),
    [activeFilter, myPvpPredictions?.positions],
  );
  const hasMyChallengeRows = myJoinedPositions.length > 0 || myJoinedPvpPredictions.length > 0;
  const visiblePvpLoading = activeTab === 'mine' ? isMyPvpLoading : isPvpLoading;
  const liveBattles = battles.filter((battle) => battle.status === 'live');
  const featured = useMemo(
    () =>
      [...liveBattles].sort(
        (left, right) =>
          right.spectators + battleVolume(right) / 10000 + right.confidenceSpread -
          (left.spectators + battleVolume(left) / 10000 + left.confidenceSpread),
      )[0] || null,
    [liveBattles],
  );

  const visibleBattles = useMemo(() => {
    if (isResultFilter(activeFilter)) return [];
    if (activeTab === 'callouts' || activeTab === 'mine') return [];
    const tabBattles = activeTab === 'live' ? liveBattles : battles;
    return tabBattles.filter((battle) => matchesFilter(battle, activeFilter, nowMs));
  }, [activeFilter, activeTab, battles, liveBattles, nowMs]);

  const visibleArenaRecords = useMemo(() => {
    if (activeTab === 'mine' || (activeFilter !== 'all' && !isResultFilter(activeFilter))) return [];
    return arenaRecords.filter((record) => {
      if (activeFilter === 'ended' || activeFilter === 'all') return record.status === 'resolved' || record.status === 'draw';
      if (activeFilter === 'winners') return record.status === 'resolved' && Boolean(record.winnerSideId || record.winnerAgentId);
      if (activeFilter === 'losers') return record.status === 'resolved' && Boolean(record.loserSideId || record.loserAgentId);
      return false;
    });
  }, [activeFilter, activeTab, arenaRecords]);

  const visiblePvpChallenges = useMemo(() => {
    if (activeTab === 'live') return [];
    return pvpChallenges.filter((challenge) => {
      if (activeTab === 'callouts' && !isResultFilter(activeFilter) && !['pending', 'accepted', 'scheduled', 'live'].includes(challenge.status)) return false;
      if (activeTab === 'mine' && challenge.viewerRole === 'spectator') return false;
      return matchesPvpChallengeFilter(challenge, activeFilter);
    });
  }, [activeFilter, activeTab, pvpChallenges]);

  const visiblePageLoading = activeTab === 'mine'
    ? !hasMyChallengeRows && (isMyPvpLoading || isMyP2PPositionsLoading || isMyPvpPredictionsLoading)
    : isResultFilter(activeFilter)
      ? !visibleArenaRecords.length && !visiblePvpChallenges.length && (isArenaRecordsLoading || visiblePvpLoading)
      : isLoading;

  const handleAcceptChallenge = (challengeCode: string) => {
    if (!isAuthenticated) {
      login();
      return;
    }
    acceptChallengeMutation.mutate(challengeCode);
  };

  const handlePickBattleSide = (battle: AgentBattle, side: AgentBattleSide, pick: 'YES' | 'NO') => {
    setBetSelection({ battle, side, pick });
    setPvpPredictionSelection(null);
    setBetAmount('50');
  };

  const handlePickPvpPrediction = (challenge: AgentPvpChallenge, pick: 'YES' | 'NO') => {
    setPvpPredictionSelection({ challenge, pick });
    setBetSelection(null);
    setBetAmount('50');
  };

  const handleTabClick = (tab: ChallengeTab) => {
    setActiveTab(tab);
    if (tab === 'live') {
      setActiveFilter('live');
    } else if (tab === 'callouts' && activeFilter === 'live') {
      setActiveFilter('all');
    }
  };

  return (
    <main className="flex-1 overflow-hidden bg-background">
      <div className="flex h-full min-h-0 overflow-hidden p-2 sm:p-3">
        <div className="min-w-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-2 sm:space-y-3">
            <div className="rounded border border-border bg-card p-1.5">
              <div className="flex gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    className={`shrink-0 rounded px-2 py-1 text-[10px] font-black transition sm:px-2.5 sm:py-1.5 sm:text-xs ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-1">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold transition sm:px-2 sm:py-1 sm:text-[11px] ${
                    activeFilter === filter.id
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {activeTab !== 'live' && activeTab !== 'mine' && !isResultFilter(activeFilter) && (
              <FeaturedChallenge battle={featured} onOpenBattle={handleOpenArenaBattle} />
            )}

            {visibleArenaRecords.length > 0 ? (
              <section className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-3">
                {visibleArenaRecords.map((record) => (
                  <ArenaResultCard key={record.id} record={record} filter={activeFilter} />
                ))}
              </section>
            ) : null}

            {!visiblePvpLoading && visiblePvpChallenges.length > 0 ? (
              <section className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-3">
                {visiblePvpChallenges.map((challenge) => (
                  <AgentCalloutCard
                    key={challenge.id}
                    challenge={challenge}
                    onAccept={handleAcceptChallenge}
                    onPickPrediction={handlePickPvpPrediction}
                    isAccepting={acceptChallengeMutation.isPending}
                  />
                ))}
              </section>
            ) : null}

            {activeTab === 'mine' && myJoinedPositions.length > 0 ? (
              <section className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-3">
                {myJoinedPositions.map((position) => (
                  <MyJoinedBattleCard key={position.id} position={position} />
                ))}
              </section>
            ) : null}

            {activeTab === 'mine' && myJoinedPvpPredictions.length > 0 ? (
              <section className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-3">
                {myJoinedPvpPredictions.map((position) => (
                  <MyPvpPredictionCard key={position.id} position={position} />
                ))}
              </section>
            ) : null}

            {visiblePageLoading ? (
              activeTab === 'live' && !isResultFilter(activeFilter) ? <LiveBattleTableSkeleton /> : <ChallengeSkeletonGrid />
            ) : isError ? (
              <div className="rounded border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                Challenge feed could not load.
              </div>
            ) : visibleBattles.length ? (
              activeTab === 'live' ? (
                <LiveBattleTable battles={visibleBattles} onOpenBattle={handleOpenArenaBattle} />
              ) : (
                <section className="grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-3">
                  {visibleBattles.map((battle) => (
                    <ChallengeCard
                      key={battle.id}
                      battle={battle}
                      onOpenBattle={handleOpenArenaBattle}
                      onPickSide={handlePickBattleSide}
                    />
                  ))}
                </section>
              )
            ) : visibleArenaRecords.length || visiblePvpChallenges.length ||
              (activeTab === 'mine' && hasMyChallengeRows) ? null : (
              <EmptyState tab={activeTab} filter={activeFilter} />
            )}
          </div>
        </div>
      </div>
      <ChallengeBattleBetModal
        selection={betSelection}
        amount={betAmount}
        pool={selectedP2PPool}
        walletAddress={walletAddress}
        escrowTokenSymbol={escrowTokenSymbol}
        isAuthenticated={isAuthenticated}
        isSubmitting={placeBetMutation.isPending}
        onAmountChange={setBetAmount}
        onClose={() => setBetSelection(null)}
        onLogin={login}
        onSubmit={() => placeBetMutation.mutate()}
      />
      <AgentChallengePredictionModal
        selection={pvpPredictionSelection}
        amount={betAmount}
        pool={selectedPvpPredictionPool}
        walletAddress={walletAddress}
        escrowTokenSymbol={pvpEscrowTokenSymbol}
        isAuthenticated={isAuthenticated}
        isSubmitting={placePvpPredictionMutation.isPending}
        onAmountChange={setBetAmount}
        onClose={() => setPvpPredictionSelection(null)}
        onLogin={login}
        onSubmit={() => placePvpPredictionMutation.mutate()}
      />
    </main>
  );
}

export function ChallengeRightSidebar() {
  const { data: battleFeed, isLoading } = useQuery<AgentBattleFeed>({
    queryKey: ['/api/bantahbro/agent-battles/live', { limit: '50' }],
    staleTime: 1_000,
    refetchInterval: 5_000,
    retry: 2,
    placeholderData: (previousData) => previousData,
  });
  const { data: bantCreditStats, isLoading: isBantCreditLoading } = useQuery<BantCreditStatsResponse>({
    queryKey: ['/api/bantahbro/stats/bantcredit'],
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 2,
    placeholderData: (previousData) => previousData,
  });
  const battles = battleFeed?.battles || [];

  return (
    <div className="flex w-full shrink-0 flex-col gap-2 overflow-hidden lg:w-72">
      <MyChallengesPanel
        battles={battles}
        bantCreditStats={bantCreditStats}
        isLoading={isLoading}
        isBantCreditLoading={isBantCreditLoading}
      />
      <ChallengeStatsPanel battles={battles} isLoading={isLoading} />
    </div>
  );
}
