/**
 * Unit tests for rate limiter middleware.
 */
import { describe, test, expect } from 'bun:test';
import {
  createRateLimiter,
  consoleSessionRateLimit,
  consoleAuthMutationRateLimit,
} from '../../src/middleware/rate-limit';
import { RateLimitedError } from '../../src/lib/errors';
import { env } from '../../src/config/env';

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

function makeRequestContext(path: string, requestHeaders: Record<string, string> = {}) {
  const responseHeaders = new Map<string, string>();
  const lowered = new Map(Object.entries(requestHeaders).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    headers: responseHeaders,
    req: {
      path,
      method: 'GET',
      header(name: string) {
        return lowered.get(name.toLowerCase());
      },
    },
    header(name: string, value: string) {
      responseHeaders.set(name, value);
    },
    get(_key: string) {
      return undefined;
    },
    set(_key: string, _value: unknown) {},
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

describe('console rate limiters', () => {
  test('console session limiter falls back to client IP when cookie is absent', async () => {
    const ctx = makeRequestContext('/console/templates', {
      'X-Forwarded-For': '198.51.100.22',
    });

    for (let i = 0; i < 120; i += 1) {
      await consoleSessionRateLimit(ctx, async () => {});
    }

    expect(ctx.headers.get('X-RateLimit-Limit')).toBe('120');
    expect(ctx.headers.get('X-RateLimit-Remaining')).toBe('0');
    await expect(consoleSessionRateLimit(ctx, async () => {})).rejects.toBeInstanceOf(RateLimitedError);
    expect(ctx.headers.get('Retry-After')).toBeDefined();
  });

  test('console session limiter accepts cookie-keyed traffic', async () => {
    const ctx = makeRequestContext('/console/templates', {
      Cookie: `${env.AUTH_COOKIE_NAME}=token-cookie-key`,
    });

    await consoleSessionRateLimit(ctx, async () => {});

    expect(ctx.headers.get('X-RateLimit-Limit')).toBe('120');
    expect(ctx.headers.get('X-RateLimit-Remaining')).toBe('119');
  });

  test('console auth mutation limiter blocks after threshold', async () => {
    const ctx = makeRequestContext('/console/auth/login', {
      'X-Forwarded-For': '203.0.113.15',
      'User-Agent': 'rate-limit-unit-test',
      'Accept-Language': 'en-US',
      'X-Device-Id': 'unit-device-1',
    });

    for (let i = 0; i < 12; i += 1) {
      await consoleAuthMutationRateLimit(ctx, async () => {});
    }

    expect(ctx.headers.get('X-RateLimit-Limit')).toBe('12');
    expect(ctx.headers.get('X-RateLimit-Remaining')).toBe('0');
    await expect(consoleAuthMutationRateLimit(ctx, async () => {})).rejects.toBeInstanceOf(RateLimitedError);
    expect(ctx.headers.get('Retry-After')).toBeDefined();
  });
});
