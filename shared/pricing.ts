/**
 * Pricing engine — shared by the browser and the API.
 *
 * The browser uses it for instant feedback while a guest customises a dish; the API
 * re-runs the very same functions against database prices before it accepts an
 * order, so a client can never talk the total down. Prices are whole rupees, which
 * is how the menu is written, and the taxable amount is rounded once.
 */
import type { CartLine, MenuItem, Selection } from '../src/data/types.ts';
import { selectionArtKeys, selectionChoices } from '../src/data/customizations.ts';
import { getItem } from '../src/data/menu.ts';
import { FREE_DELIVERY_ABOVE, TAX_RATE, type OrderMode } from '../src/data/promos.ts';
import { checkCoupon, discountFor, findCoupon, type CouponLike } from './coupons.ts';

export { checkCoupon, discountFor, findCoupon };
export type { CouponLike, CouponCheck } from './coupons.ts';

/** Items can come from the static catalogue (browser) or from SQLite (API). */
export type ItemLookup = (itemId: string) => MenuItem | undefined;

export const catalogueItemLookup: ItemLookup = getItem;

/** Price of a single configured dish: base price plus every chosen option. */
export function unitPrice(item: MenuItem, selection: Selection): number {
  const extras = selectionChoices(item.groups, selection).reduce((sum, choice) => sum + choice.price, 0);
  return Math.max(0, item.price + extras);
}

export function linePrice(line: CartLine, lookup: ItemLookup = catalogueItemLookup): number {
  const item = lookup(line.itemId);
  if (!item) return 0;
  return unitPrice(item, line.selection) * line.quantity;
}

/** Art keys for the SVG preview: the dish baseline plus the guest's picks. */
export function artKeysFor(item: MenuItem, selection: Selection): string[] {
  return [...item.art, ...selectionArtKeys(item.groups, selection)];
}

export function itemCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function subtotalOf(lines: CartLine[], lookup: ItemLookup = catalogueItemLookup): number {
  return lines.reduce((sum, line) => sum + linePrice(line, lookup), 0);
}

export interface TotalsOptions {
  mode: OrderMode;
  couponCode?: string;
  tipPercent?: number;
  /** rupees knocked off by the tracking mini-games */
  bonusDiscount?: number;
  /** server-side overrides */
  lookup?: ItemLookup;
  coupons?: CouponLike[];
}

export interface Totals {
  itemCount: number;
  subtotal: number;
  couponDiscount: number;
  bonusDiscount: number;
  discount: number;
  taxable: number;
  tax: number;
  deliveryFee: number;
  tip: number;
  total: number;
  /** how much more to spend before delivery is free (0 when already free) */
  freeDeliveryGap: number;
  savings: number;
  coupon?: CouponLike;
}

export function computeTotals(lines: CartLine[], options: TotalsOptions): Totals {
  const lookup = options.lookup ?? catalogueItemLookup;
  const subtotal = subtotalOf(lines, lookup);

  const coupon = options.couponCode
    ? options.coupons
      ? findCoupon(options.couponCode, options.coupons)
      : findCoupon(options.couponCode)
    : undefined;

  const couponDiscount = discountFor(coupon, subtotal);
  const bonusDiscount = Math.max(0, Math.min(options.bonusDiscount ?? 0, subtotal - couponDiscount));
  const discount = couponDiscount + bonusDiscount;
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round(taxable * TAX_RATE);
  const deliveryFee = options.mode === 'delivery' && taxable < FREE_DELIVERY_ABOVE ? 39 : 0;
  const tip = Math.round((taxable * (options.tipPercent ?? 0)) / 100);
  const total = taxable + tax + deliveryFee + tip;
  const freeDeliveryGap =
    options.mode === 'delivery' && taxable < FREE_DELIVERY_ABOVE ? FREE_DELIVERY_ABOVE - taxable : 0;

  return {
    itemCount: itemCount(lines),
    subtotal,
    couponDiscount,
    bonusDiscount,
    discount,
    taxable,
    tax,
    deliveryFee,
    tip,
    total,
    freeDeliveryGap,
    savings: discount,
    ...(coupon ? { coupon } : {}),
  };
}

/** Rows for the receipt-style summary panel. */
export function summaryRows(totals: Totals, mode: OrderMode): { label: string; value: number; hint?: string }[] {
  const rows: { label: string; value: number; hint?: string }[] = [{ label: 'Subtotal', value: totals.subtotal }];

  if (totals.couponDiscount > 0) {
    rows.push({ label: `Coupon ${totals.coupon?.code ?? ''}`.trim(), value: -totals.couponDiscount });
  }
  if (totals.bonusDiscount > 0) {
    rows.push({ label: 'Kitchen games bonus', value: -totals.bonusDiscount });
  }

  rows.push({ label: `GST (${Math.round(TAX_RATE * 100)}%)`, value: totals.tax });

  if (mode === 'delivery') {
    rows.push({
      label: 'Delivery',
      value: totals.deliveryFee,
      ...(totals.deliveryFee === 0 ? { hint: `free over ₹${FREE_DELIVERY_ABOVE}` } : {}),
    });
  }
  if (totals.tip > 0) rows.push({ label: 'Kitchen tip', value: totals.tip });

  return rows;
}
