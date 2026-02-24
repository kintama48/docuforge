import { createHash, randomBytes } from 'node:crypto';
import type { Context } from 'hono';
import { env } from '../config/env';
import { ForbiddenError, RateLimitedError, UnauthorizedError, ValidationError } from '../lib/errors';

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

function enforceRateLimit(
  limiter: Map<string, RateLimitEntry>,
  key: string,
  limit: number,
  windowMs: number,
  message: string
): RateLimitState {
  const now = nowMs();
  let entry = limiter.get(key);

  if (!entry || now >= entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
    limiter.set(key, entry);
  }

  entry.count += 1;
  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    throw new RateLimitedError(message, retryAfter);
  }

  return {
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

export function assertTrustedPublicPreviewOrigin(c: Context): void {
  const origin = c.req.header('Origin');
  if (!origin) return;
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

export function createPublicPreviewSession(client: { ip: string; userAgent: string }): {
  sessionId: string;
  expiresAt: string;
  remainingRenders: number;
} {
  const now = nowMs();
  purgeExpiredSessions(now);
  trimSessionStoreIfNeeded();

  const sessionId = `pps_${randomBytes(24).toString('base64url')}`;
  const expiresAtMs = now + env.PUBLIC_PREVIEW_SESSION_TTL_SECONDS * 1000;
  sessions.set(sessionId, {
    sessionId,
    ipHash: hashValue(client.ip),
    userAgentHash: hashValue(client.userAgent),
    createdAt: now,
    lastSeenAt: now,
    expiresAt: expiresAtMs,
    rendersUsed: 0,
  });

  return {
    sessionId,
    expiresAt: new Date(expiresAtMs).toISOString(),
    remainingRenders: env.PUBLIC_PREVIEW_MAX_RENDERS_PER_SESSION,
  };
}

export function enforcePublicPreviewSessionCreationRateLimit(ip: string): RateLimitState {
  return enforceRateLimit(
    sessionCreationLimiter,
    ip,
    env.PUBLIC_PREVIEW_SESSION_CREATE_RATE_LIMIT_PER_MINUTE,
    60_000,
    'Too many preview session requests'
  );
}

export function getPublicPreviewSessionOrThrow(
  sessionId: string,
  client: { ip: string; userAgent: string }
): PublicPreviewSessionRecord {
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    throw new UnauthorizedError('Invalid preview session');
  }

  const session = sessions.get(sessionId);
  if (!session) {
    throw new UnauthorizedError('Preview session expired or missing');
  }

  const now = nowMs();
  if (now >= session.expiresAt) {
    sessions.delete(sessionId);
    throw new UnauthorizedError('Preview session expired or missing');
  }

  if (session.ipHash !== hashValue(client.ip) || session.userAgentHash !== hashValue(client.userAgent)) {
    throw new ForbiddenError('Preview session fingerprint mismatch');
  }

  session.lastSeenAt = now;
  return session;
}

export function enforcePublicPreviewIpRateLimit(ip: string): RateLimitState {
  return enforceRateLimit(
    ipLimiter,
    ip,
    env.PUBLIC_PREVIEW_IP_RATE_LIMIT_PER_MINUTE,
    60_000,
    'Public preview rate limit exceeded'
  );
}

export function enforcePublicPreviewSessionRateLimit(sessionId: string): RateLimitState {
  return enforceRateLimit(
    sessionLimiter,
    sessionId,
    env.PUBLIC_PREVIEW_SESSION_RATE_LIMIT_PER_MINUTE,
    60_000,
    'Preview session rate limit exceeded'
  );
}

export function consumePublicPreviewSessionQuota(sessionId: string): {
  remainingRenders: number;
  expiresAt: string;
} {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new UnauthorizedError('Preview session expired or missing');
  }

  const now = nowMs();
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

setInterval(() => {
  const now = nowMs();
  purgeExpiredSessions(now);
  purgeExpiredRateEntries(ipLimiter, now);
  purgeExpiredRateEntries(sessionLimiter, now);
  purgeExpiredRateEntries(sessionCreationLimiter, now);
}, 60_000);
