/**
 * Users and sessions.
 *
 * Password hashes never leave this module: everything the API returns goes through
 * `toPublicUser`, so a leaked response cannot leak credentials.
 */
import type { UserRole } from '../http/context.ts';
import { all, get, run } from '../db/index.ts';
import { addHours, isExpired, nowIso } from '../utils/time.ts';
import { createId, randomToken } from '../utils/ids.ts';

export type { UserRole };

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  address: string | null;
  password_hash: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  address: string | null;
  role: UserRole;
  createdAt: string;
}

export interface SessionUserRow {
  id: string;
  user_id: string;
  expires_at: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface NewUserInput {
  email: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  passwordHash: string;
  role?: UserRole;
}

export function toPublicUser(row: UserRecord): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    address: row.address,
    role: row.role,
    createdAt: row.created_at,
  };
}

export function createUser(input: NewUserInput): PublicUser {
  const stamp = nowIso();
  const id = createId('user');

  run(
    `INSERT INTO users (id, email, name, phone, address, password_hash, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.email.trim().toLowerCase(),
      input.name.trim(),
      input.phone ?? null,
      input.address ?? null,
      input.passwordHash,
      input.role ?? 'customer',
      stamp,
      stamp,
    ],
  );

  return {
    id,
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    phone: input.phone ?? null,
    address: input.address ?? null,
    role: input.role ?? 'customer',
    createdAt: stamp,
  };
}

export function findUserByEmail(email: string): UserRecord | undefined {
  return get<UserRecord>('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
}

export function findUserById(id: string): UserRecord | undefined {
  return get<UserRecord>('SELECT * FROM users WHERE id = ?', [id]);
}

export interface ProfilePatch {
  name?: string;
  phone?: string | null;
  address?: string | null;
}

export function updateUserProfile(id: string, patch: ProfilePatch): PublicUser | undefined {
  const existing = findUserById(id);
  if (!existing) return undefined;

  const next: UserRecord = {
    ...existing,
    name: patch.name?.trim() || existing.name,
    phone: patch.phone !== undefined ? patch.phone : existing.phone,
    address: patch.address !== undefined ? patch.address : existing.address,
    updated_at: nowIso(),
  };

  run('UPDATE users SET name = ?, phone = ?, address = ?, updated_at = ? WHERE id = ?', [
    next.name,
    next.phone,
    next.address,
    next.updated_at,
    id,
  ]);

  return toPublicUser(next);
}

export interface CreatedSession {
  id: string;
  expiresAt: string;
}

export function createSession(userId: string, ttlHours: number): CreatedSession {
  const id = randomToken(32);
  const stamp = nowIso();
  const expiresAt = addHours(stamp, ttlHours);

  run('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)', [
    id,
    userId,
    stamp,
    expiresAt,
  ]);

  return { id, expiresAt };
}

/** Resolves a session token, dropping it silently when it has expired. */
export function findSessionUser(token: string): SessionUserRow | undefined {
  const row = get<SessionUserRow>(
    `SELECT s.id, s.user_id, s.expires_at, u.name, u.email, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ?`,
    [token],
  );

  if (!row) return undefined;
  if (isExpired(row.expires_at)) {
    run('DELETE FROM sessions WHERE id = ?', [token]);
    return undefined;
  }

  return row;
}

export function deleteSession(token: string): void {
  run('DELETE FROM sessions WHERE id = ?', [token]);
}

export function deleteExpiredSessions(): number {
  const before = all<{ id: string }>('SELECT id FROM sessions').length;
  run('DELETE FROM sessions WHERE expires_at <= ?', [nowIso()]);
  const after = all<{ id: string }>('SELECT id FROM sessions').length;
  return before - after;
}
