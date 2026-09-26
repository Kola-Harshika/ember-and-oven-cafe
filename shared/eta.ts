/**
 * The kitchen promise, shared by the API and the browser.
 *
 * The estimate is derived from real prep times (the slowest dish on the ticket),
 * a small load penalty for bigger trays and the extra hand-over time of the chosen
 * mode — then clamped to the window the cafe actually promises.
 */
import { ORDER_MODES, type OrderMode } from '../src/data/promos.ts';

export interface EtaWindow {
  min: number;
  max: number;
}

export function estimateEtaMinutes(prepMinutes: number[], mode: OrderMode, window: EtaWindow): number {
  const slowest = prepMinutes.length > 0 ? Math.max(...prepMinutes) : 10;
  const loadPenalty = Math.min(3, Math.max(0, prepMinutes.length - 1));
  const modeExtra = ORDER_MODES.find((entry) => entry.id === mode)?.extraMinutes ?? 0;

  const estimate = slowest + loadPenalty + modeExtra;
  return Math.min(window.max, Math.max(window.min, Math.round(estimate)));
}
