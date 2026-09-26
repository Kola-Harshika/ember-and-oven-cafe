/**
 * The active order, watched while the kitchen works.
 *
 * Extracted from the context so the state machine (boot → track → poll → finish) can
 * be read in one place. Polls stop as soon as the order reaches a terminal status,
 * and a transient poll failure is ignored instead of blanking the screen.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isTerminal } from '../../shared/orderStatus.ts';
import { ApiFailure } from '@/lib/apiClient';
import { forgetGuestOrder, guestOrderRef, guestTokenFor, rememberGuestOrder } from '@/lib/guestOrder';
import { orderApi, type OrderTracking } from '@/services/orderApi';
import type { CancellationPolicyDto, CreateOrderPayload, OrderDto } from '@/services/types';
import { useAuth } from '@/context/AuthContext';

const POLL_INTERVAL_MS = 5000;

export interface ActiveOrder {
  order: OrderDto | null;
  cancellation: CancellationPolicyDto | null;
  loading: boolean;
  error: string | null;
  payable: number;
  placeOrder: (payload: CreateOrderPayload) => Promise<OrderDto>;
  track: (orderId: string) => Promise<void>;
  refresh: () => Promise<void>;
  cancelOrder: (reason?: string) => Promise<OrderDto>;
  awardCredit: (amount: number) => Promise<void>;
  clearOrder: () => void;
}

function messageFor(failure: unknown, fallback: string): string {
  return failure instanceof ApiFailure ? failure.message : fallback;
}

export function useActiveOrder(): ActiveOrder {
  const { user, status: authStatus } = useAuth();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [cancellation, setCancellation] = useState<CancellationPolicyDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trackedRef = useRef<string | null>(null);

  const applyTracking = useCallback((tracking: OrderTracking) => {
    setOrder(tracking.order);
    setCancellation(tracking.cancellation);
    setError(null);
  }, []);

  const readOrder = useCallback(
    async (orderId: string) => {
      const tracking = await orderApi.track(orderId, guestTokenFor(orderId));
      applyTracking(tracking);
      return tracking;
    },
    [applyTracking],
  );

  const track = useCallback(
    async (orderId: string) => {
      trackedRef.current = orderId;
      setLoading(true);
      try {
        await readOrder(orderId);
      } catch (failure) {
        setOrder(null);
        setError(messageFor(failure, 'We could not load that order just now.'));
      } finally {
        setLoading(false);
      }
    },
    [readOrder],
  );

  /** Boot: the newest order of the signed-in customer, or the remembered guest order. */
  useEffect(() => {
    if (authStatus === 'loading') return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        if (user) {
          const orders = await orderApi.mine();
          if (cancelled) return;

          if (orders.length === 0) {
            setOrder(null);
            trackedRef.current = null;
            setError(null);
            return;
          }

          // The cancellation window depends on the server clock, so the detail
          // endpoint is always asked for explicitly.
          await readOrder(orders[0].id);
          trackedRef.current = orders[0].id;
          return;
        }

        const ref = guestOrderRef();
        if (!ref) {
          setOrder(null);
          return;
        }

        await readOrder(ref.orderId);
      } catch (failure) {
        if (cancelled) return;

        if (failure instanceof ApiFailure && failure.status === 404) {
          // The remembered guest order is gone (cleared database, cancelled elsewhere).
          forgetGuestOrder();
          setOrder(null);
          setError(null);
        } else {
          setError(messageFor(failure, 'We could not load your order.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, authStatus, readOrder]);

  /** Poll only while the kitchen still has work to do. */
  useEffect(() => {
    if (!order || isTerminal(order.status)) return;
    const orderId = order.id;

    const timer = window.setInterval(() => {
      void readOrder(orderId).catch(() => {
        /* a transient poll failure must not blank the tracker; the next tick retries */
      });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [order, readOrder]);

  const placeOrder = useCallback(async (payload: CreateOrderPayload) => {
    const result = await orderApi.create(payload);
    if (result.guestToken) rememberGuestOrder({ orderId: result.order.id, token: result.guestToken });
    trackedRef.current = result.order.id;
    setOrder(result.order);
    setCancellation({ allowed: true });
    setError(null);
    return result.order;
  }, []);

  const cancelOrder = useCallback(
    async (reason?: string) => {
      if (!order) throw new ApiFailure(409, 'order_missing', 'There is no active order to cancel.');
      const updated = await orderApi.cancel(order.id, reason, guestTokenFor(order.id));
      setOrder(updated);
      setCancellation({ allowed: false, reason: 'This order is already cancelled.' });
      return updated;
    },
    [order],
  );

  const awardCredit = useCallback(
    async (amount: number) => {
      if (!order) return;
      const updated = await orderApi.awardCredit(order.id, amount, guestTokenFor(order.id));
      setOrder(updated);
    },
    [order],
  );

  const refresh = useCallback(async () => {
    if (order) await readOrder(order.id);
  }, [order, readOrder]);

  const clearOrder = useCallback(() => {
    forgetGuestOrder();
    trackedRef.current = null;
    setOrder(null);
    setCancellation(null);
  }, []);

  return useMemo<ActiveOrder>(
    () => ({
      order,
      cancellation: cancellation ?? (order ? { allowed: false } : null),
      loading,
      error,
      payable: order?.payable ?? 0,
      placeOrder,
      track,
      refresh,
      cancelOrder,
      awardCredit,
      clearOrder,
    }),
    [order, cancellation, loading, error, placeOrder, track, refresh, cancelOrder, awardCredit, clearOrder],
  );
}
