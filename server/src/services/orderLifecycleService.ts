/**
 * Order lifecycle: staff status moves, customer cancellation and waiting-room credit.
 *
 * Cancellation rules live in the shared lifecycle module so the browser can explain
 * the policy *before* the guest taps cancel, and the API enforces exactly the same
 * rule when the request arrives.
 */
import { canCustomerCancel, canTransition, type CancellationPolicy, type OrderStatus } from '../../../shared/orderStatus.ts';
import { env } from '../config/env.ts';
import type { AuthContext } from '../http/context.ts';
import { ApiError } from '../http/errors.ts';
import type { OrderDto, OrderRow } from '../repositories/orderMapper.ts';
import { addBonusCredit, insertStatusEvent, setPaymentStatus, updateOrderStatus } from '../repositories/orderRepository.ts';
import { findOrderRow } from '../repositories/orderQueries.ts';
import { minutesSince } from '../utils/time.ts';
import { toDto } from './orderService.ts';

export function cancellationPolicyFor(row: OrderRow): CancellationPolicy {
  return canCustomerCancel(row.status, minutesSince(row.placed_at), env.cancelWindowMinutes);
}

/** Kitchen dashboard: move an order exactly one step along, or cancel it. */
export function advanceStatus(orderId: string, to: OrderStatus, actor: AuthContext): OrderDto {
  const row = findOrderRow(orderId);
  if (!row) throw ApiError.notFound('We could not find that order.');

  if (!canTransition(row.status, to)) {
    throw ApiError.conflict(`An order that is "${row.status}" cannot be moved to "${to}".`, 'invalid_transition');
  }

  updateOrderStatus(orderId, to);
  insertStatusEvent(orderId, to, `staff:${actor.name}`);

  const updated = findOrderRow(orderId);
  if (!updated) throw ApiError.notFound('We could not find that order.');
  return toDto(updated);
}

export interface CancelInput {
  orderId: string;
  actor: { kind: 'customer' | 'staff'; userId: string | null; name: string };
  reason?: string;
}

export function cancelOrder(input: CancelInput): OrderDto {
  const row = findOrderRow(input.orderId);
  if (!row) throw ApiError.notFound('We could not find that order.');

  if (input.actor.kind === 'customer') {
    if (row.user_id !== input.actor.userId) throw ApiError.notFound('We could not find that order.');

    const policy = cancellationPolicyFor(row);
    if (!policy.allowed) {
      throw ApiError.conflict(policy.reason ?? 'This order can no longer be cancelled.', 'cancellation_closed');
    }
  } else if (!canTransition(row.status, 'cancelled')) {
    throw ApiError.conflict('This order can no longer be cancelled.', 'cancellation_closed');
  }

  const reason = input.reason?.trim() || 'Cancelled by the customer';
  updateOrderStatus(input.orderId, 'cancelled', { reason });
  insertStatusEvent(input.orderId, 'cancelled', `${input.actor.kind}:${input.actor.name}`, reason);

  // Money that was taken is marked refunded; test payments are clearly labelled as such
  // by the payment provider, so this is a record of intent rather than a bank transfer.
  if (row.payment_status === 'paid') setPaymentStatus(input.orderId, 'refunded');
  else if (row.payment_status === 'processing') setPaymentStatus(input.orderId, 'cancelled');

  const updated = findOrderRow(input.orderId);
  if (!updated) throw ApiError.notFound('We could not find that order.');
  return toDto(updated);
}

export interface CreditActor {
  userId: string | null;
  guestToken?: string | null;
}

/** Waiting-room games: credit comes off the amount still to pay. */
export function awardGameCredit(orderId: string, amount: number, actor: CreditActor): OrderDto {
  const row = findOrderRow(orderId);
  if (!row) throw ApiError.notFound('We could not find that order.');

  const owns = actor.userId
    ? row.user_id === actor.userId
    : Boolean(row.guest_token && row.guest_token === actor.guestToken);
  if (!owns) throw ApiError.notFound('We could not find that order.');

  if (row.status === 'cancelled') throw ApiError.conflict('This order was cancelled.', 'order_cancelled');
  if (row.status === 'delivered') throw ApiError.conflict('This order is already closed.', 'order_closed');
  if (!Number.isFinite(amount) || amount <= 0) throw ApiError.validation('That reward was not valid.');

  addBonusCredit(orderId, amount);

  const updated = findOrderRow(orderId);
  if (!updated) throw ApiError.notFound('We could not find that order.');
  return toDto(updated);
}
