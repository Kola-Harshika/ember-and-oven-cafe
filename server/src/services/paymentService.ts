/**
 * Payments.
 *
 * The provider is chosen by configuration. With `PAYMENT_PROVIDER=mock` (the default)
 * this is an entirely local simulation: a payment row moves pending → paid with a
 * locally generated reference, and the UI says so. Wiring a real gateway means
 * implementing the same four operations against that gateway's API and confirming
 * the result from its webhook — no client code has to change.
 */
import { PAYMENT_METHODS, type PaymentMethod } from '../../../src/data/promos.ts';
import { env, isLivePaymentProvider, type PaymentProviderId } from '../config/env.ts';
import { ApiError } from '../http/errors.ts';
import type { PaymentMethodId, PaymentRow } from '../repositories/orderMapper.ts';
import {
  createPayment,
  findPayment,
  latestPaymentForOrder,
  listPaymentsForOrder,
  markPaid,
  updatePayment,
} from '../repositories/paymentRepository.ts';
import { setPaymentStatus } from '../repositories/orderRepository.ts';

export interface ProviderInfo {
  id: PaymentProviderId;
  /** true only when a real gateway is configured with real keys */
  live: boolean;
  label: string;
  note: string;
}

export function providerInfo(): ProviderInfo {
  if (env.paymentProvider === 'mock') {
    return {
      id: 'mock',
      live: false,
      label: 'Test payment (mock)',
      note: 'No money moves: this build simulates authorisation locally so the flow can be demonstrated safely.',
    };
  }

  const live = isLivePaymentProvider();
  return {
    id: env.paymentProvider,
    live,
    label: env.paymentProvider === 'razorpay' ? 'Razorpay' : 'Stripe',
    note: live
      ? 'Live gateway configured from environment variables.'
      : 'Gateway selected but its API keys are not configured, so payment is unavailable.',
  };
}

export function availableMethods(): PaymentMethod[] {
  return PAYMENT_METHODS;
}

export interface StartPaymentInput {
  orderId: string;
  amount: number;
  method: PaymentMethodId;
  alreadyPaid: boolean;
  orderClosed: boolean;
}

export function startPayment(input: StartPaymentInput): { payment: PaymentRow; provider: ProviderInfo } {
  const provider = providerInfo();

  if (input.orderClosed) throw ApiError.conflict('This order was cancelled, so it cannot be paid.', 'order_cancelled');
  if (input.alreadyPaid) throw ApiError.conflict('This order has already been paid.', 'already_paid');
  if (!provider.live && provider.id !== 'mock') throw ApiError.unavailable(provider.note);
  if (!PAYMENT_METHODS.some((method) => method.id === input.method)) {
    throw ApiError.validation('That payment method is not available.');
  }
  if (input.amount <= 0) {
    throw ApiError.conflict('There is nothing left to pay on this order.', 'nothing_due');
  }

  const payment = createPayment({
    orderId: input.orderId,
    provider: provider.id,
    method: input.method,
    amount: input.amount,
    status: 'pending',
  });

  setPaymentStatus(input.orderId, 'pending');
  return { payment, provider };
}

/** Mock confirmation: the local "gateway" call that a real provider would make. */
export function confirmPayment(paymentId: string): PaymentRow {
  const payment = findPayment(paymentId);
  if (!payment) throw ApiError.notFound('We could not find that payment.');

  if (payment.status === 'paid') return payment; // idempotent: refreshing must not double charge
  if (payment.status === 'cancelled' || payment.status === 'failed') {
    throw ApiError.conflict('That payment attempt is closed. Please start a new one.', 'payment_closed');
  }

  updatePayment(paymentId, { status: 'processing' });
  const paid = markPaid(paymentId, payment.provider, payment.order_id);
  if (!paid) throw ApiError.conflict('That payment could not be confirmed.');

  setPaymentStatus(payment.order_id, 'paid');
  return paid;
}

export function failPayment(paymentId: string, reason = 'The payment did not go through.'): PaymentRow {
  const payment = findPayment(paymentId);
  if (!payment) throw ApiError.notFound('We could not find that payment.');
  if (payment.status === 'paid') throw ApiError.conflict('That payment is already complete.', 'already_paid');

  const failed = updatePayment(paymentId, { status: 'failed', failureReason: reason });
  if (!failed) throw ApiError.conflict('That payment could not be updated.');

  setPaymentStatus(payment.order_id, 'failed');
  return failed;
}

export function cancelPayment(paymentId: string): PaymentRow {
  const payment = findPayment(paymentId);
  if (!payment) throw ApiError.notFound('We could not find that payment.');
  if (payment.status === 'paid') throw ApiError.conflict('That payment is already complete.', 'already_paid');

  const cancelled = updatePayment(paymentId, { status: 'cancelled', failureReason: 'Cancelled before confirmation' });
  if (!cancelled) throw ApiError.conflict('That payment could not be updated.');

  setPaymentStatus(payment.order_id, 'cancelled');
  return cancelled;
}

export function paymentFor(orderId: string): PaymentRow | undefined {
  return latestPaymentForOrder(orderId);
}

export function paymentHistory(orderId: string): PaymentRow[] {
  return listPaymentsForOrder(orderId);
}
