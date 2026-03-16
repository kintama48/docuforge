import { env } from '../src/config/env';
import { sendTransactionalEmail } from '../src/services/email';
import { emailLocales, type EmailLocale } from '../src/services/email-locale';
import {
  emailTemplateIds,
  renderEmailTemplate,
  type EmailTemplateId,
  type EmailTemplateInputById,
} from '../src/services/email-templates';
import { resolveEmailSenderForTemplate } from '../src/services/email-sender';

interface CliOptions {
  to: string;
  locales: EmailLocale[];
  templates: EmailTemplateId[];
  dryRun: boolean;
}

const DEFAULT_RECIPIENT = 'abdullah.baig416@gmail.com';

function parseCsvArg(value: string): string[] {
  return value
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function parseOptions(argv: string[]): CliOptions {
  const args = new Map<string, string>();
  let dryRun = false;

  for (const rawArg of argv) {
    if (rawArg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (!rawArg.startsWith('--')) {
      continue;
    }

    const separatorIndex = rawArg.indexOf('=');
    if (separatorIndex === -1) {
      args.set(rawArg.slice(2), '');
      continue;
    }

    const key = rawArg.slice(2, separatorIndex).trim();
    const value = rawArg.slice(separatorIndex + 1).trim();
    args.set(key, value);
  }

  const to = args.get('to') || DEFAULT_RECIPIENT;

  const localeArg = args.get('locales');
  const locales = localeArg
    ? parseCsvArg(localeArg).map((token) => {
        const normalized = token.toLowerCase() as EmailLocale;
        if (!emailLocales.includes(normalized)) {
          throw new Error(`Unsupported locale: ${token}`);
        }
        return normalized;
      })
    : [...emailLocales];

  const templateArg = args.get('templates');
  const templates = templateArg
    ? parseCsvArg(templateArg).map((token) => {
        const normalized = token as EmailTemplateId;
        if (!emailTemplateIds.includes(normalized)) {
          throw new Error(`Unsupported template: ${token}`);
        }
        return normalized;
      })
    : [...emailTemplateIds];

  return {
    to,
    locales,
    templates,
    dryRun,
  };
}

function buildTemplateInput<K extends EmailTemplateId>(
  templateId: K,
  locale: EmailLocale
): EmailTemplateInputById[K] {
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
        dashboardUrl: `${env.APP_URL}/`,
      } as EmailTemplateInputById[K];
    case 'billing_subscription_started':
      return {
        locale,
        planName: 'Starter',
        manageBillingUrl: `${env.APP_URL}/settings`,
      } as EmailTemplateInputById[K];
    case 'billing_plan_changed':
      return {
        locale,
        previousPlanName: 'Starter',
        planName: 'Pro',
        manageBillingUrl: `${env.APP_URL}/settings`,
      } as EmailTemplateInputById[K];
    case 'billing_subscription_canceled':
      return {
        locale,
        previousPlanName: 'Pro',
        restartBillingUrl: `${env.APP_URL}/pricing`,
        supportEmail: env.EMAIL_FROM_SUPPORT,
      } as EmailTemplateInputById[K];
    case 'support_acknowledgement':
      return {
        locale,
        ticketId: 'SUP-2026-0001',
        supportEmail: env.EMAIL_FROM_SUPPORT,
      } as EmailTemplateInputById[K];
    default: {
      const unreachable: never = templateId;
      throw new Error(`Unhandled template id: ${String(unreachable)}`);
    }
  }
}

async function sendTemplate<K extends EmailTemplateId>(
  templateId: K,
  locale: EmailLocale,
  recipient: string,
  dryRun: boolean
): Promise<void> {
  const input = buildTemplateInput(templateId, locale);
  const rendered = renderEmailTemplate(templateId, input);
  const sender = resolveEmailSenderForTemplate(templateId);
  const taggedSubject = `[${locale}] [${templateId}] ${rendered.subject}`;

  if (dryRun) {
    console.log(`DRY-RUN ${templateId} (${locale}) from=${sender.from} to=${recipient} subject="${taggedSubject}"`);
    return;
  }

  await sendTransactionalEmail({
    to: recipient,
    subject: taggedSubject,
    text: rendered.text,
    html: rendered.html,
    from: sender.from,
    replyTo: sender.replyTo,
  });

  console.log(`SENT ${templateId} (${locale}) from=${sender.from} to=${recipient}`);
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const total = options.locales.length * options.templates.length;

  console.log(`Email provider: ${env.EMAIL_PROVIDER}`);
  console.log(`Target recipient: ${options.to}`);
  console.log(`Locales: ${options.locales.join(', ')}`);
  console.log(`Templates: ${options.templates.join(', ')}`);
  console.log(`Total emails: ${total}`);

  for (const locale of options.locales) {
    for (const templateId of options.templates) {
      await sendTemplate(templateId, locale, options.to, options.dryRun);
    }
  }

  console.log('Matrix send completed.');
}

main().catch((err) => {
  console.error('Matrix send failed:', err);
  process.exit(1);
});
