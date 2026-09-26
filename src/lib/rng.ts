/**
 * Deterministic pseudo-random helpers.
 *
 * The order experience (kitchen log lines, courier name, game layouts) should
 * feel random to the guest but must stay stable across re-renders and page
 * refreshes, so every "random" value is derived from a seed string.
 */

export type Rng = {
  /** float in [0, 1) */
  next: () => number;
  /** integer in [min, max] inclusive */
  int: (min: number, max: number) => number;
  /** float in [min, max) */
  range: (min: number, max: number, decimals?: number) => number;
  /** true with the given probability */
  chance: (probability: number) => boolean;
  /** one element of a non-empty array */
  pick: <T>(items: readonly T[]) => T;
  /** a new shuffled copy */
  shuffle: <T>(items: readonly T[]) => T[];
};

/** FNV-1a style string hash turned into a 32 bit unsigned integer. */
export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Small, fast, seedable generator (mulberry32). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed: string | number): Rng {
  const next = mulberry32(typeof seed === 'number' ? seed : hashString(seed));

  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min;

  return {
    next,
    int,
    range: (min, max, decimals = 2) => {
      const value = next() * (max - min) + min;
      const factor = 10 ** decimals;
      return Math.round(value * factor) / factor;
    },
    chance: (probability) => next() < probability,
    pick: <T,>(items: readonly T[]): T => items[int(0, items.length - 1)],
    shuffle: <T,>(items: readonly T[]): T[] => {
      const copy = items.slice();
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = int(0, i);
        const swap = copy[i];
        copy[i] = copy[j];
        copy[j] = swap;
      }
      return copy;
    },
  };
}

/** Stable id generator for cart lines and orders. */
export function uid(prefix = 'id'): string {
  const stamp = Date.now().toString(36);
  const noise = Math.floor(Math.random() * 0xffffff).toString(36);
  return `${prefix}_${stamp}${noise}`;
}

/** Human friendly order code, e.g. "EO-4K7Q2". */
export function orderCode(seed = Date.now().toString()): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rng = makeRng(`order-code-${seed}`);
  let code = '';
  for (let i = 0; i < 5; i += 1) code += alphabet[rng.int(0, alphabet.length - 1)];
  return `EO-${code}`;
}
