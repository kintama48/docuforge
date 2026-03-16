import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import {
  createTestContext,
  createTestTemplate,
  createTestUser,
  type TestContext,
  type TestUser,
} from '../setup';

function cookieAuthHeader(user: TestUser): Record<string, string> {
  return {
    Cookie: `${env.AUTH_COOKIE_NAME}=${encodeURIComponent(user.jwt)}`,
  };
}

describe('console vs consumer API split', () => {
  let ctx: TestContext;
  let app: ReturnType<typeof createApp>;
  let user: TestUser;

  beforeEach(async () => {
    ctx = await createTestContext();
    app = createApp();
    user = await createTestUser(ctx.db);
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('rejects bearer-only auth on console routes and accepts cookie auth', async () => {
    await createTestTemplate(ctx.db, user.id, { name: 'Cookie Template' });

    const bearerOnlyTemplates = await app.request('/console/templates?include_official=false', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.jwt}`,
      },
    });
    expect(bearerOnlyTemplates.status).toBe(401);

    const cookieTemplates = await app.request('/console/templates?include_official=false', {
      method: 'GET',
      headers: cookieAuthHeader(user),
    });
    expect(cookieTemplates.status).toBe(200);

    const bearerOnlyUsage = await app.request('/console/usage', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user.jwt}`,
      },
    });
    expect(bearerOnlyUsage.status).toBe(401);

    const cookieUsage = await app.request('/console/usage', {
      method: 'GET',
      headers: cookieAuthHeader(user),
    });
    expect(cookieUsage.status).toBe(200);
  });

  it('returns 404 for legacy dashboard paths under /v1', async () => {
    const legacyAuthLogin = await app.request('/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'legacy@example.com',
        password: 'legacy-password',
      }),
    });
    expect(legacyAuthLogin.status).toBe(404);

    const legacyTemplates = await app.request('/v1/templates', { method: 'GET' });
    expect(legacyTemplates.status).toBe(404);

    const legacyPreview = await app.request('/v1/render/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: '= legacy preview' }),
    });
    expect(legacyPreview.status).toBe(404);
  });

  it('keeps consumer render/public endpoints on /v1', async () => {
    const template = await createTestTemplate(ctx.db, user.id, { name: 'Consumer Render Template' });

    const renderResponse = await app.request('/v1/render', {
      method: 'POST',
      headers: {
        'X-API-Key': user.rawApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: template.id,
        data: { customer: 'Consumer' },
      }),
    });
    expect(renderResponse.status).toBe(200);

    const sessionResponse = await app.request('/v1/render/public/session', {
      method: 'POST',
      headers: {
        Origin: env.APP_URL,
      },
    });
    expect(sessionResponse.status).toBe(201);
  });

  it('does not hard-throttle console cookie traffic', async () => {
    await createTestTemplate(ctx.db, user.id, { name: 'Rate Limit Template' });
    const headers = cookieAuthHeader(user);

    for (let i = 0; i < 140; i += 1) {
      const response = await app.request('/console/templates?include_official=false', {
        method: 'GET',
        headers,
      });
      expect(response.status).toBe(200);
    }
  });
});
