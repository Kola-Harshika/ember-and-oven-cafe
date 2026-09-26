/**
 * Checkout.
 *
 * The tray price is an estimate; this screen asks the API for the authoritative quote
 * (database prices, coupon rules, tax, tip) and shows that number before anything is
 * placed. Placing the order creates the record the kitchen actually works from.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ORDER_MODES } from '@/data/promos';
import { formatINR } from '@/lib/format';
import { ApiFailure } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useOrder } from '@/context/OrderContext';
import { useToast } from '@/context/ToastContext';
import { orderApi } from '@/services/orderApi';
import type { CreateOrderPayload, QuoteDto } from '@/services/types';
import type { Totals } from '@/lib/pricing';
import { Button } from '@/components/ui/Button';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { SummaryPanel } from '@/components/cart/SummaryPanel';

type Errors = Partial<Record<'name' | 'phone' | 'email' | 'address' | 'table', string>>;

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  table: string;
  address: string;
  notes: string;
}

function validate(form: CustomerForm, mode: string): Errors {
  const errors: Errors = {};
  if (form.name.trim().length < 2) errors.name = 'We need a name for the ticket.';
  if (form.phone.replace(/\D/g, '').length < 10) errors.phone = 'A 10-digit number, so we can reach you.';
  if (form.email.trim() && !form.email.includes('@')) errors.email = 'That email looks incomplete.';
  if (mode === 'dine-in' && form.table.trim().length === 0) errors.table = 'Which table are you at?';
  if (mode === 'delivery' && form.address.trim().length < 12) {
    errors.address = 'A full street address, please — 12 characters minimum.';
  }
  return errors;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const { user } = useAuth();
  const { lines, mode, setMode, couponCode, tipPercent, bonusDiscount, totals, reset: resetCart } = useCart();
  const { placeOrder } = useOrder();

  const [form, setForm] = useState<CustomerForm>(() => ({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    table: '',
    address: user?.address ?? '',
    notes: '',
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [quote, setQuote] = useState<QuoteDto | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /** Lines in the shape the API expects — the same shape that gets stored. */
  const payloadLines = useMemo(
    () =>
      lines.map((line) => ({
        itemId: line.itemId,
        quantity: line.quantity,
        selection: line.selection,
        ...(line.note ? { note: line.note } : {}),
      })),
    [lines],
  );

  /** Ask the kitchen to confirm the price whenever the tray, coupon or tip changes. */
  useEffect(() => {
    let cancelled = false;
    if (payloadLines.length === 0) {
      setQuote(null);
      return;
    }

    void (async () => {
      try {
        const next = await orderApi.quote({
          mode,
          lines: payloadLines,
          ...(couponCode ? { couponCode } : {}),
          tipPercent,
          bonusDiscount,
        });
        if (!cancelled) {
          setQuote(next);
          setQuoteError(null);
        }
      } catch (failure) {
        if (cancelled) return;
        setQuote(null);
        setQuoteError(failure instanceof ApiFailure ? failure.message : 'We could not confirm your prices.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [payloadLines, mode, couponCode, tipPercent, bonusDiscount]);

  /** The server quote wins when we have it; the local estimate keeps the UI alive offline. */
  const shownTotals: Totals = quote ? (quote.totals as unknown as Totals) : totals;

  const patch = (field: keyof CustomerForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async () => {
    const found = validate(form, mode);
    setErrors(found);
    setSubmitError(null);

    if (Object.keys(found).length > 0) {
      push({ title: 'A couple of details are missing', message: 'Check the highlighted fields.', tone: 'warning' });
      return;
    }
    if (lines.length === 0) return;

    const payload: CreateOrderPayload = {
      mode,
      lines: payloadLines,
      tipPercent,
      bonusDiscount,
      ...(couponCode ? { couponCode } : {}),
      customer: {
        name: form.name,
        phone: form.phone,
        ...(form.email ? { email: form.email } : {}),
        ...(form.table ? { table: form.table } : {}),
        ...(form.address ? { address: form.address } : {}),
        ...(form.notes ? { notes: form.notes } : {}),
      },
    };

    setPlacing(true);
    try {
      const order = await placeOrder(payload);
      resetCart();
      push({
        title: `Order ${order.id} is in`,
        message: `The kitchen has it — about ${order.etaMinutes} minutes.`,
        tone: 'reward',
      });
      navigate(`/order/${order.id}`);
    } catch (failure) {
      setSubmitError(
        failure instanceof ApiFailure ? failure.message : 'We could not place that order. Please try again.',
      );
      push({ title: 'We could not place the order', message: 'Nothing was charged.', tone: 'warning' });
    } finally {
      setPlacing(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="shell page">
        <div className="empty-state">
          <span className="eyebrow">Checkout</span>
          <h1>Your tray is empty</h1>
          <p className="muted">Order a dish first, then come back to settle the bill.</p>
          <Link to="/menu" className="btn btn--primary">
            Open the menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell page">
      <header className="page-head">
        <span className="eyebrow">Checkout</span>
        <h1>Who is this order for?</h1>
        <p className="lede">
          {user
            ? 'Your details are saved to your account, so next time this page is already filled in.'
            : 'Ordering as a guest works fine — sign in instead if you would like every order kept in one history.'}
        </p>
      </header>

      {quoteError && <p className="notice notice--warning">{quoteError}</p>}

      <div className="checkout-layout">
        <form
          className="checkout-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
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
          </section>

          <section className="panel stack">
            <h3>Your details</h3>
            <div className="form-grid">
              <TextField
                id="name"
                label="Name on the ticket"
                placeholder="Harshika"
                value={form.name}
                error={errors.name}
                onChange={(event) => patch('name', event.target.value)}
              />
              <TextField
                id="phone"
                label="Phone"
                inputMode="tel"
                placeholder="98765 43210"
                value={form.phone}
                error={errors.phone}
                onChange={(event) => patch('phone', event.target.value)}
              />
              <TextField
                id="email"
                label="Email"
                type="email"
                hint="Optional — the receipt lands here."
                placeholder="you@example.com"
                value={form.email}
                error={errors.email}
                onChange={(event) => patch('email', event.target.value)}
              />
              <TextField
                id="table"
                label={mode === 'dine-in' ? 'Table number' : 'Landmark'}
                hint={mode === 'dine-in' ? undefined : 'Optional — a hint for the rider or the counter.'}
                placeholder={mode === 'dine-in' ? '7' : 'Opposite the park gate'}
                value={form.table}
                error={errors.table}
                onChange={(event) => patch('table', event.target.value)}
              />
            </div>

            {mode === 'delivery' && (
              <TextAreaField
                id="address"
                label="Delivery address"
                placeholder="Flat, building, street, area, landmark"
                value={form.address}
                error={errors.address}
                onChange={(event) => patch('address', event.target.value)}
              />
            )}

            <TextAreaField
              id="notes"
              label="Notes for the kitchen"
              hint="Allergies, cutlery, sauces on the side."
              placeholder="No cutlery needed, thank you."
              value={form.notes}
              onChange={(event) => patch('notes', event.target.value)}
            />

            {submitError && <p className="field__error">{submitError}</p>}
          </section>
        </form>

        <div className="checkout-side">
          <SummaryPanel
            totals={shownTotals}
            mode={mode}
            totalLabel={quote ? 'Confirmed by the kitchen' : 'Estimated total'}
            footer={
              <>
                <Button variant="primary" size="lg" block onClick={() => void submit()} disabled={placing}>
                  {placing ? 'Placing the order…' : 'Place the order'}
                </Button>
                <Link to="/tray" className="btn btn--ghost btn--block">
                  Back to the tray
                </Link>
              </>
            }
          >
            <div className="summary__extra">
              <span className="field__label">What happens next</span>
              <ol className="mini-steps">
                <li>You get an order code and a live kitchen log.</li>
                <li>
                  While it cooks you can play the games and take credit off the bill — the kitchen applies it to this
                  order.
                </li>
                <li>
                  Pay when you are ready. This build uses a clearly-labelled test payment, so nothing is ever charged.
                </li>
              </ol>
            </div>
          </SummaryPanel>
        </div>
      </div>
    </div>
  );
}
