/** Shared domain types for the Ember & Oven menu. */

export type CategoryId = 'pizza' | 'fries' | 'shakes';

export interface Category {
  id: CategoryId;
  name: string;
  shortName: string;
  tagline: string;
  blurb: string;
  /** emoji-free accent used by the CSS design system */
  accent: 'ember' | 'herb' | 'berry';
  image: string;
  /** copy shown in the customiser header */
  craftNote: string;
}

export interface OptionChoice {
  id: string;
  label: string;
  hint?: string;
  /** price delta in whole rupees; may be negative (e.g. "no cheese") */
  price: number;
  /** small pill rendered next to the label */
  badge?: string;
  /** key understood by the SVG food renderer */
  art?: string;
  default?: boolean;
}

export interface OptionGroup {
  id: string;
  label: string;
  helper?: string;
  type: 'single' | 'multi';
  /** single groups only: a choice must be selected */
  required?: boolean;
  /** multi groups only */
  min?: number;
  max?: number;
  /** heading that groups chip pickers in the UI */
  slot: 'size' | 'build' | 'flavour' | 'toppers' | 'finish';
  choices: OptionChoice[];
}

export interface Nutrition {
  energy: string;
  protein: string;
  carbs: string;
  fat: string;
}

export interface MenuItem {
  id: string;
  name: string;
  shortName: string;
  category: CategoryId;
  tagline: string;
  description: string;
  /** base price in whole rupees, before customisation */
  price: number;
  image: string;
  tags: string[];
  badge?: string;
  /** 0 = no heat, 1 = gentle, 2 = warm, 3 = fiery */
  heat: number;
  /** minutes of kitchen time this dish needs */
  prepMinutes: number;
  rating: number;
  orderedTimes: number;
  nutrition: Nutrition;
  /** pairs shown on the item page */
  pairings: string[];
  /** baseline art keys, merged with the selected choices' art keys */
  art: string[];
  /** "house pick" options pre-ticked when the guest opens the item */
  preset?: Record<string, string[]>;
  groups: OptionGroup[];
}

/** Map of groupId -> selected choice id (single) or choice ids (multi). */
export type Selection = Record<string, string[]>;

/** A configured dish: menu item + the guest's selection. */
export interface ConfiguredItem {
  itemId: string;
  selection: Selection;
  note?: string;
}

export interface CartLine extends ConfiguredItem {
  /** unique per configured line */
  lineId: string;
  quantity: number;
}
