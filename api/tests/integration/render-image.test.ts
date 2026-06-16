import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createApp } from '../../src/app';
import {
  createTestContext,
  createTestTemplate,
  createTestUser,
  getAuthHeaders,
  type TestContext,
  type TestUser,
} from '../setup';

describe('POST /v1/render/image and /console/render/preview/image', () => {
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

  it('renders preview image with JWT auth', async () => {
    const response = await app.request('/console/render/preview/image', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({
        source: '= Hello image',
        data: { name: 'DocuForge' },
        format: 'png',
        dpi: 150,
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('X-Image-Archive')).toBe('false');
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(100);

    const engineRequest = ctx.engine.getLastRequest();
    expect(engineRequest?.body?.options.output).toBe('images');
    expect(engineRequest?.body?.options.image_format).toBe('png');
    expect(engineRequest?.body?.options.image_dpi).toBe(150);
  });

  it('renders template image with API key auth', async () => {
    const template = await createTestTemplate(ctx.db, user.id, {
      source: '= Render image from template',
    });

    const response = await app.request('/v1/render/image', {
      method: 'POST',
      headers: getAuthHeaders(user, true),
      body: JSON.stringify({
        template_id: template.id,
        format: 'jpeg',
        quality: 85,
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    expect(response.headers.get('X-Image-Archive')).toBe('false');
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(100);

    const engineRequest = ctx.engine.getLastRequest();
    expect(engineRequest?.body?.options.output).toBe('images');
    expect(engineRequest?.body?.options.image_format).toBe('jpg');
    expect(engineRequest?.body?.options.image_quality).toBe(85);
  });

  it('rejects out-of-range page numbers', async () => {
    const response = await app.request('/console/render/preview/image', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({
        source: '= Hello image',
        format: 'png',
        page_numbers: [999],
      }),
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe('validation_error');
  });
});
