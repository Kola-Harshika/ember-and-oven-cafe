/**
 * Quoting: the API is the pricing authority, and it validates customisations strictly
 * rather than quietly "fixing" them.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { firstOrderableLine, resetDatabase, seedTestStaff, server } from './helpers/harness.ts';

beforeAll(() => {
  resetDatabase();
  seedTestStaff();
});

describe('quoting', () => {
  it('prices a tray on the server, not in the browser', async () => {
    const line = await firstOrderableLine();
    const response = await server().post('/api/orders/quote').send({ mode: 'delivery', lines: [line] });

    expect(response.status).toBe(200);
    expect(response.body.totals.subtotal).toBeGreaterThan(0);
    // shared pricing rules: 5% GST on the taxable amount
    expect(response.body.totals.tax).toBe(Math.round(response.body.totals.taxable * 0.05));
    expect(response.body.lines[0]).toMatchObject({ itemId: line.itemId, quantity: 1 });
    expect(response.body.lines[0].art.length).toBeGreaterThan(0);
  });

  it('charges for the options that were chosen', async () => {
    const line = await firstOrderableLine();
    const base = await server().post('/api/orders/quote').send({ mode: 'dine-in', lines: [line] });

    const menu = await server().get('/api/menu');
    const item = menu.body.items.find((entry: { id: string }) => entry.id === line.itemId);
    const priced = item.groups
      .flatMap((group: { id: string; type: string; choices: { id: string; price: number }[] }) =>
        group.type === 'single' ? [] : group.choices.map((choice) => ({ group: group.id, choice })),
      )
      .find((entry: { choice: { price: number } }) => entry.choice.price > 0);

    if (priced) {
      const upgraded = await server()
        .post('/api/orders/quote')
        .send({
          mode: 'dine-in',
          lines: [{ ...line, selection: { ...line.selection, [priced.group]: [priced.choice.id] } }],
        });

      expect(upgraded.status).toBe(200);
      expect(upgraded.body.totals.subtotal).toBe(base.body.totals.subtotal + priced.choice.price);
    }
  });

  it('rejects an option that does not exist for that dish', async () => {
    const line = await firstOrderableLine();
    const broken = {
      ...line,
      selection: Object.fromEntries(Object.keys(line.selection).map((groupId) => [groupId, ['definitely-not-real']])),
    };

    const response = await server().post('/api/orders/quote').send({ mode: 'dine-in', lines: [broken] });

    expect(response.status).toBe(422);
    expect(response.body.error.details[0].message).toMatch(/not an option/i);
  });

  it('rejects a dish we no longer serve', async () => {
    const response = await server()
      .post('/api/orders/quote')
      .send({ mode: 'dine-in', lines: [{ itemId: 'ghost-dish', quantity: 1, selection: {} }] });

    expect(response.status).toBe(422);
    expect(response.body.error.message).toMatch(/no longer serve/i);
  });

  it('rejects an empty tray and impossible quantities', async () => {
    const line = await firstOrderableLine();

    const empty = await server().post('/api/orders/quote').send({ mode: 'dine-in', lines: [] });
    const tooMany = await server()
      .post('/api/orders/quote')
      .send({ mode: 'dine-in', lines: [{ ...line, quantity: 99 }] });

    expect(empty.status).toBe(422);
    expect(tooMany.status).toBe(422);
  });

  it('applies a real coupon and refuses an invented one', async () => {
    const line = await firstOrderableLine('double-pepperoni');
    const generous = { ...line, quantity: 3 };

    const applied = await server()
      .post('/api/orders/quote')
      .send({ mode: 'takeaway', lines: [generous], couponCode: 'ember10' });

    const refused = await server()
      .post('/api/orders/quote')
      .send({ mode: 'takeaway', lines: [generous], couponCode: 'TOTALLYFAKE' });

    expect(applied.status).toBe(200);
    expect(applied.body.totals.couponDiscount).toBeGreaterThan(0);
    expect(refused.status).toBe(422);
    expect(refused.body.error.message).toMatch(/not one of our codes/i);
  });
});

describe('health', () => {
  it('reports its configuration honestly', async () => {
    const response = await server().get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database.menuItems).toBe(17);
    // the default provider is the local test flow, and it says so
    expect(response.body.payment).toMatchObject({ id: 'mock', live: false });
  });
});
