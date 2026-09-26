/**
 * Password hashing with Node's built-in scrypt — no native module, no secret in code.
 * Format: `scrypt$<salt-base64url>$<hash-base64url>`.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const SCHEME = 'scrypt';

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(plain, salt, KEY_LENGTH);
  return `${SCHEME}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [scheme, saltPart, hashPart] = stored.split('$');
  if (scheme !== SCHEME || !saltPart || !hashPart) return false;

  const salt = Buffer.from(saltPart, 'base64url');
  const expected = Buffer.from(hashPart, 'base64url');
  const derived = scryptSync(plain, salt, expected.length);

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Used once to bootstrap the staff account when no password is configured. */
export function generatePassword(): string {
  return randomBytes(9).toString('base64url');
}
