import { eq } from 'drizzle-orm';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getDb, schema } from '../db/client';
import { env } from '../config/env';
import type { EngineAsset } from '../types';

let s3Client: S3Client | null = null;
const ASSET_CACHE_TTL_MS = 30_000;

type AssetCacheEntry = {
  expiresAt: number;
  assets: EngineAsset[];
};

const resolvedAssetCache = new Map<string, AssetCacheEntry>();

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

export function setS3Client(client: S3Client | null) {
  s3Client = client;
}

export function clearResolvedAssetCache() {
  resolvedAssetCache.clear();
}

export function invalidateResolvedAssetCache(userId: string) {
  resolvedAssetCache.delete(userId);
}

export function getResolvedAssetCacheSize() {
  return resolvedAssetCache.size;
}

function cloneAssets(assets: EngineAsset[]): EngineAsset[] {
  return assets.map((asset) => ({ ...asset }));
}

export async function resolveUserAssets(userId: string): Promise<EngineAsset[]> {
  const now = Date.now();
  const cached = resolvedAssetCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cloneAssets(cached.assets);
  }

  const db = getDb();

  const assets = await db
    .select({
      name: schema.assets.name,
      r2Key: schema.assets.r2Key,
      hash: schema.assets.hash,
    })
    .from(schema.assets)
    .where(eq(schema.assets.userId, userId));

  if (assets.length === 0) {
    resolvedAssetCache.set(userId, {
      expiresAt: now + ASSET_CACHE_TTL_MS,
      assets: [],
    });
    return [];
  }

  const client = getS3Client();
  const bucket = env.R2_BUCKET;

  const resolvedAssets: EngineAsset[] = await Promise.all(
    assets.map(async (asset) => {
      // Use GetObjectCommand for read URLs (not PutObjectCommand)
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: asset.r2Key,
      });

      // Generate presigned GET URL (expires in 5 minutes)
      const url = await getSignedUrl(client, command, { expiresIn: 300 });

      return {
        name: asset.name,
        url,
        hash: asset.hash,
      };
    })
  );

  resolvedAssetCache.set(userId, {
    expiresAt: now + ASSET_CACHE_TTL_MS,
    assets: cloneAssets(resolvedAssets),
  });

  return resolvedAssets;
}

export async function generateUploadUrl(
  userId: string,
  assetId: string,
  contentType: string,
  extension: string
): Promise<{ uploadUrl: string; r2Key: string }> {
  const client = getS3Client();
  const bucket = env.R2_BUCKET;
  const r2Key = `${userId}/assets/${assetId}${extension}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: r2Key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 }); // 10 minutes

  return { uploadUrl, r2Key };
}

export async function verifyAssetExists(r2Key: string): Promise<boolean> {
  const client = getS3Client();
  const bucket = env.R2_BUCKET;

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: r2Key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export async function deleteAssetFromR2(r2Key: string): Promise<void> {
  const client = getS3Client();
  const bucket = env.R2_BUCKET;

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: r2Key,
    })
  );
}
