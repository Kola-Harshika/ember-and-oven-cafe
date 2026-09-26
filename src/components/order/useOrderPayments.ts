/**
 * Payment behaviour for one order.
 *
 * Kept as a hook so the panel below stays presentational: it loads the provider
 * configuration and the payment history, and exposes the four actions the API allows
 * (pay, fail, cancel, refresh).
 */
import { useCallback, useEffect, useState } from 'react';
import { ApiFailure } from '@/lib/apiClient';
import { guestTokenFor } from '@/lib/guestOrder';
import { paymentApi } from '@/services/paymentApi';
import type { PaymentConfigDto, PaymentDto, PaymentMethodId } from '@/services/types';

export interface OrderPayments {
  config: PaymentConfigDto | null;
  history: PaymentDto[];
  busy: PaymentMethodId | null;
  problem: string | null;
  /** true when the configured provider is the local test flow */
  testProvider: boolean;
  pay: (method: PaymentMethodId) => Promise<PaymentDto | null>;
  failAttempt: (method: PaymentMethodId) => Promise<void>;
  cancelAttempt: (method: PaymentMethodId) => Promise<void>;
}

function messageFor(failure: unknown, fallback: string): string {
  return failure instanceof ApiFailure ? failure.message : fallback;
}

export function useOrderPayments(orderId: string, onSettled: () => void | Promise<void>): OrderPayments {
  const token = guestTokenFor(orderId);
  const [config, setConfig] = useState<PaymentConfigDto | null>(null);
  const [history, setHistory] = useState<PaymentDto[]>([]);
  const [busy, setBusy] = useState<PaymentMethodId | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [providerConfig, payments] = await Promise.all([
        paymentApi.config(),
        paymentApi.history(orderId, token),
      ]);
      setConfig(providerConfig);
      setHistory(payments);
      setProblem(null);
    } catch {
      // Without the config the panel simply hides the provider notice; nothing breaks.
      setConfig(null);
    }
  }, [orderId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const start = async (method: PaymentMethodId): Promise<PaymentDto> => {
    const { payment } = await paymentApi.start({ orderId, method, guestToken: token });
    setHistory((current) => [payment, ...current.filter((entry) => entry.id !== payment.id)]);
    return payment;
  };

  const replace = (payment: PaymentDto) =>
    setHistory((current) => [payment, ...current.filter((entry) => entry.id !== payment.id)]);

  const pay = async (method: PaymentMethodId): Promise<PaymentDto | null> => {
    setBusy(method);
    setProblem(null);
    try {
      const payment = await start(method);
      const settled = await paymentApi.confirm(payment.id, token);
      replace(settled);
      await onSettled();
      return settled;
    } catch (failure) {
      setProblem(messageFor(failure, 'That payment could not be completed.'));
      await load();
      return null;
    } finally {
      setBusy(null);
    }
  };

  const failAttempt = async (method: PaymentMethodId): Promise<void> => {
    setBusy(method);
    setProblem(null);
    try {
      const payment = await start(method);
      replace(await paymentApi.fail(payment.id, 'Declined by the test provider', token));
    } catch (failure) {
      setProblem(messageFor(failure, 'That payment could not be started.'));
    } finally {
      setBusy(null);
    }
  };

  const cancelAttempt = async (method: PaymentMethodId): Promise<void> => {
    setBusy(method);
    setProblem(null);
    try {
      const payment = await start(method);
      replace(await paymentApi.cancel(payment.id, token));
    } catch (failure) {
      setProblem(messageFor(failure, 'That payment could not be cancelled.'));
    } finally {
      setBusy(null);
    }
  };

  return {
    config,
    history,
    busy,
    problem,
    testProvider: config ? !config.provider.live : true,
    pay,
    failAttempt,
    cancelAttempt,
  };
}
