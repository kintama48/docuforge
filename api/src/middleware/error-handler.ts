import { ErrorHandler } from 'hono';
import { AppError } from '../lib/errors';
import { ZodError } from 'zod';
import { captureException } from '../lib/sentry';
import { env } from '../config/env';
import { assertNever } from '../lib/assert';
import type { ErrorCode } from '../lib/errors';

function statusFromErrorCode(code: ErrorCode): 400 | 401 | 402 | 403 | 404 | 408 | 409 | 422 | 429 | 500 | 503 {
  switch (code) {
    case 'compilation_failed':
      return 400;
    case 'unauthorized':
      return 401;
    case 'limit_exceeded':
      return 402;
    case 'forbidden':
      return 403;
    case 'not_found':
      return 404;
    case 'engine_timeout':
      return 408;
    case 'conflict':
      return 409;
    case 'validation_error':
      return 422;
    case 'rate_limited':
      return 429;
    case 'internal_error':
      return 500;
    case 'engine_unavailable':
      return 503;
    default:
      return assertNever(code);
  }
}

export const errorHandler: ErrorHandler = (err, c) => {
  // Handle our custom errors
  if (err instanceof AppError) {
    return c.json(err.toJSON(), statusFromErrorCode(err.code));
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return c.json(
      {
        error: 'validation_error',
        message: 'Validation failed',
        details: {
          issues: err.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
      },
      422
    );
  }

  // Log unexpected errors and report to Sentry
  console.error('Unhandled error:', err);
  captureException(err);

  // Don't leak internal errors in production
  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  return c.json(
    {
      error: 'internal_error',
      message,
    },
    500
  );
};
