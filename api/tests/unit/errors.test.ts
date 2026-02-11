/**
 * Unit tests for custom error classes.
 */
import { describe, test, expect } from 'bun:test';
import {
  AppError,
  LimitExceededError,
  RateLimitedError,
  CompilationError,
  EngineTimeoutError,
  EngineUnavailableError,
} from '../../src/lib/errors';

describe('error classes', () => {
  test('AppError serializes details', () => {
    const err = new AppError('conflict', 'Conflict', { field: 'name' });
    expect(err.toJSON()).toEqual({ error: 'conflict', message: 'Conflict', details: { field: 'name' } });
  });

  test('LimitExceededError includes usage and upgrade url', () => {
    const err = new LimitExceededError('Limit', { usage: { used: 10 }, upgrade_url: 'https://upgrade' });
    expect(err.toJSON()).toEqual({
      error: 'limit_exceeded',
      message: 'Limit',
      usage: { used: 10 },
      upgrade_url: 'https://upgrade',
    });
  });

  test('RateLimitedError exposes retryAfter', () => {
    const err = new RateLimitedError('Too many', 30);
    expect(err.retryAfter).toBe(30);
    expect(err.toJSON()).toEqual({ error: 'rate_limited', message: 'Too many', details: { retryAfter: 30 } });
  });

  test('Engine errors set correct codes', () => {
    const compile = new CompilationError('bad');
    expect(compile.code).toBe('compilation_failed');

    const timeout = new EngineTimeoutError();
    expect(timeout.code).toBe('engine_timeout');

    const unavailable = new EngineUnavailableError();
    expect(unavailable.code).toBe('engine_unavailable');
  });
});
