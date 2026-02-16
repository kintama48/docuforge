import { Hono } from 'hono';

import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { jwtAuth } from '../middleware/auth';
import { shortCache, noCache } from '../middleware/cache';
import { etag } from '../middleware/etag';
import { zValidator, requestUploadUrlSchema, confirmUploadSchema } from '../lib/validation';
import { generateAssetId } from '../lib/id';
import { generateUploadUrl, verifyAssetExists, deleteAssetFromR2 } from '../services/asset';
import { NotFoundError, ValidationError } from '../lib/errors';

const assets = new Hono();

// POST /v1/assets/upload-url - Request presigned upload URL
assets.post('/upload-url', jwtAuth, noCache, zValidator('json', requestUploadUrlSchema), async (c) => {
  const data = c.req.valid('json');
  const { userId } = c.get('auth');

  const assetId = generateAssetId();
  const extension = data.filename.slice(data.filename.lastIndexOf('.'));

  const { uploadUrl, r2Key } = await generateUploadUrl(userId, assetId, data.content_type, extension);

  // Store pending asset info temporarily (in real app, might use Redis or temp table)
  // For simplicity, we'll validate on confirm

  return c.json({
    upload_url: uploadUrl,
    asset_id: assetId,
    r2_key: r2Key,
    expires_in: 600,
  });
});

// POST /v1/assets - Confirm upload and register asset
assets.post('/', jwtAuth, noCache, zValidator('json', confirmUploadSchema), async (c) => {
  const data = c.req.valid('json');
  const { userId } = c.get('auth');
  const db = getDb();
  const now = Date.now();

  // Build r2Key from asset_id (we need to figure out the extension)
  // In a real implementation, you might store pending uploads
  // For now, we'll accept the name and derive the key

  const extension = data.name.slice(data.name.lastIndexOf('.'));
  const r2Key = `${userId}/assets/${data.asset_id}${extension}`;

  // Verify file exists in R2
  const exists = await verifyAssetExists(r2Key);
  if (!exists) {
    throw new ValidationError('File not found in storage. Please upload first.');
  }

  // Check if asset with same name exists for this user
  const [existing] = await db
    .select()
    .from(schema.assets)
    .where(and(eq(schema.assets.userId, userId), eq(schema.assets.name, data.name)));

  if (existing) {
    // Update existing asset
    await db
      .update(schema.assets)
      .set({
        r2Key,
        hash: data.hash,
      })
      .where(eq(schema.assets.id, existing.id));

    // Delete old file from R2
    if (existing.r2Key !== r2Key) {
      await deleteAssetFromR2(existing.r2Key).catch(() => {});
    }

    const [updated] = await db.select().from(schema.assets).where(eq(schema.assets.id, existing.id));

    return c.json({
      asset: {
        id: updated!.id,
        name: updated!.name,
        mime_type: updated!.mimeType,
        size_bytes: updated!.sizeBytes,
        hash: updated!.hash,
      },
    });
  }

  // Determine mime type from extension
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.woff2': 'font/woff2',
  };

  const mimeType = mimeTypes[extension.toLowerCase()] || 'application/octet-stream';

  // Create new asset
  await db.insert(schema.assets).values({
    id: data.asset_id,
    userId,
    name: data.name,
    r2Key,
    mimeType,
    sizeBytes: 0, // Would need to get from R2 HEAD request in production
    hash: data.hash,
    createdAt: now,
  });

  return c.json(
    {
      asset: {
        id: data.asset_id,
        name: data.name,
        mime_type: mimeType,
        size_bytes: 0,
        hash: data.hash,
      },
    },
    201
  );
});

// GET /v1/assets - List user assets
assets.get('/', jwtAuth, shortCache, etag, async (c) => {
  const { userId } = c.get('auth');
  const db = getDb();

  const userAssets = await db.select().from(schema.assets).where(eq(schema.assets.userId, userId));

  return c.json({
    assets: userAssets.map((a) => ({
      id: a.id,
      name: a.name,
      mime_type: a.mimeType,
      size_bytes: a.sizeBytes,
      created_at: a.createdAt,
    })),
  });
});

// DELETE /v1/assets/:id - Delete asset
assets.delete('/:id', jwtAuth, noCache, async (c) => {
  const assetId = c.req.param('id');
  const { userId } = c.get('auth');
  const db = getDb();

  const [asset] = await db
    .select()
    .from(schema.assets)
    .where(and(eq(schema.assets.id, assetId), eq(schema.assets.userId, userId)));

  if (!asset) {
    throw new NotFoundError('Asset not found');
  }

  // Delete from R2
  await deleteAssetFromR2(asset.r2Key).catch(() => {});

  // Delete from database
  await db.delete(schema.assets).where(eq(schema.assets.id, assetId));

  return c.json({ message: 'Asset deleted' });
});

export default assets;
