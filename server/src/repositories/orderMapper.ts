/**
 * Order row → API mappers.
 *
 * Orders keep an immutable snapshot of what was ordered (name, price, options), so a
 * later menu change never rewrites history.
 */
import type { OrderStatus } from '../../../shared/orderStatus.ts';
import type { OrderMode } from '../../../src/data/promos.ts';
import type { Selection } from '../../../src/data/types.ts';

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded';
export type PaymentMethodId = 'upi' | 'card' | 'wallet' | 'cash';

export interface OrderRow {
  id: string;
  user_id: string | null;
  guest_token: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  mode: OrderMode;
  table_no: string | null;
  address: string | null;
  notes: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  coupon_code: string | null;
  coupon_discount: number;
  bonus_discount: number;
  bonus_credit: number;
  taxable: number;
  tax: number;
  delivery_fee: number;
  tip: number;
  total: number;
  eta_minutes: number;
  placed_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  item_id: string;
  name: string;
  short_name: string;
  category_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  selection: string;
  selection_summary: string;
  selection_extras: string;
  art: string;
  note: string | null;
}

export interface StatusEventRow {
  id: string;
  status: OrderStatus;
  note: string | null;
  author: string;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  order_id: string;
  provider: string;
  method: PaymentMethodId;
  amount: number;
  status: PaymentStatus;
  reference: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderLineDto {
  id: string;
  itemId: string;
  name: string;
  shortName: string;
  categoryId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  selection: Selection;
  summary: string;
  extras: string[];
  art: string[];
  note: string | null;
}

export interface OrderStatusEventDto {
  status: OrderStatus;
  note: string | null;
  author: string;
  createdAt: string;
}

export interface OrderDto {
  id: string;
  customerId: string | null;
  customer: {
    name: string;
    phone: string;
    email: string | null;
    table: string | null;
    address: string | null;
    notes: string | null;
  };
  mode: OrderMode;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  /** amount still to pay: the total minus any credit won while waiting */
  payable: number;
  money: {
    subtotal: number;
    couponCode: string | null;
    couponDiscount: number;
    bonusDiscount: number;
    bonusCredit: number;
    taxable: number;
    tax: number;
    deliveryFee: number;
    tip: number;
    total: number;
  };
  etaMinutes: number;
  placedAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  lines: OrderLineDto[];
  history: OrderStatusEventDto[];
  payment: PaymentRow | null;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toOrderLine(row: OrderItemRow): OrderLineDto {
  return {
    id: row.id,
    itemId: row.item_id,
    name: row.name,
    shortName: row.short_name,
    categoryId: row.category_id,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    lineTotal: row.line_total,
    selection: parseJson<Selection>(row.selection, {}),
    summary: row.selection_summary,
    extras: parseJson<string[]>(row.selection_extras, []),
    art: parseJson<string[]>(row.art, []),
    note: row.note,
  };
}

export function toStatusEvent(row: StatusEventRow): OrderStatusEventDto {
  return { status: row.status, note: row.note, author: row.author, createdAt: row.created_at };
}

export function toOrderDto(row: OrderRow, lines: OrderItemRow[], history: StatusEventRow[], payment: PaymentRow | null): OrderDto {
  return {
    id: row.id,
    customerId: row.user_id,
    customer: {
      name: row.customer_name,
      phone: row.customer_phone,
      email: row.customer_email,
      table: row.table_no,
      address: row.address,
      notes: row.notes,
    },
    mode: row.mode,
    status: row.status,
    paymentStatus: row.payment_status,
    payable: Math.max(0, row.total - row.bonus_credit),
    money: {
      subtotal: row.subtotal,
      couponCode: row.coupon_code,
      couponDiscount: row.coupon_discount,
      bonusDiscount: row.bonus_discount,
      bonusCredit: row.bonus_credit,
      taxable: row.taxable,
      tax: row.tax,
      deliveryFee: row.delivery_fee,
      tip: row.tip,
      total: row.total,
    },
    etaMinutes: row.eta_minutes,
    placedAt: row.placed_at,
    updatedAt: row.updated_at,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
    lines: lines.map(toOrderLine),
    history: history.map(toStatusEvent),
    payment,
  };
}
