/**
 * Error handling.
 *
 * Only `ApiError` messages reach the client. Anything unexpected is logged on the
 * server and answered with a generic 500, so stack traces, SQL statements and file
 * paths can never leak to a customer.
 */
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.ts';
import { ApiError } from './errors.ts';

export function apiNotFound(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'not_found',
      message: `There is no API endpoint at ${req.method} ${req.path}.`,
    },
  });
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ApiError) {
    res.status(error.status).json({ error: error.toBody() });
    return;
  }

  // Malformed JSON bodies surface as a SyntaxError from express.json().
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: { code: 'bad_json', message: 'We could not read that request.' } });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(`[api] unhandled error on ${req.method} ${req.originalUrl}`, env.isTest ? '' : error);

  res.status(500).json({
    error: { code: 'internal_error', message: 'Something went wrong on our side. Please try again.' },
  });
}
