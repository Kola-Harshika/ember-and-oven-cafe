/**
 * What is on the ticket: the ordered dishes exactly as the kitchen received them,
 * plus the money snapshot taken at checkout.
 */
import { Link } from 'react-router-dom';
import { getItem } from '@/data/menu';
import { formatINR } from '@/lib/format';
import { FoodArt } from '@/components/visual/FoodArt';
import { SummaryPanel } from '@/components/cart/SummaryPanel';
import type { OrderDto } from '@/services/types';
import type { Totals } from '@/lib/pricing';

function totalsFor(order: OrderDto): Totals {
  return {
    itemCount: order.lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: order.money.subtotal,
    couponDiscount: order.money.couponDiscount,
    bonusDiscount: order.money.bonusDiscount,
    discount: order.money.couponDiscount + order.money.bonusDiscount,
    taxable: order.money.taxable,
    tax: order.money.tax,
    deliveryFee: order.money.deliveryFee,
    tip: order.money.tip,
    total: order.money.total,
    freeDeliveryGap: 0,
    savings: order.money.couponDiscount + order.money.bonusDiscount,
    ...(order.money.couponCode ? { coupon: { code: order.money.couponCode, minSubtotal: 0 } } : {}),
  };
}

export function OrderReceipt({ order }: { order: OrderDto }) {
  return (
    <section className="receipt">
      <div className="panel receipt__lines">
        <header className="tracker-panel__head">
          <h3>On the ticket</h3>
          <span className="muted">
            {order.lines.length} {order.lines.length === 1 ? 'dish' : 'dishes'} · placed {order.id}
          </span>
        </header>

        <ul className="receipt-list">
          {order.lines.map((line) => {
            const item = getItem(line.itemId);
            return (
              <li key={line.id}>
                <div className="receipt-item">
                  {item && (
                    <FoodArt
                      kind={item.category}
                      keys={line.art}
                      heat={item.heat}
                      seed={line.id}
                      className="receipt-item__art"
                    />
                  )}
                  <div>
                    <strong>
                      {line.quantity} × {line.shortName}
                    </strong>
                    <p className="muted">{line.summary}</p>
                    {line.extras.length > 0 && <p className="muted">{line.extras.join(' · ')}</p>}
                    {line.note && <p className="receipt__note">“{line.note}”</p>}
                    {item && (
                      <Link to={`/menu/${line.itemId}`} className="link-more">
                        Order this again
                      </Link>
                    )}
                  </div>
                </div>
                <span>{formatINR(line.lineTotal)}</span>
              </li>
            );
          })}
        </ul>

        {order.customer.notes && <p className="receipt__note">Kitchen note: {order.customer.notes}</p>}
      </div>

      <SummaryPanel totals={totalsFor(order)} mode={order.mode} totalLabel="Order total">
        {order.money.bonusCredit > 0 && (
          <div className="summary__extra">
            <div className="summary__row">
              <dt>Waiting-room games</dt>
              <dd className="is-credit">−{formatINR(order.money.bonusCredit)}</dd>
            </div>
            <div className="summary__row">
              <dt>Still to pay</dt>
              <dd>{formatINR(order.payable)}</dd>
            </div>
          </div>
        )}
      </SummaryPanel>
    </section>
  );
}
