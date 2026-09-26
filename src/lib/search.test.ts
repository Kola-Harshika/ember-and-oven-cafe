/**
 * The search engine itself: normalising, stemming, term expansion and matching rules.
 */
import { describe, expect, it } from 'vitest';
import { buildTokenSet, normalise, parseQuery, searchMatches, stem, tokenise } from './search';

describe('normalise', () => {
  it('lowercases, trims and collapses whitespace', () => {
    expect(normalise('  Peri   PERI  ')).toBe('peri peri');
  });

  it('treats punctuation and hyphens as separators', () => {
    expect(normalise('Wood-Fired 450°C')).toBe('wood fired 450 c');
    expect(normalise('Hand-Cut, Fries & Sides!')).toBe('hand cut fries sides');
  });

  it('folds accents', () => {
    expect(normalise('Crème Brûlée')).toBe('creme brulee');
  });
});

describe('stem', () => {
  it('folds simple plurals', () => {
    expect(stem('shakes')).toBe('shake');
    expect(stem('pizzas')).toBe('pizza');
    expect(stem('fries')).toBe('fry');
    expect(stem('wedges')).toBe('wedge');
    expect(stem('sides')).toBe('side');
    expect(stem('dips')).toBe('dip');
  });

  it('leaves words that merely end in s alone', () => {
    expect(stem('glass')).toBe('glass');
    expect(stem('swiss')).toBe('swiss');
    expect(stem('analysis')).toBe('analysis');
  });
});

describe('tokenise and buildTokenSet', () => {
  it('stores every word raw and stemmed', () => {
    const tokens = buildTokenSet(['Classic Salted Fries']);

    expect(tokens.has('fries')).toBe(true);
    expect(tokens.has('fry')).toBe(true);
    expect(tokens.has('salted')).toBe(true);
  });

  it('ignores empty fields', () => {
    expect(buildTokenSet(['', undefined, null]).size).toBe(0);
    expect(tokenise('   ')).toEqual([]);
  });
});

describe('parseQuery', () => {
  it('keeps one term per word and drops stop words', () => {
    expect(parseQuery('french fries')).toHaveLength(2);
    expect(parseQuery('the salted caramel')).toHaveLength(2);
    expect(parseQuery('the of and')).toHaveLength(0);
  });

  it('expands concepts so fry, chips and french describe the same thing', () => {
    const [term] = parseQuery('french');
    expect(term.alternatives).toContain('french');
    expect(term.alternatives).toContain('fry');
    expect(term.alternatives).toContain('chip');
  });

  it('expands shorthands without touching the rest of the query', () => {
    const terms = parseQuery('choc shake');
    expect(terms[0].alternatives).toContain('cocoa');
    expect(terms[0].alternatives).toContain('chocolate');
    expect(terms[1].alternatives).toContain('milkshake');
  });
});

describe('matching', () => {
  const fries = ['Peri Peri Masala Fries', 'Hand-Cut Fries & Sides', 'Cut at 7am, fried to order'];

  it('matches a word from its first letters', () => {
    expect(searchMatches(fries, 'peri')).toBe(true);
    expect(searchMatches(fries, 'frie')).toBe(true);
    expect(searchMatches(fries, 'mas')).toBe(true);
  });

  it('requires every term of a multi-word query to be present', () => {
    expect(searchMatches(fries, 'peri fries')).toBe(true);
    expect(searchMatches(fries, 'peri shake')).toBe(false);
  });

  it('is case, whitespace and punctuation tolerant', () => {
    expect(searchMatches(fries, '  FRIES  ')).toBe(true);
    expect(searchMatches(['Wood-Fired Pizza'], 'wood fired')).toBe(true);
    expect(searchMatches(['Wood-Fired Pizza'], 'wood-fired')).toBe(true);
  });

  it('handles plurals in either direction', () => {
    expect(searchMatches(['Salted Caramel Shake'], 'shakes')).toBe(true);
    expect(searchMatches(['Thick Shakes'], 'shake')).toBe(true);
  });

  it('returns everything for an empty or stop-words-only query', () => {
    expect(searchMatches(fries, '')).toBe(true);
    expect(searchMatches(fries, '   ')).toBe(true);
    expect(searchMatches(fries, 'the')).toBe(true);
  });

  it('does not match unrelated text', () => {
    expect(searchMatches(fries, 'pepperoni')).toBe(false);
    expect(searchMatches(fries, 'chocolate')).toBe(false);
  });

  it('only extends a query term forwards, never truncates it', () => {
    // "pepper" prefixes "pepperoni", but typing "pepperoni" must not match "pepper"
    expect(searchMatches(['Cracked Pepper Wedges'], 'pepper')).toBe(true);
    expect(searchMatches(['Cracked Pepper Wedges'], 'pepperoni')).toBe(false);
  });
});
