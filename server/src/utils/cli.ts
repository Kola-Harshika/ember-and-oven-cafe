/** Shared helpers for scripts that are both importable and runnable from the CLI. */
import { pathToFileURL } from 'node:url';

/** True when this module is the process entry point (ESM equivalent of `require.main`). */
export function isMain(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return moduleUrl === pathToFileURL(entry).href;
}

export function log(scope: string, message: string): void {
  // eslint-disable-next-line no-console
  console.log(`[${scope}] ${message}`);
}
