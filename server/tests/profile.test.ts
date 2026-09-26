/**
 * Profile editing, password changes and the guards that keep areas separate.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { TEST_CUSTOMER_PASSWORD, browser, resetDatabase, seedTestStaff, server } from './helpers/harness.ts';

beforeAll(() => {
  resetDatabase();
  seedTestStaff();
});

describe('profile', () => {
  it('updates the details used to pre-fill checkout', async () => {
    const agent = browser();
    await agent
      .post('/api/auth/register')
      .send({ name: 'Profile Person', email: 'profile@test.local', password: TEST_CUSTOMER_PASSWORD });

    const updated = await agent
      .patch('/api/auth/profile')
      .send({ name: 'Harshika R', phone: '9123456780', address: '12 Test Lane, Hyderabad, Telangana' });

    expect(updated.status).toBe(200);
    expect(updated.body.user).toMatchObject({
      name: 'Harshika R',
      phone: '9123456780',
      address: '12 Test Lane, Hyderabad, Telangana',
    });

    const me = await agent.get('/api/auth/me');
    expect(me.body.user.name).toBe('Harshika R');
  });

  it('changes the password and then accepts only the new one', async () => {
    const agent = browser();
    const email = 'rotate@test.local';
    await agent.post('/api/auth/register').send({ name: 'Rotate', email, password: TEST_CUSTOMER_PASSWORD });

    const refused = await agent
      .post('/api/auth/password')
      .send({ currentPassword: 'not-my-password', newPassword: 'brand-new-pass-1' });
    expect(refused.status).toBe(401);

    const changed = await agent
      .post('/api/auth/password')
      .send({ currentPassword: TEST_CUSTOMER_PASSWORD, newPassword: 'brand-new-pass-1' });
    expect(changed.status).toBe(200);

    const oldPassword = await server().post('/api/auth/login').send({ email, password: TEST_CUSTOMER_PASSWORD });
    const newPassword = await server().post('/api/auth/login').send({ email, password: 'brand-new-pass-1' });

    expect(oldPassword.status).toBe(401);
    expect(newPassword.status).toBe(200);
  });
});

describe('access control', () => {
  it('keeps account-only endpoints closed to signed-out visitors', async () => {
    const orders = await server().get('/api/orders');
    const profile = await server().patch('/api/auth/profile').send({ name: 'Nobody' });

    expect(orders.status).toBe(401);
    expect(profile.status).toBe(401);
  });

  it('keeps the kitchen dashboard closed to customers', async () => {
    const agent = browser();
    await agent
      .post('/api/auth/register')
      .send({ name: 'Curious', email: 'curious@test.local', password: TEST_CUSTOMER_PASSWORD });

    const listed = await agent.get('/api/admin/orders');
    const summary = await agent.get('/api/admin/summary');
    const availability = await agent.patch('/api/admin/menu/any-item/availability').send({ available: false });

    expect(listed.status).toBe(403);
    expect(summary.status).toBe(403);
    expect(availability.status).toBe(403);
  });

  it('lets staff reach the same endpoints', async () => {
    const agent = browser();
    await agent.post('/api/auth/login').send({ email: 'staff@test.local', password: 'staff-pass-123' });

    const listed = await agent.get('/api/admin/orders');
    const summary = await agent.get('/api/admin/summary');

    expect(listed.status).toBe(200);
    expect(summary.status).toBe(200);
    expect(Array.isArray(summary.body.menu)).toBe(true);
  });
});
