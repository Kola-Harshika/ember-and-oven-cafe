/**
 * Public surface for customisation: which groups each category offers plus the
 * helpers the cart uses to normalise a guest's selection.
 */
import type { CategoryId, OptionChoice, OptionGroup, Selection } from './types';
import { PIZZA_GROUPS } from './groups/pizza';
import { FRY_GROUPS } from './groups/fries';
import { SHAKE_GROUPS } from './groups/shakes';

export const CATEGORY_GROUPS: Record<CategoryId, OptionGroup[]> = {
  pizza: PIZZA_GROUPS,
  fries: FRY_GROUPS,
  shakes: SHAKE_GROUPS,
};

/** The selection a guest gets when they open an item fresh. */
export function defaultSelection(groups: OptionGroup[]): Selection {
  const selection: Selection = {};
  for (const group of groups) {
    if (group.type === 'single') {
      const preset = group.choices.find((choice) => choice.default) ?? group.choices[0];
      selection[group.id] = [preset.id];
    } else {
      selection[group.id] = [];
    }
  }
  return selection;
}

/** A dish can ship with a few "house pick" upgrades pre-ticked. */
export function applyPreset(selection: Selection, preset?: Record<string, string[]>): Selection {
  const next: Selection = { ...selection };
  if (!preset) return next;
  for (const [groupId, choiceIds] of Object.entries(preset)) {
    next[groupId] = [...choiceIds];
  }
  return next;
}

export function findChoice(group: OptionGroup, choiceId: string): OptionChoice | undefined {
  return group.choices.find((choice) => choice.id === choiceId);
}

export function findGroup(groups: OptionGroup[], groupId: string): OptionGroup | undefined {
  return groups.find((group) => group.id === groupId);
}

/** Drops ids that no longer exist (e.g. after we rename an option). */
export function sanitiseSelection(groups: OptionGroup[], selection: Selection): Selection {
  const clean: Selection = {};
  for (const group of groups) {
    const picked = (selection[group.id] ?? []).filter((id) => findChoice(group, id));
    if (group.type === 'single') {
      const fallback = group.choices.find((choice) => choice.default) ?? group.choices[0];
      clean[group.id] = [picked[0] ?? fallback.id];
    } else {
      const cap = group.max ?? picked.length;
      clean[group.id] = picked.slice(0, cap);
    }
  }
  return clean;
}

/** Flat list of the chosen options, in menu order. */
export function selectionChoices(groups: OptionGroup[], selection: Selection): OptionChoice[] {
  const chosen: OptionChoice[] = [];
  for (const group of groups) {
    for (const id of selection[group.id] ?? []) {
      const choice = findChoice(group, id);
      if (choice) chosen.push(choice);
    }
  }
  return chosen;
}

/** Every art key the SVG renderer should honour for this configuration. */
export function selectionArtKeys(groups: OptionGroup[], selection: Selection): string[] {
  return selectionChoices(groups, selection)
    .map((choice) => choice.art)
    .filter((art): art is string => Boolean(art));
}

/** "Regular · Thin & crispy · Extra mozzarella" style one-liner. */
export function describeSelection(groups: OptionGroup[], selection: Selection): string {
  const parts: string[] = [];
  for (const group of groups) {
    if (group.slot === 'toppers') continue;
    const choice = findChoice(group, (selection[group.id] ?? [])[0] ?? '');
    if (choice) parts.push(choice.label);
  }
  return parts.join(' · ');
}

/** Names of the chosen extras, e.g. ["Black olives", "Chipotle mayo"]. */
export function describeExtras(groups: OptionGroup[], selection: Selection): string[] {
  const names: string[] = [];
  for (const group of groups) {
    if (group.slot !== 'toppers') continue;
    for (const id of selection[group.id] ?? []) {
      const choice = findChoice(group, id);
      if (choice) names.push(choice.label);
    }
  }
  return names;
}

/** "3 toppings · 2 dips" style summary for the extras. */
export function countExtras(groups: OptionGroup[], selection: Selection): number {
  return groups
    .filter((group) => group.slot === 'toppers')
    .reduce((total, group) => total + (selection[group.id]?.length ?? 0), 0);
}
