import { defineConfig } from 'vitest/config';

/**
 * One test runner for the whole repository.
 *
 * The API tests talk to a throwaway SQLite file rather than the development database,
 * and they run in a single process because `node:sqlite` connections are per-process
 * (and the suite shares one file).
 */
export default defineConfig({
  test: {
    include: ['server/tests/**/*.test.ts', 'shared/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
    // Vite's builtin list predates `node:sqlite`; the API imports it directly, so it is
    // left to Node to resolve instead of being bundled.
    server: { deps: { external: [/^node:sqlite$/] } },
    env: {
      NODE_ENV: 'test',
      DB_FILE: 'server/data/test.sqlite',
      SESSION_COOKIE_NAME: 'eo_test_session',
      CANCEL_WINDOW_MINUTES: '5',
    },
  },
});
