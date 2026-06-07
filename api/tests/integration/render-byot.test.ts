/**
 * Integration tests for BYOT (Bring Your Own Template) on POST /v1/render.
 * KAN-41: typst_string raw injection alongside template_id+data.
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
  MINIMAL_PDF,
} from '../setup';

describe('POST /v1/render — BYOT mode (KAN-41)', () => {
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

  // ---------------------------------------------------------------------------
  // Regression: managed mode still works
  // ---------------------------------------------------------------------------
  it('managed mode (template_id) still returns 200 with PDF bytes', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: { name: 'Test' },
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('X-Render-Mode')).toBe('managed');

    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
    const bytes = new Uint8Array(buffer);
    expect(bytes[0]).toBe(0x25); // %PDF
  });

  // ---------------------------------------------------------------------------
  // BYOT happy path
  // ---------------------------------------------------------------------------
  it('BYOT mode (typst_string) returns 200 with PDF bytes', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        typst_string: '#set page(paper: "a4")\nHello, BYOT!',
        data: {},
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('X-Render-Mode')).toBe('byot');

    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
    const bytes = new Uint8Array(buffer);
    expect(bytes[0]).toBe(0x25); // %PDF
  });

  it('BYOT mode without data field succeeds (data defaults to {})', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        typst_string: 'Hello',
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Render-Mode')).toBe('byot');
  });

  it('BYOT mode responds with correct headers', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        typst_string: '#set page(paper: "a4")\nHello',
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Render-Duration')).not.toBeNull();
    expect(response.headers.get('X-Render-Id')).not.toBeNull();
    expect(response.headers.get('X-Pdf-Protection-Mode')).toBe('none');
    expect(response.headers.get('X-Render-Mode')).toBe('byot');
  });

  it('BYOT mode forwards engine compilation errors as 400', async () => {
    ctx.engine.configure({
      forceError: 'compilation',
      errorMessage: 'Unknown identifier: badident',
    });

    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        typst_string: '#let x = badident()',
      }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('compilation_failed');
  });

  // ---------------------------------------------------------------------------
  // Validator enforcement (XOR + oversized)
  // ---------------------------------------------------------------------------
  it('both template_id and typst_string → 422', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        typst_string: 'Hello',
      }),
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe('validation_error');
  });

  it('neither template_id nor typst_string → 422', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({ data: { key: 'val' } }),
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe('validation_error');
  });

  it('oversized typst_string (> 1 MB) → 422', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        typst_string: 'x'.repeat(1_048_577),
      }),
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe('validation_error');
  });

  // ---------------------------------------------------------------------------
  // Auth: BYOT path respects the same X-API-Key auth as managed
  // ---------------------------------------------------------------------------
  it('BYOT request without API key → 401', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        typst_string: 'Hello',
      }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('unauthorized');
  });
});
