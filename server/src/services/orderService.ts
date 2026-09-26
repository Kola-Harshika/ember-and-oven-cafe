/**
 * Orders: creation and scoped reads.
 *
 * Every read is scoped to its caller, which is what keeps one customer's orders
 * invisible to another: another customer's code is reported as "not found" rather
 * than "forbidden", so codes cannot be probed for existence.
 */
import { estimateEtaMinutes } from '../../../shared/eta.ts';
import type { OrderStatus } from '../../../shared/orderStatus.ts';
import type { OrderMode } from '../../../src/data/promos.ts';
import { env } from '../config/env.ts';
import { ApiError } from '../http/errors.ts';
import { toOrderDto, type OrderDto, type OrderRow } from '../repositories/orderMapper.ts';
import { insertOrder, nextOrderSequence, orderExists, type NewOrderLine } from '../repositories/orderRepository.ts';
import { findOrderItems, findOrderRow, listOrderRows, listOrderRowsForUser, listStatusEvents } from '../repositories/orderQueries.ts';
import { latestPaymentForOrder, listPaymentsForOrder } from '../repositories/paymentRepository.ts';
import { randomToken } from '../utils/ids.ts';
import { nowIso } from '../utils/time.ts';
import { quoteOrder, type QuoteRequestLine, type QuotedLine } from './quoteService.ts';

export interface CustomerDetailsInput {
  name: string;
  phone: string;
  email?: string;
  table?: string;
  address?: string;
  notes?: string;
}

export interface CreateOrderInput {
  customer: CustomerDetailsInput;
  mode: OrderMode;
  lines: QuoteRequestLine[];
  couponCode?: string;
  tipPercent?: number;
  bonusDiscount?: number;
}

export interface Actor {
  userId: string | null;
  name: string;
}

export interface CreateOrderResult {
  order: OrderDto;
  /** returned once for guest orders so the tracker can be reopened on that device */
  guestToken: string | null;
}

export function toDto(row: OrderRow): OrderDto {
  return toOrderDto(row, findOrderItems(row.id), listStatusEvents(row.id), latestPaymentForOrder(row.id) ?? null);
}

function snapshotLines(lines: QuotedLine[]): NewOrderLine[] {
  return lines.map((line) => ({
    itemId: line.item.id,
    name: line.item.name,
    shortName: line.item.shortName,
    categoryId: line.item.category,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
    selection: JSON.stringify(line.selection),
    summary: line.summary,
    extras: JSON.stringify(line.extras),
    art: JSON.stringify(line.art),
    note: line.note ?? null,
  }));
}

/** ORD-#### codes are human readable, so a clash is retried rather than faked. */
function allocateOrderId(): string {
  const base = nextOrderSequence();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = `ORD-${base + attempt}`;
    if (!orderExists(candidate)) return candidate;
  }
  throw ApiError.conflict('We could not print a ticket for that order. Please try again.', 'order_code_exhausted');
}

export function createOrder(input: CreateOrderInput, actor: Actor): CreateOrderResult {
  const quote = quoteOrder({
    lines: input.lines,
    mode: input.mode,
    ...(input.couponCode ? { couponCode: input.couponCode } : {}),
    tipPercent: input.tipPercent ?? 0,
    bonusDiscount: input.bonusDiscount ?? 0,
  });

  const id = allocateOrderId();
  const placedAt = nowIso();
  const guestToken = actor.userId ? null : randomToken(18);

  const etaMinutes = estimateEtaMinutes(
    quote.lines.map((line) => line.item.prepMinutes),
    input.mode,
    { min: env.etaMinMinutes, max: env.etaMaxMinutes },
  );

  insertOrder(
    {
      id,
      userId: actor.userId,
      guestToken,
      customerName: input.customer.name.trim(),
      customerPhone: input.customer.phone.trim(),
      customerEmail: input.customer.email?.trim() || null,
      mode: input.mode,
      tableNo: input.customer.table?.trim() || null,
      address: input.customer.address?.trim() || null,
      notes: input.customer.notes?.trim() || null,
      subtotal: quote.totals.subtotal,
      couponCode: quote.coupon?.code ?? null,
      couponDiscount: quote.totals.couponDiscount,
      bonusDiscount: quote.totals.bonusDiscount,
      taxable: quote.totals.taxable,
      tax: quote.totals.tax,
      deliveryFee: quote.totals.deliveryFee,
      tip: quote.totals.tip,
      total: quote.totals.total,
      etaMinutes,
      placedAt,
    },
    snapshotLines(quote.lines),
    actor.userId ? `customer:${actor.name}` : 'guest',
  );

  const row = findOrderRow(id);
  if (!row) throw ApiError.conflict('That order could not be stored. Please try again.');
  return { order: toDto(row), guestToken };
}

export function getOrderForCustomer(orderId: string, userId: string): OrderDto {
  const row = findOrderRow(orderId);
  if (!row || row.user_id !== userId) throw ApiError.notFound('We could not find that order.');
  return toDto(row);
}

export function getOrderForGuest(orderId: string, token: string): OrderDto {
  const row = findOrderRow(orderId);
  if (!row || !row.guest_token || row.guest_token !== token) {
    throw ApiError.notFound('We could not find that order.');
  }
  return toDto(row);
}

export function getOrderForStaff(orderId: string): OrderDto {
  const row = findOrderRow(orderId);
  if (!row) throw ApiError.notFound('We could not find that order.');
  return toDto(row);
}

export function listOrdersForCustomer(userId: string): OrderDto[] {
  return listOrderRowsForUser(userId).map(toDto);
}

export function listOrdersForStaff(filter: { statuses?: OrderStatus[]; limit?: number } = {}): OrderDto[] {
  return listOrderRows(filter).map((row) => {
    const payments = listPaymentsForOrder(row.id);
    return toOrderDto(row, findOrderItems(row.id), listStatusEvents(row.id), payments[0] ?? null);
  });
}
