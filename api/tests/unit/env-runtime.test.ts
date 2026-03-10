/**
 * Runtime tests for env reload and plan limits.
 */
import { describe, test, expect, beforeEach } from 'bun:test';

function setBaseEnv() {
  Object.assign(process.env, {
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
    NODE_ENV: 'test',
  });
}

describe('env runtime', () => {
  beforeEach(() => {
    setBaseEnv();
  });

  test('reloadEnv updates plan limits', async () => {
    const { env, reloadEnv, getPlanLimit, getPlanAiCreditLimit } = await import('../../src/config/env');
    process.env.FREE_MONTHLY_LIMIT = '123';
    process.env.DEV_MONTHLY_LIMIT = '234';
    process.env.STARTER_MONTHLY_LIMIT = '456';
    process.env.PRO_MONTHLY_LIMIT = '789';
    process.env.FREE_MONTHLY_AI_CREDITS = '11';
    process.env.DEV_MONTHLY_AI_CREDITS = '22';
    process.env.STARTER_MONTHLY_AI_CREDITS = '33';
    process.env.PRO_MONTHLY_AI_CREDITS = '44';

    reloadEnv();

    expect(env.FREE_MONTHLY_LIMIT).toBe(123);
    expect(getPlanLimit('free')).toBe(123);
    expect(getPlanLimit('dev')).toBe(234);
    expect(getPlanLimit('starter')).toBe(456);
    expect(getPlanLimit('pro')).toBe(789);
    expect(getPlanAiCreditLimit('free')).toBe(11);
    expect(getPlanAiCreditLimit('dev')).toBe(22);
    expect(getPlanAiCreditLimit('starter')).toBe(33);
    expect(getPlanAiCreditLimit('pro')).toBe(44);
  });
});
