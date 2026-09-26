/**
 * Kitchen dashboard API.
 *
 * The whole router is protected by a staff check, so an ordinary customer session
 * cannot read the order book, move an order along, or hide a dish from the menu.
 */
import { Router } from 'express';
import { z } from 'zod';
import { requireStaff } from '../http/context.ts';
import { parseBody, parseQuery } from '../http/validate.ts';
import { countOrdersByStatus, findOrderItems, findOrderRow, listStatusEvents } from '../repositories/orderQueries.ts';
import { listAvailability, setAvailability } from '../repositories/menuRepository.ts';
import { listPaymentsForOrder } from '../repositories/paymentRepository.ts';
import { toOrderDto } from '../repositories/orderMapper.ts';
import { advanceStatus, cancelOrder } from '../services/orderLifecycleService.ts';
import { getOrderForStaff, listOrdersForStaff } from '../services/orderService.ts';
import { ApiError } from '../http/errors.ts';

const statusSchema = z.enum([
  'received',
  'preparing',
  'cooking',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
]);

const listQuerySchema = z.object({
  status: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const statusBodySchema = z.object({
  status: statusSchema,
  note: z.string().trim().max(180).optional(),
});

const cancelBodySchema = z.object({ reason: z.string().trim().min(3).max(200) });
const availabilitySchema = z.object({ available: z.boolean() });

export const adminRouter = Router();

// Every route below is staff-only.
adminRouter.use((req, _res, next) => {
  requireStaff(req);
  next();
});

adminRouter.get('/orders', (req, res) => {
  const query = parseQuery(listQuerySchema, req.query);
  const statuses = query.status
    ? (query.status
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean) as z.infer<typeof statusSchema>[])
    : undefined;

  const orders = listOrdersForStaff({
    ...(statuses && statuses.length > 0 ? { statuses } : {}),
    ...(query.limit ? { limit: query.limit } : {}),
  });

  res.json({ orders });
});

adminRouter.get('/orders/:orderId', (req, res) => {
  res.json({ order: getOrderForStaff(req.params.orderId) });
});

adminRouter.post('/orders/:orderId/status', (req, res) => {
  const auth = requireStaff(req);
  const body = parseBody(statusBodySchema, req.body, 'That status change was not valid.');

  const order = advanceStatus(req.params.orderId, body.status, auth);
  res.json({ order });
});

adminRouter.post('/orders/:orderId/cancel', (req, res) => {
  const auth = requireStaff(req);
  const body = parseBody(cancelBodySchema, req.body, 'Please give a short reason.');

  const order = cancelOrder({
    orderId: req.params.orderId,
    actor: { kind: 'staff', userId: auth.userId, name: auth.name },
    reason: body.reason,
  });

  res.json({ order });
});

/** Manual "out of stock" switch for the menu. */
adminRouter.get('/menu', (_req, res) => {
  res.json({ items: listAvailability() });
});

adminRouter.patch('/menu/:itemId/availability', (req, res) => {
  const body = parseBody(availabilitySchema, req.body, 'That change was not valid.');
  const updated = setAvailability(req.params.itemId, body.available);
  if (!updated) throw ApiError.notFound('That dish is not on the menu.');

  res.json({ items: listAvailability() });
});

/** Counts per status for the dashboard header. */
adminRouter.get('/summary', (_req, res) => {
  res.json({ counts: countOrdersByStatus(), menu: listAvailability() });
});

/** A single order in full, for the kitchen printer view. */
adminRouter.get('/orders/:orderId/print', (req, res) => {
  const row = findOrderRow(req.params.orderId);
  if (!row) throw ApiError.notFound('We could not find that order.');

  res.json({
    order: toOrderDto(row, findOrderItems(row.id), listStatusEvents(row.id), listPaymentsForOrder(row.id)[0] ?? null),
  });
});
