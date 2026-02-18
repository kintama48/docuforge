/**
 * E2E Test: Billing Flow
 *
 * Tests the billing upgrade journey:
 * 1. Register as free user
 * 2. Fill render_logs to simulate 500 renders (use fillRenderLogs helper)
 * 3. POST /v1/render -> Expect 402 Payment Required
 * 4. Simulate Paddle webhook (transaction.completed, plan=starter)
 * 5. Verify plan_tier updated to "starter"
 * 6. POST /v1/render -> Expect 200 (limit is now 10K)
 */
import { createHmac } from 'node:crypto';
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createApp } from '../../src/app';
import {
  createMockEngine,
  createTestServer,
  setupTestEnv,
  fillRenderLogs,
  type MockEngine,
} from '../setup';
import { resetDb, initTestDb, getDb, schema } from '../../src/db/client';
import { eq } from 'drizzle-orm';
import { reloadEnv, env } from '../../src/config/env';

describe('E2E: Billing Flow', () => {
  let db: ReturnType<typeof getDb>;
  let engine: MockEngine;
  let app: ReturnType<typeof createApp>;
  let baseUrl: string;
  let server: ReturnType<typeof createTestServer>;

  beforeAll(async () => {
    engine = createMockEngine();
    setupTestEnv(engine.url);
    process.env.BILLING_ENABLED = 'true';
    process.env.BILLING_PROVIDER = 'paddle';
    process.env.PADDLE_API_KEY = 'pdl_test';
    process.env.PADDLE_WEBHOOK_SECRET = 'pdl_whsec';
    process.env.PADDLE_PRICE_ID_STARTER = 'pri_start';
    process.env.PADDLE_PRICE_ID_PRO = 'pri_pro';
    reloadEnv();

    // Initialize the global database for tests
    await initTestDb();
    db = getDb();

    app = createApp();
    server = createTestServer(app);
    baseUrl = server.url;
  });

  afterAll(async () => {
    server.stop();
    await engine.stop();
    resetDb();
  });

  test('free user hits limit, upgrades via Paddle webhook, and can render again', async () => {
    // Step 1: Register as free user
    const registerResponse = await fetch(`${baseUrl}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'billing-test@example.com',
        password: 'securepassword123',
      }),
    });

    expect(registerResponse.status).toBe(201);
    const registerData = await registerResponse.json();

    const userId = registerData.user.id;
    const apiKey = registerData.api_key.raw_key;
    const jwt = registerData.token;

    expect(registerData.user.plan).toBe('free');

    // Create a template for rendering
    const createTemplateResponse = await fetch(`${baseUrl}/v1/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        name: 'Billing Test Template',
        source: '#set page(paper: "a4")\nBilling test document',
        commit_message: 'Initial',
      }),
    });

    expect(createTemplateResponse.status).toBe(201);
    const { template } = await createTemplateResponse.json();
    const templateId = template.id;

    // Step 2: Fill render logs to simulate 500 renders (at the free limit)
    await fillRenderLogs(db, userId, 500, 'success');

    // Verify usage is at limit
    const usageResponse = await fetch(`${baseUrl}/v1/usage`, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey },
    });

    expect(usageResponse.status).toBe(200);
    const usageData = await usageResponse.json();
    expect(usageData.renders.used).toBe(500);
    expect(usageData.renders.limit).toBe(500);
    expect(usageData.renders.remaining).toBe(0);

    // Step 3: Attempt to render - should fail with 402
    const blockedRenderResponse = await fetch(`${baseUrl}/v1/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        template_id: templateId,
        data: {},
      }),
    });

    expect(blockedRenderResponse.status).toBe(402);
    const blockedData = await blockedRenderResponse.json();

    expect(blockedData.error).toBe('limit_exceeded');
    expect(blockedData.message).toContain('Monthly render limit reached');
    expect(blockedData.usage).toBeDefined();
    expect(blockedData.usage.used).toBe(500);
    expect(blockedData.usage.limit).toBe(500);
    expect(blockedData.usage.plan).toBe('free');
    expect(blockedData.upgrade_url).toBe('https://www.docuforge.app/pricing');

    // Step 4: Simulate Paddle webhook for upgrade to starter
    const externalCustomerId = `cus_billing_${Date.now()}`;
    const webhookEvent = {
      event_type: 'transaction.completed',
      data: {
        customer_id: externalCustomerId,
        custom_data: {
          userId,
          plan: 'starter',
        },
      },
    };
    const webhookBody = JSON.stringify(webhookEvent);
    const ts = Math.floor(Date.now() / 1000).toString();
    const signatureHash = createHmac('sha256', env.PADDLE_WEBHOOK_SECRET || '')
      .update(`${ts}:${webhookBody}`)
      .digest('hex');
    const signature = `ts=${ts};h1=${signatureHash}`;

    const webhookResponse = await fetch(`${baseUrl}/v1/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'paddle-signature': signature,
      },
      body: webhookBody,
    });

    expect(webhookResponse.status).toBe(200);
    const webhookData = await webhookResponse.json();
    expect(webhookData.received).toBe(true);

    // Step 5: Verify plan_tier updated to "starter"
    const [updatedUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    expect(updatedUser.planTier).toBe('starter');
    expect(updatedUser.planRenders).toBe(10000);
    expect(updatedUser.billingCustomerId).toBe(externalCustomerId);

    // Verify usage endpoint reflects new limit
    const newUsageResponse = await fetch(`${baseUrl}/v1/usage`, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey },
    });

    const newUsageData = await newUsageResponse.json();
    expect(newUsageData.plan).toBe('starter');
    expect(newUsageData.renders.limit).toBe(10000);
    expect(newUsageData.renders.remaining).toBe(9500);

    // Step 6: Render should now succeed
    const successRenderResponse = await fetch(`${baseUrl}/v1/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        template_id: templateId,
        data: {},
      }),
    });

    expect(successRenderResponse.status).toBe(200);
    expect(successRenderResponse.headers.get('Content-Type')).toBe('application/pdf');

    // Verify PDF is valid
    const pdfBuffer = await successRenderResponse.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfBuffer);
    const pdfHeader = String.fromCharCode(pdfBytes[0], pdfBytes[1], pdfBytes[2], pdfBytes[3]);
    expect(pdfHeader).toBe('%PDF');
  });

  test('invalid webhook signature is rejected', async () => {
    const webhookBody = JSON.stringify({
      event_type: 'transaction.completed',
      data: {
        customer_id: 'cus_test',
        custom_data: {
          userId: 'usr_test',
          plan: 'starter',
        },
      },
    });

    // Send with invalid signature
    const webhookResponse = await fetch(`${baseUrl}/v1/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'paddle-signature': 'ts=123;h1=invalid_signature',
      },
      body: webhookBody,
    });

    expect(webhookResponse.status).toBe(422);
    const errorData = await webhookResponse.json();
    expect(errorData.error).toBe('validation_error');
  });

  test('webhook without signature is rejected', async () => {
    const webhookResponse = await fetch(`${baseUrl}/v1/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'transaction.completed',
        data: {
          customer_id: 'cus_test',
          custom_data: {
            userId: 'usr_test',
            plan: 'starter',
          },
        },
      }),
    });

    expect(webhookResponse.status).toBe(422);
  });

  test('usage endpoint shows correct remaining renders', async () => {
    // Register user
    const registerResponse = await fetch(`${baseUrl}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'usage-check@example.com',
        password: 'securepassword123',
      }),
    });

    const { user, api_key } = await registerResponse.json();

    // Add some renders
    await fillRenderLogs(db, user.id, 123, 'success');
    // Add some failed renders (should not count)
    await fillRenderLogs(db, user.id, 50, 'error');

    const usageResponse = await fetch(`${baseUrl}/v1/usage`, {
      method: 'GET',
      headers: { 'X-API-Key': api_key.raw_key },
    });

    const usageData = await usageResponse.json();
    expect(usageData.renders.used).toBe(123);
    expect(usageData.renders.remaining).toBe(377);
    expect(usageData.plan).toBe('free');
  });

  test('402 response includes period reset information', async () => {
    // Register user
    const registerResponse = await fetch(`${baseUrl}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'period-test@example.com',
        password: 'securepassword123',
      }),
    });

    const { user, api_key, token } = await registerResponse.json();

    // Create template
    const createTemplateResponse = await fetch(`${baseUrl}/v1/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: 'Period Test',
        source: '#set page(paper: "a4")\nTest',
        commit_message: 'Initial',
      }),
    });

    const { template } = await createTemplateResponse.json();

    // Max out renders
    await fillRenderLogs(db, user.id, 500, 'success');

    // Try to render
    const renderResponse = await fetch(`${baseUrl}/v1/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': api_key.raw_key,
      },
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(renderResponse.status).toBe(402);
    const data = await renderResponse.json();

    expect(data.usage.resets_at).toBeDefined();
    // resets_at should be a valid ISO date string
    const resetDate = new Date(data.usage.resets_at);
    expect(resetDate.getTime()).toBeGreaterThan(Date.now());
  });
});
