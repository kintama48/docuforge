/**
 * Integration tests for POST /console/auth/login endpoint.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import {
  createTestContext,
  createTestUser,
  type TestContext,
  sampleUsers,
} from '../setup';

describe('POST /console/auth/login', () => {
  let ctx: TestContext;
  let app: ReturnType<typeof createApp>;
  let deviceId: string;

  beforeEach(async () => {
    ctx = await createTestContext();
    app = createApp();
    deviceId = `auth-login-${crypto.randomUUID()}`;
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('logs in with correct credentials and returns 200 with token', async () => {
    // First register a user
    await createTestUser(ctx.db, {
      email: sampleUsers.valid.email,
      password: sampleUsers.valid.password,
    });

    const response = await app.request('/console/auth/login', {
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

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.token).toBeDefined();
    expect(typeof body.token).toBe('string');
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(sampleUsers.valid.email);
    expect(body.user.id).toMatch(/^usr_/);
    expect(body.user.plan).toBeDefined();
    const setCookie = response.headers.get('Set-Cookie');
    expect(setCookie).toContain(`${env.AUTH_COOKIE_NAME}=`);
    expect(setCookie).toContain(`${env.AUTH_REFRESH_COOKIE_NAME}=`);
    expect(setCookie).toContain('HttpOnly');
  });

  it('clears auth cookie on logout', async () => {
    const response = await app.request('/console/auth/logout', {
      method: 'POST',
      headers: {
        Origin: env.APP_URL,
        'X-Device-Id': deviceId,
      },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Logged out');
    const setCookie = response.headers.get('Set-Cookie');
    expect(setCookie).toContain(`${env.AUTH_COOKIE_NAME}=`);
    expect(setCookie).toContain(`${env.AUTH_REFRESH_COOKIE_NAME}=`);
    expect(setCookie).toContain('Max-Age=0');
  });

  it('rejects wrong password with 401', async () => {
    // Register user
    await createTestUser(ctx.db, {
      email: sampleUsers.valid.email,
      password: sampleUsers.valid.password,
    });

    const response = await app.request('/console/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify({
        email: sampleUsers.valid.email,
        password: 'wrongpassword123',
      }),
    });

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('unauthorized');
    // Message should not reveal which credential is wrong
    expect(body.message).toBe('Invalid email or password');
  });

  it('rejects unknown email with 401 and same message as wrong password', async () => {
    const response = await app.request('/console/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'anypassword123',
      }),
    });

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('unauthorized');
    // Same message for security - do not reveal whether email exists
    expect(body.message).toBe('Invalid email or password');
  });

  it('rejects login from untrusted browser origin', async () => {
    await createTestUser(ctx.db, {
      email: sampleUsers.valid.email,
      password: sampleUsers.valid.password,
    });

    const response = await app.request('/console/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify({
        email: sampleUsers.valid.email,
        password: sampleUsers.valid.password,
      }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('forbidden');
  });

  it('returns 404 for legacy /v1 auth login path', async () => {
    const response = await app.request('/v1/auth/login', {
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

    expect(response.status).toBe(404);
  });

  it('applies auth mutation rate limit with retry-after header', async () => {
    await createTestUser(ctx.db, {
      email: sampleUsers.valid.email,
      password: sampleUsers.valid.password,
    });

    for (let i = 0; i < 12; i += 1) {
      const response = await app.request('/console/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'rate-limit-login-test',
          'X-Forwarded-For': '203.0.113.77',
          'X-Device-Id': 'rl-device-login',
        },
        body: JSON.stringify({
          email: sampleUsers.valid.email,
          password: 'wrong-password',
        }),
      });
      expect(response.status).toBe(401);
    }

    const blocked = await app.request('/console/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'rate-limit-login-test',
        'X-Forwarded-For': '203.0.113.77',
        'X-Device-Id': 'rl-device-login',
      },
      body: JSON.stringify({
        email: sampleUsers.valid.email,
        password: 'wrong-password',
      }),
    });

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();
    expect(blocked.headers.get('X-RateLimit-Limit')).toBe('12');
  });
});
