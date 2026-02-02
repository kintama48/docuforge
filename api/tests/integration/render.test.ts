/**
 * Integration tests for POST /v1/render endpoint.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { eq } from 'drizzle-orm';
import { createApp } from '../../src/app';
import {
  createTestContext,
  createTestUser,
  createTestTemplate,
  createTestApiKey,
  revokeApiKey,
  getAuthHeaders,
  type TestContext,
  type TestUser,
  type TestTemplate,
  schema,
  MINIMAL_PDF,
} from '../setup';

describe('POST /v1/render', () => {
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

  it('renders PDF with valid template and returns 200 with PDF bytes', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: { name: 'Test' },
      }),
    });

    expect(response.status).toBe(200);

    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);

    // Check PDF header
    const bytes = new Uint8Array(buffer);
    expect(bytes[0]).toBe(0x25); // %
    expect(bytes[1]).toBe(0x50); // P
    expect(bytes[2]).toBe(0x44); // D
    expect(bytes[3]).toBe(0x46); // F
  });

  it('response has correct content type', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
  });

  it('response has X-Render-Duration header', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(200);
    const duration = response.headers.get('X-Render-Duration');
    expect(duration).toBeDefined();
    expect(parseInt(duration!, 10)).toBeGreaterThanOrEqual(0);
  });

  it('rejects request without API key with 401', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('unauthorized');
  });

  it('rejects request with revoked key with 401', async () => {
    // Revoke the key
    await revokeApiKey(ctx.db, user.apiKeyId);

    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('unauthorized');
  });

  it('rejects request with invalid key with 401', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: {
        'X-API-Key': 'docu_live_invalid_key_12345678901234567890',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('unauthorized');
  });

  it('returns 404 for missing template', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: 'tpl_nonexistent12345',
        data: {},
      }),
    });

    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe('not_found');
  });

  it('returns 404 for other user template (access denied as 404)', async () => {
    // Create another user and their template
    const otherUser = await createTestUser(ctx.db, { email: 'other@example.com' });
    const otherTemplate = await createTestTemplate(ctx.db, otherUser.id, { name: 'Other Template' });

    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: otherTemplate.id,
        data: {},
      }),
    });

    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe('not_found');
  });

  it('forwards engine compilation errors as 400', async () => {
    ctx.engine.configure({
      forceError: 'compilation',
      errorMessage: 'Unknown identifier: invalidfunc',
    });

    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('compilation_failed');
    expect(body.message).toContain('invalidfunc');
  });

  it('returns 503 when engine is down', async () => {
    ctx.engine.configure({ forceError: 'unavailable' });

    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.error).toBe('engine_unavailable');
  });

  it('logs successful render to render_logs', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(200);

    // Check render log was created
    const logs = await ctx.db
      .select()
      .from(schema.renderLogs)
      .where(eq(schema.renderLogs.userId, user.id));

    expect(logs.length).toBe(1);
    expect(logs[0].status).toBe('success');
    expect(logs[0].templateId).toBe(template.id);
  });

  it('logs failed render to render_logs', async () => {
    ctx.engine.configure({ forceError: 'compilation', errorMessage: 'Syntax error' });

    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(400);

    // Check render log was created with error status
    const logs = await ctx.db
      .select()
      .from(schema.renderLogs)
      .where(eq(schema.renderLogs.userId, user.id));

    expect(logs.length).toBe(1);
    expect(logs[0].status).toBe('error');
    expect(logs[0].errorMessage).toBeDefined();
  });

  it('updates key last_used_at timestamp', async () => {
    const beforeTime = Date.now();

    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(200);

    // Give async update time to complete
    await Bun.sleep(100);

    const [key] = await ctx.db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.id, user.apiKeyId));

    expect(key.lastUsedAt).toBeDefined();
    expect(key.lastUsedAt!).toBeGreaterThanOrEqual(beforeTime);
  });
});
