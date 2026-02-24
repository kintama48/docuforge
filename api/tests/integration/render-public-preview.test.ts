/**
 * Integration tests for public preview session + render endpoints.
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { createApp } from '../../src/app';
import {
  createTestContext,
  samplePreviewRequests,
  type TestContext,
} from '../setup';

describe('POST /v1/render/public/*', () => {
  let ctx: TestContext;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    ctx = await createTestContext();
    app = createApp();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('creates a public preview session', async () => {
    const response = await app.request('/v1/render/public/session', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        'CF-Connecting-IP': '203.0.113.7',
        'User-Agent': 'playground-test-agent',
      },
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.session_id).toContain('pps_');
    expect(body.expires_at).toBeDefined();
    expect(body.remaining_renders).toBeGreaterThan(0);
    expect(body.watermark).toContain('PUBLIC PREVIEW');
  });

  it('rejects public preview without session header', async () => {
    const response = await app.request('/v1/render/public/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(samplePreviewRequests.valid),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('unauthorized');
  });

  it('renders a public preview PDF with backend watermark enabled', async () => {
    const sessionResponse = await app.request('/v1/render/public/session', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        'CF-Connecting-IP': '203.0.113.7',
        'User-Agent': 'playground-test-agent',
      },
    });
    expect(sessionResponse.status).toBe(201);
    const sessionPayload = await sessionResponse.json();

    const response = await app.request('/v1/render/public/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173',
        'CF-Connecting-IP': '203.0.113.7',
        'User-Agent': 'playground-test-agent',
        'X-Preview-Session': sessionPayload.session_id,
      },
      body: JSON.stringify(samplePreviewRequests.valid),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('X-Public-Preview')).toBe('true');
    expect(response.headers.get('X-Pdf-Watermarked')).toBe('true');
    expect(response.headers.get('X-Preview-Watermark-Label')).toContain('PUBLIC PREVIEW');

    const lastRequest = ctx.engine.getLastRequest();
    expect(lastRequest).toBeDefined();
    expect(lastRequest?.body?.assets).toEqual([]);
    expect(lastRequest?.body?.template?.files?.['main.typ']).toContain('DOCUFORGE PUBLIC PREVIEW');
  });

  it('rejects session fingerprint mismatches', async () => {
    const sessionResponse = await app.request('/v1/render/public/session', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        'CF-Connecting-IP': '203.0.113.7',
        'User-Agent': 'playground-test-agent',
      },
    });
    const sessionPayload = await sessionResponse.json();

    const response = await app.request('/v1/render/public/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173',
        'CF-Connecting-IP': '203.0.113.8',
        'User-Agent': 'playground-test-agent',
        'X-Preview-Session': sessionPayload.session_id,
      },
      body: JSON.stringify(samplePreviewRequests.valid),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('forbidden');
  });

  it('accepts low_code_spec in public preview mode', async () => {
    const sessionResponse = await app.request('/v1/render/public/session', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
        'CF-Connecting-IP': '203.0.113.7',
        'User-Agent': 'playground-test-agent',
      },
    });
    const sessionPayload = await sessionResponse.json();

    const response = await app.request('/v1/render/public/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost:5173',
        'CF-Connecting-IP': '203.0.113.7',
        'User-Agent': 'playground-test-agent',
        'X-Preview-Session': sessionPayload.session_id,
      },
      body: JSON.stringify(samplePreviewRequests.lowCode),
    });

    expect(response.status).toBe(200);
    const lastRequest = ctx.engine.getLastRequest();
    expect(lastRequest).toBeDefined();
    expect(lastRequest?.body?.template?.files?.['main.typ']).toContain('DOCUFORGE PUBLIC PREVIEW');
    expect(lastRequest?.body?.template?.files?.['main.typ']).toContain('sys.inputs');
  });
});
