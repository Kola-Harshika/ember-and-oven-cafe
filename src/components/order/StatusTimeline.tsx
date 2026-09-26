/**
 * The kitchen timeline.
 *
 * Steps come from the shared lifecycle, so the tracker, the kitchen dashboard and the
 * API all agree on what "cooking" means. Each step is marked done / current / upcoming
 * from the order's real status, and the log underneath is the status history the
 * kitchen actually produced.
 */
import { ORDER_FLOW, STATUS_META, statusIndex, trackerSteps, type OrderStatus } from '../../../shared/orderStatus.ts';
import type { OrderStatusEventDto } from '@/services/types';
import { formatClock } from '@/lib/format';

export interface StatusTimelineProps {
  status: OrderStatus;
  mode: 'dine-in' | 'takeaway' | 'delivery';
  history: OrderStatusEventDto[];
}

export function StatusTimeline({ status, mode, history }: StatusTimelineProps) {
  const steps = trackerSteps(mode);
  const current = statusIndex(status);
  const cancelled = status === 'cancelled';

  return (
    <section className="panel tracker-panel">
      <header className="tracker-panel__head">
        <h3>The kitchen line</h3>
        <span className="muted">{STATUS_META[status].label}</span>
      </header>

      <ol className="status-timeline">
        {steps.map((step, position) => {
          const state = cancelled ? 'stopped' : position < current ? 'done' : position === current ? 'active' : 'todo';
          return (
            <li key={step} className={`status-step status-step--${state}`}>
              <span className="status-step__dot" aria-hidden="true" />
              <div className="status-step__body">
                <strong>{STATUS_META[step].label}</strong>
                <p>{STATUS_META[step].customerCopy}</p>
              </div>
            </li>
          );
        })}
        {cancelled && (
          <li className="status-step status-step--cancelled">
            <span className="status-step__dot" aria-hidden="true" />
            <div className="status-step__body">
              <strong>{STATUS_META.cancelled.label}</strong>
              <p>{STATUS_META.cancelled.customerCopy}</p>
            </div>
          </li>
        )}
      </ol>

      {history.length > 0 && (
        <div className="history">
          <span className="field__label">From the ticket</span>
          <ul className="log">
            {history.map((event) => (
              <li className="log__line" key={`${event.status}-${event.createdAt}`}>
                <span className="log__time">{formatClock(event.createdAt)}</span>
                <span className="log__author">{event.author}</span>
                <span className="log__text">
                  {STATUS_META[event.status as OrderStatus]?.label ?? event.status}
                  {event.note ? ` — ${event.note}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <span className="sr-only">{ORDER_FLOW.length} steps in the service line</span>
    </section>
  );
}
