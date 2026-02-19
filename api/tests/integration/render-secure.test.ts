/**
 * Integration tests for POST /v1/render/secure endpoint.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createApp } from '../../src/app';
import {
  createTestContext,
  createTestUser,
  createTestTemplate,
  getAuthHeaders,
  type TestContext,
  type TestUser,
  type TestTemplate,
} from '../setup';

describe('POST /v1/render/secure', () => {
  let ctx: TestContext;
  let app: ReturnType<typeof createApp>;
  let user: TestUser;
  let template: TestTemplate;

  beforeEach(async () => {
    ctx = await createTestContext();
    app = createApp();
    user = await createTestUser(ctx.db);
    template = await createTestTemplate(ctx.db, user.id);
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('returns encrypted PDF bytes when X-Pdf-Password is provided', async () => {
    const response = await app.request('/v1/render/secure', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(user, true),
        'X-Pdf-Password': 'super-secret-password',
      },
      body: JSON.stringify({
        template_id: template.id,
        data: { name: 'Secure Test' },
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('X-Pdf-Encrypted')).toBe('aes256');
    expect(response.headers.get('X-Pdf-Protection-Mode')).toBe('server_ephemeral_legacy');
    expect(response.headers.get('X-Pdf-Protection-Legacy')).toBe('true');

    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('rejects request without X-Pdf-Password', async () => {
    const response = await app.request('/v1/render/secure', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.error).toBe('validation_error');
    expect(body.message).toContain('X-Pdf-Password');
  });

  it('rejects too-short passwords', async () => {
    const response = await app.request('/v1/render/secure', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(user, true),
        'X-Pdf-Password': 'short',
      },
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe('validation_error');
  });

  it('forwards encryption settings to engine payload', async () => {
    const response = await app.request('/v1/render/secure', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(user, true),
        'X-Pdf-Password': 'super-secret-password',
      },
      body: JSON.stringify({
        template_id: template.id,
        data: { invoice: 'INV-1001' },
      }),
    });

    expect(response.status).toBe(200);

    const lastRequest = ctx.engine.getLastRequest();
    expect(lastRequest).toBeDefined();
    expect(lastRequest!.body).toBeDefined();
    expect(lastRequest!.body!.options.encryption).toBeDefined();
    expect(lastRequest!.body!.options.encryption?.mode).toBe('aes256');
    expect(lastRequest!.body!.options.encryption?.permissions).toBe('print_only');
    expect(lastRequest!.body!.options.encryption?.user_password).toBe('super-secret-password');
    expect(lastRequest!.body!.options.cache?.cacheable).toBe(true);
    expect(lastRequest!.body!.options.cache?.template_fingerprint).toBeDefined();
  });
});
