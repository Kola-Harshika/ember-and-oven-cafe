/**
 * Dispatcher for the live dish previews.
 * Wrap it in `.food-art-frame` styles (see global.css) to get the paper card look.
 */
import type { CategoryId } from '@/data/types';
import { PizzaArt } from './PizzaArt';
import { FriesArt } from './FriesArt';
import { ShakeArt } from './ShakeArt';

export interface FoodArtProps {
  kind: CategoryId;
  /** baseline + chosen option art keys */
  keys: string[];
  heat?: number;
  /** keeps the scatter stable per configured line */
  seed?: string;
  className?: string;
  /** short caption rendered under the drawing, e.g. "13\" · thin · extra cheese" */
  caption?: string;
}

export function FoodArt({ kind, keys, heat = 0, seed = 'default', className, caption }: FoodArtProps) {
  return (
    <figure className={['food-art-frame', className].filter(Boolean).join(' ')}>
      {kind === 'pizza' && <PizzaArt keys={keys} heat={heat} seed={seed} />}
      {kind === 'fries' && <FriesArt keys={keys} heat={heat} seed={seed} />}
      {kind === 'shakes' && <ShakeArt keys={keys} heat={heat} seed={seed} />}
      {caption && <figcaption className="food-art-frame__caption">{caption}</figcaption>}
    </figure>
  );
}
