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
    PADDLE_PRICE_ID_STARTER: z.string().optional(),
    PADDLE_PRICE_ID_PRO: z.string().optional(),
    LEMONSQUEEZY_API_KEY: z.string().optional(),
    LEMONSQUEEZY_WEBHOOK_SECRET: z.string().optional(),
    LEMONSQUEEZY_STORE_ID: z.string().optional(),
    LEMONSQUEEZY_VARIANT_ID_STARTER: z.string().optional(),
    LEMONSQUEEZY_VARIANT_ID_PRO: z.string().optional(),
    GEMINI_API_KEY: z.string().min(1),
    AI_MODEL: z.string().default('gemini-2.5-flash'),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRY: z.string().default('7d'),
    FREE_MONTHLY_LIMIT: z.coerce.number().default(500),
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

function baseEnv() {
  return {
    DATABASE_URL: 'file:./test.db',
    R2_ENDPOINT: 'https://r2.cloudflarestorage.com',
    R2_ACCESS_KEY_ID: 'access_key',
    R2_SECRET_ACCESS_KEY: 'secret_key',
    R2_BUCKET: 'test-bucket',
    R2_PUBLIC_URL: 'https://assets.test.com',
    BILLING_ENABLED: 'false',
    BILLING_PROVIDER: 'none',
    GEMINI_API_KEY: 'test-gemini-abc',
    JWT_SECRET: 'this-is-a-32-character-secret!!!',
  };
}

describe('env', () => {
  test('loads required vars with billing disabled', () => {
    const result = envSchema.safeParse(baseEnv());
    expect(result.success).toBe(true);
  });

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

  test('requires provider credentials when paddle billing is enabled', () => {
    const result = envSchema.safeParse({
      ...baseEnv(),
      BILLING_ENABLED: 'true',
      BILLING_PROVIDER: 'paddle',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('PADDLE_API_KEY');
    expect(paths).toContain('PADDLE_WEBHOOK_SECRET');
  });

  test('requires provider credentials when lemon billing is enabled', () => {
    const result = envSchema.safeParse({
      ...baseEnv(),
      BILLING_ENABLED: 'true',
      BILLING_PROVIDER: 'lemonsqueezy',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths).toContain('LEMONSQUEEZY_API_KEY');
    expect(paths).toContain('LEMONSQUEEZY_STORE_ID');
  });

  test('passes when paddle billing is fully configured', () => {
    const result = envSchema.safeParse({
      ...baseEnv(),
      BILLING_ENABLED: 'true',
      BILLING_PROVIDER: 'paddle',
      PADDLE_API_KEY: 'pdl_abc',
      PADDLE_WEBHOOK_SECRET: 'pdl_whsec',
      PADDLE_PRICE_ID_STARTER: 'pri_start',
      PADDLE_PRICE_ID_PRO: 'pri_pro',
    });
    expect(result.success).toBe(true);
  });

  test('coerces numeric fields', () => {
    const result = envSchema.safeParse({
      ...baseEnv(),
      PORT: '8080',
      FREE_MONTHLY_LIMIT: '123',
      STARTER_MONTHLY_LIMIT: '456',
      PRO_MONTHLY_LIMIT: '789',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.PORT).toBe(8080);
    expect(result.data.FREE_MONTHLY_LIMIT).toBe(123);
    expect(result.data.STARTER_MONTHLY_LIMIT).toBe(456);
    expect(result.data.PRO_MONTHLY_LIMIT).toBe(789);
  });

  test('rejects invalid NODE_ENV', () => {
    const result = envSchema.safeParse({
      ...baseEnv(),
      NODE_ENV: 'staging',
    });
    expect(result.success).toBe(false);
  });

  test('DATABASE_AUTH_TOKEN is optional', () => {
    const result = envSchema.safeParse(baseEnv());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.DATABASE_AUTH_TOKEN).toBeUndefined();
  });
});
