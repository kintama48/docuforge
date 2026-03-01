import { createHash, randomBytes } from 'node:crypto';
import type { Context } from 'hono';
import { env } from '../config/env';
import { ForbiddenError, RateLimitedError, UnauthorizedError, ValidationError } from '../lib/errors';
import { withRedis } from './redis';

type PublicPreviewSessionRecord = {
  sessionId: string;
  ipHash: string;
  userAgentHash: string;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
  rendersUsed: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitState = {
  limit: number;
  remaining: number;
  resetAt: number;
};

const SESSION_ID_PATTERN = /^pps_[A-Za-z0-9_-]{20,120}$/;
const sessions = new Map<string, PublicPreviewSessionRecord>();
const ipLimiter = new Map<string, RateLimitEntry>();
const sessionLimiter = new Map<string, RateLimitEntry>();
const sessionCreationLimiter = new Map<string, RateLimitEntry>();
const SESSION_INDEX_KEY = 'pps:sessions:index';

const trustedOrigins = new Set([new URL(env.APP_URL).origin]);
if (env.PUBLIC_PREVIEW_ALLOWED_ORIGINS) {
  for (const origin of env.PUBLIC_PREVIEW_ALLOWED_ORIGINS.split(',')) {
    const normalized = origin.trim();
    if (!normalized) continue;
    trustedOrigins.add(normalized);
  }
}
if (env.NODE_ENV === 'development') {
  trustedOrigins.add('http://localhost:5173');
  trustedOrigins.add('http://127.0.0.1:5173');
  trustedOrigins.add('http://localhost:3000');
}

function nowMs(): number {
  return Date.now();
}

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeUserAgent(userAgent: string | undefined): string {
  const normalized = (userAgent || '').trim();
  return normalized.slice(0, 256) || 'unknown';
}

function normalizeIp(raw: string | undefined): string {
  const cleaned = (raw || '').trim();
  if (!cleaned) return 'unknown';
  return cleaned.slice(0, 128);
}

function resolveClientIp(c: Context): string {
  const cfConnectingIp = c.req.header('CF-Connecting-IP');
  if (cfConnectingIp) return normalizeIp(cfConnectingIp);

  const xForwardedFor = c.req.header('X-Forwarded-For');
  if (xForwardedFor) {
    const first = xForwardedFor.split(',')[0];
    if (first) return normalizeIp(first);
  }

  const xRealIp = c.req.header('X-Real-IP');
  if (xRealIp) return normalizeIp(xRealIp);

  return 'unknown';
}

function getSessionMetaKey(sessionId: string): string {
  return `pps:session:${sessionId}:meta`;
}

function getSessionRendersKey(sessionId: string): string {
  return `pps:session:${sessionId}:renders`;
}

async function persistSessionToRedis(session: PublicPreviewSessionRecord): Promise<boolean> {
  const ttlMs = Math.max(1_000, session.expiresAt - nowMs());
  const saved = await withRedis(async (redis) => {
    const batch = redis.multi();
    batch.set(getSessionMetaKey(session.sessionId), JSON.stringify(session), 'PX', ttlMs);
    batch.set(getSessionRendersKey(session.sessionId), String(session.rendersUsed), 'PX', ttlMs);
    batch.zadd(SESSION_INDEX_KEY, session.createdAt, session.sessionId);
    await batch.exec();

    const size = await redis.zcard(SESSION_INDEX_KEY);
    const overflow = size - env.PUBLIC_PREVIEW_MAX_SESSIONS;
    if (overflow > 0) {
      const oldest = await redis.zrange(SESSION_INDEX_KEY, 0, overflow - 1);
      if (oldest.length > 0) {
        const prune = redis.multi();
        for (const staleSessionId of oldest) {
          prune.del(getSessionMetaKey(staleSessionId));
          prune.del(getSessionRendersKey(staleSessionId));
          prune.zrem(SESSION_INDEX_KEY, staleSessionId);
        }
        await prune.exec();
      }
    }

    return true;
  });

  return saved === true;
}

async function removeSessionFromRedis(sessionId: string): Promise<void> {
  await withRedis(async (redis) => {
    const batch = redis.multi();
    batch.del(getSessionMetaKey(sessionId));
    batch.del(getSessionRendersKey(sessionId));
    batch.zrem(SESSION_INDEX_KEY, sessionId);
    await batch.exec();
  });
}

async function readSessionFromRedis(sessionId: string): Promise<{
  available: boolean;
  session: PublicPreviewSessionRecord | null;
}> {
  const result = await withRedis(async (redis) => {
    const [metaRaw, rendersRaw] = await redis.mget(
      getSessionMetaKey(sessionId),
      getSessionRendersKey(sessionId)
    );
    return { metaRaw, rendersRaw };
  });

  if (!result) {
    return { available: false, session: null };
  }

  if (!result.metaRaw) {
    return { available: true, session: null };
  }

  try {
    const parsed = JSON.parse(result.metaRaw) as PublicPreviewSessionRecord;
    const redisRenders = Number(result.rendersRaw ?? parsed.rendersUsed ?? 0);
    return {
      available: true,
      session: {
        ...parsed,
        rendersUsed: Number.isFinite(redisRenders) && redisRenders >= 0 ? redisRenders : 0,
      },
    };
  } catch {
    return { available: true, session: null };
  }
}

async function incrementDistributedCounter(
  scope: string,
  key: string,
  windowMs: number
): Promise<{ count: number; resetAt: number } | null> {
  const now = nowMs();
  const bucketStart = Math.floor(now / windowMs) * windowMs;
  const resetAt = bucketStart + windowMs;
  const redisKey = `pps:rl:${scope}:${key}:${bucketStart}`;

  const count = await withRedis(async (redis) => {
    const next = await redis.incr(redisKey);
    if (next === 1) {
      await redis.pexpire(redisKey, windowMs + 2_000);
    }
    return next;
  });

  if (count === null) return null;
  return { count, resetAt };
}

function purgeExpiredSessions(now: number): void {
  for (const [sessionId, session] of sessions.entries()) {
    if (now >= session.expiresAt) {
      sessions.delete(sessionId);
    }
  }
}

function purgeExpiredRateEntries(limiter: Map<string, RateLimitEntry>, now: number): void {
  for (const [key, entry] of limiter.entries()) {
    if (now >= entry.resetAt) {
      limiter.delete(key);
    }
  }
}

function trimSessionStoreIfNeeded(): void {
  if (sessions.size < env.PUBLIC_PREVIEW_MAX_SESSIONS) return;

  let oldest: PublicPreviewSessionRecord | null = null;
  for (const record of sessions.values()) {
    if (!oldest || record.lastSeenAt < oldest.lastSeenAt) {
      oldest = record;
    }
  }

  if (oldest) {
    sessions.delete(oldest.sessionId);
  }
}

async function enforceRateLimit(
  limiter: Map<string, RateLimitEntry>,
  scope: string,
  key: string,
  limit: number,
  windowMs: number,
  message: string
): Promise<RateLimitState> {
  const now = nowMs();
  const distributed = await incrementDistributedCounter(scope, key, windowMs);
  let count: number;
  let resetAt: number;

  if (distributed) {
    count = distributed.count;
    resetAt = distributed.resetAt;
  } else {
    let entry = limiter.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + windowMs,
      };
      limiter.set(key, entry);
    }
    entry.count += 1;
    count = entry.count;
    resetAt = entry.resetAt;
  }

  if (count > limit) {
    const retryAfter = Math.ceil((resetAt - now) / 1000);
    throw new RateLimitedError(message, retryAfter);
  }

  return {
    limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}

function assertMatchingSessionFingerprint(
  session: PublicPreviewSessionRecord,
  client: { ip: string; userAgent: string }
): void {
  if (session.ipHash !== hashValue(client.ip) || session.userAgentHash !== hashValue(client.userAgent)) {
    throw new ForbiddenError('Preview session fingerprint mismatch');
  }
}

function getLocalSessionOrThrow(
  sessionId: string,
  client: { ip: string; userAgent: string }
): PublicPreviewSessionRecord {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new UnauthorizedError('Preview session expired or missing');
  }

  const now = nowMs();
  if (now >= session.expiresAt) {
    sessions.delete(sessionId);
    throw new UnauthorizedError('Preview session expired or missing');
  }

  assertMatchingSessionFingerprint(session, client);
  session.lastSeenAt = now;
  return session;
}

export function assertTrustedPublicPreviewOrigin(c: Context): void {
  const origin = c.req.header('Origin');
  if (!origin) {
    // In production we require browser-originated requests so edge + app
    // origin allowlists can work together against anonymous abuse traffic.
    if (env.NODE_ENV === 'production') {
      throw new ForbiddenError('Origin header is required for public preview');
    }
    return;
  }
  if (!trustedOrigins.has(origin)) {
    throw new ForbiddenError('Cross-origin preview request blocked');
  }
}

export function getPublicPreviewClientFingerprint(c: Context): {
  ip: string;
  userAgent: string;
} {
  return {
    ip: resolveClientIp(c),
    userAgent: normalizeUserAgent(c.req.header('User-Agent')),
  };
}

export async function createPublicPreviewSession(client: {
  ip: string;
  userAgent: string;
}): Promise<{
  sessionId: string;
  expiresAt: string;
  remainingRenders: number;
}> {
  const now = nowMs();
  purgeExpiredSessions(now);
  trimSessionStoreIfNeeded();

  const sessionId = `pps_${randomBytes(24).toString('base64url')}`;
  const expiresAtMs = now + env.PUBLIC_PREVIEW_SESSION_TTL_SECONDS * 1000;
  const session: PublicPreviewSessionRecord = {
    sessionId,
    ipHash: hashValue(client.ip),
    userAgentHash: hashValue(client.userAgent),
    createdAt: now,
    lastSeenAt: now,
    expiresAt: expiresAtMs,
    rendersUsed: 0,
  };

  sessions.set(sessionId, session);
  await persistSessionToRedis(session);

  return {
    sessionId,
    expiresAt: new Date(expiresAtMs).toISOString(),
    remainingRenders: env.PUBLIC_PREVIEW_MAX_RENDERS_PER_SESSION,
  };
}

export async function enforcePublicPreviewSessionCreationRateLimit(ip: string): Promise<RateLimitState> {
  return enforceRateLimit(
    sessionCreationLimiter,
    'create',
    ip,
    env.PUBLIC_PREVIEW_SESSION_CREATE_RATE_LIMIT_PER_MINUTE,
    60_000,
    'Too many preview session requests'
  );
}

export async function getPublicPreviewSessionOrThrow(
  sessionId: string,
  client: { ip: string; userAgent: string }
): Promise<PublicPreviewSessionRecord> {
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    throw new UnauthorizedError('Invalid preview session');
  }

  const now = nowMs();
  const redisLookup = await readSessionFromRedis(sessionId);
  if (redisLookup.available && redisLookup.session) {
    const session = redisLookup.session;
    if (now >= session.expiresAt) {
      await removeSessionFromRedis(sessionId);
      sessions.delete(sessionId);
      throw new UnauthorizedError('Preview session expired or missing');
    }

    assertMatchingSessionFingerprint(session, client);
    session.lastSeenAt = now;
    sessions.set(sessionId, session);
    await persistSessionToRedis(session);
    return session;
  }

  if (redisLookup.available && !redisLookup.session) {
    sessions.delete(sessionId);
    throw new UnauthorizedError('Preview session expired or missing');
  }

  return getLocalSessionOrThrow(sessionId, client);
}

export async function enforcePublicPreviewIpRateLimit(ip: string): Promise<RateLimitState> {
  return enforceRateLimit(
    ipLimiter,
    'ip',
    ip,
    env.PUBLIC_PREVIEW_IP_RATE_LIMIT_PER_MINUTE,
    60_000,
    'Public preview rate limit exceeded'
  );
}

export async function enforcePublicPreviewSessionRateLimit(sessionId: string): Promise<RateLimitState> {
  return enforceRateLimit(
    sessionLimiter,
    'session',
    sessionId,
    env.PUBLIC_PREVIEW_SESSION_RATE_LIMIT_PER_MINUTE,
    60_000,
    'Preview session rate limit exceeded'
  );
}

export async function consumePublicPreviewSessionQuota(sessionId: string): Promise<{
  remainingRenders: number;
  expiresAt: string;
}> {
  const now = nowMs();
  const redisResult = await withRedis(async (redis) => {
    const metaKey = getSessionMetaKey(sessionId);
    const rendersKey = getSessionRendersKey(sessionId);
    const metaRaw = await redis.get(metaKey);
    if (!metaRaw) {
      return { available: true as const, status: 'missing' as const };
    }

    let session: PublicPreviewSessionRecord;
    try {
      session = JSON.parse(metaRaw) as PublicPreviewSessionRecord;
    } catch {
      const prune = redis.multi();
      prune.del(metaKey);
      prune.del(rendersKey);
      prune.zrem(SESSION_INDEX_KEY, sessionId);
      await prune.exec();
      return { available: true as const, status: 'missing' as const };
    }

    if (now >= session.expiresAt) {
      const prune = redis.multi();
      prune.del(metaKey);
      prune.del(rendersKey);
      prune.zrem(SESSION_INDEX_KEY, sessionId);
      await prune.exec();
      return { available: true as const, status: 'missing' as const };
    }

    const ttlMs = Math.max(1_000, session.expiresAt - now);
    const nextCount = await redis.incr(rendersKey);
    await redis.pexpire(rendersKey, ttlMs);

    if (nextCount > env.PUBLIC_PREVIEW_MAX_RENDERS_PER_SESSION) {
      return {
        available: true as const,
        status: 'quota' as const,
        expiresAt: session.expiresAt,
      };
    }

    session.rendersUsed = nextCount;
    session.lastSeenAt = now;
    await redis.set(metaKey, JSON.stringify(session), 'PX', ttlMs);

    return {
      available: true as const,
      status: 'ok' as const,
      expiresAt: session.expiresAt,
      remaining: Math.max(0, env.PUBLIC_PREVIEW_MAX_RENDERS_PER_SESSION - nextCount),
      rendersUsed: nextCount,
    };
  });

  if (redisResult) {
    if (redisResult.status === 'missing') {
      sessions.delete(sessionId);
      throw new UnauthorizedError('Preview session expired or missing');
    }

    if (redisResult.status === 'quota') {
      const retryAfter = Math.max(1, Math.ceil((redisResult.expiresAt - now) / 1000));
      throw new RateLimitedError('Preview session quota exceeded', retryAfter);
    }

    const local = sessions.get(sessionId);
    if (local) {
      local.rendersUsed = redisResult.rendersUsed;
      local.lastSeenAt = now;
    }

    return {
      remainingRenders: redisResult.remaining,
      expiresAt: new Date(redisResult.expiresAt).toISOString(),
    };
  }

  const session = sessions.get(sessionId);
  if (!session) {
    throw new UnauthorizedError('Preview session expired or missing');
  }

  if (now >= session.expiresAt) {
    sessions.delete(sessionId);
    throw new UnauthorizedError('Preview session expired or missing');
  }

  if (session.rendersUsed >= env.PUBLIC_PREVIEW_MAX_RENDERS_PER_SESSION) {
    const retryAfter = Math.max(1, Math.ceil((session.expiresAt - now) / 1000));
    throw new RateLimitedError('Preview session quota exceeded', retryAfter);
  }

  session.rendersUsed += 1;
  session.lastSeenAt = now;

  return {
    remainingRenders: Math.max(0, env.PUBLIC_PREVIEW_MAX_RENDERS_PER_SESSION - session.rendersUsed),
    expiresAt: new Date(session.expiresAt).toISOString(),
  };
}

export function assertPublicPreviewSourceSize(source: string): void {
  if (source.length > 140_000) {
    throw new ValidationError('Public preview source exceeds safe render size');
  }
}

const cleanupInterval = setInterval(() => {
  const now = nowMs();
  purgeExpiredSessions(now);
  purgeExpiredRateEntries(ipLimiter, now);
  purgeExpiredRateEntries(sessionLimiter, now);
  purgeExpiredRateEntries(sessionCreationLimiter, now);
}, 60_000);

cleanupInterval.unref?.();
