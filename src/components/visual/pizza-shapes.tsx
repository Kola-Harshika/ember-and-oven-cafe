/** Individual topping shapes for the live pizza renderer. */
import type { ReactNode } from 'react';
import { PIZZA_PALETTE as P, type Point, type Rng } from './art-utils';

export const TOPPING_COUNT: Record<string, number> = {
  olives: 9,
  jalapeno: 9,
  mushroom: 8,
  onion: 7,
  corn: 18,
  paneer: 8,
  chicken: 8,
  pepperoni: 8,
  salami: 7,
  basil: 6,
  sundried: 8,
  rocket: 9,
  truffle: 16,
  pineapple: 7,
  burrata: 4,
  chilli: 10,
  pesto: 6,
  rosemary: 5,
};

/** One topping piece, already positioned on the pie. */
export function toppingShape(key: string, point: Point, rng: Rng): ReactNode {
  const spin = (point.angle * 180) / Math.PI + rng.range(-14, 14);

  switch (key) {
    case 'olives':
      return (
        <g transform={`translate(${point.x} ${point.y})`}>
          <circle r={9} fill={P.olive} />
          <circle r={3.6} fill="#7a6a42" />
        </g>
      );
    case 'jalapeno':
      return (
        <g transform={`translate(${point.x} ${point.y}) rotate(${rng.range(0, 180)})`}>
          <circle r={8} fill={P.jalapeno} />
          <circle r={3.2} fill="#d8ecc0" />
        </g>
      );
    case 'mushroom':
      return (
        <g transform={`translate(${point.x} ${point.y}) rotate(${spin}) scale(0.75)`}>
          <ellipse rx={13} ry={9} fill={P.mushroom} />
          <rect x={-3} y={4} width={6} height={10} rx={3} fill="#e2d3b6" />
        </g>
      );
    case 'onion':
      return (
        <g transform={`translate(${point.x} ${point.y}) rotate(${spin})`}>
          <path d="M-11 5 Q0 -9 11 5" stroke={P.onion} strokeWidth={4.5} fill="none" strokeLinecap="round" />
          <path d="M-6 6 Q0 -2 6 6" stroke="#a9648a" strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'corn':
      return (
        <g transform={`translate(${point.x} ${point.y})`}>
          <circle r={4} fill={P.corn} />
          <circle r={1.6} fill="#fbe9a8" />
        </g>
      );
    case 'paneer':
      return (
        <g transform={`translate(${point.x} ${point.y}) rotate(${spin})`}>
          <rect x={-8} y={-8} width={16} height={16} rx={3} fill={P.paneer} stroke="#e6d9bd" />
        </g>
      );
    case 'chicken':
      return (
        <g transform={`translate(${point.x} ${point.y}) rotate(${spin})`}>
          <rect x={-10} y={-8} width={20} height={15} rx={6} fill={P.chicken} />
          <rect x={-5} y={-3.5} width={9} height={4} rx={2} fill="#e08a45" />
        </g>
      );
    case 'pepperoni':
      return (
        <g transform={`translate(${point.x} ${point.y})`}>
          <circle r={12} fill={P.pepperoni} />
          <circle r={12} fill="none" stroke="#8f2416" strokeWidth={1.6} />
          <circle cx={-3} cy={-2} r={1.8} fill="#7c1f12" />
          <circle cx={4} cy={3} r={1.6} fill="#7c1f12" />
          <circle cx={2} cy={-5} r={1.2} fill="#7c1f12" />
        </g>
      );
    case 'salami':
      return (
        <g transform={`translate(${point.x} ${point.y}) rotate(${spin})`}>
          <circle r={14} fill={P.salami} />
          <circle cx={-4} cy={-4} r={2.4} fill="#f2dfd2" />
          <circle cx={5} cy={2} r={2} fill="#f2dfd2" />
          <circle cx={-1} cy={6} r={1.6} fill="#f2dfd2" />
        </g>
      );
    case 'basil':
      return (
        <g transform={`translate(${point.x} ${point.y}) rotate(${spin}) scale(0.62)`}>
          <path d="M0 0 C10 -12 26 -10 28 2 C18 14 3 12 0 0 Z" fill={P.basil} />
          <path d="M2 2 L24 2" stroke="#2f6027" strokeWidth={1.6} />
        </g>
      );
    case 'sundried':
      return (
        <g transform={`translate(${point.x} ${point.y}) rotate(${spin})`}>
          <ellipse rx={9} ry={6.5} fill={P.sundried} />
          <ellipse rx={5} ry={3} fill="#a53a26" />
        </g>
      );
    case 'rocket':
      return (
        <g transform={`translate(${point.x} ${point.y}) rotate(${spin}) scale(0.78)`}>
          <path d="M0 0 C12 -14 30 -10 30 4 C18 18 2 14 0 0 Z" fill={P.rocket} />
          <path d="M3 3 L27 1" stroke="#2d5a24" strokeWidth={1.8} />
        </g>
      );
    case 'truffle':
      return (
        <g transform={`translate(${point.x} ${point.y})`}>
          <circle r={3.4} fill="#3a2a1c" />
          <circle cx={4} cy={3} r={2} fill="#4b3625" />
        </g>
      );
    case 'pineapple':
      return (
        <g transform={`translate(${point.x} ${point.y}) rotate(${spin})`}>
          <path d="M-9 7 L0 -8 L9 7 Z" fill={P.pineapple} stroke="#d9a92f" />
        </g>
      );
    case 'burrata':
      return (
        <g transform={`translate(${point.x} ${point.y})`}>
          <circle r={17} fill="#fdfaf1" stroke="#ece0c9" strokeWidth={1.4} />
          <circle cx={2} cy={-2} r={6} fill="#f7efd9" />
        </g>
      );
    case 'chilli':
      return (
        <g transform={`translate(${point.x} ${point.y})`}>
          <circle r={4} fill="#e2701f" opacity={0.85} />
        </g>
      );
    case 'pesto':
      return (
        <g transform={`translate(${point.x} ${point.y})`}>
          <circle r={5.4} fill={P.saucePesto} opacity={0.9} />
          <circle cx={2} cy={-2} r={2} fill="#7fa851" />
        </g>
      );
    case 'rosemary':
      return (
        <g transform={`translate(${point.x} ${point.y}) rotate(${rng.range(0, 360)})`}>
          <path d="M-16 0 L16 0" stroke="#4d6f38" strokeWidth={2.4} strokeLinecap="round" />
          <path d="M-10 -4 L-10 4 M-4 -5 L-4 5 M2 -5 L2 5 M8 -4 L8 4" stroke="#5f8445" strokeWidth={2} />
        </g>
      );
    default:
      return null;
  }
}
