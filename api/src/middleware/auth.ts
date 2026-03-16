import { createMiddleware } from 'hono/factory';
import { jwtVerify, SignJWT } from 'jose';
import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { hashApiKey, hashApiKeyLegacy, isValidApiKeyFormat } from '../lib/api-key';
import { getCachedKey, setCachedKey } from '../services/key-cache';
import { UnauthorizedError } from '../lib/errors';
import { env } from '../config/env';
import type { AuthContext, PlanTier, JwtPayload } from '../types';

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

// JWT secret is validated at startup via env.ts (min 32 chars required)
// No fallback - if JWT_SECRET is missing, the app won't start
let jwtSecretCache: Uint8Array | null = null;
let jwtSecretCacheSource: string | null = null;

function getJwtSecret(): Uint8Array {
  if (!jwtSecretCache || jwtSecretCacheSource !== env.JWT_SECRET) {
    jwtSecretCacheSource = env.JWT_SECRET;
    jwtSecretCache = new TextEncoder().encode(jwtSecretCacheSource);
  }
  return jwtSecretCache;
}

export async function createJwt(userId: string, email: string): Promise<string> {
  const expiresIn = parseExpiry(env.AUTH_ACCESS_TOKEN_EXPIRY || env.JWT_EXPIRY);

  return new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecret());
}

function parseExpiry(expiry: string): string {
  // Already in correct format for jose (e.g., '7d', '1h')
  return expiry;
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

function isConsolePath(path: string): boolean {
  return path.startsWith('/console/');
}

function assertNonEmptyToken(token: string | null, message: string): asserts token is string {
  if (!token || token.trim().length === 0) {
    throw new UnauthorizedError(message);
  }
}

function normalizePlanTier(value: unknown): PlanTier {
  if (value === 'free' || value === 'dev' || value === 'starter' || value === 'pro') {
    return value;
  }
  return 'free';
}

function parseJwtPayload(payload: unknown): JwtPayload {
  if (!payload || typeof payload !== 'object') {
    throw new UnauthorizedError('Invalid or expired token');
  }

  const record = payload as Record<string, unknown>;
  const sub = typeof record.sub === 'string' ? record.sub : null;
  const email = typeof record.email === 'string' ? record.email : null;
  const iat = typeof record.iat === 'number' ? record.iat : null;
  const exp = typeof record.exp === 'number' ? record.exp : null;

  if (!sub || !email || iat === null || exp === null) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  return { sub, email, iat, exp };
}

async function verifyJwt(token: string): Promise<JwtPayload> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return parseJwtPayload(payload);
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

async function validateApiKey(rawKey: string): Promise<AuthContext> {
  if (!isValidApiKeyFormat(rawKey)) {
    throw new UnauthorizedError('Invalid API key format');
  }

  const secureHash = hashApiKey(rawKey);

  // Check cache first
  const cached = getCachedKey(secureHash);
  if (cached) {
    return { userId: cached.userId, planTier: cached.planTier };
  }

  // Query database
  const db = getDb();
  let [keyRecord] = await db
    .select({
      keyHash: schema.apiKeys.keyHash,
      userId: schema.apiKeys.userId,
      isRevoked: schema.apiKeys.isRevoked,
      planTier: schema.users.planTier,
    })
    .from(schema.apiKeys)
    .innerJoin(schema.users, eq(schema.apiKeys.userId, schema.users.id))
    .where(and(eq(schema.apiKeys.keyHash, secureHash), eq(schema.apiKeys.isRevoked, false)));

  let matchedHash = secureHash;
  if (!keyRecord) {
    // Backward compatibility for older SHA-256-only key hashes.
    const legacyHash = hashApiKeyLegacy(rawKey);

    const cachedLegacy = getCachedKey(legacyHash);
    if (cachedLegacy) {
      setCachedKey(secureHash, cachedLegacy);
      return { userId: cachedLegacy.userId, planTier: cachedLegacy.planTier };
    }

    [keyRecord] = await db
      .select({
        keyHash: schema.apiKeys.keyHash,
        userId: schema.apiKeys.userId,
        isRevoked: schema.apiKeys.isRevoked,
        planTier: schema.users.planTier,
      })
      .from(schema.apiKeys)
      .innerJoin(schema.users, eq(schema.apiKeys.userId, schema.users.id))
      .where(and(eq(schema.apiKeys.keyHash, legacyHash), eq(schema.apiKeys.isRevoked, false)));

    matchedHash = legacyHash;
  }

  if (!keyRecord) {
    throw new UnauthorizedError('Invalid or revoked API key');
  }

  // Cache the result
  setCachedKey(secureHash, {
    userId: keyRecord.userId,
    planTier: normalizePlanTier(keyRecord.planTier),
  });
  if (matchedHash !== secureHash) {
    setCachedKey(matchedHash, {
      userId: keyRecord.userId,
      planTier: normalizePlanTier(keyRecord.planTier),
    });
  }

  // Update last_used_at asynchronously and migrate legacy hashes in place
  const updates: Partial<typeof schema.apiKeys.$inferInsert> = {
    lastUsedAt: Date.now(),
  };
  if (matchedHash !== secureHash) {
    updates.keyHash = secureHash;
  }

  db.update(schema.apiKeys)
    .set(updates)
    .where(eq(schema.apiKeys.keyHash, matchedHash))
    .execute()
    .catch((err) => {
      console.error('Failed to update API key last_used_at:', err);
    });

  return { userId: keyRecord.userId, planTier: normalizePlanTier(keyRecord.planTier) };
}

async function validateJwt(token: string): Promise<AuthContext> {
  const payload = await verifyJwt(token);
  return { userId: payload.sub, email: payload.email };
}

// Middleware for API key authentication
export const apiKeyAuth = createMiddleware(async (c, next) => {
  const apiKey = c.req.header('X-API-Key');
  if (!apiKey) {
    throw new UnauthorizedError('API key required');
  }

  const auth = await validateApiKey(apiKey);
  c.set('auth', auth);
  await next();
});

// Middleware for JWT authentication
export const jwtAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const tokenFromCookie = readCookieValue(c.req.header('Cookie'), env.AUTH_COOKIE_NAME);
  const consoleRequest = isConsolePath(c.req.path);

  if (consoleRequest) {
    // Console routes are session-cookie only.
    assertNonEmptyToken(tokenFromCookie, 'Session cookie required');
    const auth = await validateJwt(tokenFromCookie);
    c.set('auth', auth);
    await next();
    return;
  }

  const token = tokenFromHeader || tokenFromCookie;
  assertNonEmptyToken(token, 'Bearer token required');

  const auth = await validateJwt(token);
  c.set('auth', auth);
  await next();
});

// Middleware that accepts either API key or JWT
export const flexibleAuth = createMiddleware(async (c, next) => {
  const consoleRequest = isConsolePath(c.req.path);
  const apiKey = c.req.header('X-API-Key');
  const authHeader = c.req.header('Authorization');
  const cookieToken = readCookieValue(c.req.header('Cookie'), env.AUTH_COOKIE_NAME);

  if (consoleRequest) {
    // Console routes are session-cookie only.
    assertNonEmptyToken(cookieToken, 'Session cookie required');
    const auth = await validateJwt(cookieToken);
    c.set('auth', auth);
    await next();
    return;
  }

  if (apiKey) {
    const auth = await validateApiKey(apiKey);
    c.set('auth', auth);
  } else if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const auth = await validateJwt(token);
    c.set('auth', auth);
  } else if (cookieToken) {
    const auth = await validateJwt(cookieToken);
    c.set('auth', auth);
  } else {
    throw new UnauthorizedError('Authentication required');
  }

  await next();
});
