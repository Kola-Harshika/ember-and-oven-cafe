/**
 * Payment endpoints.
 *
 * The provider is decided by the API's configuration. When it reports `live: false`
 * the UI must label the flow as a test payment — no real money moves.
 */
import { api } from '@/lib/apiClient';
import type { PaymentConfigDto, PaymentDto, PaymentMethodId } from './types';

export const paymentApi = {
  config(): Promise<PaymentConfigDto> {
    return api.get<PaymentConfigDto>('/payments/config');
  },

  start(input: { orderId: string; method: PaymentMethodId; guestToken?: string | null }): Promise<{
    payment: PaymentDto;
    provider: PaymentConfigDto['provider'];
  }> {
    return api.post<{ payment: PaymentDto; provider: PaymentConfigDto['provider'] }>(
      '/payments',
      { orderId: input.orderId, method: input.method },
      { guestToken: input.guestToken ?? null },
    );
  },

  /** Only meaningful with the test provider; a live gateway confirms by webhook. */
  async confirm(paymentId: string, guestToken?: string | null): Promise<PaymentDto> {
    const payload = await api.post<{ payment: PaymentDto }>(
      `/payments/${paymentId}/confirm`,
      {},
      { guestToken },
    );
    return payload.payment;
  },

  async fail(paymentId: string, reason?: string, guestToken?: string | null): Promise<PaymentDto> {
    const payload = await api.post<{ payment: PaymentDto }>(
      `/payments/${paymentId}/fail`,
      reason ? { reason } : {},
      { guestToken },
    );
    return payload.payment;
  },

  async cancel(paymentId: string, guestToken?: string | null): Promise<PaymentDto> {
    const payload = await api.post<{ payment: PaymentDto }>(
      `/payments/${paymentId}/cancel`,
      {},
      { guestToken },
    );
    return payload.payment;
  },

  async history(orderId: string, guestToken?: string | null): Promise<PaymentDto[]> {
    const payload = await api.get<{ payments: PaymentDto[] }>(`/payments/order/${orderId}`, { guestToken });
    return payload.payments;
  },
};
