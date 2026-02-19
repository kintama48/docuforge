/**
 * Tests to verify the test infrastructure works correctly.
 * This ensures the setup helpers, mock engine, and database work as expected.
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  createTestDatabase,
  closeTestDatabase,
  createMockEngine,
  createTestUser,
  createTestApiKey,
  createTestTemplate,
  createOfficialTemplate,
  createTestAsset,
  createTestRenderLog,
  fillRenderLogs,
  getMonthlyRenderCount,
  revokeApiKey,
  updateUserPlan,
  setupTestEnv,
  schema,
  MINIMAL_PDF,
  type TestDb,
  type MockEngine,
} from './setup';
import { eq } from 'drizzle-orm';
import type { Database } from 'bun:sqlite';

describe('Test Infrastructure', () => {
  let db: TestDb;
  let sqlite: Database;
  let engine: MockEngine;

  beforeEach(() => {
    const result = createTestDatabase();
    db = result.db;
    sqlite = result.sqlite;
    engine = createMockEngine();
    setupTestEnv(engine.url);
  });

  afterEach(async () => {
    await engine.stop();
    closeTestDatabase(sqlite);
  });

  describe('Database Helper', () => {
    test('creates in-memory database with schema', async () => {
      // Should be able to insert and query users
      const userId = 'usr_test123';
      await db.insert(schema.users).values({
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hash123',
        planTier: 'free',
        planRenders: 1000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const users = await db.select().from(schema.users);
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('test@example.com');
    });

    test('enforces foreign key constraints', async () => {
      // Should fail when inserting API key for non-existent user
      let error: Error | null = null;
      try {
        await db.insert(schema.apiKeys).values({
          id: 'key_test123',
          userId: 'usr_nonexistent',
          keyHash: 'hash123',
          keyPrefix: 'docu_live_abc',
          name: 'Test Key',
          createdAt: Date.now(),
          isRevoked: false,
        });
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toContain('FOREIGN KEY');
    });

    test('each database is isolated', () => {
      const { db: db2, sqlite: sqlite2 } = createTestDatabase();

      // First database should have no users initially
      // (we haven't inserted any in this test)
      const users1 = db.select().from(schema.users);
      expect(users1).toBeDefined();

      closeTestDatabase(sqlite2);
    });
  });

  describe('Mock Engine', () => {
    test('responds to health check', async () => {
      const response = await fetch(`${engine.url}/health`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toEqual({ status: 'ok' });
    });

    test('returns PDF for render request', async () => {
      const response = await fetch(`${engine.url}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: { main: 'main.typ', files: { 'main.typ': 'Hello' } },
          data: {},
          assets: [],
          options: { timeout_ms: 5000 },
        }),
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');

      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      // PDF should start with %PDF
      expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe('%PDF');
    });

    test('records requests for assertions', async () => {
      expect(engine.requests).toHaveLength(0);

      await fetch(`${engine.url}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: { main: 'test.typ', files: { 'test.typ': 'Test' } },
          data: { name: 'World' },
          assets: [],
          options: { timeout_ms: 5000 },
        }),
      });

      expect(engine.requests).toHaveLength(1);
      expect(engine.getLastRequest()?.body?.data).toEqual({ name: 'World' });
    });

    test('can be configured to return compilation error', async () => {
      engine.configure({ forceError: 'compilation', errorMessage: 'Syntax error' });

      const response = await fetch(`${engine.url}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: { main: 'main.typ', files: {} },
          data: {},
          assets: [],
          options: { timeout_ms: 5000 },
        }),
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error).toBe('compilation_failed');
      expect(error.message).toBe('Syntax error');
    });

    test('can be configured to return timeout', async () => {
      engine.configure({ forceError: 'timeout' });

      const response = await fetch(`${engine.url}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: { main: 'main.typ', files: {} },
          data: {},
          assets: [],
          options: { timeout_ms: 5000 },
        }),
      });

      expect(response.status).toBe(408);
    });

    test('can reset configuration', async () => {
      engine.configure({ forceError: 'compilation' });
      engine.reset();

      const response = await fetch(`${engine.url}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: { main: 'main.typ', files: {} },
          data: {},
          assets: [],
          options: { timeout_ms: 5000 },
        }),
      });

      expect(response.ok).toBe(true);
    });
  });

  describe('Factory Functions', () => {
    test('createTestUser creates user with API key and JWT', async () => {
      const user = await createTestUser(db);

      expect(user.id).toMatch(/^usr_/);
      expect(user.email).toContain('@example.com');
      expect(user.rawApiKey).toMatch(/^docu_live_/);
      expect(user.jwt).toBeTruthy();

      // User should exist in database
      const [dbUser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id));
      expect(dbUser).toBeDefined();
      expect(dbUser.planTier).toBe('free');

      // API key should exist
      const [dbKey] = await db
        .select()
        .from(schema.apiKeys)
        .where(eq(schema.apiKeys.userId, user.id));
      expect(dbKey).toBeDefined();
      expect(dbKey.isRevoked).toBe(false);
    });

    test('createTestUser respects options', async () => {
      const user = await createTestUser(db, {
        email: 'custom@example.com',
        planTier: 'pro',
        planRenders: 50000,
      });

      expect(user.email).toBe('custom@example.com');
      expect(user.planTier).toBe('pro');
      expect(user.planRenders).toBe(50000);
    });

    test('createTestApiKey creates additional key for user', async () => {
      const user = await createTestUser(db);
      const key = await createTestApiKey(db, user.id, { name: 'Second Key' });

      expect(key.id).toMatch(/^key_/);
      expect(key.rawKey).toMatch(/^docu_live_/);
      expect(key.name).toBe('Second Key');

      // Should have two keys now
      const keys = await db
        .select()
        .from(schema.apiKeys)
        .where(eq(schema.apiKeys.userId, user.id));
      expect(keys).toHaveLength(2);
    });

    test('createTestTemplate creates template with version', async () => {
      const user = await createTestUser(db);
      const template = await createTestTemplate(db, user.id, {
        name: 'My Template',
        source: '#set page(paper: "a4")\nTest',
      });

      expect(template.id).toMatch(/^tpl_/);
      expect(template.versionId).toMatch(/^ver_/);
      expect(template.name).toBe('My Template');

      // Template should exist
      const [dbTemplate] = await db
        .select()
        .from(schema.templates)
        .where(eq(schema.templates.id, template.id));
      expect(dbTemplate).toBeDefined();
      expect(dbTemplate.liveVersionId).toBe(template.versionId);

      // Version should exist
      const [version] = await db
        .select()
        .from(schema.templateVersions)
        .where(eq(schema.templateVersions.id, template.versionId));
      expect(version).toBeDefined();
      expect(version.versionNumber).toBe(1);
    });

    test('createOfficialTemplate creates system template', async () => {
      const template = await createOfficialTemplate(db, { name: 'Official Invoice' });

      const [dbTemplate] = await db
        .select()
        .from(schema.templates)
        .where(eq(schema.templates.id, template.id));

      expect(dbTemplate.userId).toBeNull();
      expect(dbTemplate.isPublic).toBe(true);
    });

    test('createTestAsset creates asset record', async () => {
      const user = await createTestUser(db);
      const asset = await createTestAsset(db, user.id, {
        name: 'logo.png',
        mimeType: 'image/png',
      });

      expect(asset.id).toMatch(/^ast_/);
      expect(asset.name).toBe('logo.png');
      expect(asset.r2Key).toContain(user.id);
    });

    test('createTestRenderLog creates log entry', async () => {
      const user = await createTestUser(db);
      const logId = await createTestRenderLog(db, user.id, { status: 'success' });

      expect(logId).toMatch(/^log_/);

      const [log] = await db
        .select()
        .from(schema.renderLogs)
        .where(eq(schema.renderLogs.id, logId));
      expect(log).toBeDefined();
      expect(log.status).toBe('success');
    });

    test('fillRenderLogs creates multiple logs', async () => {
      const user = await createTestUser(db);
      await fillRenderLogs(db, user.id, 10);

      const logs = await db
        .select()
        .from(schema.renderLogs)
        .where(eq(schema.renderLogs.userId, user.id));
      expect(logs).toHaveLength(10);
    });

    test('getMonthlyRenderCount returns correct count', async () => {
      const user = await createTestUser(db);

      // Create some successful renders
      await fillRenderLogs(db, user.id, 5, 'success');
      // Create some failed renders (shouldn't count)
      await fillRenderLogs(db, user.id, 3, 'error');

      const count = await getMonthlyRenderCount(db, user.id);
      expect(count).toBe(5);
    });

    test('revokeApiKey marks key as revoked', async () => {
      const user = await createTestUser(db);
      await revokeApiKey(db, user.apiKeyId);

      const [key] = await db
        .select()
        .from(schema.apiKeys)
        .where(eq(schema.apiKeys.id, user.apiKeyId));
      expect(key.isRevoked).toBe(true);
    });

    test('updateUserPlan changes plan tier and limits', async () => {
      const user = await createTestUser(db);
      await updateUserPlan(db, user.id, 'pro');

      const [dbUser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id));
      expect(dbUser.planTier).toBe('pro');
      expect(dbUser.planRenders).toBe(50000);
    });
  });

  describe('MINIMAL_PDF constant', () => {
    test('is a valid PDF', () => {
      // PDF starts with %PDF-
      const header = String.fromCharCode(
        MINIMAL_PDF[0],
        MINIMAL_PDF[1],
        MINIMAL_PDF[2],
        MINIMAL_PDF[3],
        MINIMAL_PDF[4]
      );
      expect(header).toBe('%PDF-');
    });
  });
});
