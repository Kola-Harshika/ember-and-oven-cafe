/** Drops the SQLite file and rebuilds it from scratch: `npm run db:reset`. */
import { rmSync } from 'node:fs';
import { closeDb, databasePath } from './index.ts';
import { runMigrations } from './migrate.ts';
import { seedDatabase } from './seed.ts';
import { isMain, log } from '../utils/cli.ts';

export function resetDatabase(): void {
  closeDb();
  const file = databasePath();
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(`${file}${suffix}`, { force: true });
  }
  log('db', `cleared ${file}`);
  runMigrations();
  seedDatabase();
  closeDb();
}

if (isMain(import.meta.url)) {
  resetDatabase();
  log('db', 'database reset complete');
}
