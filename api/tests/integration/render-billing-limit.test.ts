/**
 * Integration tests for render billing limits.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createApp } from '../../src/app';
import {
  createTestContext,
  createTestUser,
  createTestTemplate,
  fillRenderLogs,
  updateUserPlan,
  getAuthHeaders,
  type TestContext,
  type TestUser,
  type TestTemplate,
  planLimits,
  schema,
} from '../setup';

describe('POST /v1/render - Billing Limits', () => {
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

  it('allows render when under limit', async () => {
    // User starts with 0 renders, limit is 1000 on free.
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(200);
  });

  it('rejects render when at limit with 402', async () => {
    // Fill render logs to exactly the limit
    await fillRenderLogs(ctx.db, user.id, planLimits.free);

    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(402);

    const body = await response.json();
    expect(body.error).toBe('limit_exceeded');
    expect(body.message).toContain('Monthly render limit reached');
  });

  it('rejects render when over limit with 402', async () => {
    // Fill render logs beyond the limit
    await fillRenderLogs(ctx.db, user.id, planLimits.free + 10);

    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(402);

    const body = await response.json();
    expect(body.error).toBe('limit_exceeded');
  });

  it('upgrade increases limit and allows more renders', async () => {
    // Fill to free limit
    await fillRenderLogs(ctx.db, user.id, planLimits.free);

    // Try render - should fail
    const failedResponse = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });
    expect(failedResponse.status).toBe(402);

    // Upgrade to pro
    await updateUserPlan(ctx.db, user.id, 'pro', planLimits.pro);

    // Now render should succeed
    const successResponse = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });
    expect(successResponse.status).toBe(200);
  });

  it('usage resets monthly', async () => {
    // Create render logs from last month
    const lastMonth = new Date();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
    const lastMonthTime = lastMonth.getTime();

    // Fill with old logs (they should not count)
    for (let i = 0; i < planLimits.free; i++) {
      await ctx.db.insert(schema.renderLogs).values({
        id: `log_old_${i}_${Date.now()}`,
        userId: user.id,
        templateId: template.id,
        templateVersionId: template.versionId,
        status: 'success',
        durationMs: 50,
        errorMessage: null,
        createdAt: lastMonthTime - i * 1000,
      });
    }

    // Current month render should work (old renders don't count)
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(200);

    // Verify usage only counts current month
    const usageResponse = await app.request('/v1/usage', {
      method: 'GET',
      headers: getAuthHeaders(user, true),
    });
    const usage = await usageResponse.json();

    // Should only count the one render we just did
    expect(usage.renders.used).toBe(1);
  });

  it('error renders do not count against limit', async () => {
    // Fill with error renders
    await fillRenderLogs(ctx.db, user.id, planLimits.free, 'error');

    // Should still be able to render (errors don't count)
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(200);

    // Check usage - should only count the successful render
    const usageResponse = await app.request('/v1/usage', {
      method: 'GET',
      headers: getAuthHeaders(user, true),
    });
    const usage = await usageResponse.json();
    expect(usage.renders.used).toBe(1);
  });

  it('402 response includes upgrade URL', async () => {
    await fillRenderLogs(ctx.db, user.id, planLimits.free);

    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(402);

    const body = await response.json();
    expect(body.upgrade_url).toBeDefined();
    expect(body.upgrade_url).toContain('docuforge');
  });

  it('402 response includes usage details', async () => {
    await fillRenderLogs(ctx.db, user.id, planLimits.free);

    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(402);

    const body = await response.json();
    expect(body.usage).toBeDefined();
    expect(body.usage.used).toBe(planLimits.free);
    expect(body.usage.limit).toBe(planLimits.free);
    expect(body.usage.plan).toBe('free');
    expect(body.usage.resets_at).toBeDefined();
  });
});
