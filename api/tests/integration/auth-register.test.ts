/**
 * Integration tests for POST /console/auth/register endpoint.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createApp } from '../../src/app';
import {
  createTestContext,
  type TestContext,
  sampleUsers,
} from '../setup';

describe('POST /console/auth/register', () => {
  let ctx: TestContext;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    ctx = await createTestContext();
    app = createApp();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('registers new user and returns 201 with token and API key', async () => {
    const response = await app.request('/console/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsers.valid),
    });

    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.user).toBeDefined();
    expect(body.user.id).toMatch(/^usr_/);
    expect(body.user.email).toBe(sampleUsers.valid.email);
    expect(body.user.plan).toBe('free');
    expect(body.token).toBeDefined();
    expect(typeof body.token).toBe('string');
    expect(body.api_key).toBeDefined();
    expect(body.api_key.raw_key).toMatch(/^docu_live_/);
    expect(body.api_key.prefix).toMatch(/^docu_live_/);
    expect(body.api_key.name).toBe('Default');
    expect(body.api_key.note).toContain('will not be shown again');
  });

  it('returns API key only once (not shown on subsequent login)', async () => {
    // Register
    const registerResponse = await app.request('/console/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsers.valid),
    });
    expect(registerResponse.status).toBe(201);

    const registerBody = await registerResponse.json();
    const rawKey = registerBody.api_key.raw_key;
    expect(rawKey).toBeDefined();

    // Login
    const loginResponse = await app.request('/console/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: sampleUsers.valid.email,
        password: sampleUsers.valid.password,
      }),
    });
    expect(loginResponse.status).toBe(200);

    const loginBody = await loginResponse.json();
    // Login should NOT return the raw API key
    expect(loginBody.api_key).toBeUndefined();
  });

  it('rejects duplicate email with 409 Conflict', async () => {
    // Register first user
    const firstResponse = await app.request('/console/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsers.valid),
    });
    expect(firstResponse.status).toBe(201);

    // Try to register with same email
    const secondResponse = await app.request('/console/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsers.valid),
    });
    expect(secondResponse.status).toBe(409);

    const body = await secondResponse.json();
    expect(body.error).toBe('conflict');
  });

  it('rejects weak password with 422', async () => {
    const response = await app.request('/console/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsers.weakPassword),
    });

    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.error).toBe('validation_error');
  });

  it('rejects invalid email with 422', async () => {
    const response = await app.request('/console/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsers.invalidEmail),
    });

    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.error).toBe('validation_error');
  });

  it('creates user as free tier', async () => {
    const response = await app.request('/console/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleUsers.valid),
    });

    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.user.plan).toBe('free');
  });

  it('rejects register from untrusted browser origin', async () => {
    const response = await app.request('/console/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
      },
      body: JSON.stringify(sampleUsers.valid),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('forbidden');
  });
});
