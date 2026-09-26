/// <reference types="vite/client" />

/**
 * Vite's environment variables, typed.
 *
 * Only variables prefixed with `VITE_` reach the browser, so nothing secret can end up
 * in the bundle by accident — the API base URL is the only one we use.
 */
interface ImportMetaEnv {
  /** Absolute API base URL. Empty (the default) means "same origin": the dev proxy or the API server. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
