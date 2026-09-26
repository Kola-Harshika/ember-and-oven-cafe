/** Kitchen dashboard endpoints — all of them are staff-only on the server. */
import { api } from '@/lib/apiClient';
import type { AdminSummaryDto, OrderDto, OrderStatus } from './types';

export const adminApi = {
  orders(filter: { statuses?: OrderStatus[]; limit?: number } = {}): Promise<OrderDto[]> {
    const params = new URLSearchParams();
    if (filter.statuses && filter.statuses.length > 0) params.set('status', filter.statuses.join(','));
    if (filter.limit) params.set('limit', String(filter.limit));
    const query = params.toString();
    return api
      .get<{ orders: OrderDto[] }>(`/admin/orders${query ? `?${query}` : ''}`)
      .then((payload) => payload.orders);
  },

  async order(orderId: string): Promise<OrderDto> {
    const payload = await api.get<{ order: OrderDto }>(`/admin/orders/${orderId}`);
    return payload.order;
  },

  async advance(orderId: string, status: OrderStatus, note?: string): Promise<OrderDto> {
    const payload = await api.post<{ order: OrderDto }>(`/admin/orders/${orderId}/status`, {
      status,
      ...(note ? { note } : {}),
    });
    return payload.order;
  },

  async cancel(orderId: string, reason: string): Promise<OrderDto> {
    const payload = await api.post<{ order: OrderDto }>(`/admin/orders/${orderId}/cancel`, { reason });
    return payload.order;
  },

  summary(): Promise<AdminSummaryDto> {
    return api.get<AdminSummaryDto>('/admin/summary');
  },

  async setAvailability(itemId: string, available: boolean): Promise<AdminSummaryDto['menu']> {
    const payload = await api.patch<{ items: AdminSummaryDto['menu'] }>(
      `/admin/menu/${itemId}/availability`,
      { available },
    );
    return payload.items;
  },
};
