/**
 * Unit tests for rate limiter middleware.
 */
import { describe, test, expect } from 'bun:test';
import { createRateLimiter } from '../../src/middleware/rate-limit';
import { RateLimitedError } from '../../src/lib/errors';

function makeContext(auth?: { userId: string; planTier?: string }) {
  const headers = new Map<string, string>();
  return {
    headers,
    get: (key: string) => (key === 'auth' ? auth : undefined),
    set: (_key: string, _value: any) => {},
    header: (name: string, value: string) => {
      headers.set(name, value);
    },
  } as any;
}

describe('rate limiter', () => {
  test('allows requests without auth', async () => {
    const limiter = createRateLimiter('render');
    const ctx = makeContext();
    let called = false;

    await limiter(ctx, async () => {
      called = true;
    });

    expect(called).toBe(true);
    expect(ctx.headers.size).toBe(0);
  });

  test('sets headers and blocks after limit', async () => {
    const limiter = createRateLimiter('render');
    const ctx = makeContext({ userId: 'usr_rate', planTier: 'free' });

    for (let i = 0; i < 10; i += 1) {
      await limiter(ctx, async () => {});
    }

    expect(ctx.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(ctx.headers.get('X-RateLimit-Remaining')).toBe('0');

    await expect(limiter(ctx, async () => {})).rejects.toBeInstanceOf(RateLimitedError);
    expect(ctx.headers.get('Retry-After')).toBeDefined();
  });

  test('resets window after expiration', async () => {
    const limiter = createRateLimiter('render');
    const ctx = makeContext({ userId: 'usr_reset', planTier: 'free' });

    const realNow = Date.now;
    const base = Date.now();
    Date.now = () => base;

    await limiter(ctx, async () => {});
    expect(ctx.headers.get('X-RateLimit-Remaining')).toBe('9');

    Date.now = () => base + 61 * 1000;
    await limiter(ctx, async () => {});
    expect(ctx.headers.get('X-RateLimit-Remaining')).toBe('9');

    Date.now = realNow;
  });
});
