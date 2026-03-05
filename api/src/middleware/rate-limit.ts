/**
 * In-memory rate limiter.
 *
 * SCALING NOTE (API-M2): This uses a per-process Map, so rate limits are
 * NOT shared across multiple server instances. For multi-instance deployments,
 * replace with a distributed rate limiter backed by Redis or similar.
 */
import { createHash } from 'node:crypto';
import { createMiddleware } from 'hono/factory';
import { RateLimitedError } from '../lib/errors';
import type { PlanTier } from '../types';
import { withRedis } from '../services/redis';
import { env } from '../config/env';
import { getAuthFingerprint, resolveClientIp } from '../services/auth-security';
import { assertPresent } from '../lib/assert';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limiters = new Map<string, Map<string, RateLimitEntry>>();

interface RateLimitConfig {
  windowMs: number;
  limits: Record<PlanTier, number>;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  render: {
    windowMs: 60 * 1000, // 1 minute
    limits: { free: 10, dev: 30, starter: 60, pro: 200 },
  },
  preview: {
    windowMs: 60 * 1000,
    limits: { free: 30, dev: 30, starter: 30, pro: 30 },
  },
  ai: {
    windowMs: 60 * 60 * 1000, // 1 hour
    limits: { free: 5, dev: 10, starter: 20, pro: 50 },
  },
  default: {
    windowMs: 60 * 1000,
    limits: { free: 60, dev: 60, starter: 60, pro: 60 },
  },
};

const CONSOLE_SESSION_WINDOW_MS = 60 * 1000;
const CONSOLE_SESSION_LIMIT = 120;
const CONSOLE_AUTH_MUTATION_WINDOW_MS = 5 * 60 * 1000;
const CONSOLE_AUTH_MUTATION_LIMIT = 12;

function getLimiter(name: string): Map<string, RateLimitEntry> {
  if (!limiters.has(name)) {
    limiters.set(name, new Map());
  }
  return assertPresent(limiters.get(name), `Limiter not initialized for ${name}`);
}

function normalizePlanTier(planTier: unknown): PlanTier {
  if (planTier === 'free' || planTier === 'dev' || planTier === 'starter' || planTier === 'pro') {
    return planTier;
  }
  return 'free';
}

async function incrementDistributedCounter(
  scope: string,
  key: string,
  windowMs: number
): Promise<{ count: number; resetAt: number } | null> {
  const now = Date.now();
  const bucketStart = Math.floor(now / windowMs) * windowMs;
  const resetAt = bucketStart + windowMs;
  const redisKey = `rl:${scope}:${key}:${bucketStart}`;

  const count = await withRedis(async (redis) => {
    const next = await redis.incr(redisKey);
    if (next === 1) {
      await redis.pexpire(redisKey, windowMs + 2000);
    }
    return next;
  });

  if (count === null) return null;
  return { count, resetAt };
}

function readCookieValue(cookieHeader: string | undefined, cookieName: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName === cookieName) {
      const value = rest.join('=');
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function resolveRateCount(
  scope: string,
  key: string,
  windowMs: number,
  limiter: Map<string, RateLimitEntry>
): Promise<{ count: number; resetAt: number }> {
  const distributed = await incrementDistributedCounter(scope, key, windowMs);
  if (distributed) {
    return distributed;
  }

  const now = Date.now();
  let entry = limiter.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    limiter.set(key, entry);
  }

  entry.count += 1;
  return { count: entry.count, resetAt: entry.resetAt };
}

export function createRateLimiter(configName: string) {
  const config = RATE_LIMIT_CONFIGS[configName] || RATE_LIMIT_CONFIGS.default;
  const limiter = getLimiter(configName);

  return createMiddleware(async (c, next) => {
    const auth = c.get('auth');
    if (!auth?.userId) {
      await next();
      return;
    }

    const key = auth.userId;
    const planTier = normalizePlanTier(auth.planTier);
    const limit = config.limits[planTier];
    const now = Date.now();

    const { count, resetAt } = await resolveRateCount(configName, key, config.windowMs, limiter);

    // Set rate limit headers
    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(Math.max(0, limit - count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

    if (count > limit) {
      const retryAfter = Math.ceil((resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      throw new RateLimitedError('Rate limit exceeded', retryAfter);
    }

    await next();
  });
}

export const renderRateLimit = createRateLimiter('render');
export const previewRateLimit = createRateLimiter('preview');
export const aiRateLimit = createRateLimiter('ai');
export const defaultRateLimit = createRateLimiter('default');
const consoleSessionLimiter = getLimiter('console_session');
const consoleAuthMutationLimiter = getLimiter('console_auth_mutation');

export const consoleSessionRateLimit = createMiddleware(async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    await next();
    return;
  }

  const token = readCookieValue(c.req.header('Cookie'), env.AUTH_COOKIE_NAME);
  const key = token && token.trim().length > 0
    ? `session:${hashValue(token)}`
    : `ip:${resolveClientIp(c)}`;
  const now = Date.now();
  const { count, resetAt } = await resolveRateCount(
    'console_session',
    key,
    CONSOLE_SESSION_WINDOW_MS,
    consoleSessionLimiter
  );

  c.header('X-RateLimit-Limit', String(CONSOLE_SESSION_LIMIT));
  c.header('X-RateLimit-Remaining', String(Math.max(0, CONSOLE_SESSION_LIMIT - count)));
  c.header('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

  if (count > CONSOLE_SESSION_LIMIT) {
    const retryAfter = Math.ceil((resetAt - now) / 1000);
    c.header('Retry-After', String(retryAfter));
    throw new RateLimitedError('Console rate limit exceeded', retryAfter);
  }

  await next();
});

export const consoleAuthMutationRateLimit = createMiddleware(async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    await next();
    return;
  }

  const fingerprint = getAuthFingerprint(c);
  const key = `${fingerprint.ipHash}:${fingerprint.fingerprintHash}`;
  const now = Date.now();
  const { count, resetAt } = await resolveRateCount(
    'console_auth_mutation',
    key,
    CONSOLE_AUTH_MUTATION_WINDOW_MS,
    consoleAuthMutationLimiter
  );

  c.header('X-RateLimit-Limit', String(CONSOLE_AUTH_MUTATION_LIMIT));
  c.header('X-RateLimit-Remaining', String(Math.max(0, CONSOLE_AUTH_MUTATION_LIMIT - count)));
  c.header('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

  if (count > CONSOLE_AUTH_MUTATION_LIMIT) {
    const retryAfter = Math.ceil((resetAt - now) / 1000);
    c.header('Retry-After', String(retryAfter));
    throw new RateLimitedError('Too many auth attempts', retryAfter);
  }

  await next();
});

// Cleanup old entries periodically
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const limiter of limiters.values()) {
    for (const [key, entry] of limiter.entries()) {
      if (now >= entry.resetAt) {
        limiter.delete(key);
      }
    }
  }
}, 60 * 1000);

cleanupInterval.unref?.();

export function resetRateLimitersForTests(): void {
  if (env.NODE_ENV !== 'test') {
    return;
  }
  for (const limiter of limiters.values()) {
    limiter.clear();
  }
}
