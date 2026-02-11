/**
 * Integration tests for asset routes using real service logic with mocked S3 client.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { S3Client } from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';
import { createApp } from '../../src/app';
import { initTestDb, getDb, resetDb } from '../../src/db/client';
import { setupTestEnv, createTestUser, getAuthHeaders, schema } from '../setup';

describe('Assets API', () => {
  let app: ReturnType<typeof createApp>;
  let user: Awaited<ReturnType<typeof createTestUser>>;
  let originalSend: typeof S3Client.prototype.send;
  let shouldExist = true;
  let deleteCalls = 0;

  beforeEach(async () => {
    setupTestEnv('http://127.0.0.1:3001');
    await initTestDb();
    app = createApp();
    user = await createTestUser(getDb() as any);

    deleteCalls = 0;
    shouldExist = true;
    originalSend = S3Client.prototype.send;
    S3Client.prototype.send = async function (command: any) {
      const name = command?.constructor?.name;
      if (name === 'HeadObjectCommand') {
        if (!shouldExist) {
          throw new Error('NotFound');
        }
        return {};
      }
      if (name === 'DeleteObjectCommand') {
        deleteCalls += 1;
        return {};
      }
      return {};
    };
  });

  afterEach(() => {
    S3Client.prototype.send = originalSend;
    resetDb();
  });

  it('issues upload URL', async () => {
    const response = await app.request('/v1/assets/upload-url', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({
        filename: 'logo.png',
        content_type: 'image/png',
        size_bytes: 1024,
        hash: 'sha256-test',
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.upload_url).toBeDefined();
    expect(body.asset_id).toBeDefined();
    expect(body.r2_key).toContain(user.id);
  });

  it('confirms upload and creates asset', async () => {
    const assetId = 'asset_test_1';
    const response = await app.request('/v1/assets', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({
        asset_id: assetId,
        name: 'logo.png',
        hash: 'sha256-logo',
      }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.asset.name).toBe('logo.png');
    expect(body.asset.mime_type).toBe('image/png');

    const db = getDb();
    const [record] = await db.select().from(schema.assets).where(eq(schema.assets.id, assetId));
    expect(record).toBeDefined();
  });

  it('updates existing asset with same name', async () => {
    const db = getDb();
    const existingId = 'asset_existing';
    await db.insert(schema.assets).values({
      id: existingId,
      userId: user.id,
      name: 'logo.png',
      r2Key: `${user.id}/assets/${existingId}.png`,
      mimeType: 'image/png',
      sizeBytes: 1200,
      hash: 'sha256-old',
      createdAt: Date.now(),
    });

    const response = await app.request('/v1/assets', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({
        asset_id: 'asset_new',
        name: 'logo.png',
        hash: 'sha256-new',
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.asset.hash).toBe('sha256-new');
    expect(deleteCalls).toBeGreaterThan(0);
  });

  it('rejects confirm when asset is missing in storage', async () => {
    shouldExist = false;
    const response = await app.request('/v1/assets', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({
        asset_id: 'asset_missing',
        name: 'missing.png',
        hash: 'sha256-missing',
      }),
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toBe('validation_error');
  });

  it('lists user assets', async () => {
    const db = getDb();
    await db.insert(schema.assets).values({
      id: 'asset_list',
      userId: user.id,
      name: 'file.png',
      r2Key: `${user.id}/assets/asset_list.png`,
      mimeType: 'image/png',
      sizeBytes: 512,
      hash: 'sha256-list',
      createdAt: Date.now(),
    });

    const response = await app.request('/v1/assets', {
      method: 'GET',
      headers: getAuthHeaders(user, false),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.assets.length).toBe(1);
    expect(body.assets[0].name).toBe('file.png');
  });

  it('deletes assets', async () => {
    const db = getDb();
    const assetId = 'asset_delete';
    await db.insert(schema.assets).values({
      id: assetId,
      userId: user.id,
      name: 'delete.png',
      r2Key: `${user.id}/assets/${assetId}.png`,
      mimeType: 'image/png',
      sizeBytes: 512,
      hash: 'sha256-del',
      createdAt: Date.now(),
    });

    const response = await app.request(`/v1/assets/${assetId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(user, false),
    });

    expect(response.status).toBe(200);
    expect(deleteCalls).toBeGreaterThan(0);

    const remaining = await db.select().from(schema.assets).where(eq(schema.assets.id, assetId));
    expect(remaining.length).toBe(0);
  });

  it('returns 404 for missing assets', async () => {
    const response = await app.request('/v1/assets/asset_unknown', {
      method: 'DELETE',
      headers: getAuthHeaders(user, false),
    });

    expect(response.status).toBe(404);
  });
});
