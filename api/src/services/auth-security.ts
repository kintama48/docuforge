import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import type { Context } from 'hono';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { env } from '../config/env';
import { ForbiddenError, RateLimitedError, UnauthorizedError } from '../lib/errors';
import { generateOtpChallengeId, generatePinId } from '../lib/id';
import { getDb, schema } from '../db/client';

export type OtpPurpose = 'email_verification' | 'login_2fa';

const OTP_CODE_PATTERN = /^\d{6}$/;

export interface AuthFingerprint {
  ip: string;
  ipHash: string;
  userAgent: string;
  userAgentHash: string;
  fingerprintHash: string;
}

function hashString(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeIp(raw: string | undefined): string {
  const value = (raw || '').trim();
  if (!value) return 'unknown';
  return value.slice(0, 128);
}

export function resolveClientIp(c: Context): string {
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

function normalizeUserAgent(raw: string | undefined): string {
  const value = (raw || '').trim();
  if (!value) return 'unknown';
  return value.slice(0, 256);
}

export function getAuthFingerprint(c: Context): AuthFingerprint {
  const ip = resolveClientIp(c);
  const userAgent = normalizeUserAgent(c.req.header('User-Agent'));
  const acceptLanguage = (c.req.header('Accept-Language') || '').trim().slice(0, 120);
  const secChUa = (c.req.header('Sec-CH-UA') || '').trim().slice(0, 160);
  const secChUaPlatform = (c.req.header('Sec-CH-UA-Platform') || '').trim().slice(0, 120);
  const deviceId = (c.req.header('X-Device-Id') || '').trim().slice(0, 120);

  const fingerprintSeed = [userAgent, acceptLanguage, secChUa, secChUaPlatform, deviceId].join('|');
  const fingerprintHash = hashString(fingerprintSeed || 'unknown');

  return {
    ip,
    ipHash: hashString(ip),
    userAgent,
    userAgentHash: hashString(userAgent),
    fingerprintHash,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function canonicalizeEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const [localPart, domain] = normalized.split('@');
  if (!localPart || !domain) return normalized;

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const withoutAlias = localPart.split('+')[0];
    const withoutDots = withoutAlias.replace(/\./g, '');
    return `${withoutDots}@gmail.com`;
  }

  return normalized;
}

function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function hashOtpCode(challengeId: string, purpose: OtpPurpose, code: string): string {
  return hashString(`${env.JWT_SECRET}:${challengeId}:${purpose}:${code}`);
}

function safeStringEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function enforceSignupAbuseGuards(
  fingerprintHash: string,
  ipHash: string,
  now: number
): Promise<void> {
  const db = getDb();

  const [accountsByFingerprint] = await db
    .select({ count: sql<number>`count(distinct ${schema.userPins.userId})` })
    .from(schema.userPins)
    .where(eq(schema.userPins.fingerprintHash, fingerprintHash));

  const accountCount = Number(accountsByFingerprint?.count || 0);
  if (accountCount >= env.AUTH_MAX_ACCOUNTS_PER_FINGERPRINT) {
    throw new ForbiddenError('Too many accounts associated with this device fingerprint');
  }

  const dayAgo = now - 24 * 60 * 60 * 1000;
  const [signupCountByFingerprint] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.signupFingerprintHash, fingerprintHash),
        gt(schema.users.createdAt, dayAgo)
      )
    );

  const fingerprintSignupCount = Number(signupCountByFingerprint?.count || 0);
  if (fingerprintSignupCount >= env.AUTH_MAX_SIGNUPS_PER_FINGERPRINT_PER_DAY) {
    throw new RateLimitedError(
      'Too many signups from this device fingerprint',
      60 * 60
    );
  }

  const [signupCountByIp] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.users)
    .where(and(eq(schema.users.signupIpHash, ipHash), gt(schema.users.createdAt, dayAgo)));

  const ipSignupCount = Number(signupCountByIp?.count || 0);
  if (ipSignupCount >= env.AUTH_MAX_SIGNUPS_PER_IP_PER_DAY) {
    throw new RateLimitedError('Too many signups from this network', 60 * 60);
  }
}

export async function upsertUserPin(
  userId: string,
  fingerprintHash: string,
  ipHash: string | null,
  now: number
): Promise<void> {
  if (!fingerprintHash) return;
  const db = getDb();

  const [existing] = await db
    .select({ id: schema.userPins.id })
    .from(schema.userPins)
    .where(
      and(
        eq(schema.userPins.userId, userId),
        eq(schema.userPins.fingerprintHash, fingerprintHash)
      )
    );

  if (existing) {
    await db
      .update(schema.userPins)
      .set({
        lastSeenAt: now,
        ipHash,
      })
      .where(eq(schema.userPins.id, existing.id));
    return;
  }

  await db.insert(schema.userPins).values({
    id: generatePinId(),
    userId,
    fingerprintHash,
    ipHash,
    firstSeenAt: now,
    lastSeenAt: now,
    createdAt: now,
  });
}

export async function createOtpChallenge(input: {
  userId: string;
  email: string;
  purpose: OtpPurpose;
  metadata?: Record<string, unknown> | null;
}): Promise<{
  challengeId: string;
  code: string;
  expiresAt: number;
  resendAvailableAt: number;
}> {
  const db = getDb();
  const challengeId = generateOtpChallengeId();
  const code = generateOtpCode();
  const now = Date.now();
  const expiresAt = now + env.AUTH_OTP_TTL_MS;
  const resendAvailableAt = now + env.AUTH_OTP_RESEND_COOLDOWN_MS;

  await db.insert(schema.authOtpChallenges).values({
    id: challengeId,
    userId: input.userId,
    purpose: input.purpose,
    email: input.email,
    codeHash: hashOtpCode(challengeId, input.purpose, code),
    expiresAt,
    resendAvailableAt,
    attempts: 0,
    maxAttempts: env.AUTH_OTP_MAX_ATTEMPTS,
    sentCount: 1,
    consumedAt: null,
    metadata: input.metadata || null,
    createdAt: now,
    updatedAt: now,
  });

  return { challengeId, code, expiresAt, resendAvailableAt };
}

export async function resendOtpChallenge(
  challengeId: string,
  purpose: OtpPurpose
): Promise<{
  challengeId: string;
  code: string;
  email: string;
  expiresAt: number;
  resendAvailableAt: number;
}> {
  const db = getDb();
  const now = Date.now();
  const [challenge] = await db
    .select()
    .from(schema.authOtpChallenges)
    .where(
      and(
        eq(schema.authOtpChallenges.id, challengeId),
        eq(schema.authOtpChallenges.purpose, purpose),
        isNull(schema.authOtpChallenges.consumedAt)
      )
    );

  if (!challenge || now >= challenge.expiresAt) {
    throw new UnauthorizedError('Challenge expired or invalid');
  }

  if (challenge.sentCount >= env.AUTH_OTP_MAX_SENDS) {
    const retryAfter = Math.max(1, Math.ceil((challenge.expiresAt - now) / 1000));
    throw new RateLimitedError('Maximum resend limit reached for this challenge', retryAfter);
  }

  if (now < challenge.resendAvailableAt) {
    const retryAfter = Math.max(1, Math.ceil((challenge.resendAvailableAt - now) / 1000));
    throw new RateLimitedError('Please wait before requesting another verification code', retryAfter);
  }

  const code = generateOtpCode();
  const expiresAt = now + env.AUTH_OTP_TTL_MS;
  const resendAvailableAt = now + env.AUTH_OTP_RESEND_COOLDOWN_MS;

  await db
    .update(schema.authOtpChallenges)
    .set({
      codeHash: hashOtpCode(challenge.id, purpose, code),
      expiresAt,
      resendAvailableAt,
      attempts: 0,
      sentCount: challenge.sentCount + 1,
      updatedAt: now,
    })
    .where(eq(schema.authOtpChallenges.id, challenge.id));

  return {
    challengeId: challenge.id,
    code,
    email: challenge.email,
    expiresAt,
    resendAvailableAt,
  };
}

export async function verifyOtpChallenge(
  challengeId: string,
  purpose: OtpPurpose,
  code: string
): Promise<{
  userId: string;
  email: string;
  metadata: Record<string, unknown> | null;
}> {
  if (!OTP_CODE_PATTERN.test(code)) {
    throw new UnauthorizedError('Invalid verification code');
  }

  const db = getDb();
  const now = Date.now();
  const [challenge] = await db
    .select()
    .from(schema.authOtpChallenges)
    .where(
      and(
        eq(schema.authOtpChallenges.id, challengeId),
        eq(schema.authOtpChallenges.purpose, purpose),
        isNull(schema.authOtpChallenges.consumedAt)
      )
    );

  if (!challenge || now >= challenge.expiresAt) {
    throw new UnauthorizedError('Challenge expired or invalid');
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    throw new UnauthorizedError('Too many invalid code attempts');
  }

  const expectedHash = hashOtpCode(challenge.id, purpose, code);
  const isValid = safeStringEqual(challenge.codeHash, expectedHash);

  if (!isValid) {
    await db
      .update(schema.authOtpChallenges)
      .set({
        attempts: challenge.attempts + 1,
        updatedAt: now,
      })
      .where(eq(schema.authOtpChallenges.id, challenge.id));

    throw new UnauthorizedError('Invalid verification code');
  }

  await db
    .update(schema.authOtpChallenges)
    .set({
      consumedAt: now,
      updatedAt: now,
    })
    .where(eq(schema.authOtpChallenges.id, challenge.id));

  return {
    userId: challenge.userId,
    email: challenge.email,
    metadata: (challenge.metadata as Record<string, unknown> | null) || null,
  };
}

export function getOtpLifetimeMinutes(): number {
  return Math.max(1, Math.ceil(env.AUTH_OTP_TTL_MS / 60_000));
}
