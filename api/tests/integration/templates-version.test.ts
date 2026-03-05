/**
 * Integration test for GET /console/templates/:id/versions/:versionId
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createApp } from '../../src/app';
import { createTestContext, createTestUser, createTestTemplate, getAuthHeaders, type TestContext } from '../setup';

describe('GET /console/templates/:id/versions/:versionId', () => {
  let ctx: TestContext;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    ctx = await createTestContext();
    app = createApp();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('returns template version detail for owner', async () => {
    const user = await createTestUser(ctx.db);
    const template = await createTestTemplate(ctx.db, user.id, {
      source: '#set page()\nHello',
    });

    const response = await app.request(`/console/templates/${template.id}/versions/${template.versionId}`, {
      method: 'GET',
      headers: getAuthHeaders(user, false),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.version).toBeDefined();
    expect(body.version.id).toBe(template.versionId);
    expect(body.version.source).toContain('Hello');
  });
});
