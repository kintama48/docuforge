import { eq } from 'drizzle-orm';
import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getDb, schema } from '../db/client';
import type { EngineAsset } from '../types';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return s3Client;
}

export async function resolveUserAssets(userId: string): Promise<EngineAsset[]> {
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
    return [];
  }

  const client = getS3Client();
  const bucket = process.env.R2_BUCKET || 'docuforge-assets';

  const resolvedAssets: EngineAsset[] = await Promise.all(
    assets.map(async (asset) => {
      const command = new PutObjectCommand({
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

  return resolvedAssets;
}

export async function generateUploadUrl(
  userId: string,
  assetId: string,
  contentType: string,
  extension: string
): Promise<{ uploadUrl: string; r2Key: string }> {
  const client = getS3Client();
  const bucket = process.env.R2_BUCKET || 'docuforge-assets';
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
  const bucket = process.env.R2_BUCKET || 'docuforge-assets';

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
  const bucket = process.env.R2_BUCKET || 'docuforge-assets';

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: r2Key,
    })
  );
}
