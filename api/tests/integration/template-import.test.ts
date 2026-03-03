import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { eq } from 'drizzle-orm';
import { createApp } from '../../src/app';
import { setGeminiClient } from '../../src/services/ai';
import {
  createTestContext,
  createTestUser,
  getAuthHeaders,
  schema,
  type TestContext,
  type TestUser,
} from '../setup';
import { MINIMAL_PDF } from '../helpers/mock-engine';

describe('PDF import flow', () => {
  let ctx: TestContext;
  let app: ReturnType<typeof createApp>;
  let user: TestUser;

  const stubGeminiModel = {
    generateContent: async () => ({
      response: {
        text: () => '= Imported Draft\n\n#set text(size: 10pt)\nImported from PDF.',
        usageMetadata: { totalTokenCount: 123 },
      },
    }),
  };

  const stubGeminiClient = {
    getGenerativeModel: () => stubGeminiModel,
  };

  beforeEach(async () => {
    setGeminiClient(stubGeminiClient as any);
    ctx = await createTestContext();
    app = createApp();
    user = await createTestUser(ctx.db);
  });

  afterEach(async () => {
    setGeminiClient(null);
    await ctx.cleanup();
  });

  it('analyzes PDF, consumes AI credit, and creates template draft', async () => {
    const pdfBase64 = Buffer.from(MINIMAL_PDF).toString('base64');

    const analyzeResponse = await app.request('/v1/templates/import/pdf/analyze', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({
        file_name: 'legacy-invoice.pdf',
        pdf_base64: pdfBase64,
        user_prompt: 'Preserve invoice structure and totals section',
      }),
    });

    expect(analyzeResponse.status).toBe(200);
    const analyzeBody = await analyzeResponse.json();
    expect(analyzeBody.analysis.source).toContain('Imported Draft');
    expect(analyzeBody.analysis.ai_credit_charged).toBe(1);

    const usageLogs = await ctx.db
      .select()
      .from(schema.aiUsageLogs)
      .where(eq(schema.aiUsageLogs.userId, user.id));
    expect(usageLogs.length).toBe(1);
    expect(usageLogs[0]?.creditsUsed).toBe(1);

    const createResponse = await app.request('/v1/templates/import/pdf/create', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({
        name: 'Imported Invoice Draft',
        description: 'Imported from a customer PDF',
        source: analyzeBody.analysis.source,
      }),
    });

    expect(createResponse.status).toBe(201);
    const createBody = await createResponse.json();
    expect(createBody.template.name).toBe('Imported Invoice Draft');
    expect(createBody.template.live_version.source).toContain('Imported Draft');

    const usageResponse = await app.request('/v1/usage', {
      method: 'GET',
      headers: getAuthHeaders(user, false),
    });
    expect(usageResponse.status).toBe(200);
    const usageBody = await usageResponse.json();
    expect(usageBody.ai_credits.used).toBe(1);
  });
});

