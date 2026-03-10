import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { reloadEnv } from '../../src/config/env';
import {
  resolveEmailSender,
  resolveEmailSenderForTemplate,
  resolveEmailSenderProfileForTemplate,
} from '../../src/services/email-sender';

const originalEnv = { ...process.env };

describe('email sender resolver', () => {
  beforeEach(() => {
    process.env.EMAIL_FROM = 'default@test.docuforge.local';
    process.env.EMAIL_FROM_NOREPLY = 'noreply@test.docuforge.local';
    process.env.EMAIL_FROM_SUPPORT = 'support@test.docuforge.local';
    process.env.EMAIL_FROM_HELLO = 'hello@test.docuforge.local';
    process.env.EMAIL_FROM_BILLING = 'billing@test.docuforge.local';
    reloadEnv();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
    reloadEnv();
  });

  test('resolves sender profile by template id', () => {
    expect(resolveEmailSenderProfileForTemplate('email_verification')).toBe('no_reply');
    expect(resolveEmailSenderProfileForTemplate('login_2fa')).toBe('no_reply');
    expect(resolveEmailSenderProfileForTemplate('welcome_first_message')).toBe('hello');
    expect(resolveEmailSenderProfileForTemplate('billing_subscription_started')).toBe('billing');
    expect(resolveEmailSenderProfileForTemplate('billing_plan_changed')).toBe('billing');
    expect(resolveEmailSenderProfileForTemplate('billing_subscription_canceled')).toBe('billing');
    expect(resolveEmailSenderProfileForTemplate('support_acknowledgement')).toBe('support');
  });

  test('resolves direct sender profiles with reply-to policy', () => {
    expect(resolveEmailSender('no_reply')).toEqual({
      from: 'noreply@test.docuforge.local',
    });

    expect(resolveEmailSender('hello')).toEqual({
      from: 'hello@test.docuforge.local',
      replyTo: 'hello@test.docuforge.local',
    });

    expect(resolveEmailSender('billing')).toEqual({
      from: 'billing@test.docuforge.local',
      replyTo: 'billing@test.docuforge.local',
    });

    expect(resolveEmailSender('support')).toEqual({
      from: 'support@test.docuforge.local',
      replyTo: 'support@test.docuforge.local',
    });
  });

  test('resolves sender directly from template id', () => {
    expect(resolveEmailSenderForTemplate('welcome_first_message').from).toBe('hello@test.docuforge.local');
    expect(resolveEmailSenderForTemplate('support_acknowledgement').from).toBe(
      'support@test.docuforge.local'
    );
    expect(resolveEmailSenderForTemplate('billing_subscription_started').from).toBe(
      'billing@test.docuforge.local'
    );
  });
});
