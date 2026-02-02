import { createMiddleware } from 'hono/factory';
import { jwtVerify, SignJWT } from 'jose';
import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { hashApiKey, isValidApiKeyFormat } from '../lib/api-key';
import { getCachedKey, setCachedKey } from '../services/key-cache';
import { UnauthorizedError } from '../lib/errors';
import type { AuthContext, PlanTier, JwtPayload } from '../types';

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret');
}

export async function createJwt(userId: string, email: string): Promise<string> {
  const expiry = process.env.JWT_EXPIRY || '7d';
  const expiresIn = parseExpiry(expiry);

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

async function verifyJwt(token: string): Promise<JwtPayload> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

async function validateApiKey(rawKey: string): Promise<AuthContext> {
  if (!isValidApiKeyFormat(rawKey)) {
    throw new UnauthorizedError('Invalid API key format');
  }

  const keyHash = hashApiKey(rawKey);

  // Check cache first
  const cached = getCachedKey(keyHash);
  if (cached) {
    return { userId: cached.userId, planTier: cached.planTier };
  }

  // Query database
  const db = getDb();
  const [keyRecord] = await db
    .select({
      userId: schema.apiKeys.userId,
      isRevoked: schema.apiKeys.isRevoked,
      planTier: schema.users.planTier,
    })
    .from(schema.apiKeys)
    .innerJoin(schema.users, eq(schema.apiKeys.userId, schema.users.id))
    .where(and(eq(schema.apiKeys.keyHash, keyHash), eq(schema.apiKeys.isRevoked, false)));

  if (!keyRecord) {
    throw new UnauthorizedError('Invalid or revoked API key');
  }

  // Cache the result
  setCachedKey(keyHash, {
    userId: keyRecord.userId,
    planTier: keyRecord.planTier as PlanTier,
  });

  // Update last_used_at asynchronously (don't await)
  db.update(schema.apiKeys)
    .set({ lastUsedAt: Date.now() })
    .where(eq(schema.apiKeys.keyHash, keyHash))
    .execute()
    .catch(() => {});

  return { userId: keyRecord.userId, planTier: keyRecord.planTier as PlanTier };
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
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Bearer token required');
  }

  const token = authHeader.slice(7);
  const auth = await validateJwt(token);
  c.set('auth', auth);
  await next();
});

// Middleware that accepts either API key or JWT
export const flexibleAuth = createMiddleware(async (c, next) => {
  const apiKey = c.req.header('X-API-Key');
  const authHeader = c.req.header('Authorization');

  if (apiKey) {
    const auth = await validateApiKey(apiKey);
    c.set('auth', auth);
  } else if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const auth = await validateJwt(token);
    c.set('auth', auth);
  } else {
    throw new UnauthorizedError('Authentication required');
  }

  await next();
});
