/**
 * Errors thrown by services and routes.
 *
 * The API only ever returns `{ error: { code, message } }` — never a stack trace
 * or a database message — so customers see friendly copy and internals stay hidden.
 */

export interface ApiErrorBody {
  code: string;
  message: string;
  /** Optional field/problem list, e.g. validation issues. */
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  toBody(): ApiErrorBody {
    return { code: this.code, message: this.message, ...(this.details ? { details: this.details } : {}) };
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, 'bad_request', message, details);
  }

  static validation(message: string, details?: unknown): ApiError {
    return new ApiError(422, 'validation_failed', message, details);
  }

  static unauthorized(message = 'Please sign in to continue.'): ApiError {
    return new ApiError(401, 'unauthorized', message);
  }

  static invalidCredentials(message = 'That email and password combination did not work.'): ApiError {
    return new ApiError(401, 'invalid_credentials', message);
  }

  static forbidden(message = 'This area is for cafe staff only.'): ApiError {
    return new ApiError(403, 'forbidden', message);
  }

  static notFound(message = 'We could not find that.'): ApiError {
    return new ApiError(404, 'not_found', message);
  }

  static conflict(message: string, code = 'conflict'): ApiError {
    return new ApiError(409, code, message);
  }

  static unavailable(message = 'That service is not available right now.'): ApiError {
    return new ApiError(503, 'service_unavailable', message);
  }
}
