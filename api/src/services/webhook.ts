import { eq, and, inArray } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { generateDeliveryId } from '../lib/id';
import { env } from '../config/env';
import type { WebhookEvent } from '../types';

const RETRY_DELAYS_MS = [0, 30_000, 300_000]; // 0s, 30s, 5min
const MAX_ATTEMPTS = 3;

export function signPayload(secret: string, body: string): string {
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);
  const data = encoder.encode(body);

  // Use Web Crypto HMAC-SHA256 synchronously via Bun's crypto
  const hmac = new Bun.CryptoHasher('sha256', key).update(data).digest('hex');
  return `sha256=${hmac}`;
}

export async function dispatchWebhookEvent(
  userId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const db = getDb();

  // Find active webhooks for this user subscribed to this event
  const userWebhooks = await db
    .select()
    .from(schema.webhooks)
    .where(
      and(
        eq(schema.webhooks.userId, userId),
        eq(schema.webhooks.isActive, true)
      )
    );

  // Filter to webhooks subscribed to this event
  const matching = userWebhooks.filter((w) => {
    const events = w.events as string[];
    return events.includes(event);
  });

  if (matching.length === 0) return;

  const now = Date.now();
  const payload = {
    event,
    timestamp: new Date(now).toISOString(),
    data,
  };

  // Create delivery records and dispatch
  for (const webhook of matching) {
    const deliveryId = generateDeliveryId();

    await db.insert(schema.webhookDeliveries).values({
      id: deliveryId,
      webhookId: webhook.id,
      event,
      payload,
      status: 'pending',
      attempts: 0,
      nextRetryAt: now,
      createdAt: now,
    });

    // Deliver asynchronously (don't block)
    deliverWithRetry(deliveryId, webhook.id, webhook.url, webhook.secret, payload).catch(
      (err) => console.error(`Webhook delivery ${deliveryId} failed:`, err)
    );
  }
}

async function deliverWithRetry(
  deliveryId: string,
  webhookId: string,
  url: string,
  secret: string,
  payload: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  const body = JSON.stringify(payload);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Wait for retry delay (skip for first attempt)
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }

    const now = Date.now();
    const signature = signPayload(secret, body);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DocuForge-Signature': signature,
          'X-DocuForge-Event': (payload as any).event,
          'X-DocuForge-Delivery-Id': deliveryId,
          'User-Agent': 'DocuForge-Webhooks/1.0',
        },
        body,
        signal: AbortSignal.timeout(env.WEBHOOK_TIMEOUT_MS),
      });

      const isSuccess = response.status >= 200 && response.status < 300;

      await db
        .update(schema.webhookDeliveries)
        .set({
          status: isSuccess ? 'success' : (attempt + 1 >= MAX_ATTEMPTS ? 'failed' : 'pending'),
          attempts: attempt + 1,
          lastAttemptAt: now,
          responseCode: response.status,
          nextRetryAt: isSuccess || attempt + 1 >= MAX_ATTEMPTS
            ? null
            : now + RETRY_DELAYS_MS[attempt + 1],
        })
        .where(eq(schema.webhookDeliveries.id, deliveryId));

      if (isSuccess) return;
    } catch (err) {
      await db
        .update(schema.webhookDeliveries)
        .set({
          status: attempt + 1 >= MAX_ATTEMPTS ? 'failed' : 'pending',
          attempts: attempt + 1,
          lastAttemptAt: now,
          nextRetryAt: attempt + 1 >= MAX_ATTEMPTS
            ? null
            : now + RETRY_DELAYS_MS[attempt + 1],
        })
        .where(eq(schema.webhookDeliveries.id, deliveryId));
    }
  }
}
