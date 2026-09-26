/**
 * Row → domain mappers for the menu.
 *
 * The database stores the menu flat (with JSON payload columns) and these mappers
 * rebuild exactly the shapes the frontend already consumes, so the UI needed no
 * changes when the data moved into SQLite.
 */
import type { Category, MenuItem, OptionChoice, OptionGroup } from '../../../src/data/types.ts';

export interface CategoryRow {
  id: string;
  name: string;
  short_name: string;
  tagline: string;
  blurb: string;
  accent: string;
  image: string;
  craft_note: string;
}

export interface ItemRow {
  id: string;
  category_id: string;
  name: string;
  short_name: string;
  tagline: string;
  description: string;
  price: number;
  image: string;
  tags: string;
  badge: string | null;
  heat: number;
  prep_minutes: number;
  rating: number;
  ordered_times: number;
  nutrition: string;
  pairings: string;
  art: string;
  preset: string | null;
  available: number;
}

export interface GroupRow {
  id: string;
  item_id: string;
  label: string;
  helper: string | null;
  type: 'single' | 'multi';
  is_required: number;
  min_select: number | null;
  max_select: number | null;
  slot: OptionGroup['slot'];
}

export interface ChoiceRow {
  item_id: string;
  group_id: string;
  id: string;
  label: string;
  hint: string | null;
  price: number;
  badge: string | null;
  art: string | null;
  is_default: number;
}

/** Defensive JSON parse: a corrupt column must never take the whole menu down. */
function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toCategory(row: CategoryRow): Category {
  return {
    id: row.id as Category['id'],
    name: row.name,
    shortName: row.short_name,
    tagline: row.tagline,
    blurb: row.blurb,
    accent: row.accent as Category['accent'],
    image: row.image,
    craftNote: row.craft_note,
  };
}

export function toChoice(row: ChoiceRow): OptionChoice {
  return {
    id: row.id,
    label: row.label,
    ...(row.hint ? { hint: row.hint } : {}),
    price: row.price,
    ...(row.badge ? { badge: row.badge } : {}),
    ...(row.art ? { art: row.art } : {}),
    ...(row.is_default ? { default: true } : {}),
  };
}

export function toGroup(row: GroupRow, choices: OptionChoice[]): OptionGroup {
  return {
    id: row.id,
    label: row.label,
    ...(row.helper ? { helper: row.helper } : {}),
    type: row.type,
    ...(row.is_required ? { required: true } : {}),
    ...(row.min_select !== null ? { min: row.min_select } : {}),
    ...(row.max_select !== null ? { max: row.max_select } : {}),
    slot: row.slot,
    choices,
  };
}

const EMPTY_NUTRITION = { energy: '—', protein: '—', carbs: '—', fat: '—' };

export function toItem(row: ItemRow, groups: OptionGroup[]): MenuItem {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    category: row.category_id as MenuItem['category'],
    tagline: row.tagline,
    description: row.description,
    price: row.price,
    image: row.image,
    tags: parseJson<string[]>(row.tags, []),
    ...(row.badge ? { badge: row.badge } : {}),
    heat: row.heat,
    prepMinutes: row.prep_minutes,
    rating: row.rating,
    orderedTimes: row.ordered_times,
    nutrition: parseJson<MenuItem['nutrition']>(row.nutrition, EMPTY_NUTRITION),
    pairings: parseJson<string[]>(row.pairings, []),
    art: parseJson<string[]>(row.art, []),
    ...(row.preset ? { preset: parseJson<Record<string, string[]>>(row.preset, {}) } : {}),
    groups,
  };
}
