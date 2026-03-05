import { describe, expect, test } from 'bun:test';
import { UnauthorizedError } from '../../src/lib/errors';
import { createJwt, flexibleAuth, jwtAuth } from '../../src/middleware/auth';
import { env } from '../../src/config/env';

function makeContext(path: string, headers: Record<string, string> = {}) {
  const values = new Map<string, unknown>();
  return {
    req: {
      path,
      header(name: string) {
        const direct = headers[name];
        if (direct !== undefined) return direct;
        return headers[name.toLowerCase()];
      },
    },
    set(key: string, value: unknown) {
      values.set(key, value);
    },
    get(key: string) {
      return values.get(key);
    },
  } as any;
}

describe('auth middleware console cookie-only behavior', () => {
  test('jwtAuth rejects bearer-only requests on /console', async () => {
    const token = await createJwt('usr_console', 'console@example.com');
    const ctx = makeContext('/console/templates', {
      Authorization: `Bearer ${token}`,
    });

    await expect(jwtAuth(ctx, async () => {})).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('jwtAuth accepts cookie session on /console', async () => {
    const token = await createJwt('usr_console_cookie', 'console-cookie@example.com');
    const ctx = makeContext('/console/templates', {
      Cookie: `${env.AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    });

    let called = false;
    await jwtAuth(ctx, async () => {
      called = true;
    });

    expect(called).toBe(true);
    expect(ctx.get('auth')).toBeDefined();
  });

  test('flexibleAuth rejects API key and bearer-only auth on /console', async () => {
    const token = await createJwt('usr_console_flexible', 'console-flex@example.com');
    const bearerCtx = makeContext('/console/usage', {
      Authorization: `Bearer ${token}`,
    });

    await expect(flexibleAuth(bearerCtx, async () => {})).rejects.toBeInstanceOf(UnauthorizedError);

    const apiKeyCtx = makeContext('/console/usage', {
      'X-API-Key': 'docu_live_invalid',
    });
    await expect(flexibleAuth(apiKeyCtx, async () => {})).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('flexibleAuth accepts cookie auth on /console', async () => {
    const token = await createJwt('usr_console_usage', 'console-usage@example.com');
    const ctx = makeContext('/console/usage', {
      Cookie: `${env.AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    });

    let called = false;
    await flexibleAuth(ctx, async () => {
      called = true;
    });

    expect(called).toBe(true);
    expect(ctx.get('auth')).toBeDefined();
  });
});
