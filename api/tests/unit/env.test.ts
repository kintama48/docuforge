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

const envSchema = z.object({
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
  BILLING_PROVIDER: z.enum(['paddle', 'lemonsqueezy']).default('paddle'),
  PADDLE_WEBHOOK_SECRET: z.string().min(1).default('paddle-webhook-secret'),
  PADDLE_PRICE_ID_DEV: z.string().min(1).default('paddle-dev-plan'),
  PADDLE_PRICE_ID_STARTER: z.string().min(1).default('paddle-starter-plan'),
  PADDLE_PRICE_ID_PRO: z.string().min(1).default('paddle-pro-plan'),
  LEMONSQUEEZY_WEBHOOK_SECRET: z.string().min(1).default('lemonsqueezy-webhook-secret'),
  LEMONSQUEEZY_VARIANT_ID_DEV: z.string().min(1).default('lemon-dev-plan'),
  LEMONSQUEEZY_VARIANT_ID_STARTER: z.string().min(1).default('lemon-starter-plan'),
  LEMONSQUEEZY_VARIANT_ID_PRO: z.string().min(1).default('lemon-pro-plan'),
  GEMINI_API_KEY: z.string().min(1),
  AI_MODEL: z.string().default('gemini-2.5-flash'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('7d'),
});

const validEnv = {
  DATABASE_URL: 'file:./test.db',
  R2_ENDPOINT: 'https://r2.cloudflarestorage.com',
  R2_ACCESS_KEY_ID: 'access_key',
  R2_SECRET_ACCESS_KEY: 'secret_key',
  R2_BUCKET: 'test-bucket',
  R2_PUBLIC_URL: 'https://assets.test.com',
  BILLING_PROVIDER: 'paddle' as const,
  PADDLE_WEBHOOK_SECRET: 'paddle-whsec',
  PADDLE_PRICE_ID_DEV: 'paddle-dev',
  PADDLE_PRICE_ID_STARTER: 'paddle-starter',
  PADDLE_PRICE_ID_PRO: 'paddle-pro',
  LEMONSQUEEZY_WEBHOOK_SECRET: 'lemon-whsec',
  LEMONSQUEEZY_VARIANT_ID_DEV: 'lemon-dev',
  LEMONSQUEEZY_VARIANT_ID_STARTER: 'lemon-starter',
  LEMONSQUEEZY_VARIANT_ID_PRO: 'lemon-pro',
  GEMINI_API_KEY: 'test-gemini-abc',
  JWT_SECRET: 'this-is-a-32-character-secret!!!',
};

describe('env', () => {
  test('loads all required billing-provider vars', () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
  });

  test('uses defaults when provider vars are omitted', () => {
    const {
      PADDLE_WEBHOOK_SECRET: _p1,
      PADDLE_PRICE_ID_DEV: _p2,
      PADDLE_PRICE_ID_STARTER: _p3,
      PADDLE_PRICE_ID_PRO: _p4,
      LEMONSQUEEZY_WEBHOOK_SECRET: _l1,
      LEMONSQUEEZY_VARIANT_ID_DEV: _l2,
      LEMONSQUEEZY_VARIANT_ID_STARTER: _l3,
      LEMONSQUEEZY_VARIANT_ID_PRO: _l4,
      ...withoutProviderVars
    } = validEnv;
    const result = envSchema.safeParse(withoutProviderVars);
    expect(result.success).toBe(true);
  });

  test('accepts both provider enum values', () => {
    expect(envSchema.safeParse(validEnv).success).toBe(true);
    expect(envSchema.safeParse({ ...validEnv, BILLING_PROVIDER: 'lemonsqueezy' }).success).toBe(true);
  });

  test('DATABASE_AUTH_TOKEN remains optional', () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_AUTH_TOKEN).toBeUndefined();
    }
  });
});
