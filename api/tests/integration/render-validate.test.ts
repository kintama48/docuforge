/**
 * Integration tests for POST /v1/render/validate (KAN-42).
 *
 * The endpoint returns:
 *   { status: 0 }                              on success (HTTP 200)
 *   { status: 1, trace: string, image_url }    on failure (HTTP 200)
 *
 * Always HTTP 200 — callers branch on the status field, not HTTP error codes.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createApp } from '../../src/app';
import {
  createTestContext,
  createTestTemplate,
  createTestUser,
  getAuthHeaders,
  type TestContext,
  type TestUser,
  type TestTemplate,
} from '../setup';

describe('POST /v1/render/validate', () => {
  let ctx: TestContext;
  let app: ReturnType<typeof createApp>;
  let user: TestUser;
  let template: TestTemplate;

  beforeEach(async () => {
    ctx = await createTestContext();
    app = createApp();
    user = await createTestUser(ctx.db);
    template = await createTestTemplate(ctx.db, user.id, {
      source: '#set page(paper: "a4")\n= Hello Validate',
    });
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  // ------------------------------------------------------------------ auth

  it('returns 401 when no auth header is provided', async () => {
    const response = await app.request('/v1/render/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: template.id }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('unauthorized');
  });

  // ------------------------------------------------------------------ validation (422)

  it('returns 422 when both template_id and typst_string are provided', async () => {
    const response = await app.request('/v1/render/validate', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        typst_string: '= Hello',
      }),
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe('validation_error');
  });

  it('returns 422 when neither template_id nor typst_string is provided', async () => {
    const response = await app.request('/v1/render/validate', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({ data: { foo: 'bar' } }),
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe('validation_error');
  });

  // ------------------------------------------------------------------ success paths (status: 0)

  it('returns { status: 0 } for a valid managed template (happy path)', async () => {
    const response = await app.request('/v1/render/validate', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: { name: 'Test' },
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe(0);
    // No PDF or extra fields on success
    expect(body.trace).toBeUndefined();
    expect(body.image_url).toBeUndefined();
  });

  it('returns { status: 0 } for a valid BYOT typst_string (happy path)', async () => {
    const response = await app.request('/v1/render/validate', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        typst_string: '#set page(paper: "a4")\n= BYOT Validate Test',
        data: {},
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe(0);
    expect(body.trace).toBeUndefined();
    expect(body.image_url).toBeUndefined();
  });

  // ------------------------------------------------------------------ failure path (status: 1)

  it('returns { status: 1, trace, image_url: null } on compilation failure', async () => {
    const errorMessage = 'Unknown identifier: nonexistent_func';
    ctx.engine.configure({
      forceError: 'compilation',
      errorMessage,
    });

    const response = await app.request('/v1/render/validate', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe(1);
    expect(typeof body.trace).toBe('string');
    expect(body.trace.length).toBeGreaterThan(0);
    expect(body.trace).toContain(errorMessage);
    // image_url is null for now (deferred to follow-up)
    expect(body.image_url).toBeNull();
  });

  it('truncates trace to at most 2KB + suffix on very long error messages', async () => {
    const longMessage = 'e'.repeat(5000);
    ctx.engine.configure({
      forceError: 'compilation',
      errorMessage: longMessage,
    });

    const response = await app.request('/v1/render/validate', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe(1);
    // 2048 bytes of content + '\n[trace truncated]' suffix
    expect(Buffer.byteLength(body.trace, 'utf8')).toBeLessThan(2048 + 50);
    expect(body.trace).toContain('[trace truncated]');
  });

  // ------------------------------------------------------------------ 404 edge cases

  it('returns 404 when template_id does not exist', async () => {
    const response = await app.request('/v1/render/validate', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({ template_id: 'tpl_nonexistent12345' }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('not_found');
  });

  it('returns 404 for another user\'s template', async () => {
    const otherUser = await createTestUser(ctx.db, { email: 'other-validate@example.com' });
    const otherTemplate = await createTestTemplate(ctx.db, otherUser.id, { name: 'Other Template' });

    const response = await app.request('/v1/render/validate', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({ template_id: otherTemplate.id }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('not_found');
  });
});
