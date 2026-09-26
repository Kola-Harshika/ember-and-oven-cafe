/** Currency, time and text formatting helpers. Prices are stored as whole rupees. */

const rupee = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const plain = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** ₹1,249 */
export function formatINR(value: number): string {
  return rupee.format(Math.round(value));
}

/** 1,249 (no symbol, for dense UI) */
export function formatNumber(value: number): string {
  return plain.format(Math.round(value));
}

/** +₹90 / −₹40 — handy for customisation deltas. */
export function formatDelta(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return 'included';
  return `${rounded > 0 ? '+' : '−'}${formatINR(Math.abs(rounded))}`;
}

/** 0:00 style countdown from a number of seconds. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** "9:42 pm" for the kitchen log timestamps. */
export function formatClock(input: Date | string | number): string {
  const date = input instanceof Date ? input : new Date(input);
  return date
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase();
}

/** Relative "arriving in 4 min" style copy. */
export function formatMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  if (safe === 0) return 'any moment';
  if (safe === 1) return '1 minute';
  if (safe < 60) return `${safe} minutes`;
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  const hourLabel = hours === 1 ? '1 hour' : `${hours} hours`;
  return rest === 0 ? hourLabel : `${hourLabel} ${rest} min`;
}

export function pluralize(count: number, single: string, plural?: string): string {
  return count === 1 ? single : plural ?? `${single}s`;
}

/** "2 ×  Margherita" style item counts for compact summaries. */
export function countLabel(count: number, single: string, plural?: string): string {
  return `${count} ${pluralize(count, single, plural)}`;
}

export function titleCase(input: string): string {
  return input.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

export function truncate(input: string, max = 120): string {
  return input.length <= max ? input : `${input.slice(0, max - 1).trimEnd()}…`;
}
