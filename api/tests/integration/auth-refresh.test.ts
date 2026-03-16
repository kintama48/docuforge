import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import {
  createTestContext,
  createTestUser,
  sampleUsers,
  type TestContext,
} from '../setup';

function extractCookieValue(setCookieHeader: string | null, cookieName: string): string {
  if (!setCookieHeader) {
    throw new Error(`Missing Set-Cookie header for ${cookieName}`);
  }

  const pattern = new RegExp(`${cookieName}=([^;]+)`);
  const match = setCookieHeader.match(pattern);
  if (!match || !match[1]) {
    throw new Error(`Cookie ${cookieName} not found in Set-Cookie header`);
  }

  return match[1];
}

describe('Auth refresh flow', () => {
  let ctx: TestContext;
  let app: ReturnType<typeof createApp>;
  let deviceId: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    app = createApp();
    deviceId = `auth-refresh-${crypto.randomUUID()}`;
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('rotates refresh token and issues a new access token', async () => {
    await createTestUser(ctx.db, {
      email: sampleUsers.valid.email,
      password: sampleUsers.valid.password,
    });

    const loginResponse = await app.request('/console/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify({
        email: sampleUsers.valid.email,
        password: sampleUsers.valid.password,
      }),
    });

    expect(loginResponse.status).toBe(200);

    const loginSetCookie = loginResponse.headers.get('Set-Cookie');
    expect(loginSetCookie).toContain(`${env.AUTH_COOKIE_NAME}=`);
    expect(loginSetCookie).toContain(`${env.AUTH_REFRESH_COOKIE_NAME}=`);

    const initialRefreshToken = extractCookieValue(
      loginSetCookie,
      env.AUTH_REFRESH_COOKIE_NAME
    );

    const refreshResponse = await app.request('/console/auth/refresh', {
      method: 'POST',
      headers: {
        Cookie: `${env.AUTH_REFRESH_COOKIE_NAME}=${initialRefreshToken}`,
        'X-Device-Id': deviceId,
      },
    });

    expect(refreshResponse.status).toBe(200);

    const refreshBody = await refreshResponse.json();
    expect(typeof refreshBody.token).toBe('string');
    expect(refreshBody.user?.email).toBe(sampleUsers.valid.email);

    const refreshSetCookie = refreshResponse.headers.get('Set-Cookie');
    expect(refreshSetCookie).toContain(`${env.AUTH_COOKIE_NAME}=`);
    expect(refreshSetCookie).toContain(`${env.AUTH_REFRESH_COOKIE_NAME}=`);

    const rotatedRefreshToken = extractCookieValue(
      refreshSetCookie,
      env.AUTH_REFRESH_COOKIE_NAME
    );
    expect(rotatedRefreshToken).not.toBe(initialRefreshToken);
  });

  it('rejects refresh requests without refresh cookie', async () => {
    const response = await app.request('/console/auth/refresh', {
      method: 'POST',
      headers: {
        'X-Device-Id': deviceId,
      },
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('unauthorized');
  });

  it('revokes refresh token on logout', async () => {
    await createTestUser(ctx.db, {
      email: sampleUsers.valid.email,
      password: sampleUsers.valid.password,
    });

    const loginResponse = await app.request('/console/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify({
        email: sampleUsers.valid.email,
        password: sampleUsers.valid.password,
      }),
    });

    expect(loginResponse.status).toBe(200);
    const loginSetCookie = loginResponse.headers.get('Set-Cookie');
    const refreshToken = extractCookieValue(loginSetCookie, env.AUTH_REFRESH_COOKIE_NAME);

    const logoutResponse = await app.request('/console/auth/logout', {
      method: 'POST',
      headers: {
        Cookie: `${env.AUTH_REFRESH_COOKIE_NAME}=${refreshToken}`,
        Origin: env.APP_URL,
        'X-Device-Id': deviceId,
      },
    });

    expect(logoutResponse.status).toBe(200);

    const refreshResponse = await app.request('/console/auth/refresh', {
      method: 'POST',
      headers: {
        Cookie: `${env.AUTH_REFRESH_COOKIE_NAME}=${refreshToken}`,
        'X-Device-Id': deviceId,
      },
    });

    expect(refreshResponse.status).toBe(401);
  });

  it('allows only one successful refresh rotation for the same token under concurrency', async () => {
    await createTestUser(ctx.db, {
      email: sampleUsers.valid.email,
      password: sampleUsers.valid.password,
    });

    const loginResponse = await app.request('/console/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify({
        email: sampleUsers.valid.email,
        password: sampleUsers.valid.password,
      }),
    });

    expect(loginResponse.status).toBe(200);
    const loginSetCookie = loginResponse.headers.get('Set-Cookie');
    const refreshToken = extractCookieValue(loginSetCookie, env.AUTH_REFRESH_COOKIE_NAME);

    const headers = {
      Cookie: `${env.AUTH_REFRESH_COOKIE_NAME}=${refreshToken}`,
      'X-Device-Id': deviceId,
    };

    const [first, second] = await Promise.all([
      app.request('/console/auth/refresh', { method: 'POST', headers }),
      app.request('/console/auth/refresh', { method: 'POST', headers }),
    ]);

    const statuses = [first.status, second.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 401]);
  });
});
