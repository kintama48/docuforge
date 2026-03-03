/**
 * Unit tests for OAuth helper utilities.
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { registerFetchHandler } from '../helpers/fetch-router';

const originalEnv = { ...process.env };
let unregisters: Array<() => void> = [];

let oauth: typeof import('../../src/services/oauth');

beforeEach(async () => {
  process.env.API_URL = 'http://localhost:3000';
  process.env.OAUTH_GOOGLE_CLIENT_ID = 'google-client';
  process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'google-secret';
  process.env.OAUTH_MICROSOFT_CLIENT_ID = 'ms-client';
  process.env.OAUTH_MICROSOFT_CLIENT_SECRET = 'ms-secret';
  process.env.OAUTH_GITHUB_CLIENT_ID = 'gh-client';
  process.env.OAUTH_GITHUB_CLIENT_SECRET = 'gh-secret';
  const { reloadEnv } = await import('../../src/config/env');
  reloadEnv();
  oauth = await import('../../src/services/oauth');
});

afterEach(() => {
  for (const unregister of unregisters) {
    unregister();
  }
  unregisters = [];
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, originalEnv);
});

describe('oauth', () => {
  test('sanitizeRedirectPath rejects unsafe redirects', () => {
    expect(oauth.sanitizeRedirectPath('/dashboard?tab=usage')).toBe('/dashboard?tab=usage');
    expect(oauth.sanitizeRedirectPath('https://evil.example')).toBeNull();
    expect(oauth.sanitizeRedirectPath('//evil.example')).toBeNull();
    expect(oauth.sanitizeRedirectPath('javascript:alert(1)')).toBeNull();
  });

  test('createOAuthState and consumeOAuthState', () => {
    const state = oauth.createOAuthState('google', '/dashboard');
    const record = oauth.consumeOAuthState(state);
    expect(record?.provider).toBe('google');
    expect(record?.redirect).toBe('/dashboard');

    const missing = oauth.consumeOAuthState(state);
    expect(missing).toBeNull();
  });

  test('createOAuthState drops unsafe redirect targets', () => {
    const state = oauth.createOAuthState('google', 'https://evil.example');
    const record = oauth.consumeOAuthState(state);
    expect(record?.provider).toBe('google');
    expect(record?.redirect).toBeNull();
  });

  test('consumeOAuthState expires old state', () => {
    const realNow = Date.now;
    const base = Date.now();
    Date.now = () => base;
    const state = oauth.createOAuthState('github', null);
    Date.now = () => base + 11 * 60 * 1000;
    const record = oauth.consumeOAuthState(state);
    expect(record).toBeNull();
    Date.now = realNow;
  });

  test('createOAuthState evicts oldest entries when state store is full', () => {
    const first = oauth.createOAuthState('google', '/first');

    for (let i = 0; i < 2100; i++) {
      oauth.createOAuthState('google', `/next-${i}`);
    }

    const evicted = oauth.consumeOAuthState(first);
    expect(evicted).toBeNull();
  });

  test('buildAuthUrl includes provider parameters', () => {
    const state = oauth.createOAuthState('google');
    const url = oauth.buildAuthUrl('google', state);
    expect(url).toContain('accounts.google.com');
    expect(url).toContain('client_id=google-client');
    expect(url).toContain('prompt=consent');

    const msUrl = oauth.buildAuthUrl('microsoft', 'state');
    expect(msUrl).toContain('login.microsoftonline.com');
    expect(msUrl).toContain('response_mode=query');
  });

  test('exchangeOAuthCode for github', async () => {
    unregisters.push(
      registerFetchHandler('https://github.com', async () =>
        new Response(JSON.stringify({ access_token: 'gh-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    const token = await oauth.exchangeOAuthCode('github', 'code');
    expect(token).toBe('gh-token');
  });

  test('exchangeOAuthCode for google', async () => {
    unregisters.push(
      registerFetchHandler('https://oauth2.googleapis.com', async () =>
        new Response(JSON.stringify({ access_token: 'google-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    const token = await oauth.exchangeOAuthCode('google', 'code');
    expect(token).toBe('google-token');
  });

  test('fetchOAuthProfile for github reads primary email', async () => {
    let call = 0;
    unregisters.push(
      registerFetchHandler('https://api.github.com', async (input) => {
        call += 1;
        const url = new URL(input.url);
        if (url.pathname === '/user' && call === 1) {
          return new Response(JSON.stringify({ id: 1, email: null, login: 'test' }), {
            status: 200,
          });
        }
        return new Response(
          JSON.stringify([
            { email: 'primary@example.com', primary: true, verified: true },
          ]),
          { status: 200 }
        );
      })
    );

    const profile = await oauth.fetchOAuthProfile('github', 'token');
    expect(profile.email).toBe('primary@example.com');
  });

  test('fetchOAuthProfile for google requires email', async () => {
    unregisters.push(
      registerFetchHandler('https://openidconnect.googleapis.com', async () =>
        new Response(JSON.stringify({ sub: '123', email: 'user@example.com' }), {
          status: 200,
        })
      )
    );
    const profile = await oauth.fetchOAuthProfile('google', 'token');
    expect(profile.email).toBe('user@example.com');
  });

  test('fetchOAuthProfile for microsoft uses userPrincipalName', async () => {
    unregisters.push(
      registerFetchHandler('https://graph.microsoft.com', async () =>
        new Response(JSON.stringify({ id: 'abc', userPrincipalName: 'm@example.com' }), {
          status: 200,
        })
      )
    );
    const profile = await oauth.fetchOAuthProfile('microsoft', 'token');
    expect(profile.email).toBe('m@example.com');
  });
});
