/** API entry point: configuration check, migrations, then listen. */
import { assertDatabaseReachable, createApp } from './app.ts';
import { env, environmentProblems } from './config/env.ts';
import { closeDb } from './db/index.ts';
import { runMigrations } from './db/migrate.ts';
import { log } from './utils/cli.ts';

const problems = environmentProblems();
if (problems.length > 0) {
  log('env', 'configuration problems:');
  for (const problem of problems) log('env', `- ${problem.key}: ${problem.message}`);
  if (env.isProduction) process.exitCode = 1;
  else log('env', 'continuing in development mode — see .env.example');
}

// Migrations are idempotent, so booting is always safe.
runMigrations();
assertDatabaseReachable();

const app = createApp();
const server = app.listen(env.port, () => {
  log('api', `Ember & Oven API listening on http://localhost:${env.port} (${env.nodeEnv})`);
  log('api', `database: ${env.dbFile}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    log('api', `${signal} received — shutting down`);
    server.close(() => {
      closeDb();
      process.exit(0);
    });
  });
}
