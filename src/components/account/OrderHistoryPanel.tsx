/**
 * The customer's order history.
 *
 * The API scopes this query to the signed-in account, so the list can only ever
 * contain that customer's own orders — the check is not a UI concern.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_META, isTerminal } from '../../../shared/orderStatus.ts';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ApiFailure } from '@/lib/apiClient';
import { formatClock, formatINR } from '@/lib/format';
import { orderApi } from '@/services/orderApi';
import type { OrderDto } from '@/services/types';

export function OrderHistoryPanel() {
  const [orders, setOrders] = useState<OrderDto[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    setProblem(null);
    try {
      setOrders(await orderApi.mine());
    } catch (failure) {
      setProblem(failure instanceof ApiFailure ? failure.message : 'We could not load your orders.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="panel stack">
      <header className="tracker-panel__head">
        <h3>Your orders</h3>
        <div className="row">
          <span className="muted">{orders ? `${orders.length} on record` : 'Loading…'}</span>
          <Button variant="quiet" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </header>

      {problem && <p className="notice notice--warning">{problem}</p>}

      {orders && orders.length === 0 && (
        <p className="muted">
          Nothing here yet. <Link to="/menu">Order something</Link> and it will appear in this list.
        </p>
      )}

      {orders && orders.length > 0 && (
        <ul className="order-history">
          {orders.map((order) => (
            <li key={order.id}>
              <div>
                <strong>{order.id}</strong>
                <span className="muted">
                  {formatClock(order.placedAt)} · {order.lines.length} {order.lines.length === 1 ? 'dish' : 'dishes'} ·{' '}
                  {order.mode}
                </span>
              </div>
              <div className="order-history__meta">
                <Chip static tone={order.status === 'cancelled' ? 'heat' : isTerminal(order.status) ? 'veg' : 'default'}>
                  {STATUS_META[order.status].label}
                </Chip>
                <strong>{formatINR(order.money.total)}</strong>
                <Link to={`/order/${order.id}`} className="link-more">
                  Track
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
