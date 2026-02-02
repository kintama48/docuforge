import { createMiddleware } from 'hono/factory';
import { RateLimitedError } from '../lib/errors';
import type { PlanTier } from '../types';

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
    limits: { free: 10, starter: 60, pro: 200 },
  },
  preview: {
    windowMs: 60 * 1000,
    limits: { free: 30, starter: 30, pro: 30 },
  },
  ai: {
    windowMs: 60 * 60 * 1000, // 1 hour
    limits: { free: 5, starter: 20, pro: 50 },
  },
  default: {
    windowMs: 60 * 1000,
    limits: { free: 60, starter: 60, pro: 60 },
  },
};

function getLimiter(name: string): Map<string, RateLimitEntry> {
  if (!limiters.has(name)) {
    limiters.set(name, new Map());
  }
  return limiters.get(name)!;
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
    const planTier = (auth.planTier || 'free') as PlanTier;
    const limit = config.limits[planTier];
    const now = Date.now();

    let entry = limiter.get(key);

    // Reset if window has passed
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + config.windowMs };
      limiter.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(Math.max(0, limit - entry.count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
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

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const limiter of limiters.values()) {
    for (const [key, entry] of limiter.entries()) {
      if (now >= entry.resetAt) {
        limiter.delete(key);
      }
    }
  }
}, 60 * 1000);
