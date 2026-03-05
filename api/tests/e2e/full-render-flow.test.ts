/**
 * E2E Test: Full Render Flow
 *
 * Tests the complete render journey:
 * 1. POST /console/auth/register -> Get API key
 * 2. POST /console/templates -> Create "My Invoice" template
 * 3. POST /v1/render with template_id + data -> Get PDF
 * 4. Verify PDF bytes are valid (check for %PDF header)
 * 5. GET /console/usage -> Verify 1 render counted
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import {
  createMockEngine,
  createTestServer,
  setupTestEnv,
  type MockEngine,
} from '../setup';
import { resetDb, initTestDb } from '../../src/db/client';

describe('E2E: Full Render Flow', () => {
  let engine: MockEngine;
  let app: ReturnType<typeof createApp>;
  let baseUrl: string;
  let server: ReturnType<typeof createTestServer>;

  function sessionCookie(token: string): string {
    return `${env.AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`;
  }

  function authMutationHeaders(seed: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Device-Id': `full-render-${seed}-${crypto.randomUUID()}`,
      'User-Agent': `full-render/${seed}`,
      'Accept-Language': 'en-US',
      'X-Forwarded-For': '198.51.100.51',
    };
  }

  beforeAll(async () => {
    engine = createMockEngine();
    setupTestEnv(engine.url);
    resetDb();
    await initTestDb();
    app = createApp();
    server = createTestServer(app);
    baseUrl = server.url;
  });

  afterAll(async () => {
    server.stop();
    await engine.stop();
    resetDb();
  });

  test('complete render journey from registration to PDF output', async () => {
    // Step 1: Register a new user
    const registerResponse = await fetch(`${baseUrl}/console/auth/register`, {
      method: 'POST',
      headers: authMutationHeaders('journey'),
      body: JSON.stringify({
        email: 'e2e-render@example.com',
        password: 'securepassword123',
      }),
    });

    expect(registerResponse.status).toBe(201);
    const registerData = await registerResponse.json();

    expect(registerData.user).toBeDefined();
    expect(registerData.user.email).toBe('e2e-render@example.com');
    expect(registerData.user.plan).toBe('free');
    expect(registerData.token).toBeDefined();
    expect(registerData.api_key).toBeDefined();
    expect(registerData.api_key.raw_key).toMatch(/^docu_live_/);

    const apiKey = registerData.api_key.raw_key;
    const jwt = registerData.token;

    // Step 2: Create a template (requires JWT auth)
    const createTemplateResponse = await fetch(`${baseUrl}/console/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie(jwt),
      },
      body: JSON.stringify({
        name: 'My Invoice',
        description: 'E2E test invoice template',
        source: `#set page(paper: "a4", margin: 2cm)
#set text(size: 11pt)

= Invoice

*Invoice ID:* #sys.inputs.invoice_id

*Customer:* #sys.inputs.customer

*Total:* $#sys.inputs.total
`,
        defaults: {
          invoice_id: 'INV-001',
          customer: 'Acme Corp',
          total: '99.99',
        },
        commit_message: 'Initial version',
      }),
    });

    expect(createTemplateResponse.status).toBe(201);
    const templateData = await createTemplateResponse.json();

    expect(templateData.template).toBeDefined();
    expect(templateData.template.id).toMatch(/^tpl_/);
    expect(templateData.template.name).toBe('My Invoice');
    expect(templateData.template.live_version).toBeDefined();
    expect(templateData.template.live_version.version_number).toBe(1);

    const templateId = templateData.template.id;

    // Step 3: Render a PDF using the template (requires API key auth)
    const renderResponse = await fetch(`${baseUrl}/v1/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        template_id: templateId,
        data: {
          invoice_id: 'INV-2024-001',
          customer: 'Test Customer Inc.',
          total: '199.99',
        },
      }),
    });

    expect(renderResponse.status).toBe(200);
    expect(renderResponse.headers.get('Content-Type')).toBe('application/pdf');
    expect(renderResponse.headers.get('X-Render-Duration')).toBeDefined();
    expect(renderResponse.headers.get('X-Render-Id')).toMatch(/^log_/);

    // Step 4: Verify PDF bytes are valid
    const pdfBuffer = await renderResponse.arrayBuffer();
    const pdfBytes = new Uint8Array(pdfBuffer);

    // PDF must start with %PDF
    const pdfHeader = String.fromCharCode(pdfBytes[0], pdfBytes[1], pdfBytes[2], pdfBytes[3]);
    expect(pdfHeader).toBe('%PDF');

    // Verify the engine received the correct payload
    const lastRequest = engine.getLastRequest();
    expect(lastRequest).toBeDefined();
    expect(lastRequest!.body!.data).toEqual({
      invoice_id: 'INV-2024-001',
      customer: 'Test Customer Inc.',
      total: '199.99',
    });
    expect(lastRequest!.body!.template.files['main.typ']).toContain('Invoice');

    // Step 5: Check usage - should show 1 render
    const usageResponse = await fetch(`${baseUrl}/console/usage`, {
      method: 'GET',
      headers: {
        Cookie: sessionCookie(jwt),
      },
    });

    expect(usageResponse.status).toBe(200);
    const usageData = await usageResponse.json();

    expect(usageData.plan).toBe('free');
    expect(usageData.renders).toBeDefined();
    expect(usageData.renders.used).toBe(1);
    expect(usageData.renders.limit).toBe(1000);
    expect(usageData.renders.remaining).toBe(999);
    expect(usageData.period).toBeDefined();
    expect(usageData.period.start).toBeDefined();
    expect(usageData.period.end).toBeDefined();
  });

  test('render with same template multiple times updates usage correctly', async () => {
    // Register a new user
    const registerResponse = await fetch(`${baseUrl}/console/auth/register`, {
      method: 'POST',
      headers: authMutationHeaders('multi'),
      body: JSON.stringify({
        email: 'e2e-multi-render@example.com',
        password: 'securepassword123',
      }),
    });

    expect(registerResponse.status).toBe(201);
    const { api_key, token } = await registerResponse.json();

    // Create template
    const createTemplateResponse = await fetch(`${baseUrl}/console/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie(token),
      },
      body: JSON.stringify({
        name: 'Simple Template',
        source: '#set page(paper: "a4")\nHello, #sys.inputs.name!',
        commit_message: 'Initial',
      }),
    });

    const { template } = await createTemplateResponse.json();
    const templateId = template.id;
    const apiKey = api_key.raw_key;

    // Render 3 times
    for (let i = 1; i <= 3; i++) {
      const renderResponse = await fetch(`${baseUrl}/v1/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          template_id: templateId,
          data: { name: `User ${i}` },
        }),
      });

      expect(renderResponse.status).toBe(200);
    }

    // Check usage shows 3 renders
    const usageResponse = await fetch(`${baseUrl}/console/usage`, {
      method: 'GET',
      headers: { Cookie: sessionCookie(token) },
    });

    const usageData = await usageResponse.json();
    expect(usageData.renders.used).toBe(3);
    expect(usageData.renders.remaining).toBe(997);
  });

  test('render fails without valid API key', async () => {
    // Register to get a template
    const registerResponse = await fetch(`${baseUrl}/console/auth/register`, {
      method: 'POST',
      headers: authMutationHeaders('no-key'),
      body: JSON.stringify({
        email: 'e2e-nokey@example.com',
        password: 'securepassword123',
      }),
    });

    const { token } = await registerResponse.json();

    // Create template
    const createTemplateResponse = await fetch(`${baseUrl}/console/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie(token),
      },
      body: JSON.stringify({
        name: 'Test Template',
        source: '#set page(paper: "a4")\nHello',
        commit_message: 'Initial',
      }),
    });

    const { template } = await createTemplateResponse.json();

    // Try to render without API key
    const renderResponse = await fetch(`${baseUrl}/v1/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: template.id,
        data: {},
      }),
    });

    expect(renderResponse.status).toBe(401);
  });

  test('render fails for non-existent template', async () => {
    const registerResponse = await fetch(`${baseUrl}/console/auth/register`, {
      method: 'POST',
      headers: authMutationHeaders('missing-template'),
      body: JSON.stringify({
        email: 'e2e-notemplate@example.com',
        password: 'securepassword123',
      }),
    });

    const { api_key } = await registerResponse.json();

    const renderResponse = await fetch(`${baseUrl}/v1/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': api_key.raw_key,
      },
      body: JSON.stringify({
        template_id: 'tpl_nonexistent',
        data: {},
      }),
    });

    expect(renderResponse.status).toBe(404);
    const errorData = await renderResponse.json();
    expect(errorData.error).toBe('not_found');
  });
});
