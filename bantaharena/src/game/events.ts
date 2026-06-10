import type { NftFighter } from "../battle/types";

export const ARENA_LOAD_EVENT = "bantaharena:load";
export const ARENA_PLAY_EVENT = "bantaharena:play";
export const ARENA_RESET_EVENT = "bantaharena:reset";
export const ARENA_COMPLETE_EVENT = "bantaharena:complete";

export interface ArenaLoadPayload {
  left: NftFighter;
  right: NftFighter;
}

export interface ArenaPlayPayload {
  left: NftFighter;
  right: NftFighter;
  seed: string;
}

export function emitArenaLoad(payload: ArenaLoadPayload) {
  window.dispatchEvent(new CustomEvent<ArenaLoadPayload>(ARENA_LOAD_EVENT, { detail: payload }));
}

export function emitArenaPlay(payload: ArenaPlayPayload) {
  window.dispatchEvent(new CustomEvent<ArenaPlayPayload>(ARENA_PLAY_EVENT, { detail: payload }));
}

export function emitArenaReset() {
  window.dispatchEvent(new CustomEvent(ARENA_RESET_EVENT));
}
