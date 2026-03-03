/**
 * E2E Test: Full Render Flow
 *
 * Tests the complete render journey:
 * 1. POST /v1/auth/register -> Get API key
 * 2. POST /v1/templates -> Create "My Invoice" template
 * 3. POST /v1/render with template_id + data -> Get PDF
 * 4. Verify PDF bytes are valid (check for %PDF header)
 * 5. GET /v1/usage -> Verify 1 render counted
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createApp } from '../../src/app';
import {
  createMockEngine,
  createTestServer,
  setupTestEnv,
  type MockEngine,
} from '../setup';
import { resetDb } from '../../src/db/client';
import { unlinkSync } from 'fs';

// Use a file-based database for E2E tests so app and test share same DB
const TEST_DB_PATH = `/tmp/docuforge-e2e-render-${Date.now()}.db`;

describe('E2E: Full Render Flow', () => {
  let engine: MockEngine;
  let app: ReturnType<typeof createApp>;
  let baseUrl: string;
  let server: ReturnType<typeof createTestServer>;

  beforeAll(async () => {
    // Set up mock engine
    engine = createMockEngine();

    // Set up test environment with file-based database
    setupTestEnv(engine.url);
    process.env.DATABASE_URL = `file:${TEST_DB_PATH}`;

    // Run migrations on the test database
    const { Database } = await import('bun:sqlite');
    const sqlite = new Database(TEST_DB_PATH);
    sqlite.exec('PRAGMA foreign_keys = ON;');
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        email_canonical TEXT UNIQUE NOT NULL,
        email_verified_at INTEGER,
        password_hash TEXT NOT NULL,
        stripe_customer_id TEXT,
        signup_fingerprint_hash TEXT,
        signup_ip_hash TEXT,
        plan_tier TEXT NOT NULL DEFAULT 'free',
        plan_renders INTEGER NOT NULL DEFAULT 1000,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_email_canonical ON users(email_canonical);
      CREATE INDEX IF NOT EXISTS idx_users_signup_fp_created ON users(signup_fingerprint_hash, created_at);
      CREATE INDEX IF NOT EXISTS idx_users_signup_ip_created ON users(signup_ip_hash, created_at);
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key_hash TEXT UNIQUE NOT NULL,
        key_prefix TEXT NOT NULL,
        name TEXT NOT NULL,
        last_used_at INTEGER,
        created_at INTEGER NOT NULL,
        is_revoked INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        live_version_id TEXT,
        is_public INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS template_versions (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        source TEXT NOT NULL,
        files TEXT,
        defaults TEXT,
        low_code_spec TEXT,
        commit_message TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        r2_key TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS render_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        template_id TEXT,
        template_version_id TEXT,
        status TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        error_message TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS auth_otp_challenges (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        purpose TEXT NOT NULL,
        email TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        resend_available_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 5,
        sent_count INTEGER NOT NULL DEFAULT 1,
        consumed_at INTEGER,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_auth_otp_user_purpose ON auth_otp_challenges(user_id, purpose);
      CREATE INDEX IF NOT EXISTS idx_auth_otp_active ON auth_otp_challenges(purpose, consumed_at, expires_at);
      CREATE TABLE IF NOT EXISTS user_pins (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        fingerprint_hash TEXT NOT NULL,
        ip_hash TEXT,
        first_seen_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_pins_user_fingerprint ON user_pins(user_id, fingerprint_hash);
      CREATE INDEX IF NOT EXISTS idx_user_pins_fingerprint ON user_pins(fingerprint_hash, last_seen_at);
      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        events TEXT NOT NULL,
        secret TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id TEXT PRIMARY KEY,
        webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
        event TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_attempt_at INTEGER,
        next_retry_at INTEGER,
        response_code INTEGER,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status, next_retry_at);
    `);
    sqlite.close();

    // Reset the database singleton to use the new file-based database
    resetDb();

    // Create app and start server
    app = createApp();
    server = createTestServer(app);
    baseUrl = server.url;
  });

  afterAll(async () => {
    server.stop();
    await engine.stop();
    try {
      unlinkSync(TEST_DB_PATH);
    } catch {
      // Ignore cleanup errors
    }
  });

  test('complete render journey from registration to PDF output', async () => {
    // Step 1: Register a new user
    const registerResponse = await fetch(`${baseUrl}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const createTemplateResponse = await fetch(`${baseUrl}/v1/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
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
    const usageResponse = await fetch(`${baseUrl}/v1/usage`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
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
    const registerResponse = await fetch(`${baseUrl}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'e2e-multi-render@example.com',
        password: 'securepassword123',
      }),
    });

    expect(registerResponse.status).toBe(201);
    const { api_key, token } = await registerResponse.json();

    // Create template
    const createTemplateResponse = await fetch(`${baseUrl}/v1/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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
    const usageResponse = await fetch(`${baseUrl}/v1/usage`, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey },
    });

    const usageData = await usageResponse.json();
    expect(usageData.renders.used).toBe(3);
    expect(usageData.renders.remaining).toBe(997);
  });

  test('render fails without valid API key', async () => {
    // Register to get a template
    const registerResponse = await fetch(`${baseUrl}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'e2e-nokey@example.com',
        password: 'securepassword123',
      }),
    });

    const { token } = await registerResponse.json();

    // Create template
    const createTemplateResponse = await fetch(`${baseUrl}/v1/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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
    const registerResponse = await fetch(`${baseUrl}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
