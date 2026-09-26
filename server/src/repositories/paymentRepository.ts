/**
 * Payment records.
 *
 * A row is created when the guest chooses a method, and only ever moves through the
 * statuses in `PaymentStatus`. With the default `mock` provider nothing leaves this
 * machine — the reference is generated locally and labelled as a test payment.
 */
import { all, get, run } from '../db/index.ts';
import { createId, paymentReference } from '../utils/ids.ts';
import { nowIso } from '../utils/time.ts';
import type { PaymentMethodId, PaymentRow, PaymentStatus } from './orderMapper.ts';

export type { PaymentRow, PaymentStatus, PaymentMethodId };

export interface NewPaymentInput {
  orderId: string;
  provider: string;
  method: PaymentMethodId;
  amount: number;
  status?: PaymentStatus;
}

export function createPayment(input: NewPaymentInput): PaymentRow {
  const stamp = nowIso();
  const id = createId('pay');

  run(
    `INSERT INTO payments (id, order_id, provider, method, amount, status, reference, failure_reason, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
    [id, input.orderId, input.provider, input.method, input.amount, input.status ?? 'pending', stamp, stamp],
  );

  return {
    id,
    order_id: input.orderId,
    provider: input.provider,
    method: input.method,
    amount: input.amount,
    status: input.status ?? 'pending',
    reference: null,
    failure_reason: null,
    created_at: stamp,
    updated_at: stamp,
  };
}

export function findPayment(id: string): PaymentRow | undefined {
  return get<PaymentRow>('SELECT * FROM payments WHERE id = ?', [id]);
}

export function listPaymentsForOrder(orderId: string): PaymentRow[] {
  return all<PaymentRow>('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC', [orderId]);
}

export function latestPaymentForOrder(orderId: string): PaymentRow | undefined {
  return get<PaymentRow>('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1', [orderId]);
}

export interface PaymentPatch {
  status: PaymentStatus;
  reference?: string | null;
  failureReason?: string | null;
}

export function updatePayment(id: string, patch: PaymentPatch): PaymentRow | undefined {
  const existing = findPayment(id);
  if (!existing) return undefined;

  run('UPDATE payments SET status = ?, reference = ?, failure_reason = ?, updated_at = ? WHERE id = ?', [
    patch.status,
    patch.reference !== undefined ? patch.reference : existing.reference,
    patch.failureReason !== undefined ? patch.failureReason : existing.failure_reason,
    nowIso(),
    id,
  ]);

  return findPayment(id);
}

/** Marks a local test payment as paid, with a locally generated reference. */
export function markPaid(id: string, provider: string, seed: string): PaymentRow | undefined {
  return updatePayment(id, { status: 'paid', reference: paymentReference(provider, seed) });
}

export function anyPaidPayment(orderId: string): boolean {
  return listPaymentsForOrder(orderId).some((payment) => payment.status === 'paid');
}
