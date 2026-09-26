/**
 * Tracking, waiting-room and payment in one place.
 *
 * Everything here is read from the order the kitchen actually works on: status,
 * history, receipt and payment rows. The countdown is the only derived value, and it
 * comes from the promise the API made at checkout.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { STATUS_META, isTerminal } from '../../shared/orderStatus.ts';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { CancelOrderDialog } from '@/components/order/CancelOrderDialog';
import { OrderReceipt } from '@/components/order/OrderReceipt';
import { PaymentPanel } from '@/components/order/PaymentPanel';
import { StatusTimeline } from '@/components/order/StatusTimeline';
import { WaitingGames } from '@/components/order/WaitingGames';
import { useAuth } from '@/context/AuthContext';
import { useOrder } from '@/context/OrderContext';
import { useElapsedSeconds } from '@/lib/hooks';
import { formatClock, formatCountdown, formatINR, formatMinutes } from '@/lib/format';

type TabId = 'track' | 'play' | 'pay';

export function OrderPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { order, cancellation, loading, error, payable, track, refresh, cancelOrder, awardCredit, clearOrder } =
    useOrder();

  const [tab, setTab] = useState<TabId>('track');
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    if (orderId && orderId !== order?.id) void track(orderId);
  }, [orderId, order?.id, track]);

  const placedAt = order ? new Date(order.placedAt).getTime() : null;
  const terminal = order ? isTerminal(order.status) : true;
  const elapsed = useElapsedSeconds(placedAt, !terminal);

  const view = useMemo(() => {
    if (!order) return null;
    const totalSeconds = order.etaMinutes * 60;
    const remaining = Math.max(0, totalSeconds - elapsed);
    return {
      totalSeconds,
      remaining,
      progress: totalSeconds > 0 ? Math.min(1, elapsed / totalSeconds) : 1,
    };
  }, [order, elapsed]);

  if (!order && loading) {
    return (
      <div className="shell page">
        <div className="empty-state">
          <span className="eyebrow">Order tracker</span>
          <h1>Finding your ticket…</h1>
          <p className="muted">One moment while we ask the kitchen which order is yours.</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="shell page">
        <div className="empty-state">
          <span className="eyebrow">Order tracker</span>
          <h1>{error ? 'We could not reach the cafe' : 'We cannot find that order'}</h1>
          <p className="muted">
            {error ??
              'The code may be mistyped, or the order belongs to another device. Start a new order and we will print a fresh ticket.'}
          </p>
          <div className="row">
            {orderId && (
              <Button variant="primary" onClick={() => void track(orderId)}>
                Try again
              </Button>
            )}
            <Link to="/menu" className="btn btn--ghost">
              Open the menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const cancelled = order.status === 'cancelled';
  const ready = !terminal && (view?.remaining ?? 0) <= 0;

  const headline = cancelled
    ? 'This order was cancelled'
    : order.status === 'delivered'
      ? 'Enjoy — that is the last of it'
      : ready
        ? 'Your order is at the pass'
        : `About ${formatMinutes(Math.ceil((view?.remaining ?? 0) / 60))} to go`;

  const copy = cancelled
    ? (order.cancelReason ?? STATUS_META.cancelled.customerCopy)
    : STATUS_META[order.status].customerCopy;

  return (
    <div className="shell page">
      <section className="tracker-head panel">
        <ProgressRing progress={view?.progress ?? 0}>
          <span className="ring__value">
            {terminal ? STATUS_META[order.status].label : formatCountdown(view?.remaining ?? 0)}
          </span>
          <span className="ring__caption">{terminal ? order.mode : 'estimated'}</span>
        </ProgressRing>

        <div className="tracker-head__copy">
          <span className="eyebrow">Order {order.id}</span>
          <h1>{headline}</h1>
          <p className="lede">{copy}</p>
          <div className="row tracker-head__meta">
            <Chip static>{order.mode}</Chip>
            {order.customer.table && <Chip static>Table {order.customer.table}</Chip>}
            <Chip static>{order.lines.length} dishes</Chip>
            <Chip static tone={order.paymentStatus === 'paid' ? 'veg' : 'default'}>
              {order.paymentStatus === 'paid' ? 'Paid' : `Due ${formatINR(payable)}`}
            </Chip>
            <Chip static>{STATUS_META[order.status].label}</Chip>
          </div>
          <p className="muted tracker-head__note">
            Placed {formatClock(order.placedAt)} · kitchen promise {order.etaMinutes} minutes
          </p>
          <div className="row">
            {cancellation?.allowed && (
              <Button variant="danger" onClick={() => setCancelOpen(true)}>
                Cancel order
              </Button>
            )}
            <Button variant="quiet" onClick={() => void refresh()}>
              Refresh
            </Button>
            {terminal && (
              <Button
                variant="quiet"
                onClick={() => {
                  clearOrder();
                  navigate('/menu');
                }}
              >
                Start a new order
              </Button>
            )}
          </div>
        </div>
      </section>

      <nav className="tabs" role="tablist" aria-label="Order sections">
        {(
          [
            { id: 'track' as TabId, label: 'Track', hint: terminal ? STATUS_META[order.status].label : 'Live' },
            {
              id: 'play' as TabId,
              label: 'Play',
              hint: order.money.bonusCredit > 0 ? `${formatINR(order.money.bonusCredit)} off` : 'Games',
            },
            {
              id: 'pay' as TabId,
              label: 'Pay',
              hint: order.paymentStatus === 'paid' ? 'Paid' : formatINR(payable),
            },
          ]
        ).map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            className={`tab${tab === entry.id ? ' is-active' : ''}`}
            onClick={() => setTab(entry.id)}
          >
            <strong>{entry.label}</strong>
            <small>{entry.hint}</small>
          </button>
        ))}
      </nav>

      <div className="tab-panel">
        {tab === 'track' && (
          <>
            <StatusTimeline status={order.status} mode={order.mode} history={order.history} />
            {!user && (
              <p className="notice">
                You ordered as a guest on this device. <Link to="/login">Sign in</Link> to keep every order in one
                history.
              </p>
            )}
            <OrderReceipt order={order} />
          </>
        )}

        {tab === 'play' &&
          (terminal ? (
            <div className="panel">
              <h3>The games are closed</h3>
              <p className="muted">
                {cancelled
                  ? 'This order was cancelled, so there is nothing left to play for.'
                  : 'This order is finished — thanks for playing along.'}
              </p>
            </div>
          ) : (
            <WaitingGames order={order} onEarn={awardCredit} />
          ))}

        {tab === 'pay' && <PaymentPanel order={order} onSettled={refresh} />}
      </div>

      <CancelOrderDialog
        open={cancelOpen}
        policy={cancellation}
        onClose={() => setCancelOpen(false)}
        onConfirm={async (reason) => {
          await cancelOrder(reason);
        }}
      />
    </div>
  );
}
