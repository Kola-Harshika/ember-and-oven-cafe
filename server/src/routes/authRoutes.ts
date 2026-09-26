/** Sign-up, sign-in, sign-out, profile and password. */
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.ts';
import { requireUser } from '../http/context.ts';
import { clearCookie, setCookie } from '../http/cookies.ts';
import { parseBody } from '../http/validate.ts';
import { changePassword, login, logout, profile, register, updateProfile } from '../services/authService.ts';
import type { CreatedSession } from '../repositories/userRepository.ts';

const emailSchema = z
  .string()
  .trim()
  .min(5)
  .max(160)
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'That email address does not look right.');

const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'That password is too long.');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Please tell us the name for the ticket.').max(60),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().trim().min(10, 'A 10-digit number, please.').max(20).optional(),
  address: z.string().trim().max(240).optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  address: z.string().trim().max(240).nullable().optional(),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: passwordSchema,
});

export const authRouter = Router();

function issueSession(
  res: Parameters<typeof setCookie>[0],
  session: CreatedSession,
): void {
  setCookie(res, env.sessionCookieName, session.id, {
    maxAgeSeconds: env.sessionTtlHours * 3600,
    secure: env.cookieSecure,
  });
}

authRouter.post('/register', (req, res) => {
  const input = parseBody(registerSchema, req.body, 'Please check the details you entered.');
  const result = register(input);
  issueSession(res, result.session);
  res.status(201).json({ user: result.user });
});

authRouter.post('/login', (req, res) => {
  const input = parseBody(loginSchema, req.body, 'Please check the details you entered.');
  const result = login(input.email, input.password);
  issueSession(res, result.session);
  res.json({ user: result.user });
});

authRouter.post('/logout', (req, res) => {
  if (req.auth) logout(req.auth.sessionId);
  clearCookie(res, env.sessionCookieName, { secure: env.cookieSecure });
  res.json({ ok: true });
});

authRouter.get('/me', (req, res) => {
  if (!req.auth) {
    res.json({ user: null });
    return;
  }
  res.json({ user: profile(req.auth.userId) });
});

authRouter.patch('/profile', (req, res) => {
  const auth = requireUser(req);
  const patch = parseBody(profileSchema, req.body, 'Please check the details you entered.');
  res.json({ user: updateProfile(auth.userId, patch) });
});

authRouter.post('/password', (req, res) => {
  const auth = requireUser(req);
  const input = parseBody(passwordChangeSchema, req.body, 'Please check the details you entered.');
  changePassword(auth.userId, input);
  res.json({ ok: true });
});
