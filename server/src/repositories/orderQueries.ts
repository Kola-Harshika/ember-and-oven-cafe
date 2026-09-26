/**
 * Order reads. Every query here is scoped by the caller (customer id, guest token or
 * staff access), so one customer can never read another customer's order.
 */
import type { OrderStatus } from '../../../shared/orderStatus.ts';
import { all, count, get } from '../db/index.ts';
import type { OrderItemRow, OrderRow, StatusEventRow } from './orderMapper.ts';

export function findOrderRow(id: string): OrderRow | undefined {
  return get<OrderRow>('SELECT * FROM orders WHERE id = ?', [id]);
}

export function findOrderItems(orderId: string): OrderItemRow[] {
  return all<OrderItemRow>('SELECT * FROM order_items WHERE order_id = ? ORDER BY rowid', [orderId]);
}

export function listStatusEvents(orderId: string): StatusEventRow[] {
  return all<StatusEventRow>(
    'SELECT id, status, note, author, created_at FROM order_status_events WHERE order_id = ? ORDER BY created_at, rowid',
    [orderId],
  );
}

export function listStatusEventsFor(orderIds: string[]): StatusEventRow[] {
  if (orderIds.length === 0) return [];
  const placeholders = orderIds.map(() => '?').join(', ');
  return all<StatusEventRow>(
    `SELECT id, status, note, author, created_at FROM order_status_events
      WHERE order_id IN (${placeholders}) ORDER BY created_at, rowid`,
    orderIds,
  );
}

export function listOrderRowsForUser(userId: string, limit = 50): OrderRow[] {
  return all<OrderRow>('SELECT * FROM orders WHERE user_id = ? ORDER BY placed_at DESC LIMIT ?', [userId, limit]);
}

export interface OrderFilter {
  statuses?: OrderStatus[];
  limit?: number;
}

/** Kitchen dashboard feed. */
export function listOrderRows(filter: OrderFilter = {}): OrderRow[] {
  const limit = filter.limit ?? 100;

  if (filter.statuses && filter.statuses.length > 0) {
    const placeholders = filter.statuses.map(() => '?').join(', ');
    return all<OrderRow>(
      `SELECT * FROM orders WHERE status IN (${placeholders}) ORDER BY placed_at DESC LIMIT ?`,
      [...filter.statuses, limit],
    );
  }

  return all<OrderRow>('SELECT * FROM orders ORDER BY placed_at DESC LIMIT ?', [limit]);
}

export function countOrders(): number {
  return count('SELECT COUNT(*) AS total FROM orders');
}

export function countOrdersByStatus(): Record<string, number> {
  const rows = all<{ status: string; total: number }>(
    'SELECT status, COUNT(*) AS total FROM orders GROUP BY status',
  );
  const summary: Record<string, number> = {};
  for (const row of rows) summary[row.status] = Number(row.total);
  return summary;
}
