import { env } from '../config/env';
import type { EmailTemplateId } from './email-templates';

export type EmailSenderProfile = 'no_reply' | 'support' | 'hello' | 'billing';

export interface EmailSender {
  from: string;
  replyTo?: string;
}

const senderProfileByTemplateId: Record<EmailTemplateId, EmailSenderProfile> = {
  email_verification: 'no_reply',
  login_2fa: 'no_reply',
  welcome_first_message: 'hello',
  billing_subscription_started: 'billing',
  billing_plan_changed: 'billing',
  billing_subscription_canceled: 'billing',
  support_acknowledgement: 'support',
};

export function resolveEmailSender(profile: EmailSenderProfile): EmailSender {
  switch (profile) {
    case 'no_reply':
      return { from: env.EMAIL_FROM_NOREPLY || env.EMAIL_FROM };
    case 'support':
      return {
        from: env.EMAIL_FROM_SUPPORT || env.EMAIL_FROM,
        replyTo: env.EMAIL_FROM_SUPPORT || env.EMAIL_FROM,
      };
    case 'hello':
      return {
        from: env.EMAIL_FROM_HELLO || env.EMAIL_FROM,
        replyTo: env.EMAIL_FROM_HELLO || env.EMAIL_FROM,
      };
    case 'billing':
      return {
        from: env.EMAIL_FROM_BILLING || env.EMAIL_FROM,
        replyTo: env.EMAIL_FROM_BILLING || env.EMAIL_FROM,
      };
    default: {
      const unreachable: never = profile;
      throw new Error(`Unhandled email sender profile: ${String(unreachable)}`);
    }
  }
}

export function resolveEmailSenderProfileForTemplate(templateId: EmailTemplateId): EmailSenderProfile {
  return senderProfileByTemplateId[templateId];
}

export function resolveEmailSenderForTemplate(templateId: EmailTemplateId): EmailSender {
  return resolveEmailSender(resolveEmailSenderProfileForTemplate(templateId));
}
