/**
 * Integration test for GET /v1/templates/:id/versions/:versionId
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createApp } from '../../src/app';
import { createTestContext, createTestUser, createTestTemplate, type TestContext } from '../setup';

describe('GET /v1/templates/:id/versions/:versionId', () => {
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

    const response = await app.request(`/v1/templates/${template.id}/versions/${template.versionId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${user.jwt}` },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.version).toBeDefined();
    expect(body.version.id).toBe(template.versionId);
    expect(body.version.source).toContain('Hello');
  });
});
