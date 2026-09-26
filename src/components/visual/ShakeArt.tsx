/**
 * Live shake renderer.
 *
 * Glass shape, liquid colour, blend-in specks, the topping crown and the
 * drizzle all follow the guest's choices.
 */
import type { ArtProps } from './art-types';
import { anyOf, has, makeRng, SHAKE_PALETTE as S, shakeLiquid, SPRINKLE_COLORS, type Rng } from './art-utils';

interface GlassSpec {
  path: string;
  /** clip path used for the liquid and blend-ins */
  liquidPath: string;
  fillLevel: number;
  rim: { x1: number; x2: number; y: number };
  height: number;
}

const GLASSES: Record<string, GlassSpec> = {
  'glass-tulip': {
    path: 'M112 96 L208 96 L188 214 L160 250 L132 214 Z',
    liquidPath: 'M116 108 L204 108 L186 212 L160 244 L134 212 Z',
    fillLevel: 0.82,
    rim: { x1: 112, x2: 208, y: 96 },
    height: 154,
  },
  'glass-tall': {
    path: 'M122 78 L198 78 L192 262 L128 262 Z',
    liquidPath: 'M126 90 L194 90 L189 258 L131 258 Z',
    fillLevel: 0.86,
    rim: { x1: 122, x2: 198, y: 78 },
    height: 184,
  },
  'glass-mason': {
    path: 'M112 92 L208 92 L208 266 Q208 278 196 278 L124 278 Q112 278 112 266 Z',
    liquidPath: 'M118 104 L202 104 L202 264 Q202 272 194 272 L126 272 Q118 272 118 264 Z',
    fillLevel: 0.8,
    rim: { x1: 112, x2: 208, y: 92 },
    height: 186,
  },
};

export function ShakeArt({ keys, seed }: ArtProps) {
  const rng = makeRng(`shake-${seed}`);
  const glassKey = has(keys, 'glass-mason') ? 'glass-mason' : has(keys, 'glass-tall') ? 'glass-tall' : 'glass-tulip';
  const glass = GLASSES[glassKey];
  const liquid = shakeLiquid(keys);
  const thick = has(keys, 'base-thick');
  const clipId = `shake-clip-${glassKey}`;
  const liquidTop = 108 + (1 - glass.fillLevel) * glass.height;

  return (
    <svg viewBox="0 0 320 320" className="food-art food-art--shake" role="img" aria-label="Live shake preview">
      <defs>
        <clipPath id={clipId}>
          <path d={glass.liquidPath} />
        </clipPath>
        <linearGradient id="shake-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      <ellipse cx={160} cy={292} rx={74} ry={13} fill="rgba(32,20,12,0.2)" />

      <g clipPath={`url(#${clipId})`}>
        <rect x={100} y={liquidTop} width={120} height={200} fill={liquid} />
        <rect x={100} y={liquidTop} width={120} height={14} fill="rgba(255,255,255,0.22)" />

        {has(keys, 'boost-chocochips') &&
          blendPoints(rng, 16).map((point, index) => (
            <rect key={`chip-${index}`} x={point.x} y={point.y} width={5} height={4} rx={1.4} fill="#3c2417" />
          ))}
        {has(keys, 'boost-cookie') &&
          blendPoints(rng, 20).map((point, index) => (
            <circle key={`crumb-${index}`} cx={point.x} cy={point.y} r={2.4} fill="#4a3324" opacity={0.85} />
          ))}
        {has(keys, 'boost-brownie') &&
          blendPoints(rng, 10).map((point, index) => (
            <rect key={`brownie-${index}`} x={point.x} y={point.y} width={9} height={8} rx={2} fill="#43301f" />
          ))}
        {has(keys, 'boost-banana') &&
          blendPoints(rng, 7).map((point, index) => (
            <ellipse key={`banana-${index}`} cx={point.x} cy={point.y} rx={6} ry={5} fill="#f4e3a8" />
          ))}
        {has(keys, 'boost-espresso') && (
          <path d={`M120 ${liquidTop + 40} q40 -14 80 4 q-40 26 -80 -4 Z`} fill="rgba(58,34,18,0.55)" />
        )}
        {has(keys, 'boost-peanut') && (
          <path d={`M118 ${liquidTop + 70} q44 16 86 -8`} stroke="#c99a5b" strokeWidth={7} fill="none" opacity={0.7} />
        )}
        {has(keys, 'boost-protein') &&
          blendPoints(rng, 18).map((point, index) => (
            <circle key={`protein-${index}`} cx={point.x} cy={point.y} r={1.6} fill="#fdf6e6" opacity={0.7} />
          ))}

        {has(keys, 'ice-cubes') &&
          Array.from({ length: 4 }).map((_, index) => (
            <rect
              key={`ice-${index}`}
              x={126 + index * 18}
              y={liquidTop + index * 9}
              width={20}
              height={20}
              rx={4}
              fill="rgba(255,255,255,0.4)"
              stroke="rgba(255,255,255,0.6)"
              transform={`rotate(${index * 12} ${136 + index * 18} ${liquidTop + index * 9 + 10})`}
            />
          ))}
      </g>

      <path d={glass.path} fill="url(#shake-glass)" stroke="rgba(255,255,255,0.75)" strokeWidth={2} />
      <ellipse cx={160} cy={glass.rim.y} rx={(glass.rim.x2 - glass.rim.x1) / 2} ry={9} fill="rgba(255,255,255,0.32)" />
      <path d="M132 118 q4 90 -6 128" stroke="rgba(255,255,255,0.5)" strokeWidth={5} fill="none" strokeLinecap="round" />

      {(has(keys, 'whip') || thick) && (
        <g>
          <circle cx={138} cy={glass.rim.y - 10} r={20} fill={S.cream} />
          <circle cx={160} cy={glass.rim.y - 22} r={22} fill={S.cream} />
          <circle cx={182} cy={glass.rim.y - 10} r={19} fill={S.cream} />
          <circle cx={150} cy={glass.rim.y - 30} r={13} fill="#ffffff" />
          <circle cx={171} cy={glass.rim.y - 27} r={11} fill="#ffffff" opacity={0.9} />
        </g>
      )}

      {has(keys, 'drizzle-choco') && (
        <path
          d={`M120 ${glass.rim.y - 8} q14 -16 26 0 q14 16 28 0 q14 -16 26 0`}
          stroke={S.choco}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          opacity={0.9}
        />
      )}
      {has(keys, 'drizzle-caramel') && (
        <path
          d={`M124 ${glass.rim.y - 20} q16 14 30 0 q16 -14 30 0`}
          stroke={S.caramel}
          strokeWidth={4.5}
          fill="none"
          strokeLinecap="round"
          opacity={0.9}
        />
      )}

      {has(keys, 'marshmallow') &&
        [0.24, 0.5, 0.74].map((ratio, index) => {
          const x = glass.rim.x1 + (glass.rim.x2 - glass.rim.x1) * ratio;
          return (
            <rect
              key={`mallow-${index}`}
              x={x - 9}
              y={glass.rim.y - 44 - (index % 2) * 8}
              width={18}
              height={16}
              rx={5}
              fill="#fff6ea"
              stroke="#efdcc6"
            />
          );
        })}

      {has(keys, 'sprinkles') &&
        Array.from({ length: 18 }).map((_, index) => {
          const x = glass.rim.x1 + 10 + rng.range(0, glass.rim.x2 - glass.rim.x1 - 20);
          const y = glass.rim.y - 30 - rng.range(0, 22);
          return (
            <rect
              key={`sprinkle-${index}`}
              x={x}
              y={y}
              width={7}
              height={2.6}
              rx={1.3}
              fill={SPRINKLE_COLORS[index % SPRINKLE_COLORS.length]}
              transform={`rotate(${rng.range(0, 360)} ${x} ${y})`}
            />
          );
        })}

      {has(keys, 'cone') && (
        <g transform="translate(206 54) rotate(24)">
          <path d="M0 0 L30 0 L15 58 Z" fill="#e3b567" stroke="#c99539" />
          <path d="M4 12 L26 12 M7 26 L23 26 M10 40 L20 40" stroke="#b9832c" strokeWidth={1.6} />
        </g>
      )}

      {anyOf(keys, ['berry', 'topping-berry']) &&
        [0.3, 0.52, 0.72].map((ratio, index) => {
          const x = glass.rim.x1 + (glass.rim.x2 - glass.rim.x1) * ratio;
          return (
            <g key={`berry-${index}`} transform={`translate(${x} ${glass.rim.y - 46 - (index % 2) * 12})`}>
              <circle r={11} fill={index === 1 ? '#d84a5f' : '#e0576d'} />
              <circle cx={-3} cy={-3} r={3.4} fill="rgba(255,255,255,0.55)" />
              <path d="M0 -12 q7 -7 12 0 q-7 5 -12 0 Z" fill="#4f8a3a" />
            </g>
          );
        })}

      {has(keys, 'straw-stripe') ? (
        <g>
          <rect x={213} y={26} width={9} height={96} rx={4} fill="#f3f7e8" transform="rotate(14 217 74)" />
          <rect x={213} y={44} width={9} height={14} fill="#8fbf6a" transform="rotate(14 217 74)" />
          <rect x={213} y={74} width={9} height={14} fill="#8fbf6a" transform="rotate(14 217 74)" />
        </g>
      ) : (
        <rect x={213} y={24} width={10} height={100} rx={5} fill="#e8e2d4" transform="rotate(14 218 74)" />
      )}
    </svg>
  );
}

/** A handful of points inside the glass, used for blend-ins. */
function blendPoints(rng: Rng, count: number): { x: number; y: number }[] {
  return Array.from({ length: count }).map(() => ({ x: rng.range(124, 196), y: rng.range(120, 250) }));
}

