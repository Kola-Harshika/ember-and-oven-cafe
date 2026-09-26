/**
 * The board maths for Ticket Match.
 *
 * This is the regression guard for the bug where a single-dish order dealt a two-card
 * board: the deck must always be six pairs, use the order's own dishes, never repeat a
 * label, and be shuffled by the random source it is given.
 */
import { describe, expect, it } from 'vitest';
import { buildDeck, CARD_COUNT, PAIR_COUNT, resolveLabels, shuffle } from './memoryDeck';

function pairCounts(cards: { pair: number }[]): number[] {
  const counts = new Map<number, number>();
  for (const card of cards) counts.set(card.pair, (counts.get(card.pair) ?? 0) + 1);
  return [...counts.values()];
}

describe('resolveLabels', () => {
  it('tops a small order up to six distinct dishes', () => {
    const labels = resolveLabels(['Double Pepperoni']);
    expect(labels).toHaveLength(PAIR_COUNT);
    expect(new Set(labels).size).toBe(PAIR_COUNT);
    expect(labels[0]).toBe('Double Pepperoni');
  });

  it('never repeats a label, even if the order lists the same dish twice', () => {
    const labels = resolveLabels(['Truffle Fries', 'Truffle Fries', 'Truffle Fries']);
    expect(labels).toHaveLength(PAIR_COUNT);
    expect(labels.filter((label) => label === 'Truffle Fries')).toHaveLength(1);
  });

  it('ignores blank entries', () => {
    expect(resolveLabels(['', '   '])).toHaveLength(PAIR_COUNT);
  });
});

describe('buildDeck', () => {
  it('always deals twelve cards forming six pairs', () => {
    const deck = buildDeck(['Double Pepperoni']);

    expect(deck).toHaveLength(CARD_COUNT);
    expect(new Set(deck.map((card) => card.id)).size).toBe(CARD_COUNT);
    expect(pairCounts(deck)).toEqual(Array(PAIR_COUNT).fill(2));
  });

  it('keeps the dishes from the order on the board', () => {
    const deck = buildDeck(['Double Pepperoni', 'Cookie Crumb Shake']);
    const labels = new Set(deck.map((card) => card.label));

    expect(labels.size).toBe(PAIR_COUNT);
    expect(labels.has('Double Pepperoni')).toBe(true);
    expect(labels.has('Cookie Crumb Shake')).toBe(true);
  });

  it('pairs each label exactly twice', () => {
    const deck = buildDeck(['Quattro Formaggi']);

    for (const card of deck) {
      expect(deck.filter((other) => other.label === card.label)).toHaveLength(2);
    }
  });
});

describe('shuffle', () => {
  it('is driven entirely by the random source, so every round can differ', () => {
    const items = [1, 2, 3, 4];

    // a source that always picks the first index, and one that never swaps
    expect(shuffle(items, () => 0)).toEqual([2, 3, 4, 1]);
    expect(shuffle(items, () => 0.999)).toEqual([1, 2, 3, 4]);
    expect(items).toEqual([1, 2, 3, 4]); // the input is not mutated
  });

  it('keeps the same cards, only in another order', () => {
    const deck = buildDeck(['Margherita'], () => 0.5);
    const again = buildDeck(['Margherita'], () => 0.9);

    expect([...deck.map((card) => card.id)].sort()).toEqual([...again.map((card) => card.id)].sort());
    expect(deck.map((card) => card.id).join()).not.toBe(again.map((card) => card.id).join());
  });
});
