/**
 * Waiting-room credit: earned in the games, capped by the cafe, applied to the bill.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { firstOrderableLine, registerCustomer, resetDatabase, seedTestStaff } from './helpers/harness.ts';

beforeAll(() => {
  resetDatabase();
  seedTestStaff();
});

const customer = { name: 'Player Guest', phone: '9876543210', address: '2 Test Way, Hyderabad, Telangana' };

async function placeOrder(agent: Awaited<ReturnType<typeof registerCustomer>>['agent']) {
  const line = await firstOrderableLine();
  const response = await agent.post('/api/orders').send({ mode: 'dine-in', lines: [line], customer });
  if (response.status !== 201) throw new Error(`Could not place order: ${response.body.error?.message}`);
  return response.body.order.id as string;
}

describe('waiting-room credit', () => {
  it('comes off the amount still to pay', async () => {
    const buyer = await registerCustomer('credit1@test.local');
    const orderId = await placeOrder(buyer.agent);
    const before = await buyer.agent.get(`/api/orders/${orderId}`);

    const awarded = await buyer.agent.post(`/api/orders/${orderId}/rewards`).send({ amount: 45 });

    expect(awarded.status).toBe(200);
    expect(awarded.body.order.money.bonusCredit).toBe(45);
    expect(awarded.body.order.payable).toBe(before.body.order.payable - 45);
  });

  it('stops at the cafe cap', async () => {
    const buyer = await registerCustomer('credit2@test.local');
    const orderId = await placeOrder(buyer.agent);

    for (let round = 0; round < 8; round += 1) {
      await buyer.agent.post(`/api/orders/${orderId}/rewards`).send({ amount: 60 });
    }

    const tracked = await buyer.agent.get(`/api/orders/${orderId}`);
    expect(tracked.body.order.money.bonusCredit).toBe(300);
  });

  it('refuses invented amounts, other people’s orders and closed orders', async () => {
    const buyer = await registerCustomer('credit3@test.local');
    const stranger = await registerCustomer('credit4@test.local');
    const orderId = await placeOrder(buyer.agent);

    const zero = await buyer.agent.post(`/api/orders/${orderId}/rewards`).send({ amount: 0 });
    const huge = await buyer.agent.post(`/api/orders/${orderId}/rewards`).send({ amount: 9999 });
    const nosy = await stranger.agent.post(`/api/orders/${orderId}/rewards`).send({ amount: 30 });

    expect(zero.status).toBe(422);
    expect(huge.status).toBe(422);
    expect(nosy.status).toBe(404);

    await buyer.agent.post(`/api/orders/${orderId}/cancel`).send({});
    const afterCancel = await buyer.agent.post(`/api/orders/${orderId}/rewards`).send({ amount: 20 });
    expect(afterCancel.status).toBe(409);
  });
});
