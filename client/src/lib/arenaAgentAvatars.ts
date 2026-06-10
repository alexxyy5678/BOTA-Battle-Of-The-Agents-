import { BOTA_CHARACTER_AVATARS, botaCharacterAvatar } from './botaCharacterLayer';

export const ARENA_AGENT_AVATARS = BOTA_CHARACTER_AVATARS;

export function arenaAgentAvatar(seed?: string | null) {
  return botaCharacterAvatar(seed, seed);
}
