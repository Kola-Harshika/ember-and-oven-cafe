/**
 * Guest orders.
 *
 * When an order is placed without a session the API returns a one-time token. Keeping
 * that token (and nothing else) is what lets the same browser reopen the tracker
 * later — no account required, and no personal data stored on the device.
 * Signed-in customers never need this path.
 */
import { loadJSON, removeKey, saveJSON } from './storage';

const KEY = 'guest-order';

export interface GuestOrderRef {
  orderId: string;
  token: string;
}

export function rememberGuestOrder(ref: GuestOrderRef): void {
  saveJSON(KEY, ref);
}

export function guestOrderRef(): GuestOrderRef | null {
  const ref = loadJSON<GuestOrderRef | null>(KEY, null);
  return ref && ref.orderId && ref.token ? ref : null;
}

export function forgetGuestOrder(): void {
  removeKey(KEY);
}

/** The token to send for a specific order (only when it is the remembered guest order). */
export function guestTokenFor(orderId: string): string | null {
  const ref = guestOrderRef();
  return ref && ref.orderId === orderId ? ref.token : null;
}
