import type { FighterClass, FighterStats, NftFighter } from "../battle/types";

export const sampleFighters: NftFighter[] = [
  makeFighter({
    id: "pudgy-221",
    name: "Pudgy #221",
    collection: "Pudgy Penguins",
    className: "tank",
    colors: ["#d7fff7", "#37d6ff", "#f4fbff"],
    traits: ["Ice Trait", "Beanie", "Round Eyes"],
    stats: {
      hp: 148,
      attack: 18,
      defense: 18,
      speed: 10,
      crit: 0.11,
      range: 92,
      cooldown: 1150
    }
  }),
  makeFighter({
    id: "azuki-88",
    name: "Azuki #88",
    collection: "Azuki",
    className: "striker",
    colors: ["#ffdee8", "#ff385c", "#111111"],
    traits: ["Angry Eyes", "Red Kimono", "Blade Aura"],
    stats: {
      hp: 112,
      attack: 25,
      defense: 8,
      speed: 17,
      crit: 0.2,
      range: 96,
      cooldown: 900
    }
  }),
  makeFighter({
    id: "hypurr-404",
    name: "Hypurr #404",
    collection: "Hypurr",
    className: "trickster",
    colors: ["#fff2a8", "#00e676", "#252525"],
    traits: ["Neon Fur", "Glitch Tail", "Side Eye"],
    stats: {
      hp: 104,
      attack: 20,
      defense: 7,
      speed: 21,
      crit: 0.24,
      range: 104,
      cooldown: 830
    }
  }),
  makeFighter({
    id: "kitty-77",
    name: "CryptoKitty #77",
    collection: "CryptoKitties",
    className: "frost",
    colors: ["#fff8fd", "#b56dff", "#56f0ff"],
    traits: ["Cool Shade", "Rare Paws", "Cloud Coat"],
    stats: {
      hp: 118,
      attack: 19,
      defense: 11,
      speed: 13,
      crit: 0.15,
      range: 118,
      cooldown: 1050
    }
  })
];

interface FighterInput {
  id: string;
  name: string;
  collection: string;
  className: FighterClass;
  colors: [string, string, string];
  traits: string[];
  stats: FighterStats;
}

function makeFighter(input: FighterInput): NftFighter {
  return {
    id: input.id,
    name: input.name,
    collection: input.collection,
    className: input.className,
    traits: input.traits,
    stats: input.stats,
    image: svgAvatar(input.name, input.collection, input.colors)
  };
}

function svgAvatar(name: string, collection: string, colors: [string, string, string]): string {
  const initials = name
    .split(/\s|#/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${colors[0]}"/>
        <stop offset="55%" stop-color="${colors[1]}"/>
        <stop offset="100%" stop-color="${colors[2]}"/>
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#000" flood-opacity=".35"/>
      </filter>
    </defs>
    <rect width="256" height="256" rx="38" fill="url(#bg)"/>
    <circle cx="128" cy="122" r="72" fill="#fff" opacity=".82" filter="url(#shadow)"/>
    <circle cx="102" cy="112" r="10" fill="#111"/>
    <circle cx="154" cy="112" r="10" fill="#111"/>
    <path d="M95 150 Q128 178 161 150" fill="none" stroke="#111" stroke-width="10" stroke-linecap="round"/>
    <text x="128" y="220" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" text-anchor="middle" fill="#111">${initials}</text>
    <text x="128" y="39" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" text-anchor="middle" fill="#111" opacity=".78">${collection}</text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
