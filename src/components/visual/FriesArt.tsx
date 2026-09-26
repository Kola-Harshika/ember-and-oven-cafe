/**
 * Live fries / sides renderer.
 *
 * The cut, the portion, the seasoning dust, the piled-on extras and the dip
 * cups all redraw from the guest's selection.
 */
import type { ReactNode } from 'react';
import type { ArtProps } from './art-types';
import { FRY_PALETTE as F, makeRng, scatterInBand, type Point, type Rng } from './art-utils';

const SEASONING_COLORS: Record<string, string> = {
  'season-salt': '#ffffff',
  'season-peri': '#d1471f',
  'season-pepper': '#2c241c',
  'season-cheese': '#f0b93a',
  'season-truffle': '#4a3a2a',
};

const DIP_COLORS: Record<string, { fill: string; label: string }> = {
  'dip-garlic': { fill: '#f4e6c8', label: 'aioli' },
  'dip-cheese': { fill: '#e9a52b', label: 'cheese' },
  'dip-chipotle': { fill: '#d6643c', label: 'chipotle' },
  'dip-mint': { fill: '#cfe6bd', label: 'mint' },
  'dip-relish': { fill: '#c0331f', label: 'relish' },
  'dip-truffle': { fill: '#e6dcc4', label: 'truffle' },
};

interface CutShape {
  width: number;
  height: number;
  radius: number;
}

const CUTS: Record<string, CutShape> = {
  'cut-straight': { width: 13, height: 64, radius: 3 },
  'cut-shoestring': { width: 8, height: 78, radius: 3 },
  'cut-wedge': { width: 26, height: 52, radius: 6 },
  'cut-crinkle': { width: 16, height: 68, radius: 4 },
};

function fryColor(rng: Rng): string {
  const roll = rng.next();
  if (roll < 0.34) return F.fry;
  if (roll < 0.66) return F.fryDeep;
  return F.fryPale;
}

/** The container the fries are served in. */
function container(keys: Set<string>): ReactNode {
  if (keys.has('portion-regular')) {
    return (
      <>
        <path d="M104 158 L216 158 L186 292 Q160 304 134 292 Z" fill={F.paper} stroke="#dccdb6" strokeWidth={2} />
        <path d="M104 158 L216 158 L212 176 L108 176 Z" fill="#e8dcc6" />
      </>
    );
  }
  if (keys.has('portion-jumbo')) {
    return (
      <>
        <path d="M78 168 L242 168 L226 292 Q160 306 94 292 Z" fill={F.basket} stroke="#a86c2c" strokeWidth={2} />
        <path d="M78 168 L242 168 L238 188 L82 188 Z" fill="#d99b4c" />
        <path d="M96 292 Q160 304 224 292 L222 300 Q160 312 98 300 Z" fill="#a86c2c" />
      </>
    );
  }
  return (
    <>
      <rect x={46} y={176} width={228} height={110} rx={16} fill={F.tray} stroke="#a8763c" strokeWidth={2} />
      <rect x={60} y={186} width={200} height={90} rx={10} fill={F.paper} />
      <rect x={60} y={186} width={200} height={12} rx={6} fill="#e6dcc6" />
    </>
  );
}

/** One fry, positioned and rotated. */
function fry(point: Point, cut: CutShape, color: string, index: number, crinkle: boolean): ReactNode {
  return (
    <g key={`fry-${index}`} transform={`translate(${point.x} ${point.y}) rotate(${point.angle})`}>
      <rect x={-cut.width / 2} y={-cut.height} width={cut.width} height={cut.height} rx={cut.radius} fill={color} />
      <rect
        x={-cut.width / 2 + 1}
        y={-cut.height + 2}
        width={Math.max(2, cut.width * 0.32)}
        height={cut.height - 8}
        rx={2}
        fill="rgba(255,255,255,0.16)"
      />
      {crinkle && (
        <path
          d={`M${-cut.width / 2} ${-cut.height * 0.72} h${cut.width} M${-cut.width / 2} ${-cut.height * 0.48} h${cut.width} M${-cut.width / 2} ${-cut.height * 0.24} h${cut.width}`}
          stroke="rgba(126,78,20,0.22)"
          strokeWidth={2}
        />
      )}
    </g>
  );
}

/** Golden onion ring, used by the onion-ring dish variant. */
function onionRing(cx: number, cy: number, radius: number, key: string): ReactNode {
  return (
    <g key={key}>
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#cf8f2f" strokeWidth={radius * 0.55} />
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#eab95c" strokeWidth={radius * 0.34} />
      <circle cx={cx} cy={cy} r={radius * 0.72} fill="none" stroke="rgba(120,68,12,0.35)" strokeWidth={1.6} />
    </g>
  );
}

export function FriesArt({ keys, heat, seed }: ArtProps) {
  const set = new Set(keys);
  const rng = makeRng(`fries-${seed}`);
  const portion = set.has('portion-share') || set.has('box-tray') ? 'share' : set.has('portion-jumbo') ? 'jumbo' : 'regular';
  const cutKey = Object.keys(CUTS).find((key) => set.has(key)) ?? 'cut-straight';
  const cut = CUTS[cutKey];
  const seasoningKey = Object.keys(SEASONING_COLORS).find((key) => set.has(key)) ?? 'season-salt';
  const seasoning = SEASONING_COLORS[seasoningKey];

  const band: [number, number] = portion === 'share' ? [68, 250] : portion === 'jumbo' ? [82, 240] : [98, 226];
  const pileTop = portion === 'share' ? 74 : portion === 'jumbo' ? 92 : 108;
  const baseY = portion === 'share' ? 176 : 158;
  const count = portion === 'share' ? 26 : portion === 'jumbo' ? 19 : 13;
  const fries = scatterInBand(rng, count, band[0], band[1], pileTop, baseY);

  const seasoningPoints = scatterInBand(rng, 70, band[0] + 6, band[1] - 6, pileTop, baseY + 10);
  const isRingDish = set.has('ring-stack');
  const dips = Object.keys(DIP_COLORS).filter((key) => set.has(key)).slice(0, 3);
  const flares = Math.round(heat * 7);

  return (
    <svg viewBox="0 0 320 320" className="food-art food-art--fries" role="img" aria-label="Live fries preview">
      <ellipse cx={160} cy={296} rx={92} ry={13} fill="rgba(32,20,12,0.2)" />

      {isRingDish
        ? Array.from({ length: 8 }).map((_, index) =>
            onionRing(
              160 + ((index % 3) - 1) * 34 + rng.range(-4, 4),
              158 - Math.floor(index / 3) * 22 + rng.range(-3, 3),
              30 + rng.range(-3, 3),
              `ring-${index}`,
            ),
          )
        : fries.map((point, index) => fry(point, cut, fryColor(rng), index, cutKey === 'cut-crinkle'))}

      {seasoningPoints.map((point, index) => (
        <circle
          key={`season-${index}`}
          cx={point.x}
          cy={point.y}
          r={rng.range(1.1, 2.6)}
          fill={seasoning}
          opacity={seasoningKey === 'season-salt' ? 0.85 : 0.7}
        />
      ))}

      {flares > 0 &&
        seasoningPoints.slice(0, flares).map((point, index) => (
          <rect
            key={`flare-${index}`}
            x={point.x}
            y={point.y}
            width={3.4}
            height={3}
            rx={1}
            fill="#c62828"
            transform={`rotate(${rng.range(0, 360)} ${point.x} ${point.y})`}
          />
        ))}

      {container(set)}

      {set.has('extra-cheddar') && (
        <>
          <path
            d={`M${band[0]} 150 Q160 132 ${band[1]} 150 L${band[1]} 178 Q160 194 ${band[0]} 176 Z`}
            fill={F.cheddar}
            opacity={0.9}
          />
          {[0.2, 0.45, 0.7].map((ratio, index) => {
            const x = band[0] + (band[1] - band[0]) * ratio;
            return <path key={`drip-${index}`} d={`M${x} 176 q4 18 -3 26 q-7 -8 -3 -26 Z`} fill={F.cheddar} opacity={0.85} />;
          })}
        </>
      )}

      {set.has('extra-parmesan') &&
        seasoningPoints.slice(0, 26).map((point, index) => (
          <rect
            key={`parm-${index}`}
            x={point.x}
            y={point.y}
            width={7}
            height={2.4}
            rx={1}
            fill={F.parmesan}
            transform={`rotate(${rng.range(-40, 40)} ${point.x} ${point.y})`}
          />
        ))}

      {set.has('extra-onion') &&
        [0.25, 0.5, 0.75].map((ratio, index) => {
          const x = band[0] + (band[1] - band[0]) * ratio;
          return (
            <path key={`crisp-${index}`} d={`M${x - 12} 150 q12 -16 24 0 q-12 12 -24 0 Z`} fill={F.onionCrisp} opacity={0.85} />
          );
        })}

      {set.has('extra-jalapeno') &&
        [0.3, 0.55, 0.8].map((ratio, index) => {
          const x = band[0] + (band[1] - band[0]) * ratio;
          return (
            <g key={`jal-${index}`}>
              <circle cx={x} cy={138} r={7} fill={F.jalapeno} />
              <circle cx={x} cy={138} r={2.8} fill="#dcefc4" />
            </g>
          );
        })}

      {set.has('extra-herbs') &&
        seasoningPoints.slice(0, 14).map((point, index) => (
          <circle key={`green-${index}`} cx={point.x} cy={point.y} r={2} fill={F.herb} />
        ))}

      {set.has('lime-wedge') && (
        <g transform="translate(268 214) rotate(-18)">
          <path d="M0 0 a22 22 0 0 1 0 34 Z" fill="#bfe07a" stroke="#7fae3f" />
          <path d="M0 0 L0 34" stroke="#f3fbdc" strokeWidth={2} />
        </g>
      )}

      {dips.map((key, index) => {
        const cup = DIP_COLORS[key];
        const x = 186 + index * 40;
        const y = 268;
        return (
          <g key={key}>
            <path d={`M${x - 17} ${y - 10} h34 l-4 22 a13 6 0 0 1 -26 0 Z`} fill="#efe6d6" stroke="#d7c8ae" />
            <ellipse cx={x} cy={y - 10} rx={17} ry={5.4} fill={cup.fill} />
            <ellipse cx={x - 4} cy={y - 11} rx={6} ry={2} fill="rgba(255,255,255,0.45)" />
          </g>
        );
      })}
    </svg>
  );
}
