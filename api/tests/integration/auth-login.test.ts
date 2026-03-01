/**
 * Integration tests for POST /v1/auth/login endpoint.
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

describe('POST /v1/auth/login', () => {
  let ctx: TestContext;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    ctx = await createTestContext();
    app = createApp();
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

    const response = await app.request('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    expect(setCookie).toContain('HttpOnly');
  });

  it('clears auth cookie on logout', async () => {
    const response = await app.request('/v1/auth/logout', {
      method: 'POST',
      headers: {
        Origin: env.APP_URL,
      },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Logged out');
    const setCookie = response.headers.get('Set-Cookie');
    expect(setCookie).toContain(`${env.AUTH_COOKIE_NAME}=`);
    expect(setCookie).toContain('Max-Age=0');
  });

  it('rejects wrong password with 401', async () => {
    // Register user
    await createTestUser(ctx.db, {
      email: sampleUsers.valid.email,
      password: sampleUsers.valid.password,
    });

    const response = await app.request('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const response = await app.request('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    const response = await app.request('/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
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
});
