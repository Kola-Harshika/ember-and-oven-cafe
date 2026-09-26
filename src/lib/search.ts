/**
 * Café search.
 *
 * One pipeline for every counter — there is no per-category rule anywhere in here:
 *
 *   normalise → tokenise → stem → expand the query's terms → every term must match
 *
 * A term matches when the text contains it exactly or as the *start* of a word, so
 * "pep" finds Pepperoni and "pizz" finds Pizza. Terms are combined with AND, which is
 * what makes a multi-word query behave like a guest expects.
 *
 * Queries are expanded through a small concept lexicon (`fry`/`chips`/`french`,
 * `shake`/`milkshake`, `choc`/`cocoa`, dietary tags). The lexicon only rewrites the
 * words the guest typed — the matcher still has to find them in the item's own text,
 * so nothing here targets a particular dish or category.
 */

/** Words that carry no meaning on their own, dropped from queries. */
const STOP_WORDS = new Set(['a', 'an', 'and', 'at', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

/** Spellings a guest uses interchangeably for the same thing. */
const CONCEPT_GROUPS: readonly string[][] = [
  ['fry', 'fries', 'chip', 'chips', 'french'],
  ['shake', 'shakes', 'milkshake', 'milkshakes', 'thickshake'],
  ['choc', 'choco', 'chocolate', 'cocoa'],
  ['veg', 'vegan', 'vegetarian'],
];

/** Lowercase, accent-folded, punctuation-as-space, single-spaced. */
export function normalise(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Conservative English plural folding, applied to both sides of the comparison:
 * shakes→shake, pizzas→pizza, fries→fry, wedges→wedge, sides→side.
 * Words that merely end in "s" (glass, swiss, analysis) are left alone.
 */
export function stem(token: string): string {
  if (token.length <= 3) return token;
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (/(?:s|x|z|ch|sh)es$/.test(token)) return token.slice(0, -2);
  if (token.endsWith('s') && !/(?:ss|us|is)$/.test(token)) return token.slice(0, -1);
  return token;
}

export function tokenise(input: string): string[] {
  return normalise(input).split(' ').filter(Boolean);
}

/** Every word in the given fields, stored raw *and* stemmed. */
export function buildTokenSet(fields: readonly (string | undefined | null)[]): Set<string> {
  const tokens = new Set<string>();

  for (const field of fields) {
    if (!field) continue;
    for (const token of tokenise(field)) {
      tokens.add(token);
      tokens.add(stem(token));
    }
  }

  return tokens;
}

/** One query term, with every spelling that satisfies it. */
export interface SearchTerm {
  alternatives: string[];
}

export function parseQuery(query: string): SearchTerm[] {
  const terms: SearchTerm[] = [];

  for (const raw of tokenise(query)) {
    if (STOP_WORDS.has(raw)) continue;

    const alternatives = new Set<string>();
    const add = (value: string) => {
      alternatives.add(value);
      alternatives.add(stem(value));
    };

    add(raw);
    for (const group of CONCEPT_GROUPS) {
      if (group.includes(raw) || group.includes(stem(raw))) group.forEach(add);
    }

    terms.push({ alternatives: [...alternatives] });
  }

  return terms;
}

/** Exact hit, or the query term is the beginning of a word in the text. */
function termMatches(tokens: Set<string>, term: SearchTerm): boolean {
  for (const alternative of term.alternatives) {
    if (tokens.has(alternative)) return true;
    for (const token of tokens) {
      if (token.startsWith(alternative)) return true;
    }
  }
  return false;
}

/** AND across terms, OR inside a term's alternatives. */
export function matchesTerms(tokens: Set<string>, terms: readonly SearchTerm[]): boolean {
  return terms.every((term) => termMatches(tokens, term));
}

/**
 * True when every term of the query appears somewhere in the given text fields.
 * An empty query — or one made only of stop words — matches everything, so the menu
 * simply shows the full list, exactly like no filter.
 */
export function searchMatches(fields: readonly (string | undefined | null)[], query: string): boolean {
  const terms = parseQuery(query);
  if (terms.length === 0) return true;
  return matchesTerms(buildTokenSet(fields), terms);
}
