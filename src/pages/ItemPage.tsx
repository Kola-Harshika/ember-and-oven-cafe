import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getCategory, getItem, TAG_LABELS } from '@/data/menu';
import type { Selection } from '@/data/types';
import {
  applyPreset,
  countExtras,
  defaultSelection,
  describeSelection,
  sanitiseSelection,
} from '@/data/customizations';
import { artKeysFor, unitPrice } from '@/lib/pricing';
import { formatINR, formatNumber } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Chip, HeatDots } from '@/components/ui/Chip';
import { Stepper } from '@/components/ui/Stepper';
import { TextAreaField } from '@/components/ui/Field';
import { FoodArt } from '@/components/visual/FoodArt';
import { Customizer } from '@/components/menu/Customizer';

interface EditState {
  editLineId?: string;
}

const TAG_TONES: Record<string, 'default' | 'veg' | 'heat'> = {
  veg: 'veg',
  vegan: 'veg',
  spicy: 'heat',
  'sweet-heat': 'heat',
};

export function ItemPage() {
  const { itemId } = useParams();
  const item = getItem(itemId);
  const location = useLocation();
  const navigate = useNavigate();
  const { addItem, replaceLine, editLine } = useCart();
  const { push } = useToast();

  const editLineId = (location.state as EditState | null)?.editLineId ?? null;
  const [selection, setSelection] = useState<Selection>(() =>
    item ? applyPreset(defaultSelection(item.groups), item.preset) : {},
  );
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState(1);
  const loadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!editLineId || !item || loadedRef.current === editLineId) return;
    const line = editLine(editLineId);
    if (!line) return;
    loadedRef.current = editLineId;
    setSelection(sanitiseSelection(item.groups, line.selection));
    setNote(line.note ?? '');
    setQuantity(line.quantity);
  }, [editLineId, item, editLine]);

  const keys = useMemo(() => (item ? artKeysFor(item, selection) : []), [item, selection]);

  if (!item) {
    return (
      <div className="shell page">
        <div className="empty-state">
          <h1>That dish left the menu</h1>
          <p className="muted">It may have been renamed since you bookmarked it. The rest of the pass is still open.</p>
          <Link to="/menu" className="btn btn--primary">
            Back to the menu
          </Link>
        </div>
      </div>
    );
  }

  const unit = unitPrice(item, selection);
  const extras = countExtras(item.groups, selection);
  const caption = [describeSelection(item.groups, selection), extras > 0 ? `${extras} extras` : '']
    .filter(Boolean)
    .join(' · ');

  const submit = () => {
    if (editLineId) {
      replaceLine(editLineId, selection, note.trim() || undefined);
      push({ title: 'Line updated', message: 'Your tray has the new build.', tone: 'success' });
      navigate('/tray');
      return;
    }
    addItem(item, selection, note.trim() || undefined, quantity);
    push({
      title: `${item.shortName} added to your tray`,
      message: `${formatINR(unit * quantity)} · ${caption}`,
      tone: 'success',
    });
    navigate('/tray');
  };

  return (
    <div className="shell page item-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/menu">Menu</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/menu?category=${item.category}`}>{TAG_LABELS[item.category] ?? item.category}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{item.shortName}</span>
      </nav>

      <div className="item-layout">
        <motion.aside
          className="preview-pane"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <FoodArt kind={item.category} keys={keys} heat={item.heat} seed={`${item.id}-${caption}`} caption={caption} />

          <div className="preview-pane__tags">
            {item.tags.map((tag) => (
              <Chip key={tag} static tone={TAG_TONES[tag] ?? 'default'}>
                {TAG_LABELS[tag] ?? tag}
              </Chip>
            ))}
            {item.heat > 0 && <HeatDots heat={item.heat} />}
          </div>

          <dl className="nutrition">
            <div>
              <dt>Energy</dt>
              <dd>{item.nutrition.energy}</dd>
            </div>
            <div>
              <dt>Protein</dt>
              <dd>{item.nutrition.protein}</dd>
            </div>
            <div>
              <dt>Carbs</dt>
              <dd>{item.nutrition.carbs}</dd>
            </div>
            <div>
              <dt>Fat</dt>
              <dd>{item.nutrition.fat}</dd>
            </div>
          </dl>

          <p className="preview-pane__note">
            Every choice below redraws the picture above — this is exactly what the kitchen sees on your ticket.
          </p>
        </motion.aside>

        <motion.div
          className="item-main"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
        >
          <header className="item-head">
            <div className="row">
              <span className="eyebrow">{getCategory(item.category).name}</span>
              {item.badge && <span className="badge">{item.badge}</span>}
            </div>
            <h1>{item.name}</h1>
            <p className="lede">{item.tagline}</p>
            <p>{item.description}</p>
            <div className="item-head__meta">
              <span className="badge badge--plain">{item.rating.toFixed(1)}★</span>
              <span className="badge badge--plain">{formatNumber(item.orderedTimes)} ordered</span>
              <span className="badge badge--plain">{item.prepMinutes} min in the kitchen</span>
            </div>
          </header>

          <Customizer item={item} selection={selection} onChange={setSelection} />

          <TextAreaField
            id="item-note"
            label="Anything the kitchen should know?"
            hint="Allergies, cut in half, sauce on the side — we read every note at the pass."
            placeholder="e.g. leave the chilli honey on the side"
            maxLength={180}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />

          <div className="item-actions">
            <div className="item-actions__qty">
              <span className="field__label">How many?</span>
              <Stepper value={quantity} onChange={setQuantity} min={1} max={10} />
            </div>
            <div className="item-actions__price">
              <span className="muted">{formatINR(unit)} each</span>
              <strong>{formatINR(unit * quantity)}</strong>
            </div>
            <Button variant="primary" size="lg" onClick={submit}>
              {editLineId ? 'Update the tray line' : 'Add to tray'}
            </Button>
          </div>

          {item.pairings.length > 0 && (
            <section className="pairings">
              <h3>Goes well with</h3>
              <div className="pairing-row">
                {item.pairings.map((pairingId) => {
                  const pairing = getItem(pairingId);
                  if (!pairing) return null;
                  return (
                    <Link key={pairingId} to={`/menu/${pairingId}`} className="pairing-card">
                      <img src={pairing.image} alt="" loading="lazy" />
                      <span>
                        <strong>{pairing.shortName}</strong>
                        <small>{formatINR(pairing.price)}</small>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </motion.div>
      </div>
    </div>
  );
}
