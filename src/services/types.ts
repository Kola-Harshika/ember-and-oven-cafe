/**
 * Wire types for the API, mirrored from the server mappers.
 *
 * Kept in one file so the services stay thin and the components can import a single
 * source of truth for what an order or an account looks like over the network.
 */
import type { OrderStatus } from '../../shared/orderStatus.ts';
import type { OrderMode } from '@/data/promos';

export type { OrderStatus };

export type UserRole = 'customer' | 'staff';

export interface AccountDto {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  address: string | null;
  role: UserRole;
  createdAt: string;
}

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded';
export type PaymentMethodId = 'upi' | 'card' | 'wallet' | 'cash';

export interface OrderLineDto {
  id: string;
  itemId: string;
  name: string;
  shortName: string;
  categoryId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  selection: Record<string, string[]>;
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

export interface PaymentDto {
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

export interface OrderMoneyDto {
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
  payable: number;
  money: OrderMoneyDto;
  etaMinutes: number;
  placedAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  lines: OrderLineDto[];
  history: OrderStatusEventDto[];
  payment: PaymentDto | null;
}

export interface CancellationPolicyDto {
  allowed: boolean;
  warning?: string;
  reason?: string;
}

export interface QuoteLineDto {
  itemId: string;
  name: string;
  shortName: string;
  categoryId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  summary: string;
  extras: string[];
  art: string[];
  note: string | null;
}

export interface QuoteDto {
  lines: QuoteLineDto[];
  totals: {
    itemCount: number;
    subtotal: number;
    couponDiscount: number;
    bonusDiscount: number;
    discount: number;
    taxable: number;
    tax: number;
    deliveryFee: number;
    tip: number;
    total: number;
    freeDeliveryGap: number;
    savings: number;
    coupon?: { code: string };
  };
}

export interface PaymentProviderDto {
  id: 'mock' | 'razorpay' | 'stripe';
  live: boolean;
  label: string;
  note: string;
}

export interface PaymentConfigDto {
  provider: PaymentProviderDto;
  methods: { id: PaymentMethodId; name: string; blurb: string; instant?: boolean }[];
}

export interface AdminSummaryDto {
  counts: Record<string, number>;
  menu: { id: string; name: string; available: boolean }[];
}

/** Payload for creating an order (already-priced lines are re-quoted by the API). */
export interface CreateOrderPayload {
  mode: OrderMode;
  couponCode?: string;
  tipPercent?: number;
  bonusDiscount?: number;
  lines: {
    itemId: string;
    quantity: number;
    selection: Record<string, string[]>;
    note?: string;
  }[];
  customer: {
    name: string;
    phone: string;
    email?: string;
    table?: string;
    address?: string;
    notes?: string;
  };
}
