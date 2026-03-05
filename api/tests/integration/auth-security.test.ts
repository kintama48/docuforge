import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { createApp } from '../../src/app';
import { env, reloadEnv } from '../../src/config/env';
import { clearMockEmails, listMockEmails } from '../../src/services/email';
import { createTestContext, type TestContext } from '../setup';

function extractOtpCode(text: string): string {
  const match = text.match(/\b(\d{6})\b/);
  if (!match) {
    throw new Error(`OTP code not found in email text: ${text}`);
  }
  return match[1];
}

describe('Auth security flows', () => {
  let ctx: TestContext;
  let app: ReturnType<typeof createApp>;
  let authMutationHeaders: Record<string, string>;

  beforeEach(async () => {
    ctx = await createTestContext();
    app = createApp();
    clearMockEmails();
    authMutationHeaders = {
      'Content-Type': 'application/json',
      'X-Device-Id': `auth-security-${crypto.randomUUID()}`,
      'User-Agent': 'auth-security-suite',
      'Accept-Language': 'en-US',
      'X-Forwarded-For': '198.51.100.40',
    };
  });

  afterEach(async () => {
    clearMockEmails();
    await ctx.cleanup();
  });

  it('supports email verification + login 2FA with resend flow', async () => {
    process.env.AUTH_EMAIL_VERIFICATION_REQUIRED = 'true';
    process.env.AUTH_2FA_REQUIRED = 'true';
    process.env.AUTH_OTP_RESEND_COOLDOWN_MS = '200';
    process.env.EMAIL_PROVIDER = 'mock';
    reloadEnv();

    const registerResponse = await app.request('/console/auth/register', {
      method: 'POST',
      headers: authMutationHeaders,
      body: JSON.stringify({
        email: 'secure-user@example.com',
        password: 'securepassword123',
      }),
    });

    expect(registerResponse.status).toBe(202);
    const registerBody = await registerResponse.json();
    expect(registerBody.verification_required).toBe(true);
    expect(registerBody.challenge_id).toMatch(/^otp_/);

    const verificationEmail = listMockEmails().at(-1);
    expect(verificationEmail).toBeDefined();
    const verificationCode = extractOtpCode(verificationEmail!.text);

    const verifyEmailResponse = await app.request('/console/auth/verify-email', {
      method: 'POST',
      headers: authMutationHeaders,
      body: JSON.stringify({
        challenge_id: registerBody.challenge_id,
        code: verificationCode,
      }),
    });

    expect(verifyEmailResponse.status).toBe(200);
    expect(verifyEmailResponse.headers.get('Set-Cookie')).toContain(`${env.AUTH_COOKIE_NAME}=`);
    const verifyEmailBody = await verifyEmailResponse.json();
    expect(verifyEmailBody.email_verified).toBe(true);
    expect(verifyEmailBody.token).toBeDefined();
    expect(verifyEmailBody.api_key?.raw_key).toMatch(/^docu_live_/);

    const loginResponse = await app.request('/console/auth/login', {
      method: 'POST',
      headers: authMutationHeaders,
      body: JSON.stringify({
        email: 'secure-user@example.com',
        password: 'securepassword123',
      }),
    });

    expect(loginResponse.status).toBe(200);
    const loginBody = await loginResponse.json();
    expect(loginBody.two_factor_required).toBe(true);
    expect(loginBody.challenge_id).toMatch(/^otp_/);

    const resendTooSoon = await app.request('/console/auth/2fa/resend', {
      method: 'POST',
      headers: authMutationHeaders,
      body: JSON.stringify({
        challenge_id: loginBody.challenge_id,
      }),
    });
    expect(resendTooSoon.status).toBe(429);

    await Bun.sleep(220);

    const resendOk = await app.request('/console/auth/2fa/resend', {
      method: 'POST',
      headers: authMutationHeaders,
      body: JSON.stringify({
        challenge_id: loginBody.challenge_id,
      }),
    });
    expect(resendOk.status).toBe(200);

    const secondFactorEmail = listMockEmails().at(-1);
    expect(secondFactorEmail).toBeDefined();
    const secondFactorCode = extractOtpCode(secondFactorEmail!.text);

    const verify2faResponse = await app.request('/console/auth/2fa/verify', {
      method: 'POST',
      headers: authMutationHeaders,
      body: JSON.stringify({
        challenge_id: loginBody.challenge_id,
        code: secondFactorCode,
      }),
    });

    expect(verify2faResponse.status).toBe(200);
    expect(verify2faResponse.headers.get('Set-Cookie')).toContain(`${env.AUTH_COOKIE_NAME}=`);
    const verify2faBody = await verify2faResponse.json();
    expect(verify2faBody.token).toBeDefined();
    expect(verify2faBody.user.email).toBe('secure-user@example.com');
  });

  it('blocks repeated account creation from the same fingerprint', async () => {
    process.env.AUTH_EMAIL_VERIFICATION_REQUIRED = 'false';
    process.env.AUTH_2FA_REQUIRED = 'false';
    process.env.AUTH_MAX_ACCOUNTS_PER_FINGERPRINT = '1';
    process.env.EMAIL_PROVIDER = 'mock';
    reloadEnv();

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'abuse-tester/1.0',
      'Accept-Language': 'en-US',
      'X-Device-Id': 'same-device',
      'X-Forwarded-For': '203.0.113.10',
    };

    const firstRegister = await app.request('/console/auth/register', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: 'fingerprint-one@example.com',
        password: 'securepassword123',
      }),
    });
    expect(firstRegister.status).toBe(201);

    const secondRegister = await app.request('/console/auth/register', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: 'fingerprint-two@example.com',
        password: 'securepassword123',
      }),
    });

    expect(secondRegister.status).toBe(403);
    const body = await secondRegister.json();
    expect(body.error).toBe('forbidden');
    expect(String(body.message)).toContain('device fingerprint');
  });
});
