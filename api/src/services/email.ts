import { env } from '../config/env';
import { InternalError } from '../lib/errors';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MockEmailRecord extends EmailMessage {
  provider: 'mock';
  sentAt: number;
}

const mockOutbox: MockEmailRecord[] = [];

function pushMockEmail(message: EmailMessage): void {
  mockOutbox.push({
    ...message,
    provider: 'mock',
    sentAt: Date.now(),
  });
}

async function sendViaResend(message: EmailMessage): Promise<void> {
  if (!env.RESEND_API_KEY) {
    throw new InternalError('RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new InternalError(`Failed to send email (${response.status}): ${body || 'unknown error'}`);
  }
}

export async function sendTransactionalEmail(message: EmailMessage): Promise<void> {
  if (env.EMAIL_PROVIDER === 'mock') {
    pushMockEmail(message);
    return;
  }

  await sendViaResend(message);
}

export function listMockEmails(): MockEmailRecord[] {
  return [...mockOutbox];
}

export function clearMockEmails(): void {
  mockOutbox.length = 0;
}
