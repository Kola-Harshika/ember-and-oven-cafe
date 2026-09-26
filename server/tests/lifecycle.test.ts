/**
 * The order lifecycle: the kitchen can only move an order forward, one station at a
 * time, and every move is written to the history the guest can read.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { firstOrderableLine, registerCustomer, resetDatabase, seedTestStaff, server, signInStaff } from './helpers/harness.ts';

beforeAll(() => {
  resetDatabase();
  seedTestStaff();
});

const customer = { name: 'Lifecycle Guest', phone: '9876543210', address: '4 Test Road, Hyderabad, Telangana' };

async function placeOrder(agent: Awaited<ReturnType<typeof registerCustomer>>['agent'], mode = 'delivery') {
  const line = await firstOrderableLine();
  const response = await agent.post('/api/orders').send({ mode, lines: [line], customer });
  if (response.status !== 201) throw new Error(`Could not place order: ${response.body.error?.message}`);
  return response.body.order.id as string;
}

const STEPS = ['preparing', 'cooking', 'ready', 'out_for_delivery', 'delivered'] as const;

describe('status machine', () => {
  it('moves one station at a time and records every step', async () => {
    const buyer = await registerCustomer('lifecycle1@test.local');
    const orderId = await placeOrder(buyer.agent);
    const staff = await signInStaff();

    for (const status of STEPS) {
      const moved = await staff.post(`/api/admin/orders/${orderId}/status`).send({ status });
      expect(moved.status).toBe(200);
      expect(moved.body.order.status).toBe(status);
    }

    const tracked = await buyer.agent.get(`/api/orders/${orderId}`);
    expect(tracked.body.order.status).toBe('delivered');
    expect(tracked.body.order.history.map((event: { status: string }) => event.status)).toEqual([
      'received',
      ...STEPS,
    ]);
    expect(tracked.body.order.history.at(-1).author).toMatch(/^staff:/);
  });

  it('refuses to skip a station or move backwards', async () => {
    const buyer = await registerCustomer('lifecycle2@test.local');
    const orderId = await placeOrder(buyer.agent, 'takeaway');
    const staff = await signInStaff();

    await staff.post(`/api/admin/orders/${orderId}/status`).send({ status: 'preparing' });

    const skipped = await staff.post(`/api/admin/orders/${orderId}/status`).send({ status: 'ready' });
    const backwards = await staff.post(`/api/admin/orders/${orderId}/status`).send({ status: 'received' });

    expect(skipped.status).toBe(409);
    expect(skipped.body.error.code).toBe('invalid_transition');
    expect(backwards.status).toBe(409);
  });

  it('refuses to reopen a closed order', async () => {
    const buyer = await registerCustomer('lifecycle3@test.local');
    const orderId = await placeOrder(buyer.agent);
    const staff = await signInStaff();

    for (const status of STEPS) {
      await staff.post(`/api/admin/orders/${orderId}/status`).send({ status });
    }

    const reopened = await staff.post(`/api/admin/orders/${orderId}/status`).send({ status: 'cooking' });
    expect(reopened.status).toBe(409);
  });

  it('refuses a status that does not exist in the cafe', async () => {
    const buyer = await registerCustomer('lifecycle4@test.local');
    const orderId = await placeOrder(buyer.agent);
    const staff = await signInStaff();

    const invented = await staff.post(`/api/admin/orders/${orderId}/status`).send({ status: 'sauteing' });
    expect(invented.status).toBe(422);
  });

  it('reports an unknown order as missing rather than failing', async () => {
    const staff = await signInStaff();
    const response = await staff.post('/api/admin/orders/ORD-9999/status').send({ status: 'preparing' });

    expect(response.status).toBe(404);
  });

  it('keeps the kitchen book staff-only', async () => {
    const buyer = await registerCustomer('lifecycle5@test.local');
    const orderId = await placeOrder(buyer.agent);

    const asCustomer = await buyer.agent.post(`/api/admin/orders/${orderId}/status`).send({ status: 'preparing' });
    expect(asCustomer.status).toBe(403);

    const anonymous = await server().get('/api/admin/orders');
    expect(anonymous.status).toBe(401);
  });
});
