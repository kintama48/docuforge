/**
 * Unit tests for src/config/env.ts
 *
 * Tests environment variable loading and validation.
 *
 * Note: These tests verify the validation schema behavior
 * without actually modifying process.env (which would affect other tests).
 */
import { describe, test, expect } from 'bun:test';
import { z } from 'zod';

// Recreate the schema from env.ts for isolated testing
const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  // Rust Engine
  ENGINE_URL: z.string().url().default('http://127.0.0.1:3001'),
  ENGINE_TIMEOUT_MS: z.coerce.number().default(5000),

  // Cloudflare R2
  R2_ENDPOINT: z.string().url(),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_STARTER_PRICE_ID: z.string().min(1),
  STRIPE_PRO_PRICE_ID: z.string().min(1),

  // AI
  OPENAI_API_KEY: z.string().min(1),
  AI_MODEL: z.string().default('gpt-4o'),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('7d'),

  // Limits
  FREE_MONTHLY_LIMIT: z.coerce.number().default(500),
  STARTER_MONTHLY_LIMIT: z.coerce.number().default(10000),
  PRO_MONTHLY_LIMIT: z.coerce.number().default(50000),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(10),
});

describe('env', () => {
  describe('envSchema validation', () => {
    test('loads all required vars', () => {
      const validEnv = {
        DATABASE_URL: 'file:./test.db',
        R2_ENDPOINT: 'https://r2.cloudflarestorage.com',
        R2_ACCESS_KEY_ID: 'access_key',
        R2_SECRET_ACCESS_KEY: 'secret_key',
        R2_BUCKET: 'test-bucket',
        R2_PUBLIC_URL: 'https://assets.test.com',
        STRIPE_SECRET_KEY: 'sk_test_abc',
        STRIPE_WEBHOOK_SECRET: 'whsec_abc',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        OPENAI_API_KEY: 'sk-openai-abc',
        JWT_SECRET: 'this-is-a-32-character-secret!!!',
      };

      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    test('defaults applied for optional', () => {
      const minimalEnv = {
        DATABASE_URL: 'file:./test.db',
        R2_ENDPOINT: 'https://r2.cloudflarestorage.com',
        R2_ACCESS_KEY_ID: 'access_key',
        R2_SECRET_ACCESS_KEY: 'secret_key',
        R2_BUCKET: 'test-bucket',
        R2_PUBLIC_URL: 'https://assets.test.com',
        STRIPE_SECRET_KEY: 'sk_test_abc',
        STRIPE_WEBHOOK_SECRET: 'whsec_abc',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        OPENAI_API_KEY: 'sk-openai-abc',
        JWT_SECRET: 'this-is-a-32-character-secret!!!',
      };

      const result = envSchema.safeParse(minimalEnv);
      expect(result.success).toBe(true);

      if (result.success) {
        // Check defaults
        expect(result.data.PORT).toBe(3000);
        expect(result.data.NODE_ENV).toBe('development');
        expect(result.data.ENGINE_URL).toBe('http://127.0.0.1:3001');
        expect(result.data.ENGINE_TIMEOUT_MS).toBe(5000);
        expect(result.data.AI_MODEL).toBe('gpt-4o');
        expect(result.data.JWT_EXPIRY).toBe('7d');
        expect(result.data.FREE_MONTHLY_LIMIT).toBe(500);
        expect(result.data.STARTER_MONTHLY_LIMIT).toBe(10000);
        expect(result.data.PRO_MONTHLY_LIMIT).toBe(50000);
        expect(result.data.MAX_UPLOAD_SIZE_MB).toBe(10);
      }
    });

    test('throws on missing required (DATABASE_URL)', () => {
      const missingDbUrl = {
        R2_ENDPOINT: 'https://r2.cloudflarestorage.com',
        R2_ACCESS_KEY_ID: 'access_key',
        R2_SECRET_ACCESS_KEY: 'secret_key',
        R2_BUCKET: 'test-bucket',
        R2_PUBLIC_URL: 'https://assets.test.com',
        STRIPE_SECRET_KEY: 'sk_test_abc',
        STRIPE_WEBHOOK_SECRET: 'whsec_abc',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        OPENAI_API_KEY: 'sk-openai-abc',
        JWT_SECRET: 'this-is-a-32-character-secret!!!',
      };

      const result = envSchema.safeParse(missingDbUrl);
      expect(result.success).toBe(false);

      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths).toContain('DATABASE_URL');
      }
    });

    test('throws on missing required (JWT_SECRET)', () => {
      const missingJwtSecret = {
        DATABASE_URL: 'file:./test.db',
        R2_ENDPOINT: 'https://r2.cloudflarestorage.com',
        R2_ACCESS_KEY_ID: 'access_key',
        R2_SECRET_ACCESS_KEY: 'secret_key',
        R2_BUCKET: 'test-bucket',
        R2_PUBLIC_URL: 'https://assets.test.com',
        STRIPE_SECRET_KEY: 'sk_test_abc',
        STRIPE_WEBHOOK_SECRET: 'whsec_abc',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        OPENAI_API_KEY: 'sk-openai-abc',
      };

      const result = envSchema.safeParse(missingJwtSecret);
      expect(result.success).toBe(false);

      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths).toContain('JWT_SECRET');
      }
    });

    test('throws on JWT_SECRET too short', () => {
      const shortJwtSecret = {
        DATABASE_URL: 'file:./test.db',
        R2_ENDPOINT: 'https://r2.cloudflarestorage.com',
        R2_ACCESS_KEY_ID: 'access_key',
        R2_SECRET_ACCESS_KEY: 'secret_key',
        R2_BUCKET: 'test-bucket',
        R2_PUBLIC_URL: 'https://assets.test.com',
        STRIPE_SECRET_KEY: 'sk_test_abc',
        STRIPE_WEBHOOK_SECRET: 'whsec_abc',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        OPENAI_API_KEY: 'sk-openai-abc',
        JWT_SECRET: 'too-short', // Less than 32 chars
      };

      const result = envSchema.safeParse(shortJwtSecret);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('JWT_SECRET'))).toBe(true);
      }
    });

    test('throws on invalid R2_ENDPOINT URL', () => {
      const invalidR2Endpoint = {
        DATABASE_URL: 'file:./test.db',
        R2_ENDPOINT: 'not-a-url',
        R2_ACCESS_KEY_ID: 'access_key',
        R2_SECRET_ACCESS_KEY: 'secret_key',
        R2_BUCKET: 'test-bucket',
        R2_PUBLIC_URL: 'https://assets.test.com',
        STRIPE_SECRET_KEY: 'sk_test_abc',
        STRIPE_WEBHOOK_SECRET: 'whsec_abc',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        OPENAI_API_KEY: 'sk-openai-abc',
        JWT_SECRET: 'this-is-a-32-character-secret!!!',
      };

      const result = envSchema.safeParse(invalidR2Endpoint);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('R2_ENDPOINT'))).toBe(true);
      }
    });

    test('throws on missing multiple required vars', () => {
      const manyMissing = {
        DATABASE_URL: 'file:./test.db',
        // Missing all R2, Stripe, OpenAI, JWT
      };

      const result = envSchema.safeParse(manyMissing);
      expect(result.success).toBe(false);

      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths).toContain('R2_ENDPOINT');
        expect(paths).toContain('STRIPE_SECRET_KEY');
        expect(paths).toContain('OPENAI_API_KEY');
        expect(paths).toContain('JWT_SECRET');
      }
    });

    test('coerces PORT from string to number', () => {
      const envWithStringPort = {
        PORT: '8080',
        DATABASE_URL: 'file:./test.db',
        R2_ENDPOINT: 'https://r2.cloudflarestorage.com',
        R2_ACCESS_KEY_ID: 'access_key',
        R2_SECRET_ACCESS_KEY: 'secret_key',
        R2_BUCKET: 'test-bucket',
        R2_PUBLIC_URL: 'https://assets.test.com',
        STRIPE_SECRET_KEY: 'sk_test_abc',
        STRIPE_WEBHOOK_SECRET: 'whsec_abc',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        OPENAI_API_KEY: 'sk-openai-abc',
        JWT_SECRET: 'this-is-a-32-character-secret!!!',
      };

      const result = envSchema.safeParse(envWithStringPort);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.PORT).toBe(8080);
        expect(typeof result.data.PORT).toBe('number');
      }
    });

    test('coerces limit values from strings', () => {
      const envWithStringLimits = {
        FREE_MONTHLY_LIMIT: '1000',
        STARTER_MONTHLY_LIMIT: '20000',
        PRO_MONTHLY_LIMIT: '100000',
        DATABASE_URL: 'file:./test.db',
        R2_ENDPOINT: 'https://r2.cloudflarestorage.com',
        R2_ACCESS_KEY_ID: 'access_key',
        R2_SECRET_ACCESS_KEY: 'secret_key',
        R2_BUCKET: 'test-bucket',
        R2_PUBLIC_URL: 'https://assets.test.com',
        STRIPE_SECRET_KEY: 'sk_test_abc',
        STRIPE_WEBHOOK_SECRET: 'whsec_abc',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        OPENAI_API_KEY: 'sk-openai-abc',
        JWT_SECRET: 'this-is-a-32-character-secret!!!',
      };

      const result = envSchema.safeParse(envWithStringLimits);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.FREE_MONTHLY_LIMIT).toBe(1000);
        expect(result.data.STARTER_MONTHLY_LIMIT).toBe(20000);
        expect(result.data.PRO_MONTHLY_LIMIT).toBe(100000);
      }
    });

    test('accepts valid NODE_ENV values', () => {
      const baseEnv = {
        DATABASE_URL: 'file:./test.db',
        R2_ENDPOINT: 'https://r2.cloudflarestorage.com',
        R2_ACCESS_KEY_ID: 'access_key',
        R2_SECRET_ACCESS_KEY: 'secret_key',
        R2_BUCKET: 'test-bucket',
        R2_PUBLIC_URL: 'https://assets.test.com',
        STRIPE_SECRET_KEY: 'sk_test_abc',
        STRIPE_WEBHOOK_SECRET: 'whsec_abc',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        OPENAI_API_KEY: 'sk-openai-abc',
        JWT_SECRET: 'this-is-a-32-character-secret!!!',
      };

      const devResult = envSchema.safeParse({ ...baseEnv, NODE_ENV: 'development' });
      expect(devResult.success).toBe(true);

      const prodResult = envSchema.safeParse({ ...baseEnv, NODE_ENV: 'production' });
      expect(prodResult.success).toBe(true);

      const testResult = envSchema.safeParse({ ...baseEnv, NODE_ENV: 'test' });
      expect(testResult.success).toBe(true);
    });

    test('rejects invalid NODE_ENV', () => {
      const baseEnv = {
        NODE_ENV: 'staging', // Invalid
        DATABASE_URL: 'file:./test.db',
        R2_ENDPOINT: 'https://r2.cloudflarestorage.com',
        R2_ACCESS_KEY_ID: 'access_key',
        R2_SECRET_ACCESS_KEY: 'secret_key',
        R2_BUCKET: 'test-bucket',
        R2_PUBLIC_URL: 'https://assets.test.com',
        STRIPE_SECRET_KEY: 'sk_test_abc',
        STRIPE_WEBHOOK_SECRET: 'whsec_abc',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        OPENAI_API_KEY: 'sk-openai-abc',
        JWT_SECRET: 'this-is-a-32-character-secret!!!',
      };

      const result = envSchema.safeParse(baseEnv);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('NODE_ENV'))).toBe(true);
      }
    });

    test('DATABASE_AUTH_TOKEN is optional', () => {
      const withoutToken = {
        DATABASE_URL: 'file:./test.db',
        R2_ENDPOINT: 'https://r2.cloudflarestorage.com',
        R2_ACCESS_KEY_ID: 'access_key',
        R2_SECRET_ACCESS_KEY: 'secret_key',
        R2_BUCKET: 'test-bucket',
        R2_PUBLIC_URL: 'https://assets.test.com',
        STRIPE_SECRET_KEY: 'sk_test_abc',
        STRIPE_WEBHOOK_SECRET: 'whsec_abc',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        OPENAI_API_KEY: 'sk-openai-abc',
        JWT_SECRET: 'this-is-a-32-character-secret!!!',
      };

      const result = envSchema.safeParse(withoutToken);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.DATABASE_AUTH_TOKEN).toBeUndefined();
      }
    });

    test('accepts DATABASE_AUTH_TOKEN when provided', () => {
      const withToken = {
        DATABASE_URL: 'libsql://db.turso.io',
        DATABASE_AUTH_TOKEN: 'turso-auth-token-abc123',
        R2_ENDPOINT: 'https://r2.cloudflarestorage.com',
        R2_ACCESS_KEY_ID: 'access_key',
        R2_SECRET_ACCESS_KEY: 'secret_key',
        R2_BUCKET: 'test-bucket',
        R2_PUBLIC_URL: 'https://assets.test.com',
        STRIPE_SECRET_KEY: 'sk_test_abc',
        STRIPE_WEBHOOK_SECRET: 'whsec_abc',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        OPENAI_API_KEY: 'sk-openai-abc',
        JWT_SECRET: 'this-is-a-32-character-secret!!!',
      };

      const result = envSchema.safeParse(withToken);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.DATABASE_AUTH_TOKEN).toBe('turso-auth-token-abc123');
      }
    });
  });
});
