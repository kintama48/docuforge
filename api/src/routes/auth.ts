import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { generateUserId, generateApiKeyId } from '../lib/id';
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../lib/api-key';
import { evictCachedKey } from '../services/key-cache';
import { createJwt, jwtAuth } from '../middleware/auth';
import { zValidator, registerSchema, loginSchema, createApiKeySchema } from '../lib/validation';
import { ConflictError, UnauthorizedError, NotFoundError, ForbiddenError } from '../lib/errors';
import { getPlanLimit } from '../config/env';

const auth = new Hono();

// POST /v1/auth/register
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const db = getDb();
  const now = Date.now();

  // Check if email already exists
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));

  if (existing) {
    throw new ConflictError('Email already registered');
  }

  // Hash password
  const passwordHash = await Bun.password.hash(password);

  // Create user
  const userId = generateUserId();
  await db.insert(schema.users).values({
    id: userId,
    email,
    passwordHash,
    planTier: 'free',
    planRenders: getPlanLimit('free'),
    createdAt: now,
    updatedAt: now,
  });

  // Generate first API key
  const rawKey = generateRawApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = extractKeyPrefix(rawKey);
  const keyId = generateApiKeyId();

  await db.insert(schema.apiKeys).values({
    id: keyId,
    userId,
    keyHash,
    keyPrefix,
    name: 'Default',
    createdAt: now,
    isRevoked: false,
  });

  // Generate JWT
  const token = await createJwt(userId, email);

  return c.json(
    {
      user: {
        id: userId,
        email,
        plan: 'free',
      },
      token,
      api_key: {
        raw_key: rawKey,
        prefix: keyPrefix,
        name: 'Default',
        note: 'Save this key — it will not be shown again.',
      },
    },
    201
  );
});

// POST /v1/auth/login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const db = getDb();

  // Find user
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Verify password
  const valid = await Bun.password.verify(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Generate JWT
  const token = await createJwt(user.id, user.email);

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      plan: user.planTier,
    },
  });
});

// POST /v1/auth/keys - Create new API key
auth.post('/keys', jwtAuth, zValidator('json', createApiKeySchema), async (c) => {
  const { name } = c.req.valid('json');
  const { userId } = c.get('auth');
  const db = getDb();
  const now = Date.now();

  // Generate API key
  const rawKey = generateRawApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = extractKeyPrefix(rawKey);
  const keyId = generateApiKeyId();

  await db.insert(schema.apiKeys).values({
    id: keyId,
    userId,
    keyHash,
    keyPrefix,
    name,
    createdAt: now,
    isRevoked: false,
  });

  return c.json(
    {
      raw_key: rawKey,
      prefix: keyPrefix,
      name,
    },
    201
  );
});

// GET /v1/auth/keys - List API keys
auth.get('/keys', jwtAuth, async (c) => {
  const { userId } = c.get('auth');
  const db = getDb();

  const keys = await db
    .select({
      id: schema.apiKeys.id,
      prefix: schema.apiKeys.keyPrefix,
      name: schema.apiKeys.name,
      lastUsedAt: schema.apiKeys.lastUsedAt,
      createdAt: schema.apiKeys.createdAt,
    })
    .from(schema.apiKeys)
    .where(and(eq(schema.apiKeys.userId, userId), eq(schema.apiKeys.isRevoked, false)));

  return c.json({
    keys: keys.map((k) => ({
      id: k.id,
      prefix: k.prefix,
      name: k.name,
      last_used_at: k.lastUsedAt,
      created_at: k.createdAt,
    })),
  });
});

// DELETE /v1/auth/keys/:id - Revoke API key
auth.delete('/keys/:id', jwtAuth, async (c) => {
  const keyId = c.req.param('id');
  const { userId } = c.get('auth');
  const db = getDb();

  // Find key and verify ownership
  const [key] = await db
    .select()
    .from(schema.apiKeys)
    .where(and(eq(schema.apiKeys.id, keyId), eq(schema.apiKeys.userId, userId)));

  if (!key) {
    throw new NotFoundError('API key not found');
  }

  if (key.isRevoked) {
    throw new ForbiddenError('Key already revoked');
  }

  // Revoke key
  await db.update(schema.apiKeys).set({ isRevoked: true }).where(eq(schema.apiKeys.id, keyId));

  // Evict from cache
  evictCachedKey(key.keyHash);

  return c.json({ message: 'Key revoked' });
});

export default auth;
