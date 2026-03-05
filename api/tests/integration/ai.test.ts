/**
 * Integration tests for AI endpoints with Gemini calls stubbed.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createApp } from '../../src/app';
import { initTestDb, getDb, resetDb } from '../../src/db/client';
import { setupTestEnv, createTestUser, getAuthHeaders } from '../setup';
import { setGeminiClient } from '../../src/services/ai';

describe('POST /v1/ai', () => {
  let app: ReturnType<typeof createApp>;
  let user: Awaited<ReturnType<typeof createTestUser>>;

  const stubGeminiModel = {
    generateContent: async () => ({
      response: {
        text: () => '```typst\n= AI Result\nHello\n```',
        usageMetadata: { totalTokenCount: 42 },
      },
    }),
  };

  const stubGeminiClient = {
    getGenerativeModel: () => stubGeminiModel,
  };

  beforeEach(async () => {
    setupTestEnv('http://127.0.0.1:3001');
    await initTestDb();
    setGeminiClient(stubGeminiClient as any);
    app = createApp();
    user = await createTestUser(getDb() as any);
  });

  afterEach(() => {
    setGeminiClient(null);
    resetDb();
  });

  it('edits code via AI', async () => {
    const response = await app.request('/console/ai/edit', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({
        prompt: 'Make it bold',
        current_code: '= Hello',
        asset_names: ['logo.png'],
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.code).toBe('= AI Result\nHello');
    expect(body.tokens_used).toBe(42);
  });

  it('generates code from image', async () => {
    const response = await app.request('/console/ai/generate', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({
        image_base64: 'Zm9vYmFy',
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.code).toBe('= AI Result\nHello');
    expect(body.tokens_used).toBe(42);
  });
});
