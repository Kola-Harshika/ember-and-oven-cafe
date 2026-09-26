/**
 * SQLite connection (Node's built-in `node:sqlite` driver — no native build step).
 *
 * The database handle is created lazily so tests can point `DB_FILE` at a
 * throwaway file and so the API can boot without touching disk until needed.
 */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { DatabaseSync as DatabaseSyncInstance } from 'node:sqlite';
import { env } from '../config/env.ts';

// Loaded through `process.getBuiltinModule` so bundlers never have to resolve
// `node:sqlite` (Vite's builtin list predates it). Node still hands back the real,
// native SQLite driver — this is not a shim.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite') as typeof import('node:sqlite');

let database: DatabaseSyncInstance | null = null;

export type SqlValue = string | number | null;

export interface Row {
  [column: string]: SqlValue;
}

export function databasePath(): string {
  return resolve(process.cwd(), env.dbFile);
}

export function getDb(): DatabaseSyncInstance {
  if (database) return database;

  const file = databasePath();
  mkdirSync(dirname(file), { recursive: true });

  const created = new DatabaseSync(file);
  created.exec('PRAGMA journal_mode = WAL');
  created.exec('PRAGMA foreign_keys = ON');
  created.exec('PRAGMA busy_timeout = 5000');

  database = created;
  return created;
}

/** Close the handle (used by tests and graceful shutdown). */
export function closeDb(): void {
  database?.close();
  database = null;
}

export function run(sql: string, params: SqlValue[] = []): void {
  getDb().prepare(sql).run(...params);
}

export function get<T = Row>(sql: string, params: SqlValue[] = []): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

export function all<T = Row>(sql: string, params: SqlValue[] = []): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}

/** Wrap a unit of work so a failure rolls the whole thing back. */
export function transaction<T>(work: () => T): T {
  const db = getDb();
  db.exec('BEGIN');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function count(sql: string, params: SqlValue[] = []): number {
  const row = get<{ total: number }>(sql, params);
  return Number(row?.total ?? 0);
}
