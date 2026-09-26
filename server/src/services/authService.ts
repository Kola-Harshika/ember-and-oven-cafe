/**
 * Accounts: registration, sign-in, sign-out and profile edits.
 *
 * Rules kept here (not in the routes) so the API, the tests and any future client
 * share one definition of what a valid account is.
 */
import { env } from '../config/env.ts';
import { ApiError } from '../http/errors.ts';
import { hashPassword, verifyPassword } from '../utils/password.ts';
import { run } from '../db/index.ts';
import {
  createSession,
  createUser,
  deleteSession,
  findUserByEmail,
  findUserById,
  toPublicUser,
  updateUserProfile,
  type CreatedSession,
  type ProfilePatch,
  type PublicUser,
} from '../repositories/userRepository.ts';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  address?: string;
}

export interface AuthResult {
  user: PublicUser;
  session: CreatedSession;
}

export function register(input: RegisterInput): AuthResult {
  const email = input.email.trim().toLowerCase();

  if (findUserByEmail(email)) {
    throw ApiError.conflict('An account already exists for that email address.', 'duplicate_email');
  }

  const user = createUser({
    email,
    name: input.name,
    phone: input.phone ?? null,
    address: input.address ?? null,
    passwordHash: hashPassword(input.password),
  });

  return { user, session: createSession(user.id, env.sessionTtlHours) };
}

export function login(email: string, password: string): AuthResult {
  const record = findUserByEmail(email);

  // Same message for "no such account" and "wrong password" so accounts cannot be probed.
  if (!record || !verifyPassword(password, record.password_hash)) {
    throw ApiError.invalidCredentials();
  }

  return { user: toPublicUser(record), session: createSession(record.id, env.sessionTtlHours) };
}

export function logout(sessionId: string): void {
  deleteSession(sessionId);
}

export function profile(userId: string): PublicUser {
  const record = findUserById(userId);
  if (!record) throw ApiError.unauthorized('That account no longer exists.');
  return toPublicUser(record);
}

export function updateProfile(userId: string, patch: ProfilePatch): PublicUser {
  const updated = updateUserProfile(userId, patch);
  if (!updated) throw ApiError.unauthorized('That account no longer exists.');
  return updated;
}

export interface CredentialChange {
  currentPassword: string;
  newPassword: string;
}

export function changePassword(userId: string, input: CredentialChange): void {
  const record = findUserById(userId);
  if (!record) throw ApiError.unauthorized('That account no longer exists.');

  if (!verifyPassword(input.currentPassword, record.password_hash)) {
    throw ApiError.invalidCredentials('Your current password did not match.');
  }

  run('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [
    hashPassword(input.newPassword),
    new Date().toISOString(),
    userId,
  ]);
}

/** Used by tests and tooling to create a known staff account without touching HTTP. */
export function createStaffAccount(email: string, password: string): PublicUser {
  const existing = findUserByEmail(email);
  if (existing) return toPublicUser(existing);
  return createUser({
    email,
    name: 'Cafe kitchen',
    passwordHash: hashPassword(password),
    role: 'staff',
  });
}

/** Convenience for tests and local tooling. */
