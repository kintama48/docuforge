import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { generateUserId, generateApiKeyId, generateOauthId } from '../lib/id';
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../lib/api-key';
import { evictCachedKey } from '../services/key-cache';
import { createJwt, jwtAuth } from '../middleware/auth';
import { noCache } from '../middleware/cache';
import { zValidator, registerSchema, loginSchema, createApiKeySchema } from '../lib/validation';
import { ConflictError, UnauthorizedError, NotFoundError, ForbiddenError } from '../lib/errors';
import { env, getPlanLimit } from '../config/env';
import {
  buildAuthUrl,
  consumeOAuthState,
  createOAuthState,
  exchangeOAuthCode,
  fetchOAuthProfile,
  type OAuthProvider,
} from '../services/oauth';
import { createExchangeCode, consumeExchangeCode } from '../services/oauth-exchange';

const auth = new Hono();

// All auth endpoints are mutations — never cache
auth.use('*', noCache);

const oauthProviders: OAuthProvider[] = ['google', 'microsoft', 'github'];

function isValidProvider(provider: string): provider is OAuthProvider {
  return oauthProviders.includes(provider as OAuthProvider);
}

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

// GET /v1/auth/oauth/:provider - Start OAuth flow
auth.get('/oauth/:provider', async (c) => {
  const provider = c.req.param('provider');
  if (!isValidProvider(provider)) {
    throw new NotFoundError('OAuth provider not supported');
  }

  const redirect = c.req.query('redirect');
  const state = createOAuthState(provider, redirect);
  const url = buildAuthUrl(provider, state);
  return c.redirect(url);
});

// GET /v1/auth/oauth/:provider/callback - OAuth callback
auth.get('/oauth/:provider/callback', async (c) => {
  const provider = c.req.param('provider');
  if (!isValidProvider(provider)) {
    throw new NotFoundError('OAuth provider not supported');
  }

  const code = c.req.query('code');
  const state = c.req.query('state');
  if (!code || !state) {
    return c.redirect(`${env.APP_URL}/login?error=oauth_failed`);
  }

  const stateRecord = consumeOAuthState(state);
  if (!stateRecord || stateRecord.provider !== provider) {
    return c.redirect(`${env.APP_URL}/login?error=oauth_invalid_state`);
  }

  try {
    const accessToken = await exchangeOAuthCode(provider, code);
    const profile = await fetchOAuthProfile(provider, accessToken);
    const db = getDb();
    const now = Date.now();

    // Find user by OAuth account
    const [oauthAccount] = await db
      .select()
      .from(schema.oauthAccounts)
      .where(
        and(
          eq(schema.oauthAccounts.provider, provider),
          eq(schema.oauthAccounts.providerUserId, profile.providerUserId)
        )
      );

    let user = null;
    let rawKey: string | null = null;

    if (oauthAccount) {
      const [existingUser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, oauthAccount.userId));
      user = existingUser || null;
    }

    // API-M1 fix: Do NOT fall back to email matching alone.
    // Auto-linking by email allows account takeover if an attacker controls
    // the OAuth provider email. Only match by providerUserId (above).
    // If no OAuth account is found, create a new user instead.

    if (!user) {
      const passwordHash = await Bun.password.hash(crypto.randomUUID());
      const userId = generateUserId();
      user = {
        id: userId,
        email: profile.email,
        passwordHash,
        billingCustomerId: null,
        planTier: 'free',
        planRenders: getPlanLimit('free'),
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(schema.users).values(user);

      rawKey = generateRawApiKey();
      const keyHash = hashApiKey(rawKey);
      const keyPrefix = extractKeyPrefix(rawKey);
      const keyId = generateApiKeyId();
      await db.insert(schema.apiKeys).values({
        id: keyId,
        userId: user.id,
        keyHash,
        keyPrefix,
        name: 'Default',
        createdAt: now,
        isRevoked: false,
      });
    }

    if (!oauthAccount) {
      await db.insert(schema.oauthAccounts).values({
        id: generateOauthId(),
        userId: user.id,
        provider,
        providerUserId: profile.providerUserId,
        email: profile.email,
        createdAt: now,
      });
    }

    const token = await createJwt(user.id, user.email);

    // Create a short-lived exchange code instead of passing sensitive data in URL
    // This prevents tokens from being logged in browser history, server logs, referrer headers
    const exchangeCode = createExchangeCode({
      token,
      userId: user.id,
      email: user.email,
      plan: user.planTier,
      apiKey: rawKey,
      redirect: stateRecord.redirect,
    });

    const redirectUrl = new URL(`${env.APP_URL}/oauth/callback`);
    redirectUrl.searchParams.set('code', exchangeCode);

    return c.redirect(redirectUrl.toString());
  } catch (err) {
    console.error('OAuth error', err);
    return c.redirect(`${env.APP_URL}/login?error=oauth_failed`);
  }
});

// POST /v1/auth/oauth/exchange - Exchange OAuth code for credentials
auth.post('/oauth/exchange', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const code = body.code;

  if (!code || typeof code !== 'string') {
    throw new UnauthorizedError('Exchange code required');
  }

  const data = consumeExchangeCode(code);
  if (!data) {
    throw new UnauthorizedError('Invalid or expired exchange code');
  }

  const response: Record<string, unknown> = {
    token: data.token,
    user: {
      id: data.userId,
      email: data.email,
      plan: data.plan,
    },
  };

  if (data.apiKey) {
    response.api_key = data.apiKey;
  }

  if (data.redirect) {
    response.redirect = data.redirect;
  }

  return c.json(response);
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
