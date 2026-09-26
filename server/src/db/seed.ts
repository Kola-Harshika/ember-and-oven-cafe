/**
 * Seed script.
 *
 * The menu that ships with the frontend (`src/data/*`) stays the single source of
 * truth: this script copies it into the database so the API can serve it, price it
 * and store immutable order snapshots. Re-running is safe (upsert + sync).
 */
import { CATEGORIES, MENU_ITEMS } from '../../../src/data/menu.ts';
import { COUPONS } from '../../../src/data/promos.ts';
import type { Category, MenuItem } from '../../../src/data/types.ts';
import { env } from '../config/env.ts';
import { generatePassword, hashPassword } from '../utils/password.ts';
import { isMain, log } from '../utils/cli.ts';
import { createId } from '../utils/ids.ts';
import { nowIso } from '../utils/time.ts';
import { closeDb, count, get, run, transaction, type SqlValue } from './index.ts';
import { runMigrations } from './migrate.ts';

const json = (value: unknown): string => JSON.stringify(value ?? null);

/** Generic upsert so each table's SQL stays short and consistent. */
function upsert(table: string, columns: string[], values: SqlValue[], conflictOn: string[] = [columns[0]]): void {
  const placeholders = columns.map(() => '?').join(', ');
  const updates = columns
    .filter((column) => !conflictOn.includes(column))
    .map((column) => `${column} = excluded.${column}`)
    .join(', ');
  run(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})
     ON CONFLICT(${conflictOn.join(', ')}) DO UPDATE SET ${updates}`,
    values,
  );
}

const CATEGORY_COLUMNS = [
  'id',
  'name',
  'short_name',
  'tagline',
  'blurb',
  'accent',
  'image',
  'craft_note',
  'sort_order',
];

const ITEM_COLUMNS = [
  'id',
  'category_id',
  'name',
  'short_name',
  'tagline',
  'description',
  'price',
  'image',
  'tags',
  'badge',
  'heat',
  'prep_minutes',
  'rating',
  'ordered_times',
  'nutrition',
  'pairings',
  'art',
  'preset',
  'available',
  'sort_order',
];

const GROUP_COLUMNS = [
  'item_id',
  'id',
  'label',
  'helper',
  'type',
  'is_required',
  'min_select',
  'max_select',
  'slot',
  'sort_order',
];

const CHOICE_COLUMNS = [
  'item_id',
  'id',
  'group_id',
  'label',
  'hint',
  'price',
  'badge',
  'art',
  'is_default',
  'sort_order',
];

const COUPON_COLUMNS = ['code', 'label', 'blurb', 'percent', 'flat', 'max_discount', 'min_subtotal', 'active'];

function seedCategory(category: Category, order: number): void {
  upsert('categories', CATEGORY_COLUMNS, [
    category.id,
    category.name,
    category.shortName,
    category.tagline,
    category.blurb,
    category.accent,
    category.image,
    category.craftNote,
    order,
  ]);
}

function seedItem(item: MenuItem, order: number): void {
  upsert('menu_items', ITEM_COLUMNS, [
    item.id,
    item.category,
    item.name,
    item.shortName,
    item.tagline,
    item.description,
    item.price,
    item.image,
    json(item.tags),
    item.badge ?? null,
    item.heat,
    item.prepMinutes,
    item.rating,
    item.orderedTimes,
    json(item.nutrition),
    json(item.pairings),
    json(item.art),
    item.preset ? json(item.preset) : null,
    1,
    order,
  ]);

  // Groups and choices are rebuilt so renames in the data file land cleanly.
  run('DELETE FROM option_groups WHERE item_id = ?', [item.id]);

  item.groups.forEach((group, groupIndex) => {
    upsert(
      'option_groups',
      GROUP_COLUMNS,
      [
        item.id,
        group.id,
        group.label,
        group.helper ?? null,
        group.type,
        group.required ? 1 : 0,
        group.min ?? null,
        group.max ?? null,
        group.slot,
        groupIndex,
      ],
      ['item_id', 'id'],
    );

    group.choices.forEach((choice, choiceIndex) => {
      upsert(
        'option_choices',
        CHOICE_COLUMNS,
        [
          item.id,
          choice.id,
          group.id,
          choice.label,
          choice.hint ?? null,
          choice.price,
          choice.badge ?? null,
          choice.art ?? null,
          choice.default ? 1 : 0,
          choiceIndex,
        ],
        ['item_id', 'id'],
      );
    });
  });
}

/** Items that disappeared from the data file are hidden, never deleted (orders reference them). */
function syncAvailability(): void {
  const ids = MENU_ITEMS.map((item) => item.id);
  const placeholders = ids.map(() => '?').join(', ');
  run(`UPDATE menu_items SET available = 0 WHERE id NOT IN (${placeholders})`, ids);
}

/** Catalogue, option groups and promotions. */
export function seedCatalogue(): void {
  transaction(() => {
    CATEGORIES.forEach(seedCategory);
    MENU_ITEMS.forEach((item, index) => seedItem(item, index));

    COUPONS.forEach((coupon) => {
      upsert('coupons', COUPON_COLUMNS, [
        coupon.code,
        coupon.label,
        coupon.blurb,
        coupon.percent ?? null,
        coupon.flat ?? null,
        coupon.maxDiscount ?? null,
        coupon.minSubtotal,
        1,
      ]);
    });

    const codes = COUPONS.map((coupon) => coupon.code);
    const placeholders = codes.map(() => '?').join(', ');
    run(`DELETE FROM coupons WHERE code NOT IN (${placeholders})`, codes);

    syncAvailability();
  });
}

export interface StaffSeedResult {
  staffCreated: boolean;
  staffEmail: string;
  generatedStaffPassword: string | null;
}

/**
 * Creates or refreshes the staff account used by the kitchen dashboard.
 * The password always comes from the environment; when none is configured a random
 * one is generated and printed once by this script — never written into the source.
 */
export function seedStaff(): StaffSeedResult {
  const email = (env.staffEmail || 'staff@ember-oven.local').toLowerCase();
  const stamp = nowIso();
  const existing = get<{ id: string }>('SELECT id FROM users WHERE email = ?', [email]);

  if (env.staffPassword) {
    const hash = hashPassword(env.staffPassword);
    if (existing) {
      run('UPDATE users SET password_hash = ?, role = ?, updated_at = ? WHERE id = ?', [
        hash,
        'staff',
        stamp,
        existing.id,
      ]);
      return { staffCreated: false, staffEmail: email, generatedStaffPassword: null };
    }

    run(
      `INSERT INTO users (id, email, name, phone, address, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?)`,
      [createId('user'), email, 'Cafe kitchen', hash, 'staff', stamp, stamp],
    );
    return { staffCreated: true, staffEmail: email, generatedStaffPassword: null };
  }

  if (existing) {
    run("UPDATE users SET role = 'staff', updated_at = ? WHERE id = ?", [stamp, existing.id]);
    return { staffCreated: false, staffEmail: email, generatedStaffPassword: null };
  }

  const password = generatePassword();
  run(
    `INSERT INTO users (id, email, name, phone, address, password_hash, role, created_at, updated_at)
     VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?)`,
    [createId('user'), email, 'Cafe kitchen', hashPassword(password), 'staff', stamp, stamp],
  );
  return { staffCreated: true, staffEmail: email, generatedStaffPassword: password };
}

export interface SeedSummary extends StaffSeedResult {
  categories: number;
  items: number;
  choices: number;
  coupons: number;
}

/** Seeds everything the API needs and reports what is in the database. */
export function seedDatabase(): SeedSummary {
  seedCatalogue();
  const staff = seedStaff();

  return {
    ...staff,
    categories: count('SELECT COUNT(*) AS total FROM categories'),
    items: count('SELECT COUNT(*) AS total FROM menu_items'),
    choices: count('SELECT COUNT(*) AS total FROM option_choices'),
    coupons: count('SELECT COUNT(*) AS total FROM coupons'),
  };
}

if (isMain(import.meta.url)) {
  runMigrations();
  const summary = seedDatabase();
  log(
    'seed',
    `${summary.categories} categories · ${summary.items} items · ${summary.choices} options · ${summary.coupons} coupons`,
  );

  if (summary.staffCreated && summary.generatedStaffPassword) {
    log('seed', `staff account created: ${summary.staffEmail}`);
    log('seed', `one-time password: ${summary.generatedStaffPassword}`);
    log('seed', 'set STAFF_EMAIL and STAFF_PASSWORD in .env to choose your own next time');
  } else if (env.staffPassword) {
    log('seed', `staff credentials taken from STAFF_EMAIL/STAFF_PASSWORD (${summary.staffEmail})`);
  } else {
    log('seed', `staff account left unchanged (${summary.staffEmail})`);
  }

  closeDb();
}

