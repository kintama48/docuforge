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
    BILLING_ENABLED: 'false',
    BILLING_PROVIDER: 'none',
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
    const { env, reloadEnv, getPlanLimit } = await import('../../src/config/env');
    process.env.FREE_MONTHLY_LIMIT = '123';
    process.env.STARTER_MONTHLY_LIMIT = '456';
    process.env.PRO_MONTHLY_LIMIT = '789';

    reloadEnv();

    expect(env.FREE_MONTHLY_LIMIT).toBe(123);
    expect(getPlanLimit('free')).toBe(123);
    expect(getPlanLimit('starter')).toBe(456);
    expect(getPlanLimit('pro')).toBe(789);
  });
});
