/**
 * Tiny, defensive wrapper around localStorage.
 * Every access is wrapped so private-mode browsers or quota errors can never
 * break the ordering flow — persistence is a bonus, not a requirement.
 */

const PREFIX = 'ember-oven:';

function safeWindow(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadJSON<T>(key: string, fallback: T): T {
  const store = safeWindow();
  if (!store) return fallback;
  try {
    const raw = store.getItem(PREFIX + key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { version?: number; value?: T } | T;
    if (parsed && typeof parsed === 'object' && 'value' in (parsed as Record<string, unknown>)) {
      return (parsed as { value: T }).value ?? fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown, version = 1): void {
  const store = safeWindow();
  if (!store) return;
  try {
    store.setItem(PREFIX + key, JSON.stringify({ version, value }));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function removeKey(key: string): void {
  const store = safeWindow();
  if (!store) return;
  try {
    store.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export const STORAGE_KEYS = {
  cart: 'cart',
  order: 'order',
  ambience: 'ambience',
  table: 'table-preference',
} as const;
