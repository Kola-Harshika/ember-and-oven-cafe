/**
 * Customer order endpoints.
 *
 * Quotes are computed by the API so the browser and the kitchen always agree on the
 * amount; creation is scoped to the signed-in customer (or to a guest token), and
 * reads are owner-scoped.
 */
import { Router } from 'express';
import { z } from 'zod';
import type { OrderMode } from '../../../src/data/promos.ts';
import { actorFrom, readGuestToken, requireActor } from '../http/actor.ts';
import { requireUser } from '../http/context.ts';
import { ApiError } from '../http/errors.ts';
import { parseBody, parseQuery } from '../http/validate.ts';
import {
  cancelOrder,
  cancellationPolicyFor,
  awardGameCredit,
} from '../services/orderLifecycleService.ts';
import {
  createOrder,
  getOrderForCustomer,
  getOrderForGuest,
  listOrdersForCustomer,
} from '../services/orderService.ts';
import { quoteOrder } from '../services/quoteService.ts';
import { findOrderRow } from '../repositories/orderQueries.ts';

const modeSchema = z.enum(['dine-in', 'takeaway', 'delivery']);

const selectionSchema = z.record(z.string(), z.array(z.string()));

const lineSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(20),
  selection: selectionSchema.default({}),
  note: z.string().trim().max(180).optional(),
});

const quoteSchema = z.object({
  mode: modeSchema,
  lines: z.array(lineSchema).min(1, 'Your tray is empty.').max(20),
  couponCode: z.string().trim().max(24).optional(),
  tipPercent: z.coerce.number().min(0).max(30).optional(),
  bonusDiscount: z.coerce.number().min(0).max(300).optional(),
});

const createSchema = quoteSchema.extend({
  customer: z.object({
    name: z.string().trim().min(2, 'We need a name for the ticket.').max(60),
    phone: z.string().trim().min(10, 'A reachable phone number, please.').max(20),
    email: z.string().trim().max(160).optional(),
    table: z.string().trim().max(20).optional(),
    address: z.string().trim().max(240).optional(),
    notes: z.string().trim().max(240).optional(),
  }),
});

const cancelSchema = z.object({ reason: z.string().trim().max(200).optional() });
const rewardSchema = z.object({ amount: z.coerce.number().min(1).max(60) });
const listQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(50).optional() });

export const orderRouter = Router();

/** Price a tray without placing anything (used by the checkout screen). */
orderRouter.post('/quote', (req, res) => {
  const input = parseBody(quoteSchema, req.body, 'Please check your tray and try again.');
  const quote = quoteOrder(input);
  res.json({
    lines: quote.lines.map((line) => ({
      itemId: line.item.id,
      name: line.item.name,
      shortName: line.item.shortName,
      categoryId: line.item.category,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      summary: line.summary,
      extras: line.extras,
      art: line.art,
      note: line.note ?? null,
    })),
    totals: quote.totals,
  });
});

orderRouter.post('/', (req, res) => {
  const input = parseBody(createSchema, req.body, 'Please check your details and try again.');
  const actor = actorFrom(req);

  const result = createOrder(
    {
      customer: input.customer,
      mode: input.mode as OrderMode,
      lines: input.lines,
      ...(input.couponCode ? { couponCode: input.couponCode } : {}),
      tipPercent: input.tipPercent ?? 0,
      bonusDiscount: input.bonusDiscount ?? 0,
    },
    { userId: actor.userId, name: actor.name },
  );

  res.status(201).json({ order: result.order, guestToken: result.guestToken });
});

orderRouter.get('/', (req, res) => {
  const auth = requireUser(req);
  const query = parseQuery(listQuerySchema, req.query);
  const orders = listOrdersForCustomer(auth.userId);
  res.json({ orders: query.limit ? orders.slice(0, query.limit) : orders });
});

/** Staff-style status list is intentionally *not* available here (see /api/admin). */
orderRouter.get('/:orderId', (req, res) => {
  const guestToken = readGuestToken(req);

  if (req.auth) {
    const order = getOrderForCustomer(req.params.orderId, req.auth.userId);
    res.json({ order, cancellation: cancellationPolicyFor(findOrderRow(order.id)!) });
    return;
  }

  if (guestToken) {
    const order = getOrderForGuest(req.params.orderId, guestToken);
    res.json({ order, cancellation: cancellationPolicyFor(findOrderRow(order.id)!) });
    return;
  }

  throw ApiError.unauthorized('Sign in, or open this order from the link you were given.');
});

orderRouter.post('/:orderId/cancel', (req, res) => {
  const actor = requireActor(req, readGuestToken(req));
  const body = parseBody(cancelSchema, req.body ?? {}, 'Please check the cancellation request.');

  const order = cancelOrder({
    orderId: req.params.orderId,
    actor: { kind: 'customer', userId: actor.userId, name: actor.name },
    ...(body.reason ? { reason: body.reason } : {}),
  });

  res.json({ order });
});

orderRouter.post('/:orderId/rewards', (req, res) => {
  const actor = requireActor(req, readGuestToken(req));
  const body = parseBody(rewardSchema, req.body, 'That reward was not valid.');

  const order = awardGameCredit(req.params.orderId, body.amount, {
    userId: actor.userId,
    guestToken: actor.guestToken,
  });

  res.json({ order });
});
