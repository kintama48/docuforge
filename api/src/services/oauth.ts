import { env } from '../config/env';

export type OAuthProvider = 'google' | 'microsoft' | 'github';

// SCALING NOTE (API-M3): OAuth state is stored in-memory. This means:
// 1. State is lost on server restart (user must restart OAuth flow)
// 2. State is not shared across multiple instances (sticky sessions required)
// For multi-instance deployments, replace with Redis or database-backed storage.
const STATE_TTL_MS = 10 * 60 * 1000;
const STATE_CLEANUP_INTERVAL_MS = 60 * 1000;
const MAX_STATE_STORE_SIZE = 2048;
const stateStore = new Map<
  string,
  { provider: OAuthProvider; redirect: string | null; createdAt: number }
>();

const SAFE_REDIRECT_BASE = 'https://docuforge.local';

export function sanitizeRedirectPath(redirect?: string | null): string | null {
  if (!redirect) return null;
  const normalized = redirect.trim();
  if (!normalized || !normalized.startsWith('/')) return null;
  if (normalized.startsWith('//') || normalized.includes('\\')) return null;

  try {
    const parsed = new URL(normalized, SAFE_REDIRECT_BASE);
    if (parsed.origin !== SAFE_REDIRECT_BASE) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function pruneExpiredStates(now = Date.now()) {
  for (const [key, value] of stateStore.entries()) {
    if (now - value.createdAt > STATE_TTL_MS) {
      stateStore.delete(key);
    }
  }
}

function enforceStateStoreLimit() {
  while (stateStore.size >= MAX_STATE_STORE_SIZE) {
    const oldestKey = stateStore.keys().next().value as string | undefined;
    if (!oldestKey) break;
    stateStore.delete(oldestKey);
  }
}

export function createOAuthState(provider: OAuthProvider, redirect?: string | null) {
  const now = Date.now();
  pruneExpiredStates(now);
  enforceStateStoreLimit();

  const state = crypto.randomUUID();
  const safeRedirect = sanitizeRedirectPath(redirect);
  stateStore.set(state, {
    provider,
    redirect: safeRedirect,
    createdAt: now,
  });
  return state;
}

export function consumeOAuthState(state: string) {
  pruneExpiredStates();
  const record = stateStore.get(state);
  if (!record) return null;
  stateStore.delete(state);
  if (Date.now() - record.createdAt > STATE_TTL_MS) {
    return null;
  }
  return record;
}

const cleanupHandle = setInterval(() => {
  pruneExpiredStates();
}, STATE_CLEANUP_INTERVAL_MS);
cleanupHandle.unref?.();

function getRedirectUri(provider: OAuthProvider) {
  return `${env.API_URL}/v1/auth/oauth/${provider}/callback`;
}

function requireConfig(value: string | undefined, label: string) {
  if (!value) {
    throw new Error(`${label} is not configured`);
  }
  return value;
}

export function getProviderConfig(provider: OAuthProvider) {
  switch (provider) {
    case 'google':
      return {
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
        clientId: requireConfig(env.OAUTH_GOOGLE_CLIENT_ID, 'OAUTH_GOOGLE_CLIENT_ID'),
        clientSecret: requireConfig(env.OAUTH_GOOGLE_CLIENT_SECRET, 'OAUTH_GOOGLE_CLIENT_SECRET'),
        scope: 'openid email profile',
        redirectUri: getRedirectUri(provider),
      };
    case 'microsoft':
      return {
        authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userUrl: 'https://graph.microsoft.com/v1.0/me',
        clientId: requireConfig(env.OAUTH_MICROSOFT_CLIENT_ID, 'OAUTH_MICROSOFT_CLIENT_ID'),
        clientSecret: requireConfig(env.OAUTH_MICROSOFT_CLIENT_SECRET, 'OAUTH_MICROSOFT_CLIENT_SECRET'),
        scope: 'openid email profile User.Read',
        redirectUri: getRedirectUri(provider),
      };
    case 'github':
      return {
        authorizeUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userUrl: 'https://api.github.com/user',
        clientId: requireConfig(env.OAUTH_GITHUB_CLIENT_ID, 'OAUTH_GITHUB_CLIENT_ID'),
        clientSecret: requireConfig(env.OAUTH_GITHUB_CLIENT_SECRET, 'OAUTH_GITHUB_CLIENT_SECRET'),
        scope: 'read:user user:email',
        redirectUri: getRedirectUri(provider),
      };
  }
}

export function buildAuthUrl(provider: OAuthProvider, state: string) {
  const config = getProviderConfig(provider);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scope,
    state,
  });

  if (provider === 'google') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }

  if (provider === 'microsoft') {
    params.set('response_mode', 'query');
  }

  return `${config.authorizeUrl}?${params.toString()}`;
}

export async function exchangeOAuthCode(provider: OAuthProvider, code: string) {
  const config = getProviderConfig(provider);

  if (provider === 'github') {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
      }),
    });

    const data = (await response.json()) as { access_token?: string; error?: string };
    if (!response.ok || !data.access_token) {
      throw new Error(data.error || 'Failed to exchange GitHub code');
    }
    return data.access_token;
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !data.access_token) {
    throw new Error(data.error || 'Failed to exchange OAuth code');
  }

  return data.access_token;
}

export async function fetchOAuthProfile(provider: OAuthProvider, accessToken: string) {
  if (provider === 'github') {
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'docuforge',
      },
    });
    const userData = (await userResponse.json()) as {
      id: number;
      email: string | null;
      login: string;
    };

    let email = userData.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'docuforge',
        },
      });
      const emails = (await emailsResponse.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const primary = emails.find((item) => item.primary && item.verified);
      email = primary?.email || emails[0]?.email || null;
    }

    if (!email) {
      throw new Error('GitHub account has no public email');
    }

    return {
      providerUserId: String(userData.id),
      email,
    };
  }

  if (provider === 'google') {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = (await response.json()) as { sub: string; email: string };
    if (!data?.email) {
      throw new Error('Google account has no email');
    }
    return {
      providerUserId: data.sub,
      email: data.email,
    };
  }

  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = (await response.json()) as { id: string; mail?: string; userPrincipalName?: string };
  const email = data.mail || data.userPrincipalName;
  if (!email) {
    throw new Error('Microsoft account has no email');
  }
  return {
    providerUserId: data.id,
    email,
  };
}
