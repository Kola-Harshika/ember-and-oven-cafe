/**
 * The pricing engine, tested directly.
 *
 * These rules are shared by the browser and the API, so this file is the contract:
 * if the numbers change here, both sides change together.
 */
import { describe, expect, it } from 'vitest';
import { COUPONS } from '../src/data/promos.ts';
import { MENU_ITEMS, getItem } from '../src/data/menu.ts';
import { applyPreset, defaultSelection, selectionChoices } from '../src/data/customizations.ts';
import { checkCoupon, computeTotals, unitPrice } from '../shared/pricing.ts';
import type { CartLine } from '../src/data/types.ts';

const code = (value: string) => value.toUpperCase();

function lineFor(itemId: string, quantity = 1, extras: Record<string, string[]> = {}): CartLine {
  const item = getItem(itemId);
  if (!item) throw new Error(`Unknown item ${itemId}`);
  const selection = { ...applyPreset(defaultSelection(item.groups), item.preset), ...extras };
  return { lineId: `line_${itemId}`, itemId, selection, quantity };
}

describe('dish pricing', () => {
  it('starts from the menu price', () => {
    const item = getItem('double-pepperoni');
    expect(item).toBeDefined();
    expect(unitPrice(item!, defaultSelection(item!.groups))).toBeGreaterThan(0);
  });

  it('adds the price of every chosen option, and only those', () => {
    const item = getItem('truffle-parmesan')!;
    const base = defaultSelection(item.groups);
    const upgrade = selectionChoices(item.groups, base).reduce((sum, choice) => sum + choice.price, 0);

    expect(unitPrice(item, base)).toBe(item.price + upgrade);
  });

  it('never returns a negative price', () => {
    for (const item of MENU_ITEMS) {
      expect(unitPrice(item, defaultSelection(item.groups))).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('order totals', () => {
  it('multiplies by quantity and adds 5% GST', () => {
    const line = lineFor('double-pepperoni', 2);
    const totals = computeTotals([line], { mode: 'dine-in' });

    expect(totals.itemCount).toBe(2);
    expect(totals.subtotal).toBe(unitPrice(getItem('double-pepperoni')!, line.selection) * 2);
    expect(totals.tax).toBe(Math.round(totals.subtotal * 0.05));
    expect(totals.total).toBe(totals.subtotal + totals.tax);
  });

  it('charges delivery only below the free threshold', () => {
    const cheap = computeTotals([lineFor('classic-salted-fries', 1)], { mode: 'delivery' });
    expect(cheap.deliveryFee).toBe(39);
    expect(cheap.freeDeliveryGap).toBeGreaterThan(0);

    const generous = computeTotals([lineFor('double-pepperoni', 4)], { mode: 'delivery' });
    expect(generous.deliveryFee).toBe(0);
    expect(generous.freeDeliveryGap).toBe(0);
  });

  it('applies tip on the taxable amount', () => {
    const totals = computeTotals([lineFor('double-pepperoni', 1)], { mode: 'dine-in', tipPercent: 10 });
    expect(totals.tip).toBe(Math.round(totals.taxable * 0.1));
  });

  it('takes coupons and game credit off before tax', () => {
    const line = lineFor('double-pepperoni', 3);
    const withBoth = computeTotals([line], { mode: 'takeaway', couponCode: 'EMBER10', bonusDiscount: 50 });

    expect(withBoth.couponDiscount).toBeGreaterThan(0);
    expect(withBoth.bonusDiscount).toBe(50);
    expect(withBoth.taxable).toBe(withBoth.subtotal - withBoth.couponDiscount - withBoth.bonusDiscount);
    expect(withBoth.tax).toBe(Math.round(withBoth.taxable * 0.05));
  });

  it('never discounts more than the subtotal', () => {
    const totals = computeTotals([lineFor('classic-salted-fries', 1)], { mode: 'dine-in', bonusDiscount: 10_000 });
    expect(totals.taxable).toBeGreaterThanOrEqual(0);
    expect(totals.total).toBeGreaterThanOrEqual(0);
  });
});

describe('coupons', () => {
  it('accepts a valid code above its minimum', () => {
    const result = checkCoupon('ember10', 900);
    expect(result.ok).toBe(true);
    expect(result.coupon?.code).toBe('EMBER10');
  });

  it('explains a code that needs a bigger order', () => {
    const result = checkCoupon('EMBER10', 100);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/needs a subtotal/i);
  });

  it('rejects an unknown code', () => {
    const result = checkCoupon('FREEPIZZA', 1000);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/not one of our codes/i);
  });

  it('exposes the codes the cafe advertises', () => {
    expect(COUPONS.map((coupon) => code(coupon.code))).toEqual(['EMBER10', 'FIRSTBITE', 'OVENFRIES']);
  });
});
