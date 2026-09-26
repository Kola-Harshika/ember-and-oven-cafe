/**
 * Ticket Match deck logic.
 *
 * Pure functions, no React: the board is always six pairs (twelve cards), it is
 * shuffled afresh on every round, and the dishes from the guest's own order are used
 * first, topped up from the menu so the board is never smaller than six pairs.
 */

export const PAIR_COUNT = 6;
export const CARD_COUNT = PAIR_COUNT * 2;

export interface MemoryCard {
  id: string;
  /** cards sharing a pair value match each other */
  pair: number;
  label: string;
}

/** Ticket faces used to top the board up when the order itself has fewer dishes. */
const FALLBACK_LABELS = [
  'Margherita',
  'Double Pepperoni',
  'Quattro Formaggi',
  'Truffle Fries',
  'Peri Peri Fries',
  'Onion Rings',
  'Cookie Crumb Shake',
  'Cold Brew Shake',
  'Salted Caramel Shake',
  'Cheese Burst',
];

/**
 * Exactly `count` distinct labels: the order's dishes first, then the house list.
 * Duplicates are dropped, because two pairs with the same name would be unfair.
 */
export function resolveLabels(preferred: string[], count = PAIR_COUNT): string[] {
  const labels: string[] = [];

  const add = (candidate: string | undefined) => {
    const clean = candidate?.trim();
    if (!clean || labels.includes(clean) || labels.length >= count) return;
    labels.push(clean);
  };

  for (const label of preferred) add(label);
  for (const label of FALLBACK_LABELS) add(label);

  return labels;
}

/** Fisher–Yates; the random source is injectable so the shuffle can be tested. */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    const held = copy[index];
    copy[index] = copy[swapWith];
    copy[swapWith] = held;
  }

  return copy;
}

/** Builds a freshly shuffled twelve-card board. */
export function buildDeck(preferred: string[], random: () => number = Math.random): MemoryCard[] {
  const labels = resolveLabels(preferred);
  const cards: MemoryCard[] = [];

  labels.forEach((label, pair) => {
    cards.push({ id: `card-${pair}-a`, pair, label });
    cards.push({ id: `card-${pair}-b`, pair, label });
  });

  return shuffle(cards, random);
}
