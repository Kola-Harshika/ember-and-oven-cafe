/**
 * Shared helpers for the hand-drawn SVG dishes.
 *
 * The renders are deterministic: a seeded generator picks the same topping
 * positions and fry angles for the same dish every time, so nothing jitters
 * while the guest tweaks their order.
 */
import { makeRng, type Rng } from '@/lib/rng';

export type { Rng };

export function has(keys: readonly string[], key: string): boolean {
  return keys.includes(key);
}

export function anyOf(keys: readonly string[], candidates: readonly string[]): boolean {
  return candidates.some((candidate) => keys.includes(candidate));
}

export interface Point {
  x: number;
  y: number;
  angle: number;
  /** 0 → 1 position from the centre outwards */
  radius: number;
}

/**
 * Even-ish scatter inside a circle. Uses a golden-angle spiral so items never
 * clump, then jitters every point with the seeded generator.
 */
export function scatterInCircle(
  rng: Rng,
  count: number,
  cx: number,
  cy: number,
  maxRadius: number,
  minRadius = 0,
): Point[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const points: Point[] = [];
  for (let i = 0; i < count; i += 1) {
    const fraction = count === 1 ? 0.5 : i / (count - 1);
    const radius = minRadius + (maxRadius - minRadius) * Math.sqrt(fraction);
    const angle = i * golden + rng.range(-0.22, 0.22);
    points.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      angle,
      radius,
    });
  }
  return points;
}

/** Scatter across an upright rectangle (used for the fry pile). */
export function scatterInBand(
  rng: Rng,
  count: number,
  xStart: number,
  xEnd: number,
  yStart: number,
  yEnd: number,
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const x = xStart + (xEnd - xStart) * t + rng.range(-6, 6);
    const y = rng.range(yStart, yEnd);
    points.push({ x, y, angle: rng.range(-26, 26), radius: t });
  }
  return points;
}

/* --------------------------------------------------------------- palettes */

export const PIZZA_PALETTE = {
  crust: '#e3ac63',
  crustDeep: '#c98b3f',
  crustChar: '#a86c2b',
  sauce: '#c0392b',
  sauceSpicy: '#a8231a',
  sauceWhite: '#f2e7d2',
  saucePesto: '#5d8a3a',
  cheese: '#f7d774',
  cheeseDeep: '#efc14f',
  cheeseFour: '#f6cf7a',
  cheeseVegan: '#eadfba',
  olive: '#2f2a1c',
  jalapeno: '#3f7d3a',
  mushroom: '#d8c3a0',
  onion: '#8e4b6b',
  corn: '#f2c14e',
  paneer: '#fdf6e6',
  chicken: '#c46a2c',
  pepperoni: '#b8331f',
  basil: '#3f7a33',
  sundried: '#8e2b1d',
  rocket: '#3d7130',
  salami: '#c0453a',
  pineapple: '#f0c94e',
};

export const FRY_PALETTE = {
  fry: '#e8b04b',
  fryDeep: '#d0942f',
  fryPale: '#f2cd75',
  paper: '#f4ece0',
  basket: '#c8873f',
  tray: '#c99a5f',
  cheddar: '#f0a92c',
  parmesan: '#fbf3dd',
  onionCrisp: '#b5762c',
  herb: '#4c7d34',
  jalapeno: '#55a049',
  chipotle: '#c9552f',
};

export const SHAKE_PALETTE = {
  cocoa: '#6b4226',
  cocoaDeep: '#4a2c17',
  caramel: '#c8873f',
  cookie: '#8a6c4f',
  coffee: '#a9784b',
  strawberry: '#e79aa9',
  milk: '#f6efe3',
  glass: '#dfe8ea',
  cream: '#fffaf0',
  choco: '#3c2417',
  mint: '#7fbf6a',
};

export const CHILLI_FLAKE = '#c62828';
export const SPRINKLE_COLORS = ['#e05c7a', '#f2c14e', '#6fb7d8', '#8fbf6a', '#b07fd8'];

/** Colour of the shake liquid for a given flavour key. */
export function shakeLiquid(keys: readonly string[]): string {
  if (has(keys, 'liquid-cocoa')) return SHAKE_PALETTE.cocoa;
  if (has(keys, 'liquid-caramel')) return SHAKE_PALETTE.caramel;
  if (has(keys, 'liquid-cookie')) return SHAKE_PALETTE.cookie;
  if (has(keys, 'liquid-coffee')) return SHAKE_PALETTE.coffee;
  if (has(keys, 'liquid-strawberry')) return SHAKE_PALETTE.strawberry;
  return SHAKE_PALETTE.milk;
}

export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.repeat(2) : clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export { makeRng };
