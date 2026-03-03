import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { initTestDb, getDb, resetDb, schema } from '../../src/db/client';
import { setupTestEnv, createTestUser } from '../setup';
import { generateAssetId } from '../../src/lib/id';
import {
  clearResolvedAssetCache,
  getResolvedAssetCacheSize,
  invalidateResolvedAssetCache,
  resolveUserAssets,
  setS3Client,
} from '../../src/services/asset';

describe('asset cache', () => {
  beforeEach(async () => {
    setupTestEnv('http://127.0.0.1:3001');
    await initTestDb();
    clearResolvedAssetCache();
    setS3Client(null);
  });

  afterEach(() => {
    clearResolvedAssetCache();
    setS3Client(null);
    resetDb();
  });

  test('caches resolved assets per user and invalidates on demand', async () => {
    const db = getDb();
    const user = await createTestUser(db as any);
    const assetId = generateAssetId();

    await db.insert(schema.assets).values({
      id: assetId,
      userId: user.id,
      name: 'logo.png',
      r2Key: `${user.id}/assets/${assetId}.png`,
      mimeType: 'image/png',
      sizeBytes: 1024,
      hash: 'hash-logo',
      createdAt: Date.now(),
    });

    const first = await resolveUserAssets(user.id);
    expect(first.length).toBe(1);
    expect(getResolvedAssetCacheSize()).toBe(1);

    const second = await resolveUserAssets(user.id);
    expect(second).toEqual(first);
    expect(getResolvedAssetCacheSize()).toBe(1);

    invalidateResolvedAssetCache(user.id);
    expect(getResolvedAssetCacheSize()).toBe(0);
  });

  test('stores empty user results and clears globally', async () => {
    const db = getDb();
    const user = await createTestUser(db as any);

    const resolved = await resolveUserAssets(user.id);
    expect(resolved).toEqual([]);
    expect(getResolvedAssetCacheSize()).toBe(1);

    clearResolvedAssetCache();
    expect(getResolvedAssetCacheSize()).toBe(0);
  });
});
