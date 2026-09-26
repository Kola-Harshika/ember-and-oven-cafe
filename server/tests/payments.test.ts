/**
 * Payment states, idempotency and the honesty rules around the default test provider.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { firstOrderableLine, registerCustomer, resetDatabase, seedTestStaff, server } from './helpers/harness.ts';

beforeAll(() => {
  resetDatabase();
  seedTestStaff();
});

const customer = { name: 'Payer Guest', phone: '9876543210', address: '7 Test Close, Hyderabad, Telangana' };

async function placeOrder(agent: Awaited<ReturnType<typeof registerCustomer>>['agent']) {
  const line = await firstOrderableLine();
  const response = await agent.post('/api/orders').send({ mode: 'takeaway', lines: [line], customer });
  if (response.status !== 201) throw new Error(`Could not place order: ${response.body.error?.message}`);
  return response.body.order;
}

describe('provider configuration', () => {
  it('says plainly that this is a test flow', async () => {
    const response = await server().get('/api/payments/config');

    expect(response.status).toBe(200);
    expect(response.body.provider).toMatchObject({ id: 'mock', live: false });
    expect(response.body.provider.note).toMatch(/no money moves/i);
  });
});

describe('payment states', () => {
  it('records a pending attempt and then a paid one', async () => {
    const buyer = await registerCustomer('pay1@test.local');
    const order = await placeOrder(buyer.agent);

    const started = await buyer.agent.post('/api/payments').send({ orderId: order.id, method: 'upi' });
    expect(started.status).toBe(201);
    expect(started.body.payment).toMatchObject({ status: 'pending', amount: order.payable });

    const confirmed = await buyer.agent.post(`/api/payments/${started.body.payment.id}/confirm`);
    expect(confirmed.body.payment.status).toBe('paid');
    expect(confirmed.body.payment.reference).toMatch(/^MOCK-/);

    const tracked = await buyer.agent.get(`/api/orders/${order.id}`);
    expect(tracked.body.order.paymentStatus).toBe('paid');
    expect(tracked.body.order.payment).toMatchObject({ method: 'upi', status: 'paid' });
  });

  it('is idempotent, so refreshing cannot double charge', async () => {
    const buyer = await registerCustomer('pay2@test.local');
    const order = await placeOrder(buyer.agent);

    const started = await buyer.agent.post('/api/payments').send({ orderId: order.id, method: 'card' });
    const first = await buyer.agent.post(`/api/payments/${started.body.payment.id}/confirm`);
    const second = await buyer.agent.post(`/api/payments/${started.body.payment.id}/confirm`);

    expect(second.body.payment.reference).toBe(first.body.payment.reference);

    const history = await buyer.agent.get(`/api/payments/order/${order.id}`);
    expect(history.body.payments.filter((payment: { status: string }) => payment.status === 'paid')).toHaveLength(1);
  });

  it('records a failure without changing the bill', async () => {
    const buyer = await registerCustomer('pay3@test.local');
    const order = await placeOrder(buyer.agent);

    const started = await buyer.agent.post('/api/payments').send({ orderId: order.id, method: 'card' });
    const failed = await buyer.agent
      .post(`/api/payments/${started.body.payment.id}/fail`)
      .send({ reason: 'Card declined' });

    expect(failed.body.payment).toMatchObject({ status: 'failed', failure_reason: 'Card declined' });

    const tracked = await buyer.agent.get(`/api/orders/${order.id}`);
    expect(tracked.body.order.paymentStatus).toBe('failed');
    expect(tracked.body.order.payable).toBe(order.payable);
  });

  it('records a cancelled attempt', async () => {
    const buyer = await registerCustomer('pay4@test.local');
    const order = await placeOrder(buyer.agent);

    const started = await buyer.agent.post('/api/payments').send({ orderId: order.id, method: 'wallet' });
    const cancelled = await buyer.agent.post(`/api/payments/${started.body.payment.id}/cancel`);

    expect(cancelled.body.payment.status).toBe('cancelled');
    expect((await buyer.agent.get(`/api/orders/${order.id}`)).body.order.paymentStatus).toBe('cancelled');
  });

  it('refuses a second payment once the order is paid', async () => {
    const buyer = await registerCustomer('pay5@test.local');
    const order = await placeOrder(buyer.agent);

    const started = await buyer.agent.post('/api/payments').send({ orderId: order.id, method: 'upi' });
    await buyer.agent.post(`/api/payments/${started.body.payment.id}/confirm`);

    const again = await buyer.agent.post('/api/payments').send({ orderId: order.id, method: 'card' });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('already_paid');
  });

  it('refuses to pay a cancelled order or an invented method', async () => {
    const buyer = await registerCustomer('pay6@test.local');
    const order = await placeOrder(buyer.agent);
    await buyer.agent.post(`/api/orders/${order.id}/cancel`).send({});

    const afterCancel = await buyer.agent.post('/api/payments').send({ orderId: order.id, method: 'upi' });
    expect(afterCancel.body.error.code).toBe('order_cancelled');

    const other = await placeOrder(buyer.agent);
    const invented = await buyer.agent.post('/api/payments').send({ orderId: other.id, method: 'bitcoin' });
    expect(invented.status).toBe(422);
  });

  it('keeps payments private to the order’s owner', async () => {
    const buyer = await registerCustomer('pay7@test.local');
    const stranger = await registerCustomer('pay8@test.local');
    const order = await placeOrder(buyer.agent);

    const started = await buyer.agent.post('/api/payments').send({ orderId: order.id, method: 'upi' });

    expect((await stranger.agent.post('/api/payments').send({ orderId: order.id, method: 'upi' })).status).toBe(404);
    expect((await stranger.agent.post(`/api/payments/${started.body.payment.id}/confirm`)).status).toBe(404);
    expect((await stranger.agent.get(`/api/payments/order/${order.id}`)).status).toBe(404);
  });
});
