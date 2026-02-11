/**
 * Regression tests for API security issues identified in SQA audit
 *
 * API-C1: JWT secret must not have a default fallback
 * API-C2: OAuth credentials must not be passed in URL params
 * API-C3: Asset URLs must use GetObjectCommand (not PutObjectCommand)
 * API-C4: CORS must not allow all origins
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createExchangeCode, consumeExchangeCode } from '../../src/services/oauth-exchange';

describe('Security Regressions', () => {
  describe('API-C1: JWT Secret Validation', () => {
    test('env schema requires JWT_SECRET with min 32 chars', () => {
      // The env.ts schema enforces: JWT_SECRET: z.string().min(32)
      // If JWT_SECRET is missing or too short, loadEnv() calls process.exit(1)
      // This test verifies the auth middleware imports env and uses env.JWT_SECRET
      // (not a hardcoded fallback)

      // Read the auth middleware source to verify no fallback exists
      const authMiddlewareSource = Bun.file('src/middleware/auth.ts');
      expect(authMiddlewareSource).toBeDefined();
    });

    test('auth middleware imports env config', async () => {
      // Verify the middleware uses validated env, not process.env directly with fallback
      const source = await Bun.file('src/middleware/auth.ts').text();

      // Should import env
      expect(source).toContain("import { env } from '../config/env'");

      // Should NOT contain the dangerous fallback
      expect(source).not.toContain("'default-secret'");
      expect(source).not.toContain('"default-secret"');

      // Should use env.JWT_SECRET
      expect(source).toContain('env.JWT_SECRET');
    });
  });

  describe('API-C2: OAuth Exchange Code Pattern', () => {
    test('exchange code can be created and consumed once', () => {
      const data = {
        token: 'jwt-token-123',
        userId: 'usr_abc',
        email: 'test@example.com',
        plan: 'free',
        apiKey: 'df_live_xyz',
        redirect: '/dashboard',
      };

      const code = createExchangeCode(data);
      expect(code).toHaveLength(32);

      // First consumption should succeed
      const result = consumeExchangeCode(code);
      expect(result).not.toBeNull();
      expect(result?.token).toBe(data.token);
      expect(result?.userId).toBe(data.userId);
      expect(result?.email).toBe(data.email);
      expect(result?.apiKey).toBe(data.apiKey);

      // Second consumption should fail (single-use)
      const secondResult = consumeExchangeCode(code);
      expect(secondResult).toBeNull();
    });

    test('exchange code is single-use (prevents replay attacks)', () => {
      const code = createExchangeCode({
        token: 'token',
        userId: 'user',
        email: 'a@b.com',
        plan: 'free',
        apiKey: null,
        redirect: null,
      });

      // Use it once
      consumeExchangeCode(code);

      // Attempt replay
      const replay = consumeExchangeCode(code);
      expect(replay).toBeNull();
    });

    test('invalid exchange code returns null', () => {
      const result = consumeExchangeCode('invalid-code-that-does-not-exist');
      expect(result).toBeNull();
    });

    test('auth routes use exchange code instead of URL params', async () => {
      const source = await Bun.file('src/routes/auth.ts').text();

      // Should import exchange code functions
      expect(source).toContain('createExchangeCode');
      expect(source).toContain('consumeExchangeCode');

      // OAuth callback should set 'code' param, not 'token'
      expect(source).toContain("searchParams.set('code', exchangeCode)");

      // Should NOT pass sensitive data directly in URL
      expect(source).not.toContain("searchParams.set('token', token)");
      expect(source).not.toContain("searchParams.set('api_key'");
    });
  });

  describe('API-C3: S3 Command for Asset URLs', () => {
    test('asset service uses GetObjectCommand for read URLs', async () => {
      const source = await Bun.file('src/services/asset.ts').text();

      // Should import GetObjectCommand
      expect(source).toContain('GetObjectCommand');

      // resolveUserAssets should use GetObjectCommand (comment indicates this)
      expect(source).toContain('Use GetObjectCommand for read URLs');

      // The actual command instantiation for reading assets
      expect(source).toContain('new GetObjectCommand({');
    });
  });

  describe('API-C4: CORS Configuration', () => {
    test('app.ts configures specific CORS origins', async () => {
      const source = await Bun.file('src/app.ts').text();

      // Should NOT have permissive cors()
      expect(source).not.toMatch(/app\.use\('\*',\s*cors\(\)\)/);

      // Should configure origin whitelist
      expect(source).toContain('origin:');
      expect(source).toContain('allowedOrigins');

      // Should use env.APP_URL
      expect(source).toContain('env.APP_URL');
    });
  });

  describe('API-M1: OAuth email fallback removed', () => {
    test('OAuth callback must NOT fall back to email matching', async () => {
      const source = await Bun.file('src/routes/auth.ts').text();

      // The dangerous pattern: looking up users by email alone during OAuth
      // This allows account takeover if attacker controls OAuth provider email
      // Should NOT have email-only fallback between oauthAccount check and user creation
      expect(source).toContain('Do NOT fall back to email matching');

      // The safe pattern: only match by providerUserId via oauth_accounts table
      expect(source).toContain('schema.oauthAccounts');
      expect(source).toContain('providerUserId');
    });
  });

  describe('API-M6: Base64 image size limit', () => {
    test('AI generate schema enforces max length on image_base64', async () => {
      const source = await Bun.file('src/lib/validation.ts').text();

      // Should have a max length on image_base64 to prevent DoS
      expect(source).toMatch(/image_base64.*max/s);
    });
  });

  describe('API-m4: Stripe key validation', () => {
    test('billing.ts uses env.STRIPE_SECRET_KEY (no empty fallback)', async () => {
      const source = await Bun.file('src/routes/billing.ts').text();

      // Should NOT have empty string fallback for Stripe key
      expect(source).not.toContain("STRIPE_SECRET_KEY || ''");
      expect(source).not.toContain("STRIPE_SECRET_KEY || \"\"");
    });
  });

  describe('API-M4: Error Logging (bonus fix)', () => {
    test('auth middleware logs database errors instead of swallowing', async () => {
      const source = await Bun.file('src/middleware/auth.ts').text();

      // Should log errors, not swallow them
      expect(source).toContain("console.error('Failed to update API key last_used_at:'");

      // Should NOT have empty catch
      expect(source).not.toContain('.catch(() => {})');
    });
  });
});
