/**
 * Integration tests that hit the real engine over HTTP.
 * Requires a running engine at ENGINE_URL (default: http://127.0.0.1:3001).
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { createApp } from '../../src/app';
import { initTestDb, getDb, resetDb } from '../../src/db/client';
import {
  setupTestEnv,
  createTestUser,
  createTestTemplate,
  getAuthHeaders,
  samplePreviewRequests,
} from '../setup';

function readEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, 'utf8');
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const envPath = path.resolve(import.meta.dir, '../../.env');
const envFromFile = readEnvFile(envPath);
const engineUrl =
  envFromFile.ENGINE_URL ||
  process.env.ENGINE_URL ||
  'http://127.0.0.1:3001';
const shouldRun = process.env.ENGINE_PIPELINE_TESTS === '1';
const describePipeline = shouldRun ? describe : describe.skip;

describePipeline('API -> Engine pipeline (real engine)', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    process.env.ENGINE_URL = engineUrl;
    setupTestEnv(engineUrl);
    try {
      const response = await fetch(`${engineUrl}/health`);
      if (!response.ok) {
        throw new Error(`Engine health check failed: ${response.status}`);
      }
    } catch (error) {
      throw new Error(
        `Engine is not reachable at ${engineUrl}. Start the engine before running this test.`
      );
    }
  });

  beforeEach(async () => {
    await initTestDb();
    app = createApp();
  });

  afterEach(() => {
    resetDb();
  });

  it('renders preview through the real engine', async () => {
    const db = getDb() as any;
    const user = await createTestUser(db);

    const response = await app.request('/v1/render/preview', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify(samplePreviewRequests.valid),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(100);
  });

  it('renders a template through the real engine', async () => {
    const db = getDb() as any;
    const user = await createTestUser(db);
    const template = await createTestTemplate(db, user.id, {
      source: '#set page(paper: "a4")\n= Engine Pipeline\nHello, world!',
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
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(100);
  });
});
