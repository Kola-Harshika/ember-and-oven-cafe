/** Order endpoints: quotes, placement, tracking, cancellation and game credit. */
import { api } from '@/lib/apiClient';
import type { CancellationPolicyDto, CreateOrderPayload, OrderDto, OrderStatus, QuoteDto } from './types';

export interface OrderTracking {
  order: OrderDto;
  cancellation: CancellationPolicyDto;
}

export const orderApi = {
  /** Server-side price check used by the checkout screen. */
  quote(payload: Omit<CreateOrderPayload, 'customer'>): Promise<QuoteDto> {
    return api.post<QuoteDto>('/orders/quote', payload);
  },

  create(payload: CreateOrderPayload): Promise<{ order: OrderDto; guestToken: string | null }> {
    return api.post<{ order: OrderDto; guestToken: string | null }>('/orders', payload);
  },

  /** Orders that belong to the signed-in customer. */
  async mine(): Promise<OrderDto[]> {
    const payload = await api.get<{ orders: OrderDto[] }>('/orders');
    return payload.orders;
  },

  /** Owner-scoped detail. Guests pass the token they were given at checkout. */
  track(orderId: string, guestToken?: string | null): Promise<OrderTracking> {
    return api.get<OrderTracking>(`/orders/${orderId}`, { guestToken });
  },

  async cancel(orderId: string, reason?: string, guestToken?: string | null): Promise<OrderDto> {
    const payload = await api.post<{ order: OrderDto }>(
      `/orders/${orderId}/cancel`,
      reason ? { reason } : {},
      { guestToken },
    );
    return payload.order;
  },

  async awardCredit(orderId: string, amount: number, guestToken?: string | null): Promise<OrderDto> {
    const payload = await api.post<{ order: OrderDto }>(`/orders/${orderId}/rewards`, { amount }, { guestToken });
    return payload.order;
  },
};

/** Kitchen status moves are a staff action; the customer UI only reads them. */
export type { OrderStatus };
