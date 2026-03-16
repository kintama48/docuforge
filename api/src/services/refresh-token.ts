import { randomBytes, createHash } from 'crypto';
import { and, eq, gt, isNotNull, isNull, lt, or } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { generateRefreshTokenId } from '../lib/id';
import { env } from '../config/env';

const REFRESH_TOKEN_PATTERN = /^rft_[A-Za-z0-9_-]{40,240}$/;
const REFRESH_TOKEN_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
const MIN_REVOKED_TOKEN_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
let lastCleanupAt = 0;
let cleanupInFlight: Promise<void> | null = null;

function getRefreshTokenExpiry(now: number): number {
  const ttlSeconds = env.AUTH_REFRESH_TOKEN_MAX_AGE_SECONDS;
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error('AUTH_REFRESH_TOKEN_MAX_AGE_SECONDS must be a positive integer');
  }
  return now + ttlSeconds * 1000;
}

function generateRawRefreshToken(): string {
  return `rft_${randomBytes(48).toString('base64url')}`;
}

function hashRefreshToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

function assertRefreshTokenFormat(rawToken: string): void {
  if (!REFRESH_TOKEN_PATTERN.test(rawToken)) {
    throw new Error('Invalid refresh token format');
  }
}

function maybeRunRefreshTokenCleanup(now: number): void {
  if (process.env.NODE_ENV === 'test' || process.env.BUN_TEST === '1') {
    return;
  }
  if (cleanupInFlight || now - lastCleanupAt < REFRESH_TOKEN_CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupAt = now;
  cleanupInFlight = deleteExpiredRefreshTokens(now)
    .catch((err) => {
      console.warn(
        'Refresh token cleanup failed:',
        err instanceof Error ? err.message : String(err)
      );
    })
    .finally(() => {
      cleanupInFlight = null;
    });
}

export async function issueRefreshToken(userId: string, now = Date.now()): Promise<{
  refreshToken: string;
  expiresAt: number;
}> {
  if (!userId || userId.trim().length === 0) {
    throw new Error('userId is required to issue refresh token');
  }

  const refreshToken = generateRawRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = getRefreshTokenExpiry(now);
  const db = getDb();

  await db.insert(schema.authRefreshTokens).values({
    id: generateRefreshTokenId(),
    userId,
    tokenHash,
    expiresAt,
    createdAt: now,
    lastUsedAt: now,
    revokedAt: null,
    replacedByTokenHash: null,
  });

  maybeRunRefreshTokenCleanup(now);
  return { refreshToken, expiresAt };
}

export async function rotateRefreshToken(rawToken: string, now = Date.now()): Promise<{
  userId: string;
  refreshToken: string;
  expiresAt: number;
} | null> {
  try {
    assertRefreshTokenFormat(rawToken);
  } catch {
    return null;
  }

  const db = getDb();
  const tokenHash = hashRefreshToken(rawToken);

  const nextRefreshToken = generateRawRefreshToken();
  const nextHash = hashRefreshToken(nextRefreshToken);
  const nextExpiresAt = getRefreshTokenExpiry(now);

  const [revoked] = await db
    .update(schema.authRefreshTokens)
    .set({
      revokedAt: now,
      lastUsedAt: now,
      replacedByTokenHash: nextHash,
    })
    .where(
      and(
        eq(schema.authRefreshTokens.tokenHash, tokenHash),
        isNull(schema.authRefreshTokens.revokedAt),
        gt(schema.authRefreshTokens.expiresAt, now)
      )
    )
    .returning({
      userId: schema.authRefreshTokens.userId,
    });

  if (!revoked) {
    return null;
  }

  await db.insert(schema.authRefreshTokens).values({
    id: generateRefreshTokenId(),
    userId: revoked.userId,
    tokenHash: nextHash,
    expiresAt: nextExpiresAt,
    createdAt: now,
    lastUsedAt: now,
    revokedAt: null,
    replacedByTokenHash: null,
  });
  const rotated = {
    userId: revoked.userId,
    refreshToken: nextRefreshToken,
    expiresAt: nextExpiresAt,
  };
  maybeRunRefreshTokenCleanup(now);
  return rotated;
}

export async function revokeRefreshToken(rawToken: string, now = Date.now()): Promise<void> {
  try {
    assertRefreshTokenFormat(rawToken);
  } catch {
    return;
  }

  const db = getDb();
  const tokenHash = hashRefreshToken(rawToken);
  await db
    .update(schema.authRefreshTokens)
    .set({
      revokedAt: now,
      lastUsedAt: now,
    })
    .where(and(eq(schema.authRefreshTokens.tokenHash, tokenHash), isNull(schema.authRefreshTokens.revokedAt)));
  maybeRunRefreshTokenCleanup(now);
}

export async function deleteExpiredRefreshTokens(now = Date.now()): Promise<void> {
  const configuredTtlMs = env.AUTH_REFRESH_TOKEN_MAX_AGE_SECONDS * 1000;
  const revokedRetentionMs = Number.isFinite(configuredTtlMs) && configuredTtlMs > 0
    ? Math.max(configuredTtlMs, MIN_REVOKED_TOKEN_RETENTION_MS)
    : MIN_REVOKED_TOKEN_RETENTION_MS;
  const revokedCutoff = now - revokedRetentionMs;
  const db = getDb();
  await db
    .delete(schema.authRefreshTokens)
    .where(
      or(
        lt(schema.authRefreshTokens.expiresAt, now),
        and(
          isNotNull(schema.authRefreshTokens.revokedAt),
          lt(schema.authRefreshTokens.revokedAt, revokedCutoff)
        )
      )
    );
}
