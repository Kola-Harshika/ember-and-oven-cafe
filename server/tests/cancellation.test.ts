/**
 * Cancellation rules — the server decides, and the browser is only told the outcome.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { firstOrderableLine, registerCustomer, resetDatabase, seedTestStaff, signInStaff } from './helpers/harness.ts';

beforeAll(() => {
  resetDatabase();
  seedTestStaff();
});

const customer = { name: 'Cancel Guest', phone: '9876543210', address: '9 Test Street, Hyderabad, Telangana' };

async function placeOrder(agent: Awaited<ReturnType<typeof registerCustomer>>['agent'], mode = 'dine-in') {
  const line = await firstOrderableLine();
  const response = await agent.post('/api/orders').send({ mode, lines: [line], customer });
  if (response.status !== 201) throw new Error(`Could not place order: ${response.body.error?.message}`);
  return response.body.order.id as string;
}

async function moveTo(orderId: string, status: string) {
  const staff = await signInStaff();
  const response = await staff.post(`/api/admin/orders/${orderId}/status`).send({ status });
  if (response.status !== 200) throw new Error(`Could not move order: ${response.body.error?.message}`);
  return response.body.order;
}

describe('customer cancellation', () => {
  it('is open straight after checkout', async () => {
    const buyer = await registerCustomer('cancel1@test.local');
    const orderId = await placeOrder(buyer.agent);

    const tracked = await buyer.agent.get(`/api/orders/${orderId}`);
    expect(tracked.body.cancellation.allowed).toBe(true);

    const cancelled = await buyer.agent.post(`/api/orders/${orderId}/cancel`).send({ reason: 'Ordered by mistake' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.order.status).toBe('cancelled');
    expect(cancelled.body.order.cancelReason).toBe('Ordered by mistake');
  });

  it('warns once the kitchen has started, but still allows it', async () => {
    const buyer = await registerCustomer('cancel2@test.local');
    const orderId = await placeOrder(buyer.agent);
    await moveTo(orderId, 'preparing');

    const tracked = await buyer.agent.get(`/api/orders/${orderId}`);
    expect(tracked.body.cancellation.allowed).toBe(true);
    expect(tracked.body.cancellation.warning).toMatch(/already started/i);

    const cancelled = await buyer.agent.post(`/api/orders/${orderId}/cancel`).send({});
    expect(cancelled.status).toBe(200);
  });

  it('closes once the food is cooking', async () => {
    const buyer = await registerCustomer('cancel3@test.local');
    const orderId = await placeOrder(buyer.agent);
    await moveTo(orderId, 'preparing');
    await moveTo(orderId, 'cooking');

    const tracked = await buyer.agent.get(`/api/orders/${orderId}`);
    expect(tracked.body.cancellation.allowed).toBe(false);
    expect(tracked.body.cancellation.reason).toMatch(/already cooked/i);

    const refused = await buyer.agent.post(`/api/orders/${orderId}/cancel`).send({});
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe('cancellation_closed');
  });

  it('is impossible once the rider has the order', async () => {
    const buyer = await registerCustomer('cancel4@test.local');
    const orderId = await placeOrder(buyer.agent, 'delivery');
    for (const status of ['preparing', 'cooking', 'ready', 'out_for_delivery']) {
      await moveTo(orderId, status);
    }

    const refused = await buyer.agent.post(`/api/orders/${orderId}/cancel`).send({});
    expect(refused.status).toBe(409);
    expect(refused.body.error.message).toMatch(/rider/i);
  });

  it('marks a paid order as refunded instead of losing the money', async () => {
    const buyer = await registerCustomer('cancel5@test.local');
    const orderId = await placeOrder(buyer.agent);

    const started = await buyer.agent.post('/api/payments').send({ orderId, method: 'upi' });
    expect(started.status).toBe(201);
    await buyer.agent.post(`/api/payments/${started.body.payment.id}/confirm`);

    const cancelled = await buyer.agent.post(`/api/orders/${orderId}/cancel`).send({ reason: 'Changed my mind' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.order.paymentStatus).toBe('refunded');
  });

  it('will not let one customer cancel another customer’s order', async () => {
    const buyer = await registerCustomer('cancel6@test.local');
    const stranger = await registerCustomer('cancel7@test.local');
    const orderId = await placeOrder(buyer.agent);

    const attempt = await stranger.agent.post(`/api/orders/${orderId}/cancel`).send({});
    expect(attempt.status).toBe(404);
  });

  it('lets the kitchen cancel an order it cannot fulfil', async () => {
    const buyer = await registerCustomer('cancel8@test.local');
    const orderId = await placeOrder(buyer.agent);
    const staff = await signInStaff();

    const cancelled = await staff
      .post(`/api/admin/orders/${orderId}/cancel`)
      .send({ reason: 'We ran out of mozzarella' });

    expect(cancelled.status).toBe(200);
    const tracked = await buyer.agent.get(`/api/orders/${orderId}`);
    expect(tracked.body.order.cancelReason).toBe('We ran out of mozzarella');
  });
});
