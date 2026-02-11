import { ErrorHandler } from 'hono';
import { AppError } from '../lib/errors';
import { ZodError } from 'zod';
import { captureException } from '../lib/sentry';

export const errorHandler: ErrorHandler = (err, c) => {
  // Handle our custom errors
  if (err instanceof AppError) {
    return c.json(err.toJSON(), err.statusCode as any);
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
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  return c.json(
    {
      error: 'internal_error',
      message,
    },
    500
  );
};
