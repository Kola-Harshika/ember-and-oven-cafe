/**
 * The pay tab — presentation only; behaviour lives in `useOrderPayments`.
 *
 * When the API reports a test provider the panel says so, so nobody mistakes this for
 * a real charge. The four payment states (waiting, paid, failed, cancelled) each have
 * a visible representation.
 */
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { formatClock, formatINR } from '@/lib/format';
import type { OrderDto, PaymentDto } from '@/services/types';
import { useOrderPayments } from './useOrderPayments';

const STATUS_COPY: Record<PaymentDto['status'], string> = {
  pending: 'Waiting',
  processing: 'Authorising',
  paid: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export interface PaymentPanelProps {
  order: OrderDto;
  /** lets the tracker refresh once a payment is recorded */
  onSettled: () => void | Promise<void>;
}

export function PaymentPanel({ order, onSettled }: PaymentPanelProps) {
  const { push } = useToast();
  const { config, history, busy, problem, testProvider, pay, failAttempt, cancelAttempt } = useOrderPayments(
    order.id,
    onSettled,
  );

  const paid = order.paymentStatus === 'paid';
  const closed = order.status === 'cancelled';
  const amount = Math.max(0, order.payable);

  const handlePay = async (methodId: PaymentDto['method'], methodName: string) => {
    const settled = await pay(methodId);
    if (!settled) return;

    push({
      title: 'Payment recorded',
      message: `${methodName} · ${formatINR(settled.amount)}${testProvider ? ' · test payment' : ''}`,
      tone: 'reward',
    });
  };

  return (
    <section className="panel pay">
      <header className="tracker-panel__head">
        <h3>{paid ? 'Paid — thank you' : closed ? 'Order cancelled' : 'Settle the bill'}</h3>
        <span className="muted">
          {paid
            ? (order.payment?.reference ?? 'Payment recorded')
            : closed
              ? 'Nothing is due on a cancelled order'
              : `${config?.provider.label ?? 'Payment'} · ${order.mode}`}
        </span>
      </header>

      {testProvider && !closed && (
        <p className="notice">
          <strong>Test payment.</strong> {config?.provider.note ?? 'No real money moves in this build.'}
        </p>
      )}

      <dl className="pay__math">
        <div>
          <dt>Order total</dt>
          <dd>{formatINR(order.money.total)}</dd>
        </div>
        {order.money.bonusCredit > 0 && (
          <div>
            <dt>Waiting-room games</dt>
            <dd className="is-credit">−{formatINR(order.money.bonusCredit)}</dd>
          </div>
        )}
        <div className="pay__math-total">
          <dt>Payable now</dt>
          <dd>{formatINR(amount)}</dd>
        </div>
      </dl>

      {paid ? (
        <p className="summary__bonus">
          Settled with {(order.payment?.method ?? 'cash').toUpperCase()}
          {order.payment ? ` at ${formatClock(order.payment.updated_at)}` : ''} — {order.payment?.reference ?? ''}
        </p>
      ) : closed ? (
        <p className="muted">This order was cancelled, so there is nothing to pay.</p>
      ) : (
        <>
          <div className="pay__methods">
            {(config?.methods ?? []).map((method) => (
              <button
                key={method.id}
                type="button"
                className="pay-method"
                disabled={Boolean(busy)}
                onClick={() => void handlePay(method.id, method.name)}
              >
                <span className="pay-method__text">
                  <strong>{method.name}</strong>
                  <small>{method.blurb}</small>
                </span>
                <span className="pay-method__go">
                  {busy === method.id ? 'Working…' : amount === 0 ? 'Covered' : formatINR(amount)}
                </span>
              </button>
            ))}
          </div>

          {amount === 0 && <p className="summary__bonus">Your game winnings cover this order completely.</p>}

          {testProvider && (
            <div className="pay__demo">
              <span className="field__label">See the other states</span>
              <div className="row">
                <Button variant="quiet" size="sm" disabled={Boolean(busy)} onClick={() => void failAttempt('card')}>
                  Simulate a failed card
                </Button>
                <Button variant="quiet" size="sm" disabled={Boolean(busy)} onClick={() => void cancelAttempt('upi')}>
                  Simulate a cancelled payment
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {problem && <p className="field__error">{problem}</p>}

      {history.length > 0 && (
        <div className="payment-history">
          <span className="field__label">Payment record</span>
          <ul>
            {history.map((payment) => (
              <li key={payment.id}>
                <span className={`payment-status payment-status--${payment.status}`}>
                  {STATUS_COPY[payment.status]}
                </span>
                <span className="muted">
                  {payment.method.toUpperCase()} · {payment.provider}
                  {payment.reference ? ` · ${payment.reference}` : ''}
                </span>
                <strong>{formatINR(payment.amount)}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
