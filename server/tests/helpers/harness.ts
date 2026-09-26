/**
 * Test harness.
 *
 * Every suite starts from a freshly migrated and seeded throwaway database, so tests
 * never depend on each other's leftovers and the real development database is never
 * touched (see `DB_FILE` in vitest.config.ts).
 */
import { rmSync } from 'node:fs';
import request from 'supertest';
import { createApp } from '../../src/app.ts';
import { closeDb, databasePath } from '../../src/db/index.ts';
import { runMigrations } from '../../src/db/migrate.ts';
import { seedCatalogue } from '../../src/db/seed.ts';
import { createStaffAccount } from '../../src/services/authService.ts';
import { findOrderRow } from '../../src/repositories/orderQueries.ts';
import type { OrderRow } from '../../src/repositories/orderMapper.ts';

export const TEST_STAFF_EMAIL = 'staff@test.local';
export const TEST_STAFF_PASSWORD = 'staff-pass-123';
export const TEST_CUSTOMER_PASSWORD = 'customer-pass-123';

/** Fresh database file + migrations + catalogue + a known staff account. */
export function resetDatabase(): void {
  closeDb();
  const file = databasePath();
  for (const suffix of ['', '-wal', '-shm']) rmSync(`${file}${suffix}`, { force: true });

  runMigrations();
  seedCatalogue();
  // a staff account with a password chosen by the test suite, not by the environment
  createStaffAccount(TEST_STAFF_EMAIL, TEST_STAFF_PASSWORD);
}

/** A staff account with a password chosen by the test, not by the environment. */
export function seedTestStaff(): { email: string; password: string } {
  createStaffAccount(TEST_STAFF_EMAIL, TEST_STAFF_PASSWORD);
  return { email: TEST_STAFF_EMAIL, password: TEST_STAFF_PASSWORD };
}

/** A supertest agent keeps cookies, so it behaves like one signed-in browser. */
export function browser() {
  return request.agent(createApp());
}

export function server() {
  return request(createApp());
}

export interface RegisteredCustomer {
  email: string;
  password: string;
  userId: string;
  agent: ReturnType<typeof request.agent>;
}

export async function registerCustomer(email = `guest${Date.now()}@test.local`): Promise<RegisteredCustomer> {
  const agent = browser();
  const response = await agent
    .post('/api/auth/register')
    .send({ name: 'Test Customer', email, password: TEST_CUSTOMER_PASSWORD, phone: '9876543210' });

  if (response.status !== 201) {
    throw new Error(`Could not register test customer: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return { email, password: TEST_CUSTOMER_PASSWORD, userId: response.body.user.id, agent };
}

export async function signInStaff(agent = browser()) {
  await agent.post('/api/auth/login').send({ email: TEST_STAFF_EMAIL, password: TEST_STAFF_PASSWORD });
  return agent;
}

/** A catalogue line the API will accept, built from the menu it actually serves. */
export async function firstOrderableLine(itemId?: string) {
  const menu = await server().get('/api/menu');
  const items = menu.body.items as {
    id: string;
    category: string;
    groups: { id: string; type: 'single' | 'multi'; choices: { id: string; default?: boolean }[] }[];
  }[];

  const item = itemId ? items.find((entry) => entry.id === itemId) : items[0];
  if (!item) throw new Error(`No such menu item: ${itemId}`);

  const selection: Record<string, string[]> = {};
  for (const group of item.groups) {
    if (group.type === 'single') {
      const preferred = group.choices.find((choice) => choice.default) ?? group.choices[0];
      selection[group.id] = [preferred.id];
    } else {
      selection[group.id] = [];
    }
  }

  return { itemId: item.id, quantity: 1, selection };
}

export async function readOrder(orderId: string): Promise<OrderRow> {
  const row = findOrderRow(orderId);
  if (!row) throw new Error(`Order ${orderId} not found`);
  return row;
}
