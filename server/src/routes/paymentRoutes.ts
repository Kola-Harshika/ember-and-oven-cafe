/**
 * Payment endpoints.
 *
 * The status machine is explicit — pending → processing → paid, or failed/cancelled —
 * and confirmations are only accepted while the mock provider is in use. A real
 * gateway confirms through its signed webhook instead, which is why this route
 * refuses to "confirm" anything when a live provider is configured.
 */
import { Router } from 'express';
import { z } from 'zod';
import { readGuestToken, requireActor, type RequestActor } from '../http/actor.ts';
import { ApiError } from '../http/errors.ts';
import { parseBody } from '../http/validate.ts';
import { findOrderRow } from '../repositories/orderQueries.ts';
import { findPayment, type PaymentRow } from '../repositories/paymentRepository.ts';
import {
  availableMethods,
  cancelPayment,
  confirmPayment,
  failPayment,
  paymentHistory,
  providerInfo,
  startPayment,
} from '../services/paymentService.ts';

const methodSchema = z.enum(['upi', 'card', 'wallet', 'cash']);

const startSchema = z.object({
  orderId: z.string().min(3).max(40),
  method: methodSchema,
  guestToken: z.string().min(8).max(120).optional(),
});

const failureSchema = z.object({ reason: z.string().trim().max(160).optional() });

export const paymentRouter = Router();

/** Who is allowed to act on this payment: its own order's owner. */
function assertPaymentAccess(payment: PaymentRow, actor: RequestActor): void {
  const order = findOrderRow(payment.order_id);
  if (!order) throw ApiError.notFound('We could not find that order.');

  const owns = actor.userId
    ? order.user_id === actor.userId
    : Boolean(order.guest_token && order.guest_token === actor.guestToken);

  if (!owns) throw ApiError.notFound('We could not find that payment.');
}

paymentRouter.get('/config', (_req, res) => {
  res.json({ provider: providerInfo(), methods: availableMethods() });
});

paymentRouter.post('/', (req, res) => {
  const body = parseBody(startSchema, req.body, 'Please choose a payment method.');
  const row = findOrderRow(body.orderId);
  if (!row) throw ApiError.notFound('We could not find that order.');

  const actor = requireActor(req, body.guestToken ?? readGuestToken(req));
  const owns = actor.userId
    ? row.user_id === actor.userId
    : Boolean(row.guest_token && row.guest_token === actor.guestToken);
  if (!owns) throw ApiError.notFound('We could not find that order.');

  const { payment, provider } = startPayment({
    orderId: row.id,
    amount: Math.max(0, row.total - row.bonus_credit),
    method: body.method,
    alreadyPaid: row.payment_status === 'paid',
    orderClosed: row.status === 'cancelled',
  });

  res.status(201).json({ payment, provider });
});

paymentRouter.get('/order/:orderId', (req, res) => {
  const actor = requireActor(req, readGuestToken(req));
  const row = findOrderRow(req.params.orderId);
  if (!row) throw ApiError.notFound('We could not find that order.');

  const owns = actor.userId
    ? row.user_id === actor.userId
    : Boolean(row.guest_token && row.guest_token === actor.guestToken);
  if (!owns) throw ApiError.notFound('We could not find that order.');

  res.json({ payments: paymentHistory(row.id) });
});

paymentRouter.post('/:paymentId/confirm', (req, res) => {
  const payment = resolvePayment(req.params.paymentId);
  const actor = requireActor(req, readGuestToken(req));
  assertPaymentAccess(payment, actor);

  const provider = providerInfo();
  if (provider.id !== 'mock') {
    throw ApiError.unavailable(
      'Live payments are confirmed by the gateway webhook, not from the browser. This build has no live gateway configured.',
    );
  }

  res.json({ payment: confirmPayment(payment.id), provider });
});

paymentRouter.post('/:paymentId/fail', (req, res) => {
  const payment = resolvePayment(req.params.paymentId);
  const actor = requireActor(req, readGuestToken(req));
  assertPaymentAccess(payment, actor);

  if (providerInfo().id !== 'mock') throw ApiError.unavailable('Only the test provider can force a failure.');
  const body = parseBody(failureSchema, req.body ?? {}, 'That request was not valid.');
  res.json({ payment: failPayment(payment.id, body.reason) });
});

paymentRouter.post('/:paymentId/cancel', (req, res) => {
  const payment = resolvePayment(req.params.paymentId);
  const actor = requireActor(req, readGuestToken(req));
  assertPaymentAccess(payment, actor);

  res.json({ payment: cancelPayment(payment.id) });
});

function resolvePayment(paymentId: string): PaymentRow {
  const payment = findPayment(paymentId);
  if (!payment) throw ApiError.notFound('We could not find that payment.');
  return payment;
}
