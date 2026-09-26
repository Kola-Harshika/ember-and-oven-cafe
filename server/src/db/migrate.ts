/**
 * Migration runner.
 *
 * Every `.sql` file in `migrations/` is applied once, in filename order, and
 * recorded in `schema_migrations` so runs are repeatable.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDb, getDb } from './index.ts';
import { isMain, log } from '../utils/cli.ts';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

function ensureRegistry(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);
}

function appliedMigrations(): Set<string> {
  const rows = getDb().prepare('SELECT name FROM schema_migrations').all() as { name: string }[];
  return new Set(rows.map((row) => row.name));
}

/** Applies pending migrations and returns how many ran. */
export function runMigrations(): number {
  const db = getDb();
  ensureRegistry();

  const done = appliedMigrations();
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  let applied = 0;
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)').run(file, new Date().toISOString());
      db.exec('COMMIT');
      applied += 1;
      log('db', `applied ${file}`);
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }

  return applied;
}

if (isMain(import.meta.url)) {
  const count = runMigrations();
  log('db', count > 0 ? `${count} migration(s) applied` : 'database already up to date');
  closeDb();
}
