/**
 * Minimal cookie helpers.
 *
 * Session cookies are `HttpOnly`, `SameSite=Lax` and `Secure` in production, so the
 * browser never exposes them to JavaScript and cross-site requests cannot use them.
 */
import type { Request, Response } from 'express';

export interface CookieOptions {
  maxAgeSeconds: number;
  secure: boolean;
  path?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    if (key === name) return decodeURIComponent(part.slice(index + 1).trim());
  }

  return null;
}

export function setCookie(res: Response, name: string, value: string, options: CookieOptions): void {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path ?? '/'}`,
    `Max-Age=${Math.floor(options.maxAgeSeconds)}`,
    `SameSite=${options.sameSite ?? 'Lax'}`,
    'HttpOnly',
  ];
  if (options.secure) parts.push('Secure');

  res.append('Set-Cookie', parts.join('; '));
}

export function clearCookie(res: Response, name: string, options: Pick<CookieOptions, 'secure' | 'path'>): void {
  const parts = [`${name}=`, `Path=${options.path ?? '/'}`, 'Max-Age=0', 'SameSite=Lax', 'HttpOnly'];
  if (options.secure) parts.push('Secure');

  res.append('Set-Cookie', parts.join('; '));
}
