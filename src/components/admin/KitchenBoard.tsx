/**
 * The kitchen queue: incoming tickets, what is on them, whether they are paid, and the
 * one button that moves each order to the next station. Only transitions the API
 * accepts are offered, so staff cannot skip a step or reopen a finished order.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { STATUS_META, nextStatus, type OrderStatus } from '../../../shared/orderStatus.ts';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField } from '@/components/ui/Field';
import { KitchenTicket } from './KitchenTicket';
import { useToast } from '@/context/ToastContext';
import { ApiFailure } from '@/lib/apiClient';
import { adminApi } from '@/services/adminApi';
import type { OrderDto } from '@/services/types';

type FilterId = 'queue' | 'ready' | 'delivering' | 'done' | 'cancelled' | 'all';

const FILTERS: { id: FilterId; label: string; statuses?: OrderStatus[] }[] = [
  { id: 'queue', label: 'In the kitchen', statuses: ['received', 'preparing', 'cooking'] },
  { id: 'ready', label: 'Ready at the pass', statuses: ['ready'] },
  { id: 'delivering', label: 'With the rider', statuses: ['out_for_delivery'] },
  { id: 'done', label: 'Closed', statuses: ['delivered'] },
  { id: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
  { id: 'all', label: 'Everything' },
];

export function KitchenBoard() {
  const { push } = useToast();
  const [filter, setFilter] = useState<FilterId>('queue');
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderDto | null>(null);
  const [cancelReason, setCancelReason] = useState('Out of stock');

  const statuses = useMemo(() => FILTERS.find((entry) => entry.id === filter)?.statuses, [filter]);

  const load = useCallback(async () => {
    try {
      setOrders(await adminApi.orders(statuses ? { statuses } : {}));
      setProblem(null);
    } catch (failure) {
      setProblem(failure instanceof ApiFailure ? failure.message : 'We could not load the order book.');
    } finally {
      setLoading(false);
    }
  }, [statuses]);

  useEffect(() => {
    void load();
  }, [load]);

  /** The board is a live view, so it re-reads the book on a slow tick. */
  useEffect(() => {
    const timer = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(timer);
  }, [load]);

  const advance = async (order: OrderDto) => {
    const target = nextStatus(order.status);
    if (!target) return;

    setBusyId(order.id);
    try {
      const updated = await adminApi.advance(order.id, target);
      setOrders((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      push({ title: `${order.id} → ${STATUS_META[target].label}`, tone: 'success' });
    } catch (failure) {
      push({
        title: 'That change was refused',
        message: failure instanceof ApiFailure ? failure.message : 'Please refresh the board.',
        tone: 'warning',
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setBusyId(cancelTarget.id);
    try {
      const updated = await adminApi.cancel(cancelTarget.id, cancelReason.trim() || 'Cancelled by the kitchen');
      setOrders((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      push({ title: `${cancelTarget.id} cancelled`, tone: 'default' });
      setCancelTarget(null);
    } catch (failure) {
      push({
        title: 'We could not cancel that',
        message: failure instanceof ApiFailure ? failure.message : 'Please try again.',
        tone: 'warning',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="panel stack">
      <header className="tracker-panel__head">
        <h3>Order book</h3>
        <div className="row">
          <span className="muted">{loading ? 'Loading…' : `${orders.length} shown`}</span>
          <Button variant="quiet" size="sm" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      </header>

      <div className="chip-cloud" role="group" aria-label="Filter orders">
        {FILTERS.map((entry) => (
          <Chip key={entry.id} active={filter === entry.id} onClick={() => setFilter(entry.id)}>
            {entry.label}
          </Chip>
        ))}
      </div>

      {problem && <p className="notice notice--warning">{problem}</p>}
      {!loading && orders.length === 0 && <p className="muted">Nothing in this part of the book right now.</p>}

      <ul className="kitchen-list">
        {orders.map((order) => (
          <KitchenTicket
            key={order.id}
            order={order}
            busy={busyId === order.id}
            onAdvance={(entry) => void advance(entry)}
            onCancel={(entry) => {
              setCancelTarget(entry);
              setCancelReason('Out of stock');
            }}
          />
        ))}
      </ul>

      <Modal
        open={Boolean(cancelTarget)}
        title={cancelTarget ? `Cancel ${cancelTarget.id}?` : 'Cancel order'}
        onClose={() => setCancelTarget(null)}
      >
        <p className="muted">
          The guest sees this reason, and any payment already taken is marked refunded rather than silently dropped.
        </p>
        <TextAreaField
          id="kitchen-cancel-reason"
          label="Reason (shown to the customer)"
          value={cancelReason}
          maxLength={180}
          onChange={(event) => setCancelReason(event.target.value)}
        />
        <div className="modal__actions">
          <Button variant="quiet" onClick={() => setCancelTarget(null)}>
            Keep the order
          </Button>
          <Button variant="danger" onClick={() => void confirmCancel()} disabled={busyId === cancelTarget?.id}>
            Cancel the order
          </Button>
        </div>
      </Modal>
    </section>
  );
}
