/**
 * Live pizza renderer.
 *
 * Every customisation on the item page has a visual consequence here: the size
 * changes the radius, the crust changes the border, the cheese changes the
 * layer, and each topping is a real shape scattered by a seeded generator so
 * nothing jitters while you tweak.
 */
import type { ArtProps } from './art-types';
import { CHILLI_FLAKE, makeRng, scatterInCircle, PIZZA_PALETTE as P } from './art-utils';
import { TOPPING_COUNT, toppingShape } from './pizza-shapes';

const ALIASES: Record<string, string> = {
  'basil-torn': 'basil',
  'chilli-oil': 'chilli',
  'pepperoni-extra': 'pepperoni',
  'truffle-sheen': 'truffle',
  'pesto-dots': 'pesto',
};

function normalize(keys: string[]): Set<string> {
  const set = new Set<string>();
  for (const key of keys) set.add(ALIASES[key] ?? key);
  return set;
}

export function PizzaArt({ keys, heat, seed }: ArtProps) {
  const set = normalize(keys);
  const rng = makeRng(`pizza-${seed}`);
  const cx = 160;
  const cy = 160;
  const radius = set.has('size-large') ? 143 : set.has('size-regular') ? 129 : 115;

  const sauce = set.has('sauce-pesto')
    ? P.saucePesto
    : set.has('sauce-white')
      ? P.sauceWhite
      : set.has('sauce-spicy')
        ? P.sauceSpicy
        : P.sauce;

  const cheese = set.has('cheese-four')
    ? P.cheeseFour
    : set.has('cheese-vegan')
      ? P.cheeseVegan
      : set.has('cheese-extra')
        ? P.cheeseDeep
        : P.cheese;
  const cheeseOn = !set.has('cheese-none');
  const extraCheese = set.has('cheese-extra');

  const crustRatio = set.has('crust-thin')
    ? 0.95
    : set.has('crust-wheat')
      ? 0.9
      : set.has('crust-stuffed')
        ? 0.84
        : 0.87;
  const inner = radius * crustRatio;

  const charSpots = scatterInCircle(rng, 22, cx, cy, radius * 0.98, radius * 0.8);
  const bubbleCount = extraCheese ? 16 : 10;
  const bubbles = scatterInCircle(rng, bubbleCount, cx, cy, inner * 0.82, 0);
  const flakes = Math.round(heat * 5.5);
  const flakePoints = scatterInCircle(rng, Math.max(flakes, 1), cx, cy, inner * 0.8, 0);
  const herbPoints = scatterInCircle(rng, 26, cx, cy, inner * 0.88, 0);
  const toppingKeys = Object.keys(TOPPING_COUNT).filter((key) => set.has(key));

  return (
    <svg viewBox="0 0 320 320" className="food-art food-art--pizza" role="img" aria-label="Live pizza preview">
      <defs>
        <radialGradient id="pizza-crust" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0.55" stopColor={P.crust} />
          <stop offset="1" stopColor={P.crustDeep} />
        </radialGradient>
        <radialGradient id="pizza-shine" cx="0.34" cy="0.28" r="0.72">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.34" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={cx} cy={cy + radius * 0.94} rx={radius * 0.9} ry={radius * 0.16} fill="rgba(32,20,12,0.22)" />
      <circle cx={cx} cy={cy} r={radius} fill="url(#pizza-crust)" />

      {charSpots.map((point, index) => (
        <circle
          key={`char-${index}`}
          cx={point.x}
          cy={point.y}
          r={rng.range(2, 6)}
          fill={P.crustChar}
          opacity={0.35}
        />
      ))}

      {set.has('crust-stuffed') &&
        Array.from({ length: 16 }).map((_, index) => {
          const angle = (index / 16) * Math.PI * 2;
          return (
            <circle
              key={`stuffed-${index}`}
              cx={cx + Math.cos(angle) * radius * 0.92}
              cy={cy + Math.sin(angle) * radius * 0.92}
              r={radius * 0.055}
              fill={P.cheese}
              stroke="#e0a94a"
            />
          );
        })}

      <circle cx={cx} cy={cy} r={inner} fill={sauce} />

      {cheeseOn && (
        <>
          <circle cx={cx} cy={cy} r={inner * 0.94} fill={cheese} opacity={extraCheese ? 0.97 : 0.86} />
          {bubbles.map((point, index) => (
            <circle
              key={`bubble-${index}`}
              cx={point.x}
              cy={point.y}
              r={rng.range(5, 12)}
              fill="#fff3c9"
              opacity={0.26}
            />
          ))}
        </>
      )}

      {toppingKeys.map((key) => {
        const points = scatterInCircle(rng, TOPPING_COUNT[key], cx, cy, inner * 0.76, inner * 0.12);
        return points.map((point, index) => <g key={`${key}-${index}`}>{toppingShape(key, point, rng)}</g>);
      })}

      {flakePoints.slice(0, flakes).map((point, index) => (
        <rect
          key={`flake-${index}`}
          x={point.x}
          y={point.y}
          width={4}
          height={3}
          rx={1}
          fill={CHILLI_FLAKE}
          transform={`rotate(${rng.range(0, 360)} ${point.x} ${point.y})`}
        />
      ))}

      {set.has('finish-butter') && (
        <circle cx={cx} cy={cy} r={inner * 0.99} fill="none" stroke="#f7e2a4" strokeWidth={7} opacity={0.32} />
      )}

      {set.has('finish-honey') &&
        [0.4, 0.6, 0.82].map((ratio, index) => (
          <circle
            key={`honey-${index}`}
            cx={cx}
            cy={cy}
            r={inner * ratio}
            fill="none"
            stroke="#eeb02f"
            strokeWidth={3}
            strokeDasharray="14 22"
            opacity={0.75}
          />
        ))}

      {set.has('finish-balsamic') &&
        [0.5, 0.74].map((ratio, index) => (
          <circle
            key={`balsamic-${index}`}
            cx={cx}
            cy={cy}
            r={inner * ratio}
            fill="none"
            stroke="#3b1f22"
            strokeWidth={2.6}
            strokeDasharray="10 26"
            opacity={0.6}
          />
        ))}

      {set.has('finish-herbs') &&
        herbPoints.map((point, index) => (
          <circle key={`herb-${index}`} cx={point.x} cy={point.y} r={1.8} fill="#4f7d38" />
        ))}

      {Array.from({ length: 6 }).map((_, index) => {
        const angle = (index / 6) * Math.PI * 2 - Math.PI / 2;
        return (
          <line
            key={`slice-${index}`}
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(angle) * inner}
            y2={cy + Math.sin(angle) * inner}
            stroke="rgba(60,34,16,0.26)"
            strokeWidth={2}
          />
        );
      })}

      <circle cx={cx} cy={cy} r={radius} fill="url(#pizza-shine)" />
    </svg>
  );
}
