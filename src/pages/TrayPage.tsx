import { TrayLine } from '@/components/cart/TrayLine';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ORDER_MODES, TIP_PRESETS } from '@/data/promos';
import { formatINR } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { SummaryPanel } from '@/components/cart/SummaryPanel';

export function TrayPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const {
    lines,
    mode,
    setMode,
    couponCode,
    tryCoupon,
    clearCoupon,
    tipPercent,
    setTip,
    totals,
    bonusDiscount,
    reset: clearTray,
  } = useCart();

  const [code, setCode] = useState(couponCode);
  const [couponTone, setCouponTone] = useState<'idle' | 'good' | 'bad'>('idle');
  const [couponText, setCouponText] = useState('');

  const applyCoupon = () => {
    const result = tryCoupon(code);
    setCouponTone(result.ok ? 'good' : 'bad');
    setCouponText(result.message);
    push({
      title: result.ok ? 'Coupon applied' : 'That code did not work',
      message: result.message,
      tone: result.ok ? 'success' : 'warning',
    });
  };

  if (lines.length === 0) {
    return (
      <div className="shell page">
        <div className="empty-state">
          <span className="eyebrow">The tray</span>
          <h1>Nothing on the tray yet</h1>
          <p className="muted">
            Start with a pizza, a cone of fries or a shake. Build it the way you like it and it lands here, priced and
            ready to order.
          </p>
          <div className="row">
            <Link to="/menu" className="btn btn--primary btn--lg">
              Open the menu
            </Link>
            <Link to="/menu?category=fries" className="btn btn--ghost btn--lg">
              Start with fries
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell page">
      <header className="page-head">
        <span className="eyebrow">The tray</span>
        <h1>
          {totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'}, built your way
        </h1>
        <p className="lede">
          Change anything here — quantities, options, the fulfilment mode. Nothing reaches the kitchen until you check
          out.
        </p>
      </header>

      <div className="tray-layout">
        <div className="tray-lines">
          {lines.map((line) => (
            <TrayLine key={line.lineId} line={line} />
          ))}
          <div className="tray-lines__actions">
            <Link to="/menu" className="btn btn--ghost">
              Add another dish
            </Link>
            <Button
              variant="danger"
              onClick={() => {
                clearTray();
                push({ title: 'Tray cleared', message: 'Nothing was sent to the kitchen.', tone: 'default' });
              }}
            >
              Clear the tray
            </Button>
          </div>
        </div>

        <div className="tray-side">
          <section className="panel stack">
            <h3>How are you having it?</h3>
            <div className="mode-list">
              {ORDER_MODES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`mode-card${mode === entry.id ? ' is-active' : ''}`}
                  aria-pressed={mode === entry.id}
                  onClick={() => setMode(entry.id)}
                >
                  <span className="mode-card__text">
                    <strong>{entry.name}</strong>
                    <small>{entry.blurb}</small>
                  </span>
                  <span className="mode-card__meta">{entry.fee === 0 ? 'No fee' : formatINR(entry.fee)}</span>
                </button>
              ))}
            </div>
            <p className="muted">Delivery is free above ₹799. Tips go straight to the kitchen.</p>
          </section>

          <SummaryPanel
            totals={totals}
            mode={mode}
            footer={
              <>
                <Button variant="primary" size="lg" block onClick={() => navigate('/checkout')}>
                  Go to checkout
                </Button>
                <Link to="/menu" className="btn btn--ghost btn--block">
                  Keep browsing
                </Link>
              </>
            }
          >
            <div className="summary__extra">
              <span className="field__label">Coupon</span>
              {couponCode ? (
                <div className="row row--between">
                  <Chip static tone="veg">
                    {couponCode} applied
                  </Chip>
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => {
                      clearCoupon();
                      setCode('');
                      setCouponTone('idle');
                      setCouponText('');
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="row">
                  <input
                    className="input"
                    value={code}
                    placeholder="EMBER10"
                    aria-label="Coupon code"
                    onChange={(event) => setCode(event.target.value.toUpperCase())}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') applyCoupon();
                    }}
                  />
                  <Button variant="quiet" onClick={applyCoupon}>
                    Apply
                  </Button>
                </div>
              )}
              {couponText && (
                <p className={couponTone === 'bad' ? 'field__error' : 'field__hint'}>{couponText}</p>
              )}
            </div>

            <div className="summary__extra">
              <span className="field__label">Tip the kitchen</span>
              <div className="chip-cloud chip-cloud--tight">
                {TIP_PRESETS.map((preset) => (
                  <Chip key={preset} active={tipPercent === preset} onClick={() => setTip(preset)}>
                    {preset === 0 ? 'No tip' : `${preset}%`}
                  </Chip>
                ))}
              </div>
            </div>

            {bonusDiscount > 0 && (
              <p className="summary__bonus">Game winnings already applied: −{formatINR(bonusDiscount)}</p>
            )}
          </SummaryPanel>
        </div>
      </div>
    </div>
  );
}
