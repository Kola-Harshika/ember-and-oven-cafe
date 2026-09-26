/**
 * Menu search, checked against the real catalogue with the searches guests actually type.
 *
 * These are the regression tests for the bug where a single substring match meant
 * "pizza" returned one dish, "shakes"/"milkshake"/"french fries" returned nothing, and
 * a whole counter could not be found by its own name.
 */
import { describe, expect, it } from 'vitest';
import { itemsByCategory, MENU_ITEMS, searchItems } from './menu';
import type { CategoryId } from './types';

const ids = (items: { id: string }[]) => items.map((item) => item.id).sort();
const counter = (category: CategoryId) => ids(itemsByCategory(category));

/** Every result must belong to one of the expected counters. */
function expectOnlyCounters(query: string, ...categories: CategoryId[]) {
  const allowed = new Set(categories.flatMap((category) => counter(category)));
  const strays = searchItems(query)
    .filter((item) => !allowed.has(item.id))
    .map((item) => item.id);

  expect(strays, `unrelated results for "${query}"`).toEqual([]);
}

describe('category-wide searches', () => {
  it('returns every pizza for pizza, pizz, pizzas, padded capitals and its counter name', () => {
    const expected = counter('pizza');
    expect(expected).toHaveLength(6);

    for (const query of ['pizza', 'PIZZA', 'pizz', 'pizzas', '  PIZZA  ', 'wood-fired', 'wood fired']) {
      expect(ids(searchItems(query)), query).toEqual(expected);
    }
  });

  it('returns every fries-counter item for fries, french fries, french and chips', () => {
    const expected = counter('fries');
    expect(expected).toHaveLength(6);

    for (const query of ['fries', 'french fries', 'FRENCH FRIES', 'french', 'chips']) {
      expect(ids(searchItems(query)), query).toEqual(expected);
    }
  });

  it('returns every shake for shake, shakes, milkshake and thickshake', () => {
    const expected = counter('shakes');
    expect(expected).toHaveLength(5);

    for (const query of ['shake', 'shakes', 'SHAKES', 'milkshake', 'milkshakes', 'thickshake']) {
      expect(ids(searchItems(query)), query).toEqual(expected);
    }
  });

  it('never mixes counters for a counter-wide query', () => {
    expectOnlyCounters('pizza', 'pizza');
    expectOnlyCounters('fries', 'fries');
    expectOnlyCounters('french fries', 'fries');
    expectOnlyCounters('milkshake', 'shakes');
  });
});

describe('partial and multi-word searches', () => {
  it('matches a dish from the first letters of a word', () => {
    // "pep" reaches every dish whose text says pepper or pepperoni: the wedges, the
    // pepperoni pizza, and the salami pizza (cracked pepper in its description).
    expect(ids(searchItems('pep'))).toEqual(['cracked-pepper-wedges', 'double-pepperoni', 'salami-rustica']);
    expectOnlyCounters('pep', 'fries', 'pizza');
  });

  it('finds the chocolate items for choc', () => {
    // cocoa lives in the dark cocoa shake, chocolate in the cookie-crumb shake
    expect(ids(searchItems('choc'))).toEqual(['cookie-crumb-shake', 'dark-cocoa-shake']);
  });

  it('never stretches a longer word onto a shorter one', () => {
    // "pepper" is a prefix of "pepperoni", but searching "pepperoni" must not match "pepper"
    expect(ids(searchItems('pepperoni'))).toEqual(['double-pepperoni']);
  });

  it('treats multi-word queries as "all of these words"', () => {
    expect(ids(searchItems('peri peri'))).toEqual(['peri-peri-fries']);
    expect(ids(searchItems('salted caramel'))).toEqual(['salted-caramel-shake']);
    expect(ids(searchItems('cold brew'))).toEqual(['slow-cold-brew-shake']);
    expect(ids(searchItems('pepper wedges'))).toEqual(['cracked-pepper-wedges']);
    expect(ids(searchItems('truffle fries'))).toEqual(['truffle-parmesan']);
  });

  it('finds the one dish called truffle', () => {
    expect(ids(searchItems('truffle'))).toEqual(['truffle-parmesan']);
  });

  it('understands each counter’s own vocabulary', () => {
    expect(ids(searchItems('blend-ins'))).toEqual(counter('shakes'));
    expect(ids(searchItems('dips'))).toEqual(counter('fries'));
    expect(ids(searchItems('crust'))).toEqual(counter('pizza'));
  });
});

describe('names, filters and empty searches', () => {
  it('finds every item by its full name', () => {
    for (const item of MENU_ITEMS) {
      expect(ids(searchItems(item.name)), item.name).toContain(item.id);
    }
  });

  it('finds every item by its short name', () => {
    for (const item of MENU_ITEMS) {
      expect(ids(searchItems(item.shortName)), item.shortName).toContain(item.id);
    }
  });

  it('returns the whole menu for an empty, blank or stop-words-only query', () => {
    expect(searchItems('')).toHaveLength(MENU_ITEMS.length);
    expect(searchItems('    ')).toHaveLength(MENU_ITEMS.length);
    expect(searchItems('the')).toHaveLength(MENU_ITEMS.length);
  });

  it('still respects the category filter', () => {
    expect(ids(searchItems('', 'shakes'))).toEqual(counter('shakes'));
    expect(ids(searchItems('fries', 'fries'))).toEqual(counter('fries'));
    expect(ids(searchItems('pepperoni', 'shakes'))).toEqual([]);
  });

  it('gives the same answer whatever the case', () => {
    const queries = ['fries', 'french fries', 'shake', 'shakes', 'milkshake', 'pizza', 'pep', 'choc', 'french'];

    for (const query of queries) {
      expect(ids(searchItems(query.toUpperCase())), query).toEqual(ids(searchItems(query)));
    }
  });
});
