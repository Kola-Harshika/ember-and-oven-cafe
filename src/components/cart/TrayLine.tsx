import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { CartLine } from '@/data/types';
import { getItem } from '@/data/menu';
import { describeExtras, describeSelection } from '@/data/customizations';
import { artKeysFor, linePrice, unitPrice } from '@/lib/pricing';
import { formatINR } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Stepper } from '@/components/ui/Stepper';
import { FoodArt } from '@/components/visual/FoodArt';

/** One configured line in the tray: live preview, description and quantity controls. */
export function TrayLine({ line }: { line: CartLine }) {
  const item = getItem(line.itemId);
  const navigate = useNavigate();
  const { updateQuantity, removeLine } = useCart();
  const { push } = useToast();

  if (!item) return null;

  const extras = describeExtras(item.groups, line.selection);

  return (
    <motion.article
      className="tray-line"
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
    >
      <FoodArt
        kind={item.category}
        keys={artKeysFor(item, line.selection)}
        heat={item.heat}
        seed={line.lineId}
        className="tray-line__art"
      />

      <div className="tray-line__body">
        <header>
          <h3>
            <Link to={`/menu/${item.id}`}>{item.name}</Link>
          </h3>
          <p className="muted">{describeSelection(item.groups, line.selection)}</p>
          {extras.length > 0 && (
            <div className="chip-cloud chip-cloud--tight">
              {extras.map((extra) => (
                <Chip key={extra} static>
                  {extra}
                </Chip>
              ))}
            </div>
          )}
          {line.note && <p className="tray-line__note">“{line.note}”</p>}
        </header>

        <footer className="tray-line__foot">
          <Stepper
            value={line.quantity}
            min={1}
            max={10}
            label={`Quantity for ${item.shortName}`}
            onChange={(next) => updateQuantity(line.lineId, next)}
          />
          <span className="muted tray-line__unit">{formatINR(unitPrice(item, line.selection))} each</span>
          <strong className="tray-line__price">{formatINR(linePrice(line))}</strong>
          <div className="row">
            <Button
              variant="quiet"
              size="sm"
              onClick={() => navigate(`/menu/${item.id}`, { state: { editLineId: line.lineId } })}
            >
              Edit build
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                removeLine(line.lineId);
                push({ title: `${item.shortName} removed`, tone: 'default' });
              }}
            >
              Remove
            </Button>
          </div>
        </footer>
      </div>
    </motion.article>
  );
}
