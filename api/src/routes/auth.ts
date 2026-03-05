import { Hono } from 'hono';
import type { Context } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { generateUserId, generateApiKeyId, generateOauthId } from '../lib/id';
import { generateRawApiKey, hashApiKey, extractKeyPrefix } from '../lib/api-key';
import { evictCachedKey } from '../services/key-cache';
import { createJwt, jwtAuth } from '../middleware/auth';
import { consoleAuthMutationRateLimit } from '../middleware/rate-limit';
import { noCache } from '../middleware/cache';
import {
  zValidator,
  registerSchema,
  loginSchema,
  createApiKeySchema,
  verifyEmailSchema,
  resendEmailVerificationSchema,
  verifyTwoFactorSchema,
  resendTwoFactorSchema,
} from '../lib/validation';
import { ConflictError, UnauthorizedError, NotFoundError, ForbiddenError } from '../lib/errors';
import { env, getPlanLimit } from '../config/env';
import { sendTransactionalEmail } from '../services/email';
import {
  buildAuthUrl,
  consumeOAuthStateDistributed,
  createOAuthStateDistributed,
  exchangeOAuthCode,
  fetchOAuthProfile,
  sanitizeRedirectPath,
  type OAuthProvider,
} from '../services/oauth';
import { createExchangeCode, consumeExchangeCode } from '../services/oauth-exchange';
import { issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../services/refresh-token';
import {
  canonicalizeEmail,
  createOtpChallenge,
  enforceSignupAbuseGuards,
  getAuthFingerprint,
  getOtpLifetimeMinutes,
  normalizeEmail,
  resendOtpChallenge,
  upsertUserPin,
  verifyOtpChallenge,
} from '../services/auth-security';

const auth = new Hono();

// All auth endpoints are mutations — never cache
auth.use('*', noCache);

const oauthProviders: OAuthProvider[] = ['google', 'microsoft', 'github'];
const trustedBrowserOrigins = new Set([new URL(env.APP_URL).origin]);
if (env.NODE_ENV === 'development') {
  trustedBrowserOrigins.add('http://localhost:5173');
  trustedBrowserOrigins.add('http://127.0.0.1:5173');
  trustedBrowserOrigins.add('http://localhost:3000');
}

function isValidProvider(provider: string): provider is OAuthProvider {
  return oauthProviders.includes(provider as OAuthProvider);
}

function assertTrustedBrowserOrigin(c: Context) {
  const origin = c.req.header('Origin');
  if (!origin) return;
  if (!trustedBrowserOrigins.has(origin)) {
    throw new ForbiddenError('Cross-origin auth request blocked');
  }
}

async function createDefaultApiKey(
  userId: string,
  now: number
): Promise<{ rawKey: string; keyPrefix: string; name: string } | null> {
  const db = getDb();

  const [existing] = await db
    .select({ id: schema.apiKeys.id })
    .from(schema.apiKeys)
    .where(and(eq(schema.apiKeys.userId, userId), eq(schema.apiKeys.isRevoked, false)));

  if (existing) {
    return null;
  }

  const rawKey = generateRawApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = extractKeyPrefix(rawKey);
  const keyId = generateApiKeyId();
  const name = 'Default';

  await db.insert(schema.apiKeys).values({
    id: keyId,
    userId,
    keyHash,
    keyPrefix,
    name,
    createdAt: now,
    isRevoked: false,
  });

  return { rawKey, keyPrefix, name };
}

async function sendEmailVerificationCode(email: string, code: string): Promise<void> {
  const ttlMinutes = getOtpLifetimeMinutes();
  await sendTransactionalEmail({
    to: email,
    subject: 'Verify your DocuForge email',
    text: `Your DocuForge verification code is ${code}. It expires in ${ttlMinutes} minute(s).`,
  });
}

async function sendLoginCode(email: string, code: string): Promise<void> {
  const ttlMinutes = getOtpLifetimeMinutes();
  await sendTransactionalEmail({
    to: email,
    subject: 'Your DocuForge login verification code',
    text: `Your DocuForge login code is ${code}. It expires in ${ttlMinutes} minute(s).`,
  });
}

function setSessionCookie(c: Context, token: string) {
  if (!token || token.trim().length === 0) {
    throw new Error('Session token must be provided');
  }
  if (env.AUTH_COOKIE_MAX_AGE_SECONDS <= 0) {
    throw new Error('AUTH_COOKIE_MAX_AGE_SECONDS must be positive');
  }

  setCookie(c, env.AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.AUTH_COOKIE_SAME_SITE,
    path: '/',
    maxAge: env.AUTH_COOKIE_MAX_AGE_SECONDS,
    ...(env.AUTH_COOKIE_DOMAIN ? { domain: env.AUTH_COOKIE_DOMAIN } : {}),
  });
}

function setRefreshCookie(c: Context, token: string) {
  if (!token || token.trim().length === 0) {
    throw new Error('Refresh token must be provided');
  }
  if (env.AUTH_REFRESH_TOKEN_MAX_AGE_SECONDS <= 0) {
    throw new Error('AUTH_REFRESH_TOKEN_MAX_AGE_SECONDS must be positive');
  }

  setCookie(c, env.AUTH_REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.AUTH_COOKIE_SAME_SITE,
    path: '/',
    maxAge: env.AUTH_REFRESH_TOKEN_MAX_AGE_SECONDS,
    ...(env.AUTH_COOKIE_DOMAIN ? { domain: env.AUTH_COOKIE_DOMAIN } : {}),
  });
}

function clearSessionCookie(c: Context) {
  deleteCookie(c, env.AUTH_COOKIE_NAME, {
    path: '/',
    ...(env.AUTH_COOKIE_DOMAIN ? { domain: env.AUTH_COOKIE_DOMAIN } : {}),
  });
}

function clearRefreshCookie(c: Context) {
  deleteCookie(c, env.AUTH_REFRESH_COOKIE_NAME, {
    path: '/',
    ...(env.AUTH_COOKIE_DOMAIN ? { domain: env.AUTH_COOKIE_DOMAIN } : {}),
  });
}

async function issueSessionForUser(c: Context, user: { id: string; email: string }) {
  const accessToken = await createJwt(user.id, user.email);
  const { refreshToken } = await issueRefreshToken(user.id);

  setSessionCookie(c, accessToken);
  setRefreshCookie(c, refreshToken);

  return accessToken;
}

// POST /v1/auth/register
auth.post('/register', consoleAuthMutationRateLimit, zValidator('json', registerSchema), async (c) => {
  assertTrustedBrowserOrigin(c);
  const { email: rawEmail, password } = c.req.valid('json');
  const db = getDb();
  const now = Date.now();
  const email = normalizeEmail(rawEmail);
  const emailCanonical = canonicalizeEmail(email);
  const fingerprint = getAuthFingerprint(c);

  await enforceSignupAbuseGuards(fingerprint.fingerprintHash, fingerprint.ipHash, now);

  // Check if email already exists (canonicalized to reduce alias abuse)
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.emailCanonical, emailCanonical));

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
    emailCanonical,
    emailVerifiedAt: env.AUTH_EMAIL_VERIFICATION_REQUIRED ? null : now,
    passwordHash,
    planTier: 'free',
    planRenders: getPlanLimit('free'),
    signupFingerprintHash: fingerprint.fingerprintHash,
    signupIpHash: fingerprint.ipHash,
    createdAt: now,
    updatedAt: now,
  });

  await upsertUserPin(userId, fingerprint.fingerprintHash, fingerprint.ipHash, now);

  if (env.AUTH_EMAIL_VERIFICATION_REQUIRED) {
    const challenge = await createOtpChallenge({
      userId,
      email,
      purpose: 'email_verification',
      metadata: {
        fingerprint_hash: fingerprint.fingerprintHash,
        ip_hash: fingerprint.ipHash,
      },
    });

    await sendEmailVerificationCode(email, challenge.code);

    return c.json(
      {
        verification_required: true,
        challenge_id: challenge.challengeId,
        expires_in_ms: Math.max(0, challenge.expiresAt - now),
        resend_after_ms: Math.max(0, challenge.resendAvailableAt - now),
        user: {
          id: userId,
          email,
          plan: 'free',
        },
      },
      202
    );
  }

  const defaultKey = await createDefaultApiKey(userId, now);
  if (!defaultKey) {
    throw new UnauthorizedError('Unable to provision default API key');
  }

  const token = await issueSessionForUser(c, { id: userId, email });

  return c.json(
    {
      user: {
        id: userId,
        email,
        plan: 'free',
      },
      token,
      api_key: {
        raw_key: defaultKey.rawKey,
        prefix: defaultKey.keyPrefix,
        name: defaultKey.name,
        note: 'Save this key — it will not be shown again.',
      },
    },
    201
  );
});

// POST /v1/auth/login
auth.post('/login', consoleAuthMutationRateLimit, zValidator('json', loginSchema), async (c) => {
  assertTrustedBrowserOrigin(c);
  const { email: rawEmail, password } = c.req.valid('json');
  const db = getDb();
  const email = normalizeEmail(rawEmail);
  const emailCanonical = canonicalizeEmail(email);
  const now = Date.now();
  const fingerprint = getAuthFingerprint(c);

  // Find user
  let [user] = await db.select().from(schema.users).where(eq(schema.users.emailCanonical, emailCanonical));
  if (!user) {
    // Backward compatibility for records created before canonical email support.
    [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  }

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Verify password
  const valid = await Bun.password.verify(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (env.AUTH_EMAIL_VERIFICATION_REQUIRED && !user.emailVerifiedAt) {
    const challenge = await createOtpChallenge({
      userId: user.id,
      email: user.email,
      purpose: 'email_verification',
      metadata: {
        fingerprint_hash: fingerprint.fingerprintHash,
        ip_hash: fingerprint.ipHash,
      },
    });

    await sendEmailVerificationCode(user.email, challenge.code);

    return c.json(
      {
        verification_required: true,
        challenge_id: challenge.challengeId,
        expires_in_ms: Math.max(0, challenge.expiresAt - now),
        resend_after_ms: Math.max(0, challenge.resendAvailableAt - now),
      },
      403
    );
  }

  if (env.AUTH_2FA_REQUIRED) {
    const challenge = await createOtpChallenge({
      userId: user.id,
      email: user.email,
      purpose: 'login_2fa',
      metadata: {
        fingerprint_hash: fingerprint.fingerprintHash,
        ip_hash: fingerprint.ipHash,
      },
    });

    await sendLoginCode(user.email, challenge.code);

    return c.json({
      two_factor_required: true,
      challenge_id: challenge.challengeId,
      expires_in_ms: Math.max(0, challenge.expiresAt - now),
      resend_after_ms: Math.max(0, challenge.resendAvailableAt - now),
      user: {
        id: user.id,
        email: user.email,
        plan: user.planTier,
      },
    });
  }

  await upsertUserPin(user.id, fingerprint.fingerprintHash, fingerprint.ipHash, now);

  // Generate JWT
  const token = await issueSessionForUser(c, { id: user.id, email: user.email });

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      plan: user.planTier,
    },
  });
});

// POST /v1/auth/verify-email - Verify signup email using OTP code
auth.post('/verify-email', consoleAuthMutationRateLimit, zValidator('json', verifyEmailSchema), async (c) => {
  assertTrustedBrowserOrigin(c);
  const { challenge_id, code } = c.req.valid('json');
  const now = Date.now();
  const verified = await verifyOtpChallenge(challenge_id, 'email_verification', code);
  const db = getDb();

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, verified.userId));
  if (!user) {
    throw new UnauthorizedError('Invalid verification challenge');
  }

  if (!user.emailVerifiedAt) {
    await db
      .update(schema.users)
      .set({
        emailVerifiedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.users.id, user.id));
  }

  if (typeof verified.metadata?.fingerprint_hash === 'string') {
    const ipHash = typeof verified.metadata?.ip_hash === 'string' ? verified.metadata.ip_hash : null;
    await upsertUserPin(user.id, verified.metadata.fingerprint_hash, ipHash, now);
  }

  const defaultKey = await createDefaultApiKey(user.id, now);
  const token = await issueSessionForUser(c, { id: user.id, email: user.email });

  return c.json({
    email_verified: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      plan: user.planTier,
    },
    ...(defaultKey && {
      api_key: {
        raw_key: defaultKey.rawKey,
        prefix: defaultKey.keyPrefix,
        name: defaultKey.name,
        note: 'Save this key — it will not be shown again.',
      },
    }),
  });
});

// POST /v1/auth/resend-verification - Resend signup verification code
auth.post(
  '/resend-verification',
  consoleAuthMutationRateLimit,
  zValidator('json', resendEmailVerificationSchema),
  async (c) => {
  assertTrustedBrowserOrigin(c);
  const { challenge_id } = c.req.valid('json');
  const now = Date.now();
  const resent = await resendOtpChallenge(challenge_id, 'email_verification');
  await sendEmailVerificationCode(resent.email, resent.code);

  return c.json({
    sent: true,
    challenge_id: resent.challengeId,
    expires_in_ms: Math.max(0, resent.expiresAt - now),
    resend_after_ms: Math.max(0, resent.resendAvailableAt - now),
  });
});

// POST /v1/auth/2fa/verify - Verify login OTP code and issue JWT
auth.post('/2fa/verify', consoleAuthMutationRateLimit, zValidator('json', verifyTwoFactorSchema), async (c) => {
  assertTrustedBrowserOrigin(c);
  const { challenge_id, code } = c.req.valid('json');
  const now = Date.now();
  const verified = await verifyOtpChallenge(challenge_id, 'login_2fa', code);
  const db = getDb();

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, verified.userId));
  if (!user) {
    throw new UnauthorizedError('Invalid verification challenge');
  }

  if (typeof verified.metadata?.fingerprint_hash === 'string') {
    const ipHash = typeof verified.metadata?.ip_hash === 'string' ? verified.metadata.ip_hash : null;
    await upsertUserPin(user.id, verified.metadata.fingerprint_hash, ipHash, now);
  }

  const token = await issueSessionForUser(c, { id: user.id, email: user.email });
  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      plan: user.planTier,
    },
  });
});

// POST /v1/auth/2fa/resend - Resend login OTP code
auth.post('/2fa/resend', consoleAuthMutationRateLimit, zValidator('json', resendTwoFactorSchema), async (c) => {
  assertTrustedBrowserOrigin(c);
  const { challenge_id } = c.req.valid('json');
  const now = Date.now();
  const resent = await resendOtpChallenge(challenge_id, 'login_2fa');
  await sendLoginCode(resent.email, resent.code);

  return c.json({
    sent: true,
    challenge_id: resent.challengeId,
    expires_in_ms: Math.max(0, resent.expiresAt - now),
    resend_after_ms: Math.max(0, resent.resendAvailableAt - now),
  });
});

// GET /v1/auth/oauth/:provider - Start OAuth flow
auth.get('/oauth/:provider', async (c) => {
  const provider = c.req.param('provider');
  if (!isValidProvider(provider)) {
    throw new NotFoundError('OAuth provider not supported');
  }

  const redirect = c.req.query('redirect');
  const state = await createOAuthStateDistributed(provider, redirect);
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

  const stateRecord = await consumeOAuthStateDistributed(state);
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
        emailCanonical: canonicalizeEmail(profile.email),
        emailVerifiedAt: now,
        passwordHash,
        stripeCustomerId: null,
        signupFingerprintHash: null,
        signupIpHash: null,
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
    const exchangeCode = await createExchangeCode({
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
auth.post('/oauth/exchange', consoleAuthMutationRateLimit, async (c) => {
  assertTrustedBrowserOrigin(c);
  const body = await c.req.json().catch(() => ({}));
  const code = body.code;

  if (!code || typeof code !== 'string') {
    throw new UnauthorizedError('Exchange code required');
  }

  const data = await consumeExchangeCode(code);
  if (!data) {
    throw new UnauthorizedError('Invalid or expired exchange code');
  }

  const token = await issueSessionForUser(c, { id: data.userId, email: data.email });

  const response: Record<string, unknown> = {
    token,
    user: {
      id: data.userId,
      email: data.email,
      plan: data.plan,
    },
  };

  if (data.apiKey) {
    response.api_key = data.apiKey;
  }

  const safeRedirect = sanitizeRedirectPath(data.redirect);
  if (safeRedirect) {
    response.redirect = safeRedirect;
  }

  return c.json(response);
});

// POST /v1/auth/refresh - Rotate refresh token and issue new access token
auth.post('/refresh', consoleAuthMutationRateLimit, async (c) => {
  assertTrustedBrowserOrigin(c);
  const rawRefreshToken = getCookie(c, env.AUTH_REFRESH_COOKIE_NAME);
  if (!rawRefreshToken) {
    clearSessionCookie(c);
    clearRefreshCookie(c);
    throw new UnauthorizedError('Refresh token required');
  }

  const rotated = await rotateRefreshToken(rawRefreshToken);
  if (!rotated) {
    clearSessionCookie(c);
    clearRefreshCookie(c);
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const db = getDb();
  const [user] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      planTier: schema.users.planTier,
    })
    .from(schema.users)
    .where(eq(schema.users.id, rotated.userId));

  if (!user) {
    clearSessionCookie(c);
    clearRefreshCookie(c);
    throw new UnauthorizedError('Refresh token user not found');
  }

  const token = await createJwt(user.id, user.email);
  setSessionCookie(c, token);
  setRefreshCookie(c, rotated.refreshToken);

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      plan: user.planTier,
    },
  });
});

// POST /v1/auth/logout - clear browser session cookie
auth.post('/logout', consoleAuthMutationRateLimit, async (c) => {
  assertTrustedBrowserOrigin(c);
  const rawRefreshToken = getCookie(c, env.AUTH_REFRESH_COOKIE_NAME);
  if (rawRefreshToken) {
    await revokeRefreshToken(rawRefreshToken);
  }
  clearSessionCookie(c);
  clearRefreshCookie(c);
  return c.json({ message: 'Logged out' });
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
