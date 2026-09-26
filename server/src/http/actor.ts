/**
 * Turns a request into an "actor": a signed-in customer, or a guest holding the
 * token that was handed to them when the order was placed. Guest checkout is a
 * first-class path in the API (orders carry `guest_token`), which is what lets the
 * UI stay simple today and add real guest accounts later without a migration.
 */
import type { Request } from 'express';
import { ApiError } from './errors.ts';

export interface RequestActor {
  userId: string | null;
  guestToken: string | null;
  name: string;
}

export function actorFrom(req: Request, guestToken?: string | null): RequestActor {
  if (req.auth) return { userId: req.auth.userId, guestToken: null, name: req.auth.name };
  return { userId: null, guestToken: guestToken ?? null, name: 'Guest' };
}

/** An order can only be read/changed by its owner or by the guest that placed it. */
export function requireActor(req: Request, guestToken?: string | null): RequestActor {
  const actor = actorFrom(req, guestToken);
  if (!actor.userId && !actor.guestToken) {
    throw ApiError.unauthorized('Sign in, or use the link from your order confirmation, to see this order.');
  }
  return actor;
}

export function readGuestToken(req: Request): string | null {
  const header = req.header('x-guest-token');
  if (header) return header;
  const query = req.query.token;
  return typeof query === 'string' && query.length > 0 ? query : null;
}
