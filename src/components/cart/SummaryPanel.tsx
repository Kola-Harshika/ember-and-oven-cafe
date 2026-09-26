import type { ReactNode } from 'react';
import { summaryRows, type Totals } from '@/lib/pricing';
import type { OrderMode } from '@/data/promos';
import { formatINR } from '@/lib/format';

export interface SummaryPanelProps {
  totals: Totals;
  mode: OrderMode;
  /** extra rows rendered above the total, e.g. a tip slider */
  children?: ReactNode;
  /** buttons under the receipt */
  footer?: ReactNode;
  totalLabel?: string;
}

/** Receipt-style money panel shared by the tray, checkout and order page. */
export function SummaryPanel({ totals, mode, children, footer, totalLabel = 'Total' }: SummaryPanelProps) {
  const rows = summaryRows(totals, mode);

  return (
    <aside className="summary panel">
      <header className="summary__head">
        <h3>Your bill</h3>
        <span className="summary__count">
          {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}
        </span>
      </header>

      <dl className="summary__rows">
        {rows.map((row) => (
          <div className="summary__row" key={row.label}>
            <dt>
              {row.label}
              {row.hint && <small>{row.hint}</small>}
            </dt>
            <dd className={row.value < 0 ? 'is-credit' : undefined}>
              {row.value < 0 ? `−${formatINR(Math.abs(row.value))}` : formatINR(row.value)}
            </dd>
          </div>
        ))}
      </dl>

      {children}

      <div className="summary__total">
        <span>{totalLabel}</span>
        <strong>{formatINR(totals.total)}</strong>
      </div>

      {totals.savings > 0 && (
        <p className="summary__saving">You are saving {formatINR(totals.savings)} on this order.</p>
      )}

      {totals.freeDeliveryGap > 0 && mode === 'delivery' && (
        <p className="summary__hint">
          Add {formatINR(totals.freeDeliveryGap)} more and delivery is on the house.
        </p>
      )}

      {footer && <div className="summary__foot">{footer}</div>}
    </aside>
  );
}
