/**
 * The single place the browser talks to the API.
 *
 * Responsibilities kept here (and nowhere else): credentials, JSON encoding, a
 * consistent error shape, and turning network/DNS failures into the same
 * `ApiFailure` the UI already knows how to render. Nothing in a component should
 * call `fetch` directly.
 */

export interface ApiFailureBody {
  code?: string;
  message?: string;
  details?: unknown;
}

/** Thrown for any non-2xx response or transport failure. */
export class ApiFailure extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiFailure';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the API could not be reached at all (offline, server down). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

/** Same-origin by default; `VITE_API_BASE_URL` allows a separate API deployment. */
const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** sent as `x-guest-token` for orders placed before signing in */
  guestToken?: string | null;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.guestToken) headers['x-guest-token'] = options.guestToken;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api${path}`, {
      method: options.method ?? 'GET',
      headers,
      credentials: 'include',
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (error) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    throw new ApiFailure(
      0,
      'network_error',
      offline
        ? 'You appear to be offline. Reconnect and try again.'
        : 'We could not reach the cafe just now. Please try again in a moment.',
      error,
    );
  }

  if (response.status === 204) return undefined as T;

  const raw = await response.text();
  const payload = raw ? (safeParse(raw) as { error?: ApiFailureBody } & T) : ({} as T);

  if (!response.ok) {
    const body = (payload as { error?: ApiFailureBody }).error ?? {};
    throw new ApiFailure(
      response.status,
      body.code ?? 'request_failed',
      body.message ?? DEFAULT_MESSAGE,
      body.details,
    );
  }

  return payload as T;
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export const api = {
  get: <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) => request<T>(path, options),
  post: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'POST', body: body ?? {} }),
  patch: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'PATCH', body: body ?? {} }),
};
