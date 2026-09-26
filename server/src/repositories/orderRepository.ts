/**
 * Order writes: creation, status changes and the payment-status mirror kept on the
 * order row (so the kitchen dashboard and the tracker can render with one read).
 */
import type { OrderStatus } from '../../../shared/orderStatus.ts';
import { get, run, transaction } from '../db/index.ts';
import { createId } from '../utils/ids.ts';
import { nowIso } from '../utils/time.ts';
import type { OrderRow, PaymentStatus } from './orderMapper.ts';

export interface NewOrderRecord {
  id: string;
  userId: string | null;
  guestToken: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  mode: OrderRow['mode'];
  tableNo: string | null;
  address: string | null;
  notes: string | null;
  subtotal: number;
  couponCode: string | null;
  couponDiscount: number;
  bonusDiscount: number;
  taxable: number;
  tax: number;
  deliveryFee: number;
  tip: number;
  total: number;
  etaMinutes: number;
  placedAt: string;
}

export interface NewOrderLine {
  itemId: string;
  name: string;
  shortName: string;
  categoryId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  selection: string;
  summary: string;
  extras: string;
  art: string;
  note: string | null;
}

/** Next customer-facing code (ORD-1001, ORD-1002, …). */
export function nextOrderSequence(start = 1001): number {
  const row = get<{ last: string | null }>(
    "SELECT MAX(CAST(SUBSTR(id, 5) AS INTEGER)) AS last FROM orders WHERE id LIKE 'ORD-%'",
  );
  const last = row?.last ? Number(row.last) : 0;
  return Math.max(start, (Number.isFinite(last) ? last : 0) + 1);
}

export function orderExists(id: string): boolean {
  return Boolean(get<{ id: string }>('SELECT id FROM orders WHERE id = ?', [id]));
}

/** Inserts the order, its lines and the opening status event as one unit of work. */
export function insertOrder(record: NewOrderRecord, lines: NewOrderLine[], author: string): void {
  transaction(() => {
    run(
      `INSERT INTO orders (
         id, user_id, guest_token, customer_name, customer_phone, customer_email,
         mode, table_no, address, notes, status, payment_status,
         subtotal, coupon_code, coupon_discount, bonus_discount, taxable, tax,
         delivery_fee, tip, total, eta_minutes, placed_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.userId,
        record.guestToken,
        record.customerName,
        record.customerPhone,
        record.customerEmail,
        record.mode,
        record.tableNo,
        record.address,
        record.notes,
        record.subtotal,
        record.couponCode,
        record.couponDiscount,
        record.bonusDiscount,
        record.taxable,
        record.tax,
        record.deliveryFee,
        record.tip,
        record.total,
        record.etaMinutes,
        record.placedAt,
        record.placedAt,
      ],
    );

    for (const line of lines) {
      run(
        `INSERT INTO order_items (
           id, order_id, item_id, name, short_name, category_id, quantity, unit_price, line_total,
           selection, selection_summary, selection_extras, art, note
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createId('line'),
          record.id,
          line.itemId,
          line.name,
          line.shortName,
          line.categoryId,
          line.quantity,
          line.unitPrice,
          line.lineTotal,
          line.selection,
          line.summary,
          line.extras,
          line.art,
          line.note,
        ],
      );
    }

    insertStatusEvent(record.id, 'received', author, 'Ticket printed at the pass');
  });
}

export function insertStatusEvent(orderId: string, status: OrderStatus, author: string, note?: string): void {
  run('INSERT INTO order_status_events (id, order_id, status, note, author, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
    createId('event'),
    orderId,
    status,
    note ?? null,
    author,
    nowIso(),
  ]);
}

export function updateOrderStatus(id: string, status: OrderStatus, extra: { reason?: string } = {}): void {
  const stamp = nowIso();

  if (status === 'cancelled') {
    run('UPDATE orders SET status = ?, cancelled_at = ?, cancel_reason = ?, updated_at = ? WHERE id = ?', [
      status,
      stamp,
      extra.reason ?? null,
      stamp,
      id,
    ]);
    return;
  }

  run('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', [status, stamp, id]);
}

export function setPaymentStatus(id: string, status: PaymentStatus): void {
  run('UPDATE orders SET payment_status = ?, updated_at = ? WHERE id = ?', [status, nowIso(), id]);
}

/**
 * Adds waiting-room game winnings to the order. Capped so the credit can never
 * exceed the cafe's own limit, and never goes negative.
 */
export function addBonusCredit(orderId: string, amount: number, cap = 300): number {
  const row = get<{ bonus_credit: number }>('SELECT bonus_credit FROM orders WHERE id = ?', [orderId]);
  if (!row) return 0;

  const next = Math.min(cap, Math.max(0, row.bonus_credit + Math.round(amount)));
  run('UPDATE orders SET bonus_credit = ?, updated_at = ? WHERE id = ?', [next, nowIso(), orderId]);
  return next;
}
