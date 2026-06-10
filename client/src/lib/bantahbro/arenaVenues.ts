export type ArenaVenue = {
  label: string;
};

type ArenaVenueSide = {
  chainLabel?: string | null;
  tokenName?: string | null;
  agentName?: string | null;
  label?: string | null;
};

type ArenaVenueBattle = {
  sides?: readonly ArenaVenueSide[] | null;
};

const ARENA_VENUES: ArenaVenue[] = [
  { label: 'Neon Ring' },
  { label: 'Signal Dome' },
  { label: 'Circuit Pit' },
  { label: 'Oracle Yard' },
  { label: 'Velocity Deck' },
  { label: 'Apex Vault' },
  { label: 'Pulse Arena' },
  { label: 'Quantum Court' },
  { label: 'Launch Bay' },
  { label: 'Base Chamber' },
  { label: 'Vector Hall' },
  { label: 'Skyline Stage' },
];

function hashArenaSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function arenaVenueForBattle(seed?: string | null, fallbackIndex = 0): ArenaVenue {
  const normalizedSeed = seed?.trim() || `arena:${fallbackIndex}`;
  return ARENA_VENUES[hashArenaSeed(normalizedSeed) % ARENA_VENUES.length];
}

export function arenaLabelForBattle(seed?: string | null, fallbackIndex = 0) {
  return arenaVenueForBattle(seed, fallbackIndex).label;
}

function sourceTextForSide(side?: ArenaVenueSide | null) {
  return [
    side?.chainLabel,
    side?.tokenName,
    side?.agentName,
    side?.label,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function sourceArenaLabelForBattle(battle?: ArenaVenueBattle | null) {
  const sides = battle?.sides || [];
  const sourceTexts = sides.map(sourceTextForSide);
  if (!sourceTexts.length) return null;

  const firstElizaIndex = sourceTexts.findIndex((text) => text.includes('eliza'));
  const firstVirtualsIndex = sourceTexts.findIndex((text) => text.includes('virtual'));

  if (firstElizaIndex !== -1 && firstVirtualsIndex !== -1) {
    return firstElizaIndex <= firstVirtualsIndex ? 'ElizaOS Arena' : 'Virtuals Protocol Arena';
  }
  if (firstElizaIndex !== -1) return 'ElizaOS Arena';
  if (firstVirtualsIndex !== -1) return 'Virtuals Protocol Arena';
  return null;
}

export function arenaLabelForBattleWithSources(
  battle: ArenaVenueBattle | null | undefined,
  seed?: string | null,
  fallbackIndex = 0,
) {
  return sourceArenaLabelForBattle(battle) || arenaLabelForBattle(seed, fallbackIndex);
}
