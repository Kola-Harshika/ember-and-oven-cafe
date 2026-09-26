import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CATEGORIES, featuredItems, MENU_ITEMS } from '@/data/menu';
import { COUPONS, CRAFT_STEPS } from '@/data/promos';
import { AMBIENCES, useAmbience } from '@/context/AmbienceContext';
import { useOrder } from '@/context/OrderContext';
import { useToast } from '@/context/ToastContext';
import { applyPreset, defaultSelection } from '@/data/customizations';
import { artKeysFor } from '@/lib/pricing';
import { formatINR } from '@/lib/format';
import { FoodArt } from '@/components/visual/FoodArt';
import { ItemCard } from '@/components/menu/ItemCard';

const HOME_STATS = [
  { value: '450°C', label: 'Stone oven, lit at 7am' },
  { value: '10–15 min', label: 'From order to your table' },
  { value: '48 hr', label: 'Cold-proofed dough' },
  { value: '4.9★', label: 'From 2,300 guests this month' },
];

function HeroSection() {
  const { ambience, setAmbience } = useAmbience();
  const { order } = useOrder();
  const hero = featuredItems()[0] ?? MENU_ITEMS[0];
  const heroKeys = artKeysFor(hero, applyPreset(defaultSelection(hero.groups), hero.preset));

  return (
    <section className="hero">
      <div className="shell hero__inner">
        <motion.div
          className="hero__copy"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="eyebrow">
            <i className="hero__pulse" aria-hidden="true" /> Open now · kitchen till 11pm
          </span>
          <h1>
            Wood fire, hand-cut potatoes and shakes that <em>stand up in the glass</em>.
          </h1>
          <p className="lede">
            Ember &amp; Oven is a small cafe with one stone oven and a menu you build yourself. Choose the dough, the
            cut, the blend-ins — watch the drawing change as you go, then follow your ticket through the kitchen.
          </p>

          <div className="hero__actions">
            <Link to="/menu" className="btn btn--primary btn--lg">
              Browse the menu
            </Link>
            {order ? (
              <Link to={`/order/${order.id}`} className="btn btn--ghost btn--lg">
                Track order {order.id}
              </Link>
            ) : (
              <a href="#kitchen" className="btn btn--ghost btn--lg">
                How the kitchen runs
              </a>
            )}
          </div>

          <div className="ambience-picker" role="group" aria-label="Room lighting">
            <span className="ambience-picker__label">Set the room</span>
            {AMBIENCES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`ambience-card ambience-card--${entry.id}${ambience === entry.id ? ' is-active' : ''}`}
                aria-pressed={ambience === entry.id}
                onClick={() => setAmbience(entry.id)}
                title={entry.blurb}
              >
                <span className="ambience-card__swatch" aria-hidden="true" />
                <span className="ambience-card__text">
                  <strong>{entry.name}</strong>
                  <small>{entry.blurb}</small>
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="hero__art"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <FoodArt
            kind={hero.category}
            keys={heroKeys}
            heat={hero.heat}
            seed={`hero-${hero.id}`}
            caption={`${hero.name} — drawn live from the options you pick`}
          />
          <div className="hero__pills">
            <span className="hero-pill">
              <strong>{formatINR(hero.price)}</strong>
              <small>house build, from</small>
            </span>
            <span className="hero-pill">
              <strong>{hero.prepMinutes} min</strong>
              <small>average kitchen time</small>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatsStrip() {
  return (
    <section className="stats-strip">
      <div className="shell stats-strip__inner">
        {HOME_STATS.map((stat, index) => (
          <motion.div
            key={stat.value}
            className="stat"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.06 }}
          >
            <strong>{stat.value}</strong>
            <small>{stat.label}</small>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function CategoryTrio() {
  return (
    <section className="section" id="counters">
      <div className="shell">
        <header className="section__head">
          <div>
            <span className="eyebrow">Three counters</span>
            <h2>Pick the corner you are hungry in</h2>
          </div>
          <Link to="/menu" className="link-more">
            See everything
          </Link>
        </header>

        <div className="category-grid">
          {CATEGORIES.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
            >
              <Link to={`/menu?category=${category.id}`} className={`category-tile category-tile--${category.accent}`}>
                <img src={category.image} alt="" loading="lazy" />
                <div className="category-tile__body">
                  <span className="category-tile__tagline">{category.tagline}</span>
                  <h3>{category.name}</h3>
                  <p>{category.craftNote}</p>
                  <span className="category-tile__cta">Build yours</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedSection() {
  const featured = featuredItems();

  return (
    <section className="section" id="featured">
      <div className="shell">
        <header className="section__head">
          <div>
            <span className="eyebrow">Most ordered</span>
            <h2>What the pass cannot keep up with</h2>
          </div>
          <Link to="/menu" className="link-more">
            Full menu
          </Link>
        </header>

        <div className="item-grid">
          {featured.map((item, index) => (
            <ItemCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function KitchenSection() {
  return (
    <section className="section section--alt" id="kitchen">
      <div className="shell kitchen">
        <div className="kitchen__copy">
          <span className="eyebrow">Behind the pass</span>
          <h2>Nothing here is pre-made, so the wait is real</h2>
          <p className="lede">
            Your order is a printed ticket that moves along the line. Once you check out you get a code, a live kitchen
            log and a countdown that ends when your tray is packed or your table is served.
          </p>

          <ol className="craft-steps">
            {CRAFT_STEPS.map((step, index) => (
              <motion.li
                key={step.title}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: index * 0.07 }}
              >
                <span className="craft-steps__index">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>

        <figure className="ticket">
          <figcaption>
            <span className="ticket__dot" aria-hidden="true" /> Kitchen ticket · EO-K4TQ2
          </figcaption>
          <pre>
            {`1× DOUBLE PEPPERONI          12" thin
   + extra mozzarella
   + chilli honey drizzle
1× TRUFFLE PARMESAN FRIES   skin-on
   + truffle salt
2× COOKIE CRUMB SHAKE       mason
   + extra cookie crumb
--------------------------------
MODE      Dine in · table 7
PROMISE   10–15 minutes`}
          </pre>
          <p className="ticket__note">
            “Twelve minutes, give or take. Watch the log on your order page — the fryer talks a lot.”
          </p>
        </figure>
      </div>
    </section>
  );
}

function CouponStrip({ onCopy }: { onCopy: (toast: { title: string; message?: string; tone: 'reward' }) => void }) {
  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      onCopy({ title: `${code} copied`, message: 'Paste it in the tray at checkout.', tone: 'reward' });
    } catch {
      onCopy({ title: code, message: 'Copy it by hand — clipboard is blocked here.', tone: 'reward' });
    }
  };

  return (
    <section className="section" id="offers">
      <div className="shell">
        <header className="section__head">
          <div>
            <span className="eyebrow">Today at the counter</span>
            <h2>Codes worth keeping</h2>
          </div>
          <span className="muted">One code per order, applied in the tray.</span>
        </header>

        <div className="coupon-grid">
          {COUPONS.map((coupon) => (
            <article className="coupon" key={coupon.code}>
              <span className="coupon__label">{coupon.label}</span>
              <h3>{coupon.code}</h3>
              <p>{coupon.blurb}</p>
              <button type="button" className="coupon__copy" onClick={() => void copy(coupon.code)}>
                Copy code
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingBand() {
  return (
    <section className="closing">
      <div className="shell closing__inner">
        <div>
          <h2>Hungry now, or planning your evening?</h2>
          <p className="lede">
            Build it your way, order, then watch it come together. If you would rather choose the room first, switch the
            lighting any time from the header.
          </p>
        </div>
        <div className="closing__actions">
          <Link to="/menu" className="btn btn--primary btn--lg">
            Start an order
          </Link>
          <Link to="/menu?category=shakes" className="btn btn--ghost btn--lg">
            See the shake bar
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const { push } = useToast();

  return (
    <>
      <HeroSection />
      <StatsStrip />
      <CategoryTrio />
      <FeaturedSection />
      <KitchenSection />
      <CouponStrip onCopy={push} />
      <ClosingBand />
    </>
  );
}


