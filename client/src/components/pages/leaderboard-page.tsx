'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bot,
  BrainCircuit,
  Coins,
  Cpu,
  Gamepad2,
  Globe2,
  Image as ImageIcon,
  Trophy,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { botaCharacterAlt, botaFighterProfileArt } from '@/lib/botaCharacterLayer';
import type { BotaFighterOrigin, BotaFighterProfile } from '@shared/botaFighterProfile';
import { getBotaDerivativeFighter } from '@shared/botaDerivativeFighter';
import {
  fighterTitle,
  getFighterIdentity,
  getFighterSourceMeta,
} from '@/lib/bantahbro/fighterIdentity';

type SourceFilter = 'all' | 'ens' | 'eliza' | 'virtuals' | 'bankr' | 'agentkit' | 'game-sdk' | 'meme' | 'nft' | 'bota';
type SortMode = 'earnings' | 'wins' | 'challenges';

interface FighterProfilesFeed {
  profiles: BotaFighterProfile[];
  updatedAt: string;
}

interface LeaderboardEntry {
  id: string;
  origin: BotaFighterOrigin | 'meme';
  sourceLabel: string;
  sourceIconUrl: string | null;
  identityLabel: string;
  identityStory: string;
  identityLogoUrl: string;
  brainLabel: string;
  rank: number;
  name: string;
  handle: string | null;
  score: number;
  wins: number;
  losses: number;
  bantCredits: number;
  challenges: number;
  avatarUrl: string;
  title: string;
  league: string;
  usdcEarned: number;
}

const sourceFilters: Array<{ value: SourceFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'ens', label: 'ENS' },
  { value: 'eliza', label: 'ElizaOS' },
  { value: 'virtuals', label: 'Virtuals' },
  { value: 'bankr', label: 'Bankr' },
  { value: 'agentkit', label: 'AgentKit' },
  { value: 'game-sdk', label: 'GAME SDK' },
  { value: 'meme', label: 'Meme' },
  { value: 'nft', label: 'NFT' },
  { value: 'bota', label: 'BOTA' },
];

function titleCase(value?: string | null) {
  return String(value || 'BOTA')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function metadataNumber(metadata: Record<string, unknown> | undefined, keys: string[]) {
  if (!metadata) return 0;
  for (const key of keys) {
    const parsed = Number(metadata[key]);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function metadataText(metadata: Record<string, unknown> | undefined, keys: string[]) {
  if (!metadata) return null;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function sourceMeta(profile: BotaFighterProfile) {
  const derivative = getBotaDerivativeFighter(profile.metadata);
  const sourceHint = metadataText(profile.metadata, ['sourceHint', 'importSource', 'importedFrom'])?.toLowerCase() || '';
  const token = profile.metadata?.token && typeof profile.metadata.token === 'object' && !Array.isArray(profile.metadata.token)
    ? profile.metadata.token as Record<string, unknown>
    : null;
  const tokenLogo = metadataText(profile.metadata, ['sourceIconUrl', 'originIconUrl', 'tokenLogoUrl'])
    || (typeof token?.logoUrl === 'string' ? token.logoUrl : null);

  if (derivative) return { label: derivative.speciesLabel, iconUrl: profile.avatarUrl || null, origin: 'nft' as const };
  if (profile.origin === 'ens') return { label: profile.ensName ? `ENS · ${profile.ensName}` : 'ENS Fighter', iconUrl: '/assets/ens-badge.jpg', origin: 'ens' as const };
  if (profile.origin === 'eliza') return { label: 'ElizaOS', iconUrl: '/assets/source-elizaos.png', origin: 'eliza' as const };
  if (profile.origin === 'virtuals') return { label: 'Virtuals Protocol', iconUrl: '/assets/source-virtuals.jpg', origin: 'virtuals' as const };
  if (profile.origin === 'bankr') return { label: 'Bankr', iconUrl: '/assets/source-bankr.png', origin: 'bankr' as const };
  if (profile.origin === 'game-sdk') return { label: 'GAME SDK', iconUrl: '/assets/bota-bantah-icon.png', origin: 'game-sdk' as const };
  if (profile.origin === 'agentkit') return { label: 'AgentKit', iconUrl: '/assets/base-icon-1024.png', origin: 'virtuals' as const };
  if (profile.origin === 'nft') return { label: 'NFT Import', iconUrl: tokenLogo, origin: 'nft' as const };
  if (profile.origin === 'token' || profile.origin === 'dexscreener' || sourceHint.includes('meme')) {
    return { label: profile.tokenSymbol ? `$${profile.tokenSymbol} Meme` : 'Meme Token', iconUrl: tokenLogo, origin: 'meme' as const };
  }
  return { label: profile.origin === 'bota' ? 'BOTA Native' : titleCase(profile.origin), iconUrl: '/assets/bota-bantah-icon.png', origin: profile.origin };
}

function SourceIcon({ entry }: { entry: LeaderboardEntry }) {
  const fallback = (() => {
    if (entry.origin === 'ens') return <Globe2 size={12} />;
    if (entry.origin === 'eliza') return <BrainCircuit size={12} />;
    if (entry.origin === 'virtuals') return <Globe2 size={12} />;
    if (entry.origin === 'bankr') return <Coins size={12} />;
    if (entry.origin === 'game-sdk') return <Gamepad2 size={12} />;
    if (entry.origin === 'meme' || entry.origin === 'token' || entry.origin === 'dexscreener') return <Coins size={12} />;
    if (entry.origin === 'nft') return <ImageIcon size={12} />;
    if (entry.origin === 'agentkit') return <Cpu size={12} />;
    return <Bot size={12} />;
  })();

  return (
    <span
      className="relative grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-background text-muted-foreground"
      title={entry.sourceLabel}
      aria-label={entry.sourceLabel}
    >
      <span className="absolute inset-0 grid place-items-center">{fallback}</span>
      {entry.sourceIconUrl ? (
        <img
          src={entry.sourceIconUrl}
          alt=""
          className="relative h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
    </span>
  );
}

function IdentityLogo({ entry, size = 'h-5 w-5' }: { entry: LeaderboardEntry; size?: string }) {
  return (
    <span
      className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-full border border-background bg-card shadow`}
      title={entry.sourceLabel}
      aria-label={entry.sourceLabel}
    >
      <img
        src={entry.sourceIconUrl || entry.identityLogoUrl}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
    </span>
  );
}

function profileName(profile: BotaFighterProfile) {
  return profile.origin === 'ens' && profile.ensName ? profile.ensName : profile.displayName;
}

function profileToEntry(profile: BotaFighterProfile, index: number): LeaderboardEntry {
  const meta = getFighterSourceMeta(profile);
  const identity = getFighterIdentity(profile);
  const bantCredits = Math.max(0, Math.round(Number(profile.bantCreditsEarned || profile.metadata?.bantCreditsEarned || 0)));
  const arenaRecordStats = profile.metadata?.arenaRecordStats &&
    typeof profile.metadata.arenaRecordStats === 'object' &&
    !Array.isArray(profile.metadata.arenaRecordStats)
    ? profile.metadata.arenaRecordStats as Record<string, unknown>
    : null;
  const usdcEarned = Math.max(0, Math.round(Number((profile as any).usdcEarned || profile.metadata?.usdcEarned || 0)));
  const challenges = Math.max(
    profile.wins + profile.losses,
    Math.round(Number(profile.challengeVolume || arenaRecordStats?.matches || 0)),
  );
  return {
    id: profile.agentId,
    origin: meta.leaderboardOrigin,
    sourceLabel: meta.label,
    sourceIconUrl: meta.iconUrl,
    identityLabel: identity.label,
    identityStory: identity.story,
    identityLogoUrl: identity.logoUrl,
    brainLabel: identity.brainLabel,
    rank: profile.rank || index + 1,
    name: profileName(profile),
    handle: profile.ensName || profile.tokenSymbol || profile.badgeLabel || null,
    score: Math.round(profile.fameScore || 0),
    wins: profile.wins,
    losses: profile.losses,
    bantCredits,
    challenges,
    avatarUrl: botaFighterProfileArt({
      avatarUrl: profile.avatarUrl,
      seed: profile.agentId,
      source: meta.kind,
    }),
    title: fighterTitle(profile),
    league: profile.league,
    usdcEarned,
  };
}

function formatBantCredits(value: number) {
  const safe = Math.max(0, Number.isFinite(value) ? value : 0);
  if (safe >= 1_000_000) return `${(safe / 1_000_000).toFixed(1)}M BC`;
  if (safe >= 1_000) return `${(safe / 1_000).toFixed(1)}K BC`;
  return `${Math.round(safe).toLocaleString()} BC`;
}

function scoreLabel(entry: LeaderboardEntry, sortMode: SortMode) {
  return `${entry.score} pts`;
}

export default function LeaderboardPage() {
  const [sortMode, setSortMode] = useState<SortMode>('wins');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const { data, isLoading } = useQuery<FighterProfilesFeed>({
    queryKey: ['/api/bantahbro/fighter-profiles', { limit: '100', refreshLive: 'true' }],
    staleTime: 10_000,
    refetchInterval: 20_000,
  });

  const entries = useMemo(() => {
    const profiles = data?.profiles || [];
    return profiles
      .map(profileToEntry)
      .filter((entry) => sourceFilter === 'all' || entry.origin === sourceFilter)
      .sort((left, right) => {
        if (sortMode === 'wins') return right.wins - left.wins || right.score - left.score;
        if (sortMode === 'challenges') return right.challenges - left.challenges || right.score - left.score;
        return right.usdcEarned - left.usdcEarned || right.score - left.score;
      })
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        badge: index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : null,
      }));
  }, [data?.profiles, sortMode, sourceFilter]);

  const sourceCounts = useMemo(() => {
    const counts: Record<SourceFilter, number> = {
      all: data?.profiles?.length || 0,
      ens: 0,
      eliza: 0,
      virtuals: 0,
      bankr: 0,
      agentkit: 0,
      'game-sdk': 0,
      meme: 0,
      nft: 0,
      bota: 0,
    };
    for (const profile of data?.profiles || []) {
      const origin = getFighterSourceMeta(profile).leaderboardOrigin;
      if (origin in counts) counts[origin as SourceFilter] += 1;
    }
    return counts;
  }, [data?.profiles]);

  const podiumEntries =
    entries.length >= 3
      ? [entries[1], entries[0], entries[2]].filter(Boolean)
      : entries.slice(0, 3);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="flex-1 flex flex-col bg-card border border-border rounded overflow-hidden">
        <div className="border-b border-border bg-background px-4 py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
            <div className="flex w-full overflow-hidden rounded bg-muted text-xs font-bold md:w-auto md:shrink-0">
              {([
                ['earnings', 'Top Earnings'],
                ['wins', 'Most Wins'],
                ['challenges', 'Top Challenges'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSortMode(value)}
                  className={`flex-1 px-1 py-1 text-[10px] sm:text-xs sm:px-3 sm:py-1.5 transition md:flex-none ${sortMode === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!isLoading && podiumEntries.length >= 3 && (
            <div className="border-b border-border bg-background/50 px-4 py-4">
              <div className="flex items-end justify-center gap-4">
                {podiumEntries.map((entry, index) => {
                  const heights = ['h-20', 'h-28', 'h-16'];
                  const positions = ['2nd', '1st', '3rd'];

                  return (
                    <div key={entry.id} className="flex min-w-0 flex-col items-center gap-1">
                      <span className="relative h-14 w-14">
                        <img
                          src={entry.avatarUrl}
                          alt={botaCharacterAlt(entry.name)}
                          className="h-14 w-14 rounded-full border border-primary/30 bg-black object-cover object-center p-0"
                          loading="lazy"
                        />
                        <span className="absolute -bottom-1 -right-1">
                          <IdentityLogo entry={entry} size="h-5 w-5" />
                        </span>
                      </span>
                      <div className="max-w-28 truncate text-xs font-bold text-foreground">{entry.name}</div>
                      <div className="text-xs font-mono text-secondary">{scoreLabel(entry, sortMode)}</div>
                      <div className={`${heights[index]} w-16 bg-primary/20 border border-primary/30 rounded-t flex items-center justify-center`}>
                        <span className="text-sm font-bold text-primary">{positions[index]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="overflow-x-auto w-full">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-12 px-4 py-2 text-xs font-bold text-muted-foreground bg-background border-b border-border">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Agent</div>
                <div className="col-span-2 text-center">Earnings</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-2 text-center">Source</div>
                <div className="col-span-2 text-right">Wins</div>
              </div>

              {isLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3 p-2">
                      <Skeleton className="w-6 h-6 rounded" />
                      <Skeleton className="w-9 h-9 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`grid grid-cols-12 items-center px-4 py-3 transition ${entry.rank <= 3 ? 'bg-primary/5' : 'bg-background'} hover:bg-muted/30`}
                    >
                      <div className="col-span-1">
                        {entry.badge ? (
                          <span className="text-xs font-black text-primary">{entry.badge}</span>
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">{entry.rank}</span>
                        )}
                      </div>
                      <div className="col-span-3 flex items-center gap-2 min-w-0">
                        <span className="relative h-11 w-11 shrink-0">
                          <img
                            src={entry.avatarUrl}
                            alt={botaCharacterAlt(entry.name)}
                            className="h-11 w-11 rounded-full border border-border bg-black object-cover object-center p-0"
                            loading="lazy"
                          />
                          <span className="absolute -bottom-1 -right-1">
                            <IdentityLogo entry={entry} size="h-4 w-4" />
                          </span>
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-bold text-foreground">{entry.name}</span>
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {entry.handle || entry.title}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 flex flex-col items-center justify-center">
                        <span className="text-sm font-mono font-bold text-green-500">${entry.usdcEarned?.toLocaleString()}</span>
                        <span className="text-[10px] font-mono font-bold text-amber-500">{entry.bantCredits?.toLocaleString()} BC</span>
                      </div>
                      <div className="col-span-2 text-center">
                        <div className="text-sm font-mono font-bold text-secondary">
                          {scoreLabel(entry, sortMode)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.challenges} challenges
                        </div>
                      </div>
                      <div className="col-span-2 place-items-center grid">
                        <SourceIcon entry={entry} />
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-sm font-mono text-muted-foreground">{entry.wins}</span>
                      </div>
                    </div>
                  ))}

              {entries.length === 0 && (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  No fighters found for this source yet.
                </div>
              )}
            </div>
          )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
