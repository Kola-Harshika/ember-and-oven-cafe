/**
 * Coupon rules — one implementation for the browser and the API.
 *
 * The client uses the built-in list for instant feedback while typing; the API
 * validates against the `coupons` table, which is the authority for discounts.
 */
import { COUPONS } from '../src/data/promos.ts';

/** Shape shared by the static coupons and the database rows. */
export interface CouponLike {
  code: string;
  label?: string;
  blurb?: string;
  percent?: number | null;
  flat?: number | null;
  maxDiscount?: number | null;
  minSubtotal: number;
}

export interface CouponCheck {
  ok: boolean;
  message: string;
  coupon?: CouponLike;
}

const catalogue: CouponLike[] = COUPONS.map((coupon) => ({
  code: coupon.code,
  label: coupon.label,
  blurb: coupon.blurb,
  percent: coupon.percent ?? null,
  flat: coupon.flat ?? null,
  maxDiscount: coupon.maxDiscount ?? null,
  minSubtotal: coupon.minSubtotal,
}));

export function findCoupon(code: string, coupons: CouponLike[] = catalogue): CouponLike | undefined {
  const normalised = code.trim().toUpperCase();
  return coupons.find((coupon) => coupon.code.toUpperCase() === normalised);
}

export function checkCoupon(code: string, subtotal: number, coupons: CouponLike[] = catalogue): CouponCheck {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, message: 'Enter a code to see the saving.' };

  const coupon = findCoupon(trimmed, coupons);
  if (!coupon) return { ok: false, message: `${trimmed.toUpperCase()} is not one of our codes.` };

  if (subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      message: `${coupon.code} needs a subtotal of ₹${coupon.minSubtotal}. Add ₹${coupon.minSubtotal - subtotal} more.`,
    };
  }

  const blurb = coupon.blurb ?? 'discount applied';
  return { ok: true, message: `${coupon.code} applied — ${blurb}.`, coupon };
}

export function discountFor(coupon: CouponLike | undefined, subtotal: number): number {
  if (!coupon || subtotal < coupon.minSubtotal) return 0;
  const raw = coupon.percent ? (subtotal * coupon.percent) / 100 : (coupon.flat ?? 0);
  const capped = coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
  return Math.min(Math.round(capped), subtotal);
}
