import { env } from '../config/env';
import { InternalError } from '../lib/errors';
import { withRedis } from './redis';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
  replyTo?: string;
}

export interface MockEmailRecord extends EmailMessage {
  provider: 'mock';
  sentAt: number;
}

interface QuotaEntry {
  count: number;
  resetAt: number;
}

const mockOutbox: MockEmailRecord[] = [];
const quotaFallbackStore = new Map<string, QuotaEntry>();

function pushMockEmail(message: EmailMessage): void {
  mockOutbox.push({
    ...message,
    provider: 'mock',
    sentAt: Date.now(),
  });
}

function parseRetryAfterMs(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const seconds = Number(headerValue.trim());
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.ceil(seconds * 1000);
  }

  const timestamp = Date.parse(headerValue);
  if (Number.isFinite(timestamp)) {
    const delta = timestamp - Date.now();
    if (delta > 0) return delta;
  }

  return null;
}

function resolveFallbackQuotaWaitMs(scope: string, windowMs: number, limit: number): number {
  const now = Date.now();
  const bucketStart = Math.floor(now / windowMs) * windowMs;
  const key = `${scope}:${bucketStart}`;
  const entry = quotaFallbackStore.get(key);

  if (!entry || now >= entry.resetAt) {
    quotaFallbackStore.set(key, {
      count: 1,
      resetAt: bucketStart + windowMs,
    });
    return 0;
  }

  entry.count += 1;
  if (entry.count <= limit) {
    return 0;
  }

  return Math.max(250, entry.resetAt - now);
}

async function resolveQuotaWaitMs(scope: string, windowMs: number, limit: number): Promise<number> {
  const now = Date.now();
  const bucketStart = Math.floor(now / windowMs) * windowMs;
  const redisKey = `email_quota:${scope}:${bucketStart}`;

  const distributed = await withRedis(async (redis) => {
    const next = await redis.incr(redisKey);
    if (next === 1) {
      await redis.pexpire(redisKey, windowMs + 2000);
    }

    if (next <= limit) {
      return 0;
    }

    const ttl = await redis.pttl(redisKey);
    return ttl > 0 ? ttl : windowMs;
  });

  if (distributed !== null) {
    return distributed;
  }

  return resolveFallbackQuotaWaitMs(scope, windowMs, limit);
}

async function resolveResendQuotaDelayMs(): Promise<number> {
  const [perSecondWait, perMinuteWait, perDayWait] = await Promise.all([
    resolveQuotaWaitMs('per_second', 1_000, env.EMAIL_RESEND_MAX_PER_SECOND),
    resolveQuotaWaitMs('per_minute', 60_000, env.EMAIL_RESEND_MAX_PER_MINUTE),
    resolveQuotaWaitMs('per_day', 24 * 60 * 60 * 1000, env.EMAIL_RESEND_MAX_PER_DAY),
  ]);

  return Math.max(perSecondWait, perMinuteWait, perDayWait);
}

async function sendViaResendOnce(message: EmailMessage): Promise<{ ok: boolean; retryAfterMs: number | null; status: number }> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: message.from || env.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
      reply_to: message.replyTo,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  return {
    ok: response.ok,
    retryAfterMs: parseRetryAfterMs(response.headers.get('retry-after')),
    status: response.status,
  };
}

function computeBackoffMs(attempt: number, retryAfterMs: number | null): number {
  if (retryAfterMs && retryAfterMs > 0) {
    return Math.min(retryAfterMs, env.EMAIL_RESEND_RETRY_MAX_MS);
  }

  const base = env.EMAIL_RESEND_RETRY_BASE_MS;
  const exponential = Math.min(env.EMAIL_RESEND_RETRY_MAX_MS, base * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * 250);
  return exponential + jitter;
}

async function sendViaResend(message: EmailMessage): Promise<void> {
  if (!env.RESEND_API_KEY) {
    throw new InternalError('RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
  }

  const maxAttempts = Math.max(1, env.EMAIL_RESEND_MAX_RETRIES);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const quotaWaitMs = await resolveResendQuotaDelayMs();
      if (quotaWaitMs > 0) {
        if (attempt >= maxAttempts) {
          break;
        }
        await Bun.sleep(Math.min(quotaWaitMs, env.EMAIL_RESEND_RETRY_MAX_MS));
        continue;
      }

      const result = await sendViaResendOnce(message);
      if (result.ok) {
        return;
      }

      const retryable = result.status === 429 || result.status >= 500;
      if (!retryable || attempt >= maxAttempts) {
        break;
      }

      await Bun.sleep(computeBackoffMs(attempt, result.retryAfterMs));
    } catch (err) {
      if (attempt >= maxAttempts) {
        break;
      }

      const retryDelayMs = computeBackoffMs(attempt, null);
      await Bun.sleep(retryDelayMs);
      console.warn('Email provider call failed, retrying', {
        attempt,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  throw new InternalError('Unable to deliver email at the moment');
}

export async function sendTransactionalEmail(message: EmailMessage): Promise<void> {
  if (env.EMAIL_PROVIDER === 'mock') {
    pushMockEmail(message);
    return;
  }

  await sendViaResend(message);
}

export function listMockEmails(): MockEmailRecord[] {
  return [...mockOutbox];
}

export function clearMockEmails(): void {
  mockOutbox.length = 0;
}
