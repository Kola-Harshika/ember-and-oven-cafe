/** Props shared by the three SVG dish renderers. */
export interface ArtProps {
  /** baseline art keys from the dish plus the art key of every chosen option */
  keys: string[];
  /** 0 = none, 3 = fiery */
  heat: number;
  /** seed for the deterministic scatter, usually the line/item id */
  seed: string;
}
