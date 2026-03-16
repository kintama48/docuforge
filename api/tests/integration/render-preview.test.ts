/**
 * Integration tests for POST /console/render/preview endpoint.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { eq, and, gte } from 'drizzle-orm';
import { createApp } from '../../src/app';
import {
  createTestContext,
  createTestUser,
  getAuthHeaders,
  type TestContext,
  type TestUser,
  schema,
  samplePreviewRequests,
} from '../setup';

describe('POST /console/render/preview', () => {
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

  it('renders from raw source and returns 200 with PDF bytes', async () => {
    const response = await app.request('/console/render/preview', {
      method: 'POST',
      headers: getAuthHeaders(user, false), // JWT auth
      body: JSON.stringify(samplePreviewRequests.valid),
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

    // Check content type
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
  });

  it('requires JWT auth, rejects API key with 401', async () => {
    const response = await app.request('/console/render/preview', {
      method: 'POST',
      headers: getAuthHeaders(user, true), // API key auth
      body: JSON.stringify(samplePreviewRequests.valid),
    });

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('unauthorized');
  });

  it('does not count preview renders against credits', async () => {
    // Get initial count of successful renders this month
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const initialLogs = await ctx.db
      .select()
      .from(schema.renderLogs)
      .where(
        and(
          eq(schema.renderLogs.userId, user.id),
          eq(schema.renderLogs.status, 'success'),
          gte(schema.renderLogs.createdAt, startOfMonth.getTime())
        )
      );
    const initialCount = initialLogs.length;

    // Render a preview
    const response = await app.request('/console/render/preview', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify(samplePreviewRequests.valid),
    });

    expect(response.status).toBe(200);

    // Check that preview was logged but with null template_id
    const allLogs = await ctx.db
      .select()
      .from(schema.renderLogs)
      .where(eq(schema.renderLogs.userId, user.id));

    // Should have one more log
    expect(allLogs.length).toBe(initialCount + 1);

    // The preview log should have null template_id
    const previewLog = allLogs.find((log) => log.templateId === null);
    expect(previewLog).toBeDefined();

    // Check usage endpoint - previews don't count against production limit
    const usageResponse = await app.request('/console/usage', {
      method: 'GET',
      headers: getAuthHeaders(user, false),
    });
    const usage = await usageResponse.json();

    // Usage should only count logs with template_id (production renders)
    // Since we only did a preview, production count should still be 0
    expect(usage.renders.used).toBe(0);
  });

  it('rejects source over 100KB with 422', async () => {
    const response = await app.request('/console/render/preview', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify(samplePreviewRequests.oversized),
    });

    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.error).toBe('validation_error');
  });

  it('works with additional files parameter', async () => {
    const response = await app.request('/console/render/preview', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify(samplePreviewRequests.withFiles),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
  });

  it('renders preview from low_code_spec', async () => {
    const response = await app.request('/console/render/preview', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify(samplePreviewRequests.lowCode),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');

    const lastRequest = ctx.engine.getLastRequest();
    expect(lastRequest).toBeDefined();
    expect(lastRequest!.body?.template?.files?.['main.typ']).toContain('sys.inputs');
    expect(lastRequest!.body?.template?.files?.['main.typ']).toContain(
      'data.at("invoice", default: (:)).at("title", default: "Untitled")'
    );
  });

  it('works with data parameter', async () => {
    const response = await app.request('/console/render/preview', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify(samplePreviewRequests.withData),
    });

    expect(response.status).toBe(200);

    // Verify engine received the data
    const lastRequest = ctx.engine.getLastRequest();
    expect(lastRequest).toBeDefined();
    expect(lastRequest!.body!.data).toEqual({ name: 'World' });
  });
});
