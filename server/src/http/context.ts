/**
 * Request authentication context.
 *
 * `attachAuth` resolves the session cookie once per request and stores a small,
 * serialisable snapshot on `req.auth`; guards read from it. Nothing sensitive
 * (password hashes, session ids of other users) is ever exposed through the API.
 */
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.ts';
import { findSessionUser } from '../repositories/userRepository.ts';
import { ApiError } from './errors.ts';
import { readCookie } from './cookies.ts';

export type UserRole = 'customer' | 'staff';

export interface AuthContext {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  sessionId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth: AuthContext | null;
    }
  }
}

export function attachAuth(req: Request, _res: Response, next: NextFunction): void {
  req.auth = null;

  const token = readCookie(req, env.sessionCookieName);
  if (!token) {
    next();
    return;
  }

  const session = findSessionUser(token);
  if (session) {
    req.auth = {
      userId: session.user_id,
      name: session.name,
      email: session.email,
      role: session.role as UserRole,
      sessionId: session.id,
    };
  }

  next();
}

/** Any signed-in customer. */
export function requireUser(req: Request): AuthContext {
  if (!req.auth) throw ApiError.unauthorized();
  return req.auth;
}

/** Kitchen/admin only. */
export function requireStaff(req: Request): AuthContext {
  const auth = requireUser(req);
  if (auth.role !== 'staff') throw ApiError.forbidden();
  return auth;
}
