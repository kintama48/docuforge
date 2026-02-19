/**
 * Unit tests for src/config/env.ts schema behavior.
 */
import { describe, test, expect } from 'bun:test';
import { z } from 'zod';

const envBoolean = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off', ''].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

const envSchema = z
  .object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().min(1),
    DATABASE_AUTH_TOKEN: z.string().optional(),
    ENGINE_URL: z.string().url().default('http://127.0.0.1:3001'),
    ENGINE_TIMEOUT_MS: z.coerce.number().default(5000),
    R2_ENDPOINT: z.string().url(),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET: z.string().min(1),
    R2_PUBLIC_URL: z.string().url(),
    BILLING_ENABLED: envBoolean.default(false),
    BILLING_PROVIDER: z.enum(['none', 'paddle', 'lemonsqueezy']).default('none'),
    PADDLE_API_KEY: z.string().optional(),
    PADDLE_WEBHOOK_SECRET: z.string().optional(),
    PADDLE_PRICE_ID_DEV: z.string().optional(),
    PADDLE_PRICE_ID_STARTER: z.string().optional(),
    PADDLE_PRICE_ID_PRO: z.string().optional(),
    LEMONSQUEEZY_API_KEY: z.string().optional(),
    LEMONSQUEEZY_WEBHOOK_SECRET: z.string().optional(),
    LEMONSQUEEZY_STORE_ID: z.string().optional(),
    LEMONSQUEEZY_VARIANT_ID_DEV: z.string().optional(),
    LEMONSQUEEZY_VARIANT_ID_STARTER: z.string().optional(),
    LEMONSQUEEZY_VARIANT_ID_PRO: z.string().optional(),
    GEMINI_API_KEY: z.string().min(1),
    AI_MODEL: z.string().default('gemini-2.5-flash'),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRY: z.string().default('7d'),
    FREE_MONTHLY_LIMIT: z.coerce.number().default(1000),
    DEV_MONTHLY_LIMIT: z.coerce.number().default(3000),
    STARTER_MONTHLY_LIMIT: z.coerce.number().default(10000),
    PRO_MONTHLY_LIMIT: z.coerce.number().default(50000),
    MAX_UPLOAD_SIZE_MB: z.coerce.number().default(10),
  })
  .superRefine((value, ctx) => {
    if (!value.BILLING_ENABLED) return;
    if (value.BILLING_PROVIDER === 'none') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'BILLING_PROVIDER must not be none when billing is enabled',
        path: ['BILLING_PROVIDER'],
      });
      return;
    }

    if (value.BILLING_PROVIDER === 'paddle') {
      for (const key of [
        'PADDLE_API_KEY',
        'PADDLE_WEBHOOK_SECRET',
        'PADDLE_PRICE_ID_DEV',
        'PADDLE_PRICE_ID_STARTER',
        'PADDLE_PRICE_ID_PRO',
      ] as const) {
        if (!value[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${key} required`,
            path: [key],
          });
        }
      }
    }

    if (value.BILLING_PROVIDER === 'lemonsqueezy') {
      for (const key of [
        'LEMONSQUEEZY_API_KEY',
        'LEMONSQUEEZY_WEBHOOK_SECRET',
        'LEMONSQUEEZY_STORE_ID',
        'LEMONSQUEEZY_VARIANT_ID_DEV',
        'LEMONSQUEEZY_VARIANT_ID_STARTER',
        'LEMONSQUEEZY_VARIANT_ID_PRO',
      ] as const) {
        if (!value[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${key} required`,
            path: [key],
          });
        }
      }
    }
  });

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_DEV_PRICE_ID: z.string().min(1),
  STRIPE_STARTER_PRICE_ID: z.string().min(1),
  STRIPE_PRO_PRICE_ID: z.string().min(1),

  // AI
  GEMINI_API_KEY: z.string().min(1),
  AI_MODEL: z.string().default('gemini-2.5-flash'),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('7d'),

  // Limits
  FREE_MONTHLY_LIMIT: z.coerce.number().default(1000),
  DEV_MONTHLY_LIMIT: z.coerce.number().default(3000),
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
        STRIPE_DEV_PRICE_ID: 'price_dev',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        GEMINI_API_KEY: 'test-gemini-abc',
        JWT_SECRET: 'this-is-a-32-character-secret!!!',
      };

  test('applies defaults', () => {
    const result = envSchema.safeParse(baseEnv());
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.PORT).toBe(3000);
    expect(result.data.NODE_ENV).toBe('development');
    expect(result.data.ENGINE_URL).toBe('http://127.0.0.1:3001');
    expect(result.data.AI_MODEL).toBe('gemini-2.5-flash');
    expect(result.data.BILLING_ENABLED).toBe(false);
  });

  test('fails without DATABASE_URL', () => {
    const env = baseEnv();
    delete (env as Partial<typeof env>).DATABASE_URL;
    const result = envSchema.safeParse(env);
    expect(result.success).toBe(false);
  });

  test('fails without JWT_SECRET', () => {
    const env = baseEnv();
    delete (env as Partial<typeof env>).JWT_SECRET;
    const result = envSchema.safeParse(env);
    expect(result.success).toBe(false);
  });

  test('fails on invalid R2 endpoint URL', () => {
    const result = envSchema.safeParse({
      ...baseEnv(),
      R2_ENDPOINT: 'not-a-url',
    });
    expect(result.success).toBe(false);
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
        STRIPE_DEV_PRICE_ID: 'price_dev',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        GEMINI_API_KEY: 'test-gemini-abc',
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
        expect(result.data.AI_MODEL).toBe('gemini-2.5-flash');
        expect(result.data.JWT_EXPIRY).toBe('7d');
        expect(result.data.FREE_MONTHLY_LIMIT).toBe(1000);
        expect(result.data.DEV_MONTHLY_LIMIT).toBe(3000);
        expect(result.data.STARTER_MONTHLY_LIMIT).toBe(10000);
        expect(result.data.PRO_MONTHLY_LIMIT).toBe(50000);
        expect(result.data.MAX_UPLOAD_SIZE_MB).toBe(10);
      }
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('PADDLE_API_KEY');
    expect(paths).toContain('PADDLE_WEBHOOK_SECRET');
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
        STRIPE_DEV_PRICE_ID: 'price_dev',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        GEMINI_API_KEY: 'test-gemini-abc',
        JWT_SECRET: 'this-is-a-32-character-secret!!!',
      };

      const result = envSchema.safeParse(missingDbUrl);
      expect(result.success).toBe(false);

      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths).toContain('DATABASE_URL');
      }
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('LEMONSQUEEZY_API_KEY');
    expect(paths).toContain('LEMONSQUEEZY_STORE_ID');
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
        STRIPE_DEV_PRICE_ID: 'price_dev',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        GEMINI_API_KEY: 'test-gemini-abc',
      };

      const result = envSchema.safeParse(missingJwtSecret);
      expect(result.success).toBe(false);

      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths).toContain('JWT_SECRET');
      }
    });
    expect(result.success).toBe(true);
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
        STRIPE_DEV_PRICE_ID: 'price_dev',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        GEMINI_API_KEY: 'test-gemini-abc',
        JWT_SECRET: 'too-short', // Less than 32 chars
      };

      const result = envSchema.safeParse(shortJwtSecret);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('JWT_SECRET'))).toBe(true);
      }
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.PORT).toBe(8080);
    expect(result.data.FREE_MONTHLY_LIMIT).toBe(123);
    expect(result.data.DEV_MONTHLY_LIMIT).toBe(234);
    expect(result.data.STARTER_MONTHLY_LIMIT).toBe(456);
    expect(result.data.PRO_MONTHLY_LIMIT).toBe(789);
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
        STRIPE_DEV_PRICE_ID: 'price_dev',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        GEMINI_API_KEY: 'test-gemini-abc',
        JWT_SECRET: 'this-is-a-32-character-secret!!!',
      };

      const result = envSchema.safeParse(invalidR2Endpoint);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('R2_ENDPOINT'))).toBe(true);
      }
    });
    expect(result.success).toBe(false);
  });

    test('throws on missing multiple required vars', () => {
      const manyMissing = {
        DATABASE_URL: 'file:./test.db',
        // Missing all R2, Stripe, Gemini, JWT
      };

      const result = envSchema.safeParse(manyMissing);
      expect(result.success).toBe(false);

      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths).toContain('R2_ENDPOINT');
        expect(paths).toContain('STRIPE_SECRET_KEY');
        expect(paths).toContain('GEMINI_API_KEY');
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
        STRIPE_DEV_PRICE_ID: 'price_dev',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        GEMINI_API_KEY: 'test-gemini-abc',
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
        DEV_MONTHLY_LIMIT: '3000',
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
        STRIPE_DEV_PRICE_ID: 'price_dev',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        GEMINI_API_KEY: 'test-gemini-abc',
        JWT_SECRET: 'this-is-a-32-character-secret!!!',
      };

      const result = envSchema.safeParse(envWithStringLimits);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.FREE_MONTHLY_LIMIT).toBe(1000);
        expect(result.data.DEV_MONTHLY_LIMIT).toBe(3000);
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
        STRIPE_DEV_PRICE_ID: 'price_dev',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        GEMINI_API_KEY: 'test-gemini-abc',
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
        STRIPE_DEV_PRICE_ID: 'price_dev',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        GEMINI_API_KEY: 'test-gemini-abc',
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
        STRIPE_DEV_PRICE_ID: 'price_dev',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        GEMINI_API_KEY: 'test-gemini-abc',
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
        STRIPE_DEV_PRICE_ID: 'price_dev',
        STRIPE_STARTER_PRICE_ID: 'price_starter',
        STRIPE_PRO_PRICE_ID: 'price_pro',
        GEMINI_API_KEY: 'test-gemini-abc',
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
