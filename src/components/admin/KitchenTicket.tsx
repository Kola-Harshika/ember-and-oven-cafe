/**
 * One kitchen ticket: everything the pass needs to see, plus the single action that
 * moves it along. Presentational only — the board owns the API calls.
 */
import { ORDER_FLOW, STATUS_META, isTerminal, nextStatus } from '../../../shared/orderStatus.ts';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { formatClock, formatINR } from '@/lib/format';
import type { OrderDto } from '@/services/types';

const PAYMENT_TONE: Record<string, string> = {
  paid: 'is-paid',
  pending: 'is-pending',
  processing: 'is-pending',
  failed: 'is-failed',
  cancelled: 'is-cancelled',
  refunded: 'is-refunded',
};

export interface KitchenTicketProps {
  order: OrderDto;
  busy: boolean;
  onAdvance: (order: OrderDto) => void;
  onCancel: (order: OrderDto) => void;
}

export function KitchenTicket({ order, busy, onAdvance, onCancel }: KitchenTicketProps) {
  const target = nextStatus(order.status);

  return (
    <li className="kitchen-ticket">
      <header className="kitchen-ticket__head">
        <div>
          <strong>{order.id}</strong>
          <span className="muted">
            {formatClock(order.placedAt)} · {order.mode}
            {order.customer.table ? ` · table ${order.customer.table}` : ''}
          </span>
        </div>
        <div className="kitchen-ticket__flags">
          <Chip static>{STATUS_META[order.status].label}</Chip>
          <span className={`payment-status ${PAYMENT_TONE[order.paymentStatus] ?? ''}`}>{order.paymentStatus}</span>
          <strong>{formatINR(order.money.total)}</strong>
        </div>
      </header>

      <p className="kitchen-ticket__customer">
        {order.customer.name} · {order.customer.phone}
        {order.customer.address ? ` · ${order.customer.address}` : ''}
      </p>

      <ul className="kitchen-ticket__items">
        {order.lines.map((line) => (
          <li key={line.id}>
            <strong>
              {line.quantity} × {line.shortName}
            </strong>
            <span className="muted">{line.summary}</span>
            {line.extras.length > 0 && <span className="muted">{line.extras.join(' · ')}</span>}
            {line.note && <em>“{line.note}”</em>}
          </li>
        ))}
      </ul>

      {order.customer.notes && <p className="receipt__note">Note: {order.customer.notes}</p>}

      <footer className="kitchen-ticket__actions">
        <Button variant="primary" size="sm" disabled={busy || !target} onClick={() => onAdvance(order)}>
          {target ? `Move to ${STATUS_META[target].label}` : 'No further steps'}
        </Button>
        {!isTerminal(order.status) && (
          <Button variant="danger" size="sm" disabled={busy} onClick={() => onCancel(order)}>
            Cancel
          </Button>
        )}
        <span className="muted kitchen-ticket__step">
          step {ORDER_FLOW.indexOf(order.status) + 1} of {ORDER_FLOW.length}
        </span>
      </footer>
    </li>
  );
}
