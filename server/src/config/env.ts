/**
 * Environment configuration for the cafe API.
 *
 * Every value has a safe development default, and no secret is ever hard-coded:
 * credentials and provider keys are read from the environment (see `.env.example`)
 * and validated when they matter (production / non-mock payment providers).
 */

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

export type PaymentProviderId = 'mock' | 'razorpay' | 'stripe';

export const env = {
  nodeEnv,
  isProduction,
  isTest,
  port: readNumber(process.env.PORT, 4000),
  /** SQLite file, relative to the repository root unless absolute. */
  dbFile: process.env.DB_FILE ?? (isTest ? 'server/data/test.sqlite' : 'server/data/ember-oven.sqlite'),
  /** Where the browser app runs in development (used for dev-only redirects). */
  appOrigin: process.env.APP_ORIGIN ?? 'http://localhost:5173',
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'eo_session',
  sessionTtlHours: readNumber(process.env.SESSION_TTL_HOURS, 24 * 7),
  cookieSecure: readBoolean(process.env.COOKIE_SECURE, isProduction),
  /** Staff account created by the seed script — password comes from the environment only. */
  staffEmail: process.env.STAFF_EMAIL ?? '',
  staffPassword: process.env.STAFF_PASSWORD ?? '',
  /** Payment: the default provider is an offline test flow, never a real charge. */
  paymentProvider: (process.env.PAYMENT_PROVIDER ?? 'mock') as PaymentProviderId,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  /** Kitchen promise window, kept in one place for API + UI copy. */
  etaMinMinutes: readNumber(process.env.ETA_MIN_MINUTES, 10),
  etaMaxMinutes: readNumber(process.env.ETA_MAX_MINUTES, 15),
  /** How long a customer may cancel after checkout, while the kitchen has not started. */
  cancelWindowMinutes: readNumber(process.env.CANCEL_WINDOW_MINUTES, 5),
} as const;

export interface EnvProblem {
  key: string;
  message: string;
}

/** Problems that must be fixed before the API is safe to expose. */
export function environmentProblems(): EnvProblem[] {
  const problems: EnvProblem[] = [];

  if (env.isProduction) {
    if (!env.cookieSecure) {
      problems.push({ key: 'COOKIE_SECURE', message: 'Session cookies must be Secure in production.' });
    }
  }

  if (env.paymentProvider !== 'mock') {
    if (env.paymentProvider === 'razorpay' && !(env.razorpayKeyId && env.razorpayKeySecret)) {
      problems.push({ key: 'RAZORPAY_KEY_ID', message: 'Razorpay requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.' });
    }
    if (env.paymentProvider === 'stripe' && !env.stripeSecretKey) {
      problems.push({ key: 'STRIPE_SECRET_KEY', message: 'Stripe requires STRIPE_SECRET_KEY.' });
    }
  }

  return problems;
}

/** True when real money could move through the configured provider. */
export function isLivePaymentProvider(): boolean {
  return env.paymentProvider !== 'mock' && environmentProblems().length === 0;
}
