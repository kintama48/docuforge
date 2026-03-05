import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { schema } from '../../src/db/client';
import { generateRefreshTokenId } from '../../src/lib/id';
import { deleteExpiredRefreshTokens } from '../../src/services/refresh-token';
import {
  createTestContext,
  createTestUser,
  type TestContext,
} from '../setup';

describe('refresh token cleanup', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  it('prunes expired tokens and old revoked tokens', async () => {
    const user = await createTestUser(ctx.db);
    const now = Date.now();
    const staleRevokedAt = now - 8 * 24 * 60 * 60 * 1000;
    const freshRevokedAt = now - 30 * 60 * 1000;

    await ctx.db.insert(schema.authRefreshTokens).values([
      {
        id: generateRefreshTokenId(),
        userId: user.id,
        tokenHash: 'tok_expired_active',
        expiresAt: now - 1_000,
        createdAt: now - 10_000,
        lastUsedAt: now - 10_000,
        revokedAt: null,
        replacedByTokenHash: null,
      },
      {
        id: generateRefreshTokenId(),
        userId: user.id,
        tokenHash: 'tok_stale_revoked',
        expiresAt: now + 24 * 60 * 60 * 1000,
        createdAt: now - 10_000,
        lastUsedAt: staleRevokedAt,
        revokedAt: staleRevokedAt,
        replacedByTokenHash: null,
      },
      {
        id: generateRefreshTokenId(),
        userId: user.id,
        tokenHash: 'tok_fresh_revoked',
        expiresAt: now + 24 * 60 * 60 * 1000,
        createdAt: now - 10_000,
        lastUsedAt: freshRevokedAt,
        revokedAt: freshRevokedAt,
        replacedByTokenHash: null,
      },
      {
        id: generateRefreshTokenId(),
        userId: user.id,
        tokenHash: 'tok_active',
        expiresAt: now + 24 * 60 * 60 * 1000,
        createdAt: now - 10_000,
        lastUsedAt: now - 10_000,
        revokedAt: null,
        replacedByTokenHash: null,
      },
    ]);

    await deleteExpiredRefreshTokens(now);

    const [expiredActive] = await ctx.db
      .select({ tokenHash: schema.authRefreshTokens.tokenHash })
      .from(schema.authRefreshTokens)
      .where(eq(schema.authRefreshTokens.tokenHash, 'tok_expired_active'));
    expect(expiredActive).toBeUndefined();

    const [staleRevoked] = await ctx.db
      .select({ tokenHash: schema.authRefreshTokens.tokenHash })
      .from(schema.authRefreshTokens)
      .where(eq(schema.authRefreshTokens.tokenHash, 'tok_stale_revoked'));
    expect(staleRevoked).toBeUndefined();

    const [freshRevoked] = await ctx.db
      .select({ tokenHash: schema.authRefreshTokens.tokenHash })
      .from(schema.authRefreshTokens)
      .where(eq(schema.authRefreshTokens.tokenHash, 'tok_fresh_revoked'));
    expect(freshRevoked?.tokenHash).toBe('tok_fresh_revoked');

    const [active] = await ctx.db
      .select({ tokenHash: schema.authRefreshTokens.tokenHash })
      .from(schema.authRefreshTokens)
      .where(eq(schema.authRefreshTokens.tokenHash, 'tok_active'));
    expect(active?.tokenHash).toBe('tok_active');
  });
});
