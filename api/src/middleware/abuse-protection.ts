import { createMiddleware } from 'hono/factory';
import { createHash, randomInt } from 'node:crypto';
import { withRedis } from '../services/redis';
import { getAuthFingerprint, resolveClientIp } from '../services/auth-security';
import { ForbiddenError } from '../lib/errors';
import { env } from '../config/env';

interface CounterState {
  count: number;
  resetAt: number;
}

const localCounters = new Map<string, CounterState>();

const SHORT_WINDOW_MS = 60 * 1000;
const LONG_WINDOW_MS = 10 * 60 * 1000;

const MONITOR_SHORT_THRESHOLD = 25;
const MONITOR_LONG_THRESHOLD = 100;
const SUSPICIOUS_SHORT_THRESHOLD = 45;
const SUSPICIOUS_LONG_THRESHOLD = 180;
const BLOCK_SHORT_THRESHOLD = 70;
const BLOCK_LONG_THRESHOLD = 280;

const protectedAuthPaths = new Set([
  '/console/auth/register',
  '/console/auth/login',
  '/console/auth/verify-email',
  '/console/auth/resend-verification',
  '/console/auth/2fa/verify',
  '/console/auth/2fa/resend',
  '/console/auth/oauth/exchange',
]);

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function resolveLocalCounter(scope: string, key: string, windowMs: number): CounterState {
  const now = Date.now();
  const composite = `${scope}:${key}`;
  const existing = localCounters.get(composite);
  if (!existing || now >= existing.resetAt) {
    const next = {
      count: 1,
      resetAt: now + windowMs,
    };
    localCounters.set(composite, next);
    return next;
  }

  existing.count += 1;
  return existing;
}

async function resolveCounter(scope: string, key: string, windowMs: number): Promise<number> {
  const now = Date.now();
  const bucketStart = Math.floor(now / windowMs) * windowMs;
  const redisKey = `abuse:${scope}:${key}:${bucketStart}`;

  const distributedCount = await withRedis(async (redis) => {
    const next = await redis.incr(redisKey);
    if (next === 1) {
      await redis.pexpire(redisKey, windowMs + 2000);
    }
    return next;
  });

  if (distributedCount !== null) {
    return distributedCount;
  }

  return resolveLocalCounter(scope, key, windowMs).count;
}

function resolveAbuseKey(ip: string, fingerprintHash: string): string {
  return `${hashValue(ip)}:${fingerprintHash}`;
}

function isProtectedAuthMutation(method: string, path: string): boolean {
  if (method !== 'POST') return false;
  return protectedAuthPaths.has(path);
}

export const consoleAuthAbuseProtection = createMiddleware(async (c, next) => {
  if (!isProtectedAuthMutation(c.req.method, c.req.path)) {
    await next();
    return;
  }

  const fingerprint = getAuthFingerprint(c);
  const ip = resolveClientIp(c);
  const abuseKey = resolveAbuseKey(ip, fingerprint.fingerprintHash);

  const [shortCount, longCount] = await Promise.all([
    resolveCounter('auth_short', abuseKey, SHORT_WINDOW_MS),
    resolveCounter('auth_long', abuseKey, LONG_WINDOW_MS),
  ]);

  if (shortCount >= BLOCK_SHORT_THRESHOLD || longCount >= BLOCK_LONG_THRESHOLD) {
    throw new ForbiddenError('Request blocked for security reasons');
  }

  if (shortCount >= SUSPICIOUS_SHORT_THRESHOLD || longCount >= SUSPICIOUS_LONG_THRESHOLD) {
    if (env.NODE_ENV !== 'test') {
      await Bun.sleep(randomInt(150, 650));
    }
  } else if (shortCount >= MONITOR_SHORT_THRESHOLD || longCount >= MONITOR_LONG_THRESHOLD) {
    // Passive monitoring threshold crossed. Keep request flowing without user-facing throttling.
    console.warn('Auth abuse monitor threshold crossed', {
      path: c.req.path,
      shortCount,
      longCount,
      ipHash: hashValue(ip),
    });
  }

  await next();
});

export function resetAbuseCountersForTests(): void {
  localCounters.clear();
}
