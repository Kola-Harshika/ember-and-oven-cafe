/**
 * Accounts: registration and sign-in, including the failure paths customers actually hit.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { TEST_CUSTOMER_PASSWORD, browser, resetDatabase, seedTestStaff, server } from './helpers/harness.ts';

beforeAll(() => {
  resetDatabase();
  seedTestStaff();
});

describe('registration', () => {
  it('creates an account and starts a session', async () => {
    const agent = browser();
    const response = await agent.post('/api/auth/register').send({
      name: 'Harshika',
      email: 'harshika@test.local',
      password: TEST_CUSTOMER_PASSWORD,
      phone: '9876543210',
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ email: 'harshika@test.local', role: 'customer' });
    // credentials must never travel back to the browser
    expect(response.body.user).not.toHaveProperty('password_hash');
    expect(response.body.user).not.toHaveProperty('passwordHash');

    const cookies = String(response.headers['set-cookie'] ?? '');
    expect(cookies).toContain('eo_test_session');
    expect(cookies.toLowerCase()).toContain('httponly');

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('harshika@test.local');
  });

  it('refuses a duplicate email with a friendly explanation', async () => {
    const email = 'duplicate@test.local';
    await server().post('/api/auth/register').send({ name: 'First', email, password: TEST_CUSTOMER_PASSWORD });

    const second = await server()
      .post('/api/auth/register')
      .send({ name: 'Second', email, password: TEST_CUSTOMER_PASSWORD });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('duplicate_email');
    expect(second.body.error.message).toMatch(/already exists/i);
  });

  it('rejects a weak password without exposing internals', async () => {
    const response = await server()
      .post('/api/auth/register')
      .send({ name: 'Weak', email: 'weak@test.local', password: 'short' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('validation_failed');
    expect(response.body.error.details[0].field).toBe('password');
    expect(JSON.stringify(response.body)).not.toMatch(/scrypt|sqlite|at Object/i);
  });

  it('rejects a malformed email', async () => {
    const response = await server()
      .post('/api/auth/register')
      .send({ name: 'Bad email', email: 'not-an-email', password: TEST_CUSTOMER_PASSWORD });

    expect(response.status).toBe(422);
    expect(response.body.error.details[0].field).toBe('email');
  });
});

describe('sign-in', () => {
  const email = 'signin@test.local';

  beforeAll(async () => {
    await server().post('/api/auth/register').send({ name: 'Sign In', email, password: TEST_CUSTOMER_PASSWORD });
  });

  it('signs an existing customer in', async () => {
    const agent = browser();
    const response = await agent.post('/api/auth/login').send({ email, password: TEST_CUSTOMER_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(email);
  });

  it('gives the same answer for a wrong password and an unknown account', async () => {
    const wrongPassword = await server().post('/api/auth/login').send({ email, password: 'totally-wrong' });
    const unknownAccount = await server()
      .post('/api/auth/login')
      .send({ email: 'nobody@test.local', password: TEST_CUSTOMER_PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownAccount.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe('invalid_credentials');
    // identical wording, so accounts cannot be enumerated
    expect(wrongPassword.body.error.message).toBe(unknownAccount.body.error.message);
  });

  it('signs out and clears the session', async () => {
    const agent = browser();
    await agent.post('/api/auth/login').send({ email, password: TEST_CUSTOMER_PASSWORD });
    expect((await agent.get('/api/auth/me')).body.user.email).toBe(email);

    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(200);
    expect((await agent.get('/api/auth/me')).body.user).toBeNull();
  });
});
