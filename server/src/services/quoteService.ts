/**
 * Server-side quoting — the pricing authority.
 *
 * The browser may estimate prices while a guest customises a dish, but every order
 * is re-quoted here against database prices and validated against the option groups
 * that actually exist. An invalid customisation or an unusable coupon is rejected
 * instead of being silently "fixed", so the amount charged always matches the amount
 * the guest approved on the tray screen.
 */
import { describeExtras, describeSelection } from '../../../src/data/customizations.ts';
import type { CartLine, MenuItem, Selection } from '../../../src/data/types.ts';
import type { OrderMode } from '../../../src/data/promos.ts';
import type { CouponLike } from '../../../shared/coupons.ts';
import { artKeysFor, checkCoupon, computeTotals, unitPrice, type ItemLookup, type Totals } from '../../../shared/pricing.ts';
import { ApiError } from '../http/errors.ts';
import { findMenuItem, isMenuItemAvailable, listCoupons } from '../repositories/menuRepository.ts';

export const MAX_LINE_QUANTITY = 20;
export const MAX_LINES = 20;

export interface QuoteRequestLine {
  itemId: string;
  quantity: number;
  selection: Selection;
  note?: string;
}

export interface QuotedLine {
  item: MenuItem;
  quantity: number;
  selection: Selection;
  unitPrice: number;
  lineTotal: number;
  summary: string;
  extras: string[];
  art: string[];
  note?: string;
}

export interface Quote {
  lines: QuotedLine[];
  totals: Totals;
  coupon?: CouponLike;
}

export interface QuoteInput {
  lines: QuoteRequestLine[];
  mode: OrderMode;
  couponCode?: string;
  tipPercent?: number;
  bonusDiscount?: number;
}

function selectionProblems(item: MenuItem, selection: Selection): string[] {
  const problems: string[] = [];

  for (const group of item.groups) {
    const picked = selection[group.id] ?? [];
    const known = new Set(group.choices.map((choice) => choice.id));

    for (const choiceId of picked) {
      if (!known.has(choiceId)) problems.push(`${group.label}: "${choiceId}" is not an option for ${item.shortName}`);
    }

    if (group.type === 'single') {
      if (picked.length !== 1) problems.push(`${group.label}: choose exactly one option`);
    } else {
      if (group.min !== undefined && picked.length < group.min) {
        problems.push(`${group.label}: choose at least ${group.min}`);
      }
      if (group.max !== undefined && picked.length > group.max) {
        problems.push(`${group.label}: choose at most ${group.max}`);
      }
    }
  }

  return problems;
}

/** Validates one requested line against the live menu and returns its snapshot. */
function quoteLine(request: QuoteRequestLine, index: number, lookup: ItemLookup): QuotedLine {
  const item = lookup(request.itemId);
  if (!item) {
    throw ApiError.validation(`Line ${index + 1}: we no longer serve "${request.itemId}".`, [
      { field: `lines.${index}.itemId`, message: 'Unknown dish' },
    ]);
  }

  if (!isMenuItemAvailable(item.id)) {
    throw ApiError.conflict(`${item.name} is off the menu right now. Please remove it from your tray.`, 'item_unavailable');
  }

  if (!Number.isInteger(request.quantity) || request.quantity < 1 || request.quantity > MAX_LINE_QUANTITY) {
    throw ApiError.validation(`Line ${index + 1}: quantity must be a whole number between 1 and ${MAX_LINE_QUANTITY}.`);
  }

  const problems = selectionProblems(item, request.selection ?? {});
  if (problems.length > 0) {
    throw ApiError.validation(`Line ${index + 1}: ${problems[0]}`, [{ field: `lines.${index}.selection`, message: problems[0] }]);
  }

  const price = unitPrice(item, request.selection);

  return {
    item,
    quantity: request.quantity,
    selection: request.selection,
    unitPrice: price,
    lineTotal: price * request.quantity,
    summary: describeSelection(item.groups, request.selection),
    extras: describeExtras(item.groups, request.selection),
    art: artKeysFor(item, request.selection),
    ...(request.note ? { note: request.note } : {}),
  };
}

export function quoteOrder(input: QuoteInput): Quote {
  if (input.lines.length === 0) {
    throw ApiError.validation('Your tray is empty — add something from the menu first.');
  }
  if (input.lines.length > MAX_LINES) {
    throw ApiError.validation(`A single order can hold up to ${MAX_LINES} dishes. Please split the order.`);
  }

  const lookup: ItemLookup = (itemId) => findMenuItem(itemId);
  const lines = input.lines.map((line, index) => quoteLine(line, index, lookup));

  const cartLines: CartLine[] = lines.map((line, index) => ({
    lineId: `quote_${index}`,
    itemId: line.item.id,
    selection: line.selection,
    quantity: line.quantity,
    ...(line.note ? { note: line.note } : {}),
  }));

  const coupons = listCoupons();
  const couponCode = input.couponCode?.trim().toUpperCase();

  if (couponCode) {
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const check = checkCoupon(couponCode, subtotal, coupons);
    if (!check.ok) throw ApiError.validation(check.message, [{ field: 'couponCode', message: check.message }]);
  }

  const totals = computeTotals(cartLines, {
    mode: input.mode,
    ...(couponCode ? { couponCode } : {}),
    tipPercent: input.tipPercent ?? 0,
    bonusDiscount: input.bonusDiscount ?? 0,
    lookup,
    coupons,
  });

  return { lines, totals, ...(totals.coupon ? { coupon: totals.coupon } : {}) };
}
