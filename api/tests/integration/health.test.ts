/**
 * Integration tests for GET /health endpoint.
 */
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createApp } from '../../src/app';
import { createMockEngine, setupTestEnv, type MockEngine } from '../setup';

describe('GET /health', () => {
  let app: ReturnType<typeof createApp>;
  let engine: MockEngine;

  beforeAll(() => {
    engine = createMockEngine();
    setupTestEnv(engine.url);
    app = createApp();
  });

  afterAll(async () => {
    await engine.stop();
  });

  it('returns 200 with status ok when engine is healthy', async () => {
    engine.reset();

    const response = await app.request('/health');
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.engine).toBe('healthy');
    expect(body.version).toBe('1.0.0');
    expect(typeof body.uptime).toBe('number');
  });

  it('reports engine status as unhealthy when engine returns error', async () => {
    engine.configure({ forceError: 'unavailable' });

    const response = await app.request('/health');
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('degraded');
    expect(body.engine).toBe('unhealthy');
  });

  it('sets hardened security headers on responses', async () => {
    const response = await app.request('/health', {
      headers: { Origin: 'http://localhost:5173' },
    });

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(response.headers.get('Permissions-Policy')).toContain('camera=()');
    expect(response.headers.get('Vary')).toContain('Accept-Encoding');
    expect(response.headers.get('Vary')).toContain('Origin');
  });
});
