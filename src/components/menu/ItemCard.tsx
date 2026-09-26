import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { MenuItem } from '@/data/types';
import { TAG_LABELS } from '@/data/menu';
import { applyPreset, defaultSelection } from '@/data/customizations';
import { formatINR, formatNumber } from '@/lib/format';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Chip, HeatDots } from '@/components/ui/Chip';

export interface ItemCardProps {
  item: MenuItem;
  index?: number;
}

/** Menu tile: photo, price, tags and a one-tap "quick add" that uses house picks. */
export function ItemCard({ item, index = 0 }: ItemCardProps) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { push } = useToast();

  const quickAdd = () => {
    const selection = applyPreset(defaultSelection(item.groups), item.preset);
    addItem(item, selection);
    push({
      title: `${item.shortName} is in your tray`,
      message: 'House picks applied — customise it any time.',
      tone: 'success',
    });
  };

  return (
    <motion.article
      className="item-card"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.42, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={`/menu/${item.id}`} className="item-card__media">
        <img src={item.image} alt={item.name} loading="lazy" decoding="async" />
        <span className="item-card__price">{formatINR(item.price)}</span>
        {item.badge && <span className="badge item-card__badge">{item.badge}</span>}
      </Link>

      <div className="item-card__body">
        <header className="item-card__head">
          <h3>
            <Link to={`/menu/${item.id}`}>{item.name}</Link>
          </h3>
          <p>{item.tagline}</p>
        </header>

        <div className="row item-card__tags">
          {item.tags.slice(0, 3).map((tag) => (
            <Chip key={tag} static tone={tag === 'spicy' ? 'heat' : tag === 'veg' || tag === 'vegan' ? 'veg' : 'default'}>
              {TAG_LABELS[tag] ?? tag}
            </Chip>
          ))}
          {item.heat > 0 && <HeatDots heat={item.heat} />}
        </div>

        <footer className="item-card__foot">
          <span className="muted item-card__meta">
            {item.rating.toFixed(1)}★ · {formatNumber(item.orderedTimes)} ordered · {item.prepMinutes} min
          </span>
          <div className="row">
            <Button variant="quiet" size="sm" onClick={quickAdd}>
              Quick add
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate(`/menu/${item.id}`)}>
              Customise
            </Button>
          </div>
        </footer>
      </div>
    </motion.article>
  );
}
