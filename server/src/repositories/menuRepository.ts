/**
 * Menu reads.
 *
 * Only the repository layer talks SQL; services and routes work with domain types.
 */
import type { Category, MenuItem, OptionChoice, OptionGroup } from '../../../src/data/types.ts';
import { all, get, run } from '../db/index.ts';
import {
  toCategory,
  toChoice,
  toGroup,
  toItem,
  type CategoryRow,
  type ChoiceRow,
  type GroupRow,
  type ItemRow,
} from './menuMapper.ts';

/** Loads option groups (and their choices) for a batch of items in two queries. */
function loadGroups(itemIds: string[]): Map<string, OptionGroup[]> {
  const byItem = new Map<string, OptionGroup[]>();
  if (itemIds.length === 0) return byItem;

  const itemPlaceholders = itemIds.map(() => '?').join(', ');
  const groups = all<GroupRow>(
    `SELECT item_id, id, label, helper, type, is_required, min_select, max_select, slot
       FROM option_groups WHERE item_id IN (${itemPlaceholders}) ORDER BY item_id, sort_order`,
    itemIds,
  );
  if (groups.length === 0) return byItem;

  // Choice ids are reused across dishes, so they are keyed by dish *and* group.
  const choices = all<ChoiceRow>(
    `SELECT item_id, group_id, id, label, hint, price, badge, art, is_default
       FROM option_choices WHERE item_id IN (${itemPlaceholders}) ORDER BY item_id, group_id, sort_order`,
    itemIds,
  );

  const choicesByGroup = new Map<string, OptionChoice[]>();
  for (const choice of choices) {
    const key = `${choice.item_id}::${choice.group_id}`;
    const list = choicesByGroup.get(key) ?? [];
    list.push(toChoice(choice));
    choicesByGroup.set(key, list);
  }

  for (const group of groups) {
    const list = byItem.get(group.item_id) ?? [];
    list.push(toGroup(group, choicesByGroup.get(`${group.item_id}::${group.id}`) ?? []));
    byItem.set(group.item_id, list);
  }

  return byItem;
}

export function listCategories(): Category[] {
  return all<CategoryRow>('SELECT * FROM categories ORDER BY sort_order').map(toCategory);
}

/** The menu the API serves: available items only, with their customisation groups. */
export function listMenuItems(): MenuItem[] {
  const rows = all<ItemRow>('SELECT * FROM menu_items WHERE available = 1 ORDER BY sort_order');
  const groups = loadGroups(rows.map((row) => row.id));
  return rows.map((row) => toItem(row, groups.get(row.id) ?? []));
}

export function findMenuItem(id: string): MenuItem | undefined {
  const row = get<ItemRow>('SELECT * FROM menu_items WHERE id = ?', [id]);
  if (!row) return undefined;
  return toItem(row, loadGroups([row.id]).get(row.id) ?? []);
}

export interface MenuItemAvailability {
  id: string;
  name: string;
  available: boolean;
}

export function listAvailability(): MenuItemAvailability[] {
  return all<{ id: string; name: string; available: number }>(
    'SELECT id, name, available FROM menu_items ORDER BY sort_order',
  ).map((row) => ({ id: row.id, name: row.name, available: Boolean(row.available) }));
}

export function setAvailability(id: string, available: boolean): boolean {
  const existing = get<{ id: string }>('SELECT id FROM menu_items WHERE id = ?', [id]);
  if (!existing) return false;
  run('UPDATE menu_items SET available = ? WHERE id = ?', [available ? 1 : 0, id]);
  return true;
}

export function isMenuItemAvailable(id: string): boolean {
  const row = get<{ available: number }>('SELECT available FROM menu_items WHERE id = ?', [id]);
  return Boolean(row?.available);
}

/** Coupon rows straight from the database, so promotions stay server-authoritative. */
export interface CouponRecord {
  code: string;
  label: string;
  blurb: string;
  percent: number | null;
  flat: number | null;
  maxDiscount: number | null;
  minSubtotal: number;
}

interface CouponRow {
  code: string;
  label: string;
  blurb: string;
  percent: number | null;
  flat: number | null;
  max_discount: number | null;
  min_subtotal: number;
}

const COUPON_SELECT = 'SELECT code, label, blurb, percent, flat, max_discount, min_subtotal FROM coupons';

function toCoupon(row: CouponRow): CouponRecord {
  return {
    code: row.code,
    label: row.label,
    blurb: row.blurb,
    percent: row.percent,
    flat: row.flat,
    maxDiscount: row.max_discount,
    minSubtotal: row.min_subtotal,
  };
}

export function listCoupons(): CouponRecord[] {
  return all<CouponRow>(`${COUPON_SELECT} WHERE active = 1 ORDER BY code`).map(toCoupon);
}

export function findCoupon(code: string): CouponRecord | undefined {
  const row = get<CouponRow>(`${COUPON_SELECT} WHERE active = 1 AND code = ?`, [code.trim().toUpperCase()]);
  return row ? toCoupon(row) : undefined;
}
