/** The full menu: categories, items and lookup helpers. */
import type { Category, CategoryId, MenuItem } from './types';
import { PIZZA_ITEMS } from './items/pizzas';
import { FRY_ITEMS } from './items/fries';
import { SHAKE_ITEMS } from './items/shakes';
import { searchMatches } from '../lib/search';

export const CATEGORIES: Category[] = [
  {
    id: 'pizza',
    name: 'Wood-Fired Pizza',
    shortName: 'Pizza',
    tagline: '90 seconds at 450°C',
    blurb:
      '48-hour cold-proofed dough, blistered in the stone oven and finished at the pass. Pick a size, a crust and let the preview show you exactly what you will get.',
    accent: 'ember',
    image: '/img/pizza-pepperoni.jpg',
    craftNote: 'Sauce, cheese, crust and every topping is yours to set.',
  },
  {
    id: 'fries',
    name: 'Hand-Cut Fries & Sides',
    shortName: 'Fries',
    tagline: 'Cut at 7am, fried to order',
    blurb:
      'Maris Pipers cut each morning, blanched, rested and dropped again when you order. Choose the cut, the seasoning and the dips that come on the side.',
    accent: 'herb',
    image: '/img/fries-periperi.jpg',
    craftNote: 'Cut, seasoning and up to three dips — we pack them separately.',
  },
  {
    id: 'shakes',
    name: 'Thick Shakes',
    shortName: 'Shakes',
    tagline: 'Stands up in the glass',
    blurb:
      'Blended with real ice cream and cold milk, thinned down with nothing. Build a shake in a tulip glass, a tall glass or a mason jar.',
    accent: 'berry',
    image: '/img/shake-oreo.jpg',
    craftNote: 'Size, base, sweetness, blend-ins and the topping crown.',
  },
];

export const MENU_ITEMS: MenuItem[] = [...PIZZA_ITEMS, ...FRY_ITEMS, ...SHAKE_ITEMS];

const ITEM_INDEX = new Map(MENU_ITEMS.map((item) => [item.id, item]));

export function getItem(id: string | undefined): MenuItem | undefined {
  return id ? ITEM_INDEX.get(id) : undefined;
}

export function itemsByCategory(category: CategoryId): MenuItem[] {
  return MENU_ITEMS.filter((item) => item.category === category);
}

export function getCategory(id: CategoryId): Category {
  return CATEGORIES.find((category) => category.id === id) ?? CATEGORIES[0];
}

/** Hand-picked line-up for the home page. */
export const FEATURED_IDS = [
  'double-pepperoni',
  'truffle-parmesan',
  'burrata-rocket',
  'cookie-crumb-shake',
] as const;

export function featuredItems(): MenuItem[] {
  return FEATURED_IDS.map((id) => ITEM_INDEX.get(id)).filter((item): item is MenuItem => Boolean(item));
}

export const TAG_LABELS: Record<string, string> = {
  veg: 'Vegetarian',
  vegan: 'Vegan option',
  'non-veg': 'Contains meat',
  spicy: 'Spicy',
  classic: 'Classic',
  rich: 'Rich',
  fruity: 'Fruity',
  caffeinated: 'Caffeinated',
  bestseller: 'Bestseller',
  'sweet-heat': 'Sweet heat',
};

/**
 * Everything about an item a guest might reasonably type: its own copy, its dietary
 * tags, and the vocabulary of its counter (name, tagline, blurb and craft notes).
 *
 * The counter's words are what make a category-wide query work — "pizza" returns the
 * whole wood-fired section, "fries" the whole fries counter, "blend-ins" the shake bar —
 * without a special case for any of them.
 */
function searchableFields(item: MenuItem): string[] {
  const category = getCategory(item.category);

  return [
    item.name,
    item.shortName,
    item.tagline,
    item.description,
    ...item.tags,
    category.name,
    category.shortName,
    category.tagline,
    category.blurb,
    category.craftNote,
  ];
}

/**
 * Search the menu. One general matcher for every counter: case-insensitive,
 * whitespace- and punctuation-tolerant, plural-aware and partial-match friendly.
 * An empty query means "no filter", exactly as before.
 */
export function searchItems(query: string, category: CategoryId | 'all' = 'all'): MenuItem[] {
  return MENU_ITEMS.filter((item) => {
    if (category !== 'all' && item.category !== category) return false;
    return searchMatches(searchableFields(item), query);
  });
}

export * from './types';
export * from './customizations';
