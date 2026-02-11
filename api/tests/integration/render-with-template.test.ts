/**
 * Integration tests for render with template data merging.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createApp } from '../../src/app';
import {
  createTestContext,
  createTestUser,
  createTestTemplate,
  createTestAsset,
  getAuthHeaders,
  type TestContext,
  type TestUser,
  type TestTemplate,
  sampleTemplates,
} from '../setup';

describe('POST /v1/render - Template Data', () => {
  let ctx: TestContext;
  let app: ReturnType<typeof createApp>;
  let user: TestUser;
  let template: TestTemplate;

  beforeEach(async () => {
    ctx = await createTestContext();
    app = createApp();
    user = await createTestUser(ctx.db);
    template = await createTestTemplate(ctx.db, user.id, {
      name: 'Template with Defaults',
      source: sampleTemplates.withVariables.source,
      defaults: sampleTemplates.withVariables.defaults,
    });
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('merges user data with template defaults', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {
          name: 'Custom Name',
          // title and message will use defaults
        },
      }),
    });

    expect(response.status).toBe(200);

    // Check that engine received the merged data
    const lastRequest = ctx.engine.getLastRequest();
    expect(lastRequest).toBeDefined();
    expect(lastRequest!.body!.data).toEqual({
      name: 'Custom Name',
    });
  });

  it('passes data to engine correctly', async () => {
    const userData = {
      name: 'John Doe',
      title: 'Custom Title',
      message: 'Custom message content',
    };

    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: userData,
      }),
    });

    expect(response.status).toBe(200);

    const lastRequest = ctx.engine.getLastRequest();
    expect(lastRequest).toBeDefined();
    expect(lastRequest!.body).toBeDefined();

    // Verify template structure
    expect(lastRequest!.body!.template).toBeDefined();
    expect(lastRequest!.body!.template.main).toBe('main.typ');
    expect(lastRequest!.body!.template.files['main.typ']).toBe(template.source);

    // Verify data passed through
    expect(lastRequest!.body!.data).toEqual(userData);

    // Verify options
    expect(lastRequest!.body!.options).toBeDefined();
    expect(lastRequest!.body!.options.timeout_ms).toBeGreaterThan(0);
  });

  it('passes additional template files to engine', async () => {
    const templateWithFiles = await createTestTemplate(ctx.db, user.id, {
      name: 'Template with Files',
      source: sampleTemplates.invoice.source,
      files: sampleTemplates.invoice.files,
      defaults: sampleTemplates.invoice.defaults,
    });

    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: templateWithFiles.id,
        data: {},
      }),
    });

    expect(response.status).toBe(200);

    const lastRequest = ctx.engine.getLastRequest();
    expect(lastRequest).toBeDefined();

    // Verify additional files are included
    expect(lastRequest!.body!.template.files['main.typ']).toBeDefined();
    expect(lastRequest!.body!.template.files['utils.typ']).toBeDefined();
    expect(lastRequest!.body!.template.files['utils.typ']).toBe(sampleTemplates.invoice.files!['utils.typ']);
  });

  it('includes user assets in engine payload', async () => {
    await createTestAsset(ctx.db, user.id, {
      name: 'logo.png',
      mimeType: 'image/png',
      sizeBytes: 2048,
      hash: 'sha256-logo',
    });

    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(200);

    const lastRequest = ctx.engine.getLastRequest();
    expect(lastRequest).toBeDefined();
    expect(lastRequest!.body!.assets).toBeDefined();
    expect(lastRequest!.body!.assets.length).toBe(1);
    expect(lastRequest!.body!.assets[0].name).toBe('logo.png');
    expect(lastRequest!.body!.assets[0].url).toContain('X-Amz');
  });

  it('handles empty data object', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(response.status).toBe(200);

    const lastRequest = ctx.engine.getLastRequest();
    expect(lastRequest!.body!.data).toEqual({});
  });

  it('handles missing data field', async () => {
    const response = await app.request('/v1/render', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
      }),
    });

    expect(response.status).toBe(200);

    const lastRequest = ctx.engine.getLastRequest();
    expect(lastRequest!.body!.data).toEqual({});
  });
});
