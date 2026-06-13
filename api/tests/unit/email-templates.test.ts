import { describe, expect, test } from 'bun:test';
import { reloadEnv } from '../../src/config/env';
import { emailLocales } from '../../src/services/email-locale';
import {
  emailTemplateIds,
  renderEmailTemplate,
  renderOtpEmailTemplate,
  type EmailTemplateId,
  type EmailTemplateInputById,
} from '../../src/services/email-templates';

const DOCUFORGE_LOGO_URL = 'https://www.docuforge.app/brand/logo-square-64.png';

function withEnv(updates: Record<string, string | undefined>, fn: () => void): void {
  const previous = Object.fromEntries(
    Object.keys(updates).map((key) => [key, process.env[key]])
  );

  try {
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    reloadEnv();
    fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    reloadEnv();
  }
}

function buildInput<K extends EmailTemplateId>(templateId: K, locale: (typeof emailLocales)[number]): EmailTemplateInputById[K] {
  switch (templateId) {
    case 'email_verification':
      return {
        locale,
        code: '123456',
        ttlMinutes: 10,
      } as EmailTemplateInputById[K];
    case 'login_2fa':
      return {
        locale,
        code: '654321',
        ttlMinutes: 10,
      } as EmailTemplateInputById[K];
    case 'welcome_first_message':
      return {
        locale,
        dashboardUrl: 'https://console.docuforge.app/',
      } as EmailTemplateInputById[K];
    case 'billing_subscription_started':
      return {
        locale,
        planName: 'Starter',
        manageBillingUrl: 'https://console.docuforge.app/settings',
      } as EmailTemplateInputById[K];
    case 'billing_plan_changed':
      return {
        locale,
        previousPlanName: 'Starter',
        planName: 'Pro',
        manageBillingUrl: 'https://console.docuforge.app/settings',
      } as EmailTemplateInputById[K];
    case 'billing_subscription_canceled':
      return {
        locale,
        previousPlanName: 'Pro',
        restartBillingUrl: 'https://console.docuforge.app/pricing',
        supportEmail: 'support@docuforge.app',
      } as EmailTemplateInputById[K];
    case 'support_acknowledgement':
      return {
        locale,
        ticketId: 'SUP-2026-0001',
        supportEmail: 'support@docuforge.app',
      } as EmailTemplateInputById[K];
    default: {
      const unreachable: never = templateId;
      throw new Error(`Unhandled template id in test: ${String(unreachable)}`);
    }
  }
}

describe('email templates', () => {
  test('renders every template for every supported locale', () => {
    for (const locale of emailLocales) {
      for (const templateId of emailTemplateIds) {
        const rendered = renderEmailTemplate(templateId, buildInput(templateId, locale));
        expect(rendered.subject.length).toBeGreaterThan(3);
        expect(rendered.text.length).toBeGreaterThan(20);
        expect(rendered.html.length).toBeGreaterThan(120);
        expect(rendered.html).toContain('DocuForge');
        expect(rendered.html).toContain(DOCUFORGE_LOGO_URL);

        if (templateId === 'email_verification') {
          expect(rendered.text).toContain('123456');
          expect(rendered.html).toContain('123456');
        }
        if (templateId === 'login_2fa') {
          expect(rendered.text).toContain('654321');
          expect(rendered.html).toContain('654321');
        }
      }
    }
  });

  test('throws when OTP code is invalid', () => {
    expect(() =>
      renderOtpEmailTemplate('email_verification', {
        locale: 'en',
        code: '12A456',
        ttlMinutes: 10,
      })
    ).toThrow('6-digit');
  });

  test('throws when ttlMinutes is invalid', () => {
    expect(() =>
      renderOtpEmailTemplate('login_2fa', {
        locale: 'en',
        code: '123456',
        ttlMinutes: 0,
      })
    ).toThrow('ttlMinutes');
  });

  test('throws when billing URLs are not absolute', () => {
    expect(() =>
      renderEmailTemplate('billing_subscription_started', {
        locale: 'en',
        planName: 'Starter',
        manageBillingUrl: '/settings',
      })
    ).toThrow('absolute URL');
  });

  test('renders legal and configured social footer links in HTML shells', () => {
    withEnv(
      {
        LEGAL_TERMS_URL: 'https://www.docuforge.app/terms',
        LEGAL_PRIVACY_URL: 'https://www.docuforge.app/privacy',
        SOCIAL_LINKEDIN_URL: 'https://www.linkedin.com/company/docuforge',
        SOCIAL_GITHUB_URL: 'https://github.com/kintama48/docuforge',
      },
      () => {
        const standard = renderEmailTemplate('welcome_first_message', {
          locale: 'en',
          dashboardUrl: 'https://console.docuforge.app/',
        });
        const otp = renderOtpEmailTemplate('email_verification', {
          locale: 'en',
          code: '123456',
          ttlMinutes: 10,
        });

        for (const rendered of [standard, otp]) {
          expect(rendered.html).toContain('https://www.docuforge.app/terms');
          expect(rendered.html).toContain('https://www.docuforge.app/privacy');
          expect(rendered.html).toContain('https://www.linkedin.com/company/docuforge');
          expect(rendered.html).toContain('https://github.com/kintama48/docuforge');
          expect(rendered.html).toContain('/brand/social/linkedin.png');
          expect(rendered.html).toContain('/brand/social/github.png');
        }
      }
    );
  });
});
