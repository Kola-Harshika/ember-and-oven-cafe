/**
 * Pricing, coupons and totals.
 *
 * The implementation lives in the shared/ folder so the browser and the API run
 * exactly the same math (the API is the authority, the browser is the instant
 * preview). This module keeps the original import surface, so no component had to
 * change.
 */
export * from '../../shared/pricing.ts';

