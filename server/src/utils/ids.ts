/** Identifier and code helpers for the cafe API. */
import { randomBytes, randomUUID } from 'node:crypto';

/** Prefixed UUID used for every table's primary key. */
export function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

/** Opaque token (session ids, guest order tokens). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Customer-facing order code, e.g. ORD-1047. */
export function orderCode(sequence: number): string {
  return `ORD-${sequence}`;
}

/** Parses the numeric part of an order code so the next one can be issued. */
export function orderSequence(orderId: string): number {
  const parsed = Number(orderId.replace(/^ORD-/, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function paymentReference(provider: string, seed: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  return `${provider.toUpperCase()}-${stamp}-${seed.slice(-4).toUpperCase()}`;
}
