/**
 * Unit tests for error handler middleware.
 */
import { describe, test, expect } from 'bun:test';
import { Hono } from 'hono';
import { ZodError } from 'zod';
import { errorHandler } from '../../src/middleware/error-handler';
import { UnauthorizedError } from '../../src/lib/errors';
import { reloadEnv } from '../../src/config/env';

describe('error-handler', () => {
  const buildApp = () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.get('/app-error', () => {
      throw new UnauthorizedError('No access');
    });
    app.get('/zod', () => {
      throw new ZodError([
        {
          code: 'custom',
          message: 'Invalid input',
          path: ['field'],
        } as any,
      ]);
    });
    app.get('/unknown', () => {
      throw new Error('Boom');
    });
    return app;
  };

  test('handles AppError with status code', async () => {
    const app = buildApp();
    const response = await app.request('/app-error');
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('unauthorized');
    expect(body.message).toBe('No access');
  });

  test('handles ZodError with validation details', async () => {
    const app = buildApp();
    const response = await app.request('/zod');
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe('validation_error');
    expect(body.details.issues[0].path).toBe('field');
  });

  test('handles unknown errors in development', async () => {
    const app = buildApp();
    const response = await app.request('/unknown');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.message).toBe('Boom');
  });

  test('hides unknown errors in production', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    reloadEnv();
    const app = buildApp();
    const response = await app.request('/unknown');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.message).toBe('Internal server error');
    process.env.NODE_ENV = previous;
    reloadEnv();
  });
});
