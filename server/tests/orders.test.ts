/**
 * Placing orders, and the scoping that keeps them private.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { firstOrderableLine, registerCustomer, resetDatabase, seedTestStaff, server, signInStaff } from './helpers/harness.ts';

beforeAll(() => {
  resetDatabase();
  seedTestStaff();
});

const customer = {
  name: 'Test Customer',
  phone: '9876543210',
  address: '12 Test Lane, Hyderabad, Telangana',
};

describe('placing an order', () => {
  it('creates a ticket, and only its owner can read it', async () => {
    const buyer = await registerCustomer('buyer@test.local');
    const line = await firstOrderableLine();

    const created = await buyer.agent.post('/api/orders').send({ mode: 'delivery', lines: [line], customer });

    expect(created.status).toBe(201);
    expect(created.body.order.id).toMatch(/^ORD-\d+$/);
    expect(created.body.order.status).toBe('received');
    expect(created.body.order.paymentStatus).toBe('pending');
    // the promise stays inside the window the cafe advertises
    expect(created.body.order.etaMinutes).toBeGreaterThanOrEqual(10);
    expect(created.body.order.etaMinutes).toBeLessThanOrEqual(15);
    expect(created.body.order.history[0]).toMatchObject({ status: 'received' });
    expect(created.body.order.lines[0].summary).toBeTruthy();
    expect(created.body.order.customerId).toBe(buyer.userId);

    const mine = await buyer.agent.get('/api/orders');
    expect(mine.body.orders).toHaveLength(1);

    // another customer cannot read it, even knowing the exact code
    const other = await registerCustomer('other@test.local');
    const peek = await other.agent.get(`/api/orders/${created.body.order.id}`);
    expect(peek.status).toBe(404);

    // and a signed-out caller gets nowhere at all
    const stranger = await server().get(`/api/orders/${created.body.order.id}`);
    expect(stranger.status).toBe(401);
  });

  it('gives a guest a token instead of inventing an account', async () => {
    const line = await firstOrderableLine();
    const created = await server().post('/api/orders').send({ mode: 'takeaway', lines: [line], customer });

    expect(created.status).toBe(201);
    expect(created.body.guestToken).toBeTruthy();
    expect(created.body.order.customerId).toBeNull();

    const withoutToken = await server().get(`/api/orders/${created.body.order.id}`);
    const withToken = await server()
      .get(`/api/orders/${created.body.order.id}`)
      .set('x-guest-token', created.body.guestToken);

    expect(withoutToken.status).toBe(401);
    expect(withToken.status).toBe(200);
    expect(withToken.body.order.id).toBe(created.body.order.id);
  });

  it('refuses a dish the kitchen has run out of', async () => {
    const staff = await signInStaff();
    const line = await firstOrderableLine();

    await staff.patch(`/api/admin/menu/${line.itemId}/availability`).send({ available: false });
    const blocked = await server().post('/api/orders').send({ mode: 'dine-in', lines: [line], customer });
    await staff.patch(`/api/admin/menu/${line.itemId}/availability`).send({ available: true });

    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('item_unavailable');
  });

  it('rejects a malformed order before it reaches the kitchen', async () => {
    const response = await server()
      .post('/api/orders')
      .send({ mode: 'teleport', lines: [], customer: { name: 'x' } });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('validation_failed');
  });

  it('returns an empty history rather than failing for a new account', async () => {
    const fresh = await registerCustomer('fresh@test.local');
    const response = await fresh.agent.get('/api/orders');

    expect(response.status).toBe(200);
    expect(response.body.orders).toEqual([]);
  });
});
