/**
 * Request payload validation.
 *
 * Every request body/query is validated with zod and a failed check becomes a
 * friendly 422 — the client never sees a raw parser or SQLite message.
 */
import type { ZodType } from 'zod';
import { ApiError } from './errors.ts';

export function parseWith<T>(schema: ZodType<T>, input: unknown, message: string): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const issues = result.error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));

  return throwValidation(message, issues);
}

export function parseBody<T>(schema: ZodType<T>, body: unknown, message = 'Some of those details were not valid.'): T {
  return parseWith(schema, body, message);
}

export function parseQuery<T>(schema: ZodType<T>, query: unknown, message = 'Those filters were not valid.'): T {
  return parseWith(schema, query, message);
}

function throwValidation(message: string, details: unknown): never {
  throw ApiError.validation(message, details);
}
