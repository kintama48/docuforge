/**
 * OAuth Code Exchange Service
 *
 * Implements a secure code exchange pattern for OAuth callbacks.
 * Instead of passing sensitive tokens directly in URL params (which get logged),
 * we generate a short-lived, single-use code that can be exchanged via POST.
 */

import { nanoid } from 'nanoid';
import { withRedis } from './redis';

interface OAuthExchangeData {
  token: string;
  userId: string;
  email: string;
  plan: string;
  apiKey: string | null;
  redirect: string | null;
  createdAt: number;
}

// Fallback in-memory store (used when Redis is unavailable)
const exchangeStore = new Map<string, OAuthExchangeData>();

// Code expiry: 60 seconds (codes should be exchanged immediately)
const CODE_EXPIRY_MS = 60 * 1000;
const REDIS_PREFIX = 'oauth:exchange';

// Cleanup interval: every 30 seconds
const CLEANUP_INTERVAL_MS = 30 * 1000;

/**
 * Create a short-lived exchange code that can be used to retrieve OAuth credentials
 */
export async function createExchangeCode(data: Omit<OAuthExchangeData, 'createdAt'>): Promise<string> {
  const code = nanoid(32);
  const payload: OAuthExchangeData = {
    ...data,
    createdAt: Date.now(),
  };
  exchangeStore.set(code, payload);

  await withRedis(async (redis) => {
    await redis.set(`${REDIS_PREFIX}:${code}`, JSON.stringify(payload), 'PX', CODE_EXPIRY_MS);
  });

  return code;
}

/**
 * Consume an exchange code and return the associated credentials.
 * Returns null if the code is invalid, expired, or already used.
 */
export async function consumeExchangeCode(code: string): Promise<OAuthExchangeData | null> {
  const redisLookup = await withRedis(async (redis) => {
    const key = `${REDIS_PREFIX}:${code}`;
    const raw = await redis.get(key);
    if (raw) {
      await redis.del(key);
    }
    return { raw };
  });

  if (redisLookup) {
    exchangeStore.delete(code);
    if (!redisLookup.raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(redisLookup.raw) as OAuthExchangeData;
      if (Date.now() - parsed.createdAt > CODE_EXPIRY_MS) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  const data = exchangeStore.get(code);

  if (!data) {
    return null;
  }

  // Always delete the code (single-use)
  exchangeStore.delete(code);

  // Check expiry
  if (Date.now() - data.createdAt > CODE_EXPIRY_MS) {
    return null;
  }

  return data;
}

// Periodic cleanup of expired codes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [code, data] of exchangeStore.entries()) {
    if (now - data.createdAt > CODE_EXPIRY_MS) {
      exchangeStore.delete(code);
    }
  }
}, CLEANUP_INTERVAL_MS);

cleanupInterval.unref?.();
