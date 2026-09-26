/**
 * Runs the API and the web dev server together: `npm run dev:full`.
 *
 * Written with Node's own child_process so no extra dependency (nodemon, concurrently)
 * is needed just to start two processes. Ctrl+C stops both.
 */
import { spawn } from 'node:child_process';

const targets = [
  {
    name: 'api',
    args: ['--watch', '--env-file-if-exists=.env', '--import', 'tsx', 'server/src/index.ts'],
    url: 'http://localhost:4000/api/health',
  },
  {
    name: 'web',
    args: ['node_modules/vite/bin/vite.js'],
    url: 'http://localhost:5173',
  },
];

const children = targets.map(({ name, args }) => {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env });
  child.on('exit', (code) => {
    console.log(`[dev] ${name} stopped (exit ${code ?? 0})`);
    stop(code ?? 0);
  });
  return child;
});

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exit(code);
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

console.log('[dev] starting Ember & Oven');
for (const target of targets) console.log(`[dev] ${target.name.padEnd(3)} → ${target.url}`);
console.log('[dev] the web app proxies /api to the API, so cookies stay first-party');
