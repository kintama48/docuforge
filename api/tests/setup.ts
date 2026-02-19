/**
 * Main test setup for DocuForge API tests.
 *
 * Provides:
 * - In-memory SQLite database with full schema
 * - Mock engine server
 * - Hono app instance configured for testing
 * - Factory functions for test data
 * - Helper functions for authenticated requests
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Database } from 'bun:sqlite';
import { eq } from 'drizzle-orm';

import { createTestDatabase, closeTestDatabase, type TestDb, schema } from './helpers/db';
import { createMockEngine, type MockEngine, type MockEngineConfig } from './helpers/mock-engine';
import { createTestJwt, TEST_JWT_SECRET } from './helpers/auth';
import { generateUserId, generateApiKeyId, generateTemplateId, generateVersionId, generateAssetId, generateLogId } from '../src/lib/id';
import { hashApiKey, generateRawApiKey, extractKeyPrefix } from '../src/lib/api-key';
import type { PlanTier } from '../src/types';
import { resetDb, initTestDb, getDb, schema as dbSchema } from '../src/db/client';
import { createApp } from '../src/app';
import { reloadEnv } from '../src/config/env';

// Re-export helpers for convenience
export { createTestDatabase, closeTestDatabase, type TestDb, schema } from './helpers/db';
export { createMockEngine, type MockEngine, type MockEngineConfig, MINIMAL_PDF } from './helpers/mock-engine';
export { createTestServer, type TestServer } from './helpers/test-server';
export { createAuthHeaders, createApiKeyHeaders, createTestJwt, createExpiredJwt, createInvalidSignatureJwt, TEST_JWT_SECRET } from './helpers/auth';
export * from './helpers/fixtures';
export * from './helpers/mock-stripe';

/**
 * Test context that holds all test infrastructure.
 */
export interface TestContext {
  db: TestDb;
  sqlite: Database;
  engine: MockEngine;
  app: ReturnType<typeof createApp>;
  cleanup: () => Promise<void>;
}

/**
 * Set up environment variables for tests.
 * Call this before creating test context.
 */
export function setupTestEnv(engineUrl?: string): void {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = ':memory:';
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_EXPIRY = '1h';
  process.env.ENGINE_TIMEOUT_MS = '5000';
  process.env.FREE_MONTHLY_LIMIT = '1000';
  process.env.DEV_MONTHLY_LIMIT = '3000';
  process.env.STARTER_MONTHLY_LIMIT = '10000';
  process.env.PRO_MONTHLY_LIMIT = '50000';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_12345';
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  process.env.STRIPE_DEV_PRICE_ID = 'price_dev_test';
  process.env.STRIPE_STARTER_PRICE_ID = 'price_starter_test';
  process.env.STRIPE_PRO_PRICE_ID = 'price_pro_test';
  process.env.R2_ENDPOINT = 'https://fake.r2.cloudflarestorage.com';
  process.env.R2_ACCESS_KEY_ID = 'fake_access_key';
  process.env.R2_SECRET_ACCESS_KEY = 'fake_secret_key';
  process.env.R2_BUCKET = 'test-bucket';
  process.env.R2_PUBLIC_URL = 'https://assets.test.local';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.AI_MODEL = 'gemini-2.5-flash';

  if (engineUrl) {
    process.env.ENGINE_URL = engineUrl;
  }

  reloadEnv();
}

/**
 * Create a complete test context with database, mock engine, and app.
 */
export async function createTestContext(engineConfig?: MockEngineConfig): Promise<TestContext> {
  // Create mock engine first to get its URL
  const engine = createMockEngine(engineConfig);

  // Set up environment with engine URL
  setupTestEnv(engine.url);

  // Reset and initialize the global database for tests
  // This ensures the real app uses the same in-memory database
  await initTestDb();
  const db = getDb() as unknown as TestDb;

  // Create the real app - it will use the initialized test database
  const app = createApp();

  // Create a dummy sqlite object for backwards compatibility with some tests
  // The actual database is managed by libsql now
  const { sqlite } = createTestDatabase();

  return {
    db,
    sqlite,
    engine,
    app,
    cleanup: async () => {
      await engine.stop();
      closeTestDatabase(sqlite);
      resetDb();
    },
  };
}

/**
 * Options for creating a test user.
 */
export interface CreateTestUserOptions {
  email?: string;
  password?: string;
  planTier?: PlanTier;
  planRenders?: number;
  stripeCustomerId?: string;
}

/**
 * Result of creating a test user.
 */
export interface TestUser {
  id: string;
  email: string;
  planTier: PlanTier;
  planRenders: number;
  rawApiKey: string;
  apiKeyId: string;
  jwt: string;
}

/**
 * Create a test user with an API key and JWT.
 */
export async function createTestUser(
  db: TestDb,
  options: CreateTestUserOptions = {}
): Promise<TestUser> {
  const now = Date.now();
  const userId = generateUserId();
  const email = options.email || `test-${userId}@example.com`;
  const password = options.password || 'testpassword123';
  const planTier = options.planTier || 'free';
  const planRenders =
    options.planRenders ??
    (planTier === 'pro' ? 50000 : planTier === 'starter' ? 10000 : planTier === 'dev' ? 3000 : 1000);

  // Hash password
  const passwordHash = await Bun.password.hash(password);

  // Insert user
  await db.insert(schema.users).values({
    id: userId,
    email,
    passwordHash,
    stripeCustomerId: options.stripeCustomerId || null,
    planTier,
    planRenders,
    createdAt: now,
    updatedAt: now,
  });

  // Create API key
  const rawApiKey = generateRawApiKey();
  const keyHash = hashApiKey(rawApiKey);
  const keyPrefix = extractKeyPrefix(rawApiKey);
  const apiKeyId = generateApiKeyId();

  await db.insert(schema.apiKeys).values({
    id: apiKeyId,
    userId,
    keyHash,
    keyPrefix,
    name: 'Test Key',
    createdAt: now,
    isRevoked: false,
  });

  // Create JWT
  const jwt = await createTestJwt(userId, email);

  return {
    id: userId,
    email,
    planTier,
    planRenders,
    rawApiKey,
    apiKeyId,
    jwt,
  };
}

/**
 * Options for creating a test API key.
 */
export interface CreateTestApiKeyOptions {
  name?: string;
  isRevoked?: boolean;
}

/**
 * Result of creating a test API key.
 */
export interface TestApiKey {
  id: string;
  rawKey: string;
  keyHash: string;
  keyPrefix: string;
  name: string;
}

/**
 * Create an additional API key for a user.
 */
export async function createTestApiKey(
  db: TestDb,
  userId: string,
  options: CreateTestApiKeyOptions = {}
): Promise<TestApiKey> {
  const now = Date.now();
  const rawKey = generateRawApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = extractKeyPrefix(rawKey);
  const keyId = generateApiKeyId();
  const name = options.name || 'Additional Test Key';

  await db.insert(schema.apiKeys).values({
    id: keyId,
    userId,
    keyHash,
    keyPrefix,
    name,
    createdAt: now,
    isRevoked: options.isRevoked ?? false,
  });

  return {
    id: keyId,
    rawKey,
    keyHash,
    keyPrefix,
    name,
  };
}

/**
 * Options for creating a test template.
 */
export interface CreateTestTemplateOptions {
  name?: string;
  description?: string;
  source?: string;
  files?: Record<string, string>;
  defaults?: Record<string, unknown>;
  isPublic?: boolean;
  commitMessage?: string;
}

/**
 * Result of creating a test template.
 */
export interface TestTemplate {
  id: string;
  versionId: string;
  name: string;
  source: string;
}

/**
 * Create a test template with initial version.
 */
export async function createTestTemplate(
  db: TestDb,
  userId: string | null,
  options: CreateTestTemplateOptions = {}
): Promise<TestTemplate> {
  const now = Date.now();
  const templateId = generateTemplateId();
  const versionId = generateVersionId();
  const name = options.name || `Test Template ${templateId.slice(-6)}`;
  const source = options.source || '#set page(paper: "a4")\nHello, World!';

  // Insert template
  await db.insert(schema.templates).values({
    id: templateId,
    userId,
    name,
    description: options.description || null,
    liveVersionId: versionId,
    isPublic: options.isPublic ?? false,
    createdAt: now,
    updatedAt: now,
  });

  // Insert version
  await db.insert(schema.templateVersions).values({
    id: versionId,
    templateId,
    versionNumber: 1,
    source,
    files: options.files || null,
    defaults: options.defaults || null,
    commitMessage: options.commitMessage || 'Initial version',
    createdAt: now,
  });

  return {
    id: templateId,
    versionId,
    name,
    source,
  };
}

/**
 * Create an official (system) template.
 */
export async function createOfficialTemplate(
  db: TestDb,
  options: CreateTestTemplateOptions = {}
): Promise<TestTemplate> {
  return createTestTemplate(db, null, { ...options, isPublic: true });
}

/**
 * Options for creating a test asset.
 */
export interface CreateTestAssetOptions {
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
  hash?: string;
}

/**
 * Result of creating a test asset.
 */
export interface TestAsset {
  id: string;
  name: string;
  r2Key: string;
  mimeType: string;
}

/**
 * Create a test asset record.
 */
export async function createTestAsset(
  db: TestDb,
  userId: string,
  options: CreateTestAssetOptions = {}
): Promise<TestAsset> {
  const now = Date.now();
  const assetId = generateAssetId();
  const name = options.name || 'test-asset.png';
  const mimeType = options.mimeType || 'image/png';
  const r2Key = `${userId}/assets/${assetId}.${name.split('.').pop()}`;

  await db.insert(schema.assets).values({
    id: assetId,
    userId,
    name,
    r2Key,
    mimeType,
    sizeBytes: options.sizeBytes || 10000,
    hash: options.hash || `sha256-${assetId}`,
    createdAt: now,
  });

  return {
    id: assetId,
    name,
    r2Key,
    mimeType,
  };
}

/**
 * Options for creating a test render log.
 */
export interface CreateTestRenderLogOptions {
  templateId?: string;
  templateVersionId?: string;
  status?: 'success' | 'error';
  durationMs?: number;
  errorMessage?: string;
  createdAt?: number;
}

/**
 * Create a test render log entry.
 */
export async function createTestRenderLog(
  db: TestDb,
  userId: string,
  options: CreateTestRenderLogOptions = {}
): Promise<string> {
  const logId = generateLogId();

  await db.insert(schema.renderLogs).values({
    id: logId,
    userId,
    templateId: options.templateId || null,
    templateVersionId: options.templateVersionId || null,
    status: options.status || 'success',
    durationMs: options.durationMs || 50,
    errorMessage: options.errorMessage || null,
    createdAt: options.createdAt || Date.now(),
  });

  return logId;
}

/**
 * Fill render logs to a specific count for a user.
 * Useful for testing billing limits.
 * Uses a dummy templateId to simulate production renders (preview renders have null templateId and don't count).
 */
export async function fillRenderLogs(
  db: TestDb,
  userId: string,
  count: number,
  status: 'success' | 'error' = 'success'
): Promise<void> {
  const now = Date.now();
  // Use a dummy templateId to simulate production renders
  const dummyTemplateId = 'tpl_dummy_for_billing_test';
  const logs = Array.from({ length: count }, (_, i) => ({
    id: generateLogId(),
    userId,
    templateId: dummyTemplateId,
    templateVersionId: null,
    status,
    durationMs: 50,
    errorMessage: null,
    createdAt: now - i * 1000, // Stagger timestamps
  }));

  // Insert in batches to avoid SQLite limits
  const batchSize = 100;
  for (let i = 0; i < logs.length; i += batchSize) {
    const batch = logs.slice(i, i + batchSize);
    await db.insert(schema.renderLogs).values(batch);
  }
}

/**
 * Get the count of successful renders for a user in the current month.
 */
export async function getMonthlyRenderCount(db: TestDb, userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const result = await db
    .select()
    .from(schema.renderLogs)
    .where(eq(schema.renderLogs.userId, userId));

  return result.filter(
    (log) => log.status === 'success' && log.createdAt >= startOfMonth.getTime()
  ).length;
}

/**
 * Revoke an API key.
 */
export async function revokeApiKey(db: TestDb, keyId: string): Promise<void> {
  await db
    .update(schema.apiKeys)
    .set({ isRevoked: true })
    .where(eq(schema.apiKeys.id, keyId));
}

/**
 * Update a user's plan.
 */
export async function updateUserPlan(
  db: TestDb,
  userId: string,
  planTier: PlanTier,
  planRenders?: number
): Promise<void> {
  const renders =
    planRenders ?? (planTier === 'pro' ? 50000 : planTier === 'starter' ? 10000 : planTier === 'dev' ? 3000 : 1000);

  await db
    .update(schema.users)
    .set({
      planTier,
      planRenders: renders,
      updatedAt: Date.now(),
    })
    .where(eq(schema.users.id, userId));
}

/**
 * Make an authenticated request helper.
 * Returns headers for the request.
 */
export function getAuthHeaders(user: TestUser, useApiKey = true): Record<string, string> {
  if (useApiKey) {
    return {
      'X-API-Key': user.rawApiKey,
      'Content-Type': 'application/json',
    };
  }
  return {
    Authorization: `Bearer ${user.jwt}`,
    'Content-Type': 'application/json',
  };
}
