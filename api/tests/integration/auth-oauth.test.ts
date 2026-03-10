/**
 * Integration tests for OAuth auth routes.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createApp } from '../../src/app';
import { initTestDb, getDb, resetDb, schema } from '../../src/db/client';
import { setupTestEnv, createTestUser } from '../setup';
import { reloadEnv } from '../../src/config/env';
import { eq } from 'drizzle-orm';
import { registerFetchHandler } from '../helpers/fetch-router';
import { clearMockEmails, listMockEmails } from '../../src/services/email';

let unregisters: Array<() => void> = [];

function setOAuthEnv() {
  process.env.OAUTH_GITHUB_CLIENT_ID = 'gh-client';
  process.env.OAUTH_GITHUB_CLIENT_SECRET = 'gh-secret';
  process.env.OAUTH_GOOGLE_CLIENT_ID = 'google-client';
  process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'google-secret';
  process.env.OAUTH_MICROSOFT_CLIENT_ID = 'ms-client';
  process.env.OAUTH_MICROSOFT_CLIENT_SECRET = 'ms-secret';
  reloadEnv();
}

describe('OAuth routes', () => {
  let app: ReturnType<typeof createApp>;
  let deviceId: string;

  beforeEach(async () => {
    setupTestEnv('http://127.0.0.1:3001');
    setOAuthEnv();
    await initTestDb();
    app = createApp();
    deviceId = `auth-oauth-${crypto.randomUUID()}`;
    clearMockEmails();
  });

  afterEach(() => {
    clearMockEmails();
    for (const unregister of unregisters) {
      unregister();
    }
    unregisters = [];
    resetDb();
  });

  it('rejects unsupported providers', async () => {
    const response = await app.request('/console/auth/oauth/unknown');
    expect(response.status).toBe(404);
  });

  it('redirects to provider and returns oauth_failed when missing code', async () => {
    const start = await app.request('/console/auth/oauth/github?redirect=/dashboard');
    expect(start.status).toBe(302);
    const location = start.headers.get('Location');
    expect(location).toBeTruthy();

    const url = new URL(location!);
    const state = url.searchParams.get('state');
    expect(state).toBeTruthy();

    const callback = await app.request(`/console/auth/oauth/github/callback?state=${state}`);
    expect(callback.status).toBe(302);
    const callbackLocation = callback.headers.get('Location');
    expect(callbackLocation).toContain('/login?error=oauth_failed');
  });

  it('rejects invalid oauth state', async () => {
    const start = await app.request('/console/auth/oauth/google?redirect=/dashboard');
    const location = start.headers.get('Location');
    const url = new URL(location!);
    const state = url.searchParams.get('state');

    const callback = await app.request(`/console/auth/oauth/github/callback?code=code&state=${state}`);
    expect(callback.status).toBe(302);
    const callbackLocation = callback.headers.get('Location');
    expect(callbackLocation).toContain('/login?error=oauth_invalid_state');
  });

  it('creates a new user on oauth callback and returns api key', async () => {
    unregisters.push(
      registerFetchHandler('https://github.com', async (request) => {
        const url = new URL(request.url);
        if (url.pathname === '/login/oauth/access_token') {
          return new Response(JSON.stringify({ access_token: 'gh-token' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('{}', { status: 404 });
      })
    );
    unregisters.push(
      registerFetchHandler('https://api.github.com', async (request) => {
        const url = new URL(request.url);
        if (url.pathname === '/user') {
          return new Response(JSON.stringify({ id: 99, email: 'new@example.com', login: 'new' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('{}', { status: 404 });
      })
    );

    const start = await app.request('/console/auth/oauth/github?redirect=/dashboard');
    const location = start.headers.get('Location');
    const url = new URL(location!);
    const state = url.searchParams.get('state');

    const callback = await app.request(`/console/auth/oauth/github/callback?code=code&state=${state}`);
    expect(callback.status).toBe(302);
    const callbackLocation = callback.headers.get('Location');
    expect(callbackLocation).toContain('/oauth/callback');
    expect(callbackLocation).toContain('code=');

    const callbackUrl = new URL(callbackLocation!);
    const exchangeCode = callbackUrl.searchParams.get('code');
    expect(exchangeCode).toBeTruthy();

    const exchangeResponse = await app.request('/console/auth/oauth/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify({ code: exchangeCode }),
    });
    expect(exchangeResponse.status).toBe(200);
    const exchangeBody = await exchangeResponse.json();
    expect(exchangeBody.api_key).toBeTruthy();

    const welcomeEmail = listMockEmails().at(-1);
    expect(welcomeEmail).toBeDefined();
    expect(welcomeEmail?.subject).toBe('Welcome to DocuForge');
    expect(welcomeEmail?.from).toBe('hello@test.docuforge.local');

    const db = getDb();
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, 'new@example.com'));
    expect(user).toBeDefined();
  });

  it('drops unsafe redirect targets from oauth exchange payload', async () => {
    unregisters.push(
      registerFetchHandler('https://github.com', async (request) => {
        const url = new URL(request.url);
        if (url.pathname === '/login/oauth/access_token') {
          return new Response(JSON.stringify({ access_token: 'gh-token' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('{}', { status: 404 });
      })
    );
    unregisters.push(
      registerFetchHandler('https://api.github.com', async (request) => {
        const url = new URL(request.url);
        if (url.pathname === '/user') {
          return new Response(JSON.stringify({ id: 77, email: 'safe@example.com', login: 'safe' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('{}', { status: 404 });
      })
    );

    const start = await app.request('/console/auth/oauth/github?redirect=https://evil.example/path');
    const location = start.headers.get('Location');
    const url = new URL(location!);
    const state = url.searchParams.get('state');

    const callback = await app.request(`/console/auth/oauth/github/callback?code=code&state=${state}`);
    expect(callback.status).toBe(302);
    const callbackUrl = new URL(callback.headers.get('Location')!);
    const exchangeCode = callbackUrl.searchParams.get('code');
    expect(exchangeCode).toBeTruthy();

    const exchangeResponse = await app.request('/console/auth/oauth/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify({ code: exchangeCode }),
    });
    expect(exchangeResponse.status).toBe(200);

    const exchangeBody = await exchangeResponse.json();
    expect(exchangeBody.redirect).toBeUndefined();
  });

  it('rejects oauth exchange from untrusted browser origin', async () => {
    unregisters.push(
      registerFetchHandler('https://github.com', async (request) => {
        const url = new URL(request.url);
        if (url.pathname === '/login/oauth/access_token') {
          return new Response(JSON.stringify({ access_token: 'gh-token' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('{}', { status: 404 });
      })
    );
    unregisters.push(
      registerFetchHandler('https://api.github.com', async (request) => {
        const url = new URL(request.url);
        if (url.pathname === '/user') {
          return new Response(JSON.stringify({ id: 91, email: 'origin@example.com', login: 'origin' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('{}', { status: 404 });
      })
    );

    const start = await app.request('/console/auth/oauth/github?redirect=/dashboard');
    const location = start.headers.get('Location');
    const url = new URL(location!);
    const state = url.searchParams.get('state');

    const callback = await app.request(`/console/auth/oauth/github/callback?code=code&state=${state}`);
    const callbackUrl = new URL(callback.headers.get('Location')!);
    const exchangeCode = callbackUrl.searchParams.get('code');
    expect(exchangeCode).toBeTruthy();

    const exchangeResponse = await app.request('/console/auth/oauth/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
        'X-Device-Id': deviceId,
      },
      body: JSON.stringify({ code: exchangeCode }),
    });
    expect(exchangeResponse.status).toBe(403);
  });

  it('fails oauth when email matches existing user without oauth account', async () => {
    const db = getDb();
    const existing = await createTestUser(db, { email: 'existing@example.com' });

    unregisters.push(
      registerFetchHandler('https://github.com', async (request) => {
        const url = new URL(request.url);
        if (url.pathname === '/login/oauth/access_token') {
          return new Response(JSON.stringify({ access_token: 'gh-token' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response('{}', { status: 404 });
      })
    );
    unregisters.push(
      registerFetchHandler('https://api.github.com', async (request) => {
        const url = new URL(request.url);
        if (url.pathname === '/user') {
          return new Response(
            JSON.stringify({ id: 100, email: existing.email, login: 'existing' }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        return new Response('{}', { status: 404 });
      })
    );

    const start = await app.request('/console/auth/oauth/github?redirect=/dashboard');
    const location = start.headers.get('Location');
    const url = new URL(location!);
    const state = url.searchParams.get('state');

    const callback = await app.request(`/console/auth/oauth/github/callback?code=code&state=${state}`);
    expect(callback.status).toBe(302);
    const callbackLocation = callback.headers.get('Location');
    expect(callbackLocation).toContain('/login?error=oauth_failed');
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, existing.id));
    expect(user).toBeDefined();
  });
});
