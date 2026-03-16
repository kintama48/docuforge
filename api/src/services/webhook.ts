import { eq, and } from 'drizzle-orm';
import { Queue, Worker, type ConnectionOptions, type JobsOptions } from 'bullmq';
import { getDb, schema } from '../db/client';
import { generateDeliveryId } from '../lib/id';
import { env } from '../config/env';
import type { WebhookEvent } from '../types';

const RETRY_DELAYS_MS = [0, 30_000, 300_000]; // Legacy fallback when queue is disabled
const MAX_ATTEMPTS = 3;
const WEBHOOK_JOB_NAME = 'webhook-delivery';

type WebhookJobData = {
  deliveryId: string;
  webhookId: string;
  url: string;
  secret: string;
  payload: Record<string, unknown>;
};

class RetryableWebhookError extends Error {}

let queue: Queue | null = null;
let worker: Worker | null = null;

function createRedisConnection(): ConnectionOptions {
  const url = new URL(env.REDIS_URL);
  const dbFromPath = url.pathname && url.pathname !== '/' ? Number(url.pathname.slice(1)) : undefined;

  const options: ConnectionOptions = {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: Number.isFinite(dbFromPath ?? NaN) ? dbFromPath : undefined,
    maxRetriesPerRequest: null,
  };

  if (url.protocol === 'rediss:') {
    (options as Record<string, unknown>).tls = {};
  }

  return options;
}

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(env.WEBHOOK_QUEUE_NAME, {
      connection: createRedisConnection(),
    });
  }
  return queue;
}

function getJobOptions(deliveryId: string): JobsOptions {
  return {
    jobId: `wdq_${deliveryId}`,
    attempts: env.WEBHOOK_QUEUE_ATTEMPTS,
    backoff: env.WEBHOOK_QUEUE_ATTEMPTS > 1
      ? { type: 'fixed', delay: env.WEBHOOK_QUEUE_BACKOFF_MS }
      : undefined,
    removeOnComplete: {
      age: 24 * 60 * 60,
      count: 5000,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
      count: 10000,
    },
  };
}

function getNextRetryAt(now: number, attempt: number): number {
  if (env.WEBHOOK_QUEUE_ENABLED) {
    return now + env.WEBHOOK_QUEUE_BACKOFF_MS;
  }
  return now + (RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
}

async function updateDeliveryStatus(params: {
  deliveryId: string;
  status: 'pending' | 'success' | 'failed';
  attempt: number;
  responseCode?: number;
  nextRetryAt: number | null;
}): Promise<void> {
  const db = getDb();
  await db
    .update(schema.webhookDeliveries)
    .set({
      status: params.status,
      attempts: params.attempt,
      lastAttemptAt: Date.now(),
      responseCode: params.responseCode ?? null,
      nextRetryAt: params.nextRetryAt,
    })
    .where(eq(schema.webhookDeliveries.id, params.deliveryId));
}

async function processWebhookDeliveryJob(jobData: WebhookJobData, attempt: number, maxAttempts: number) {
  const now = Date.now();
  const body = JSON.stringify(jobData.payload);
  const signature = signPayload(jobData.secret, body);

  try {
    const response = await fetch(jobData.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DocuForge-Signature': signature,
        'X-DocuForge-Event': String(jobData.payload.event ?? ''),
        'X-DocuForge-Delivery-Id': jobData.deliveryId,
        'User-Agent': 'DocuForge-Webhooks/1.0',
      },
      body,
      signal: AbortSignal.timeout(env.WEBHOOK_TIMEOUT_MS),
    });

    const isSuccess = response.status >= 200 && response.status < 300;
    if (isSuccess) {
      await updateDeliveryStatus({
        deliveryId: jobData.deliveryId,
        status: 'success',
        attempt,
        responseCode: response.status,
        nextRetryAt: null,
      });
      return;
    }

    const finalAttempt = attempt >= maxAttempts;
    await updateDeliveryStatus({
      deliveryId: jobData.deliveryId,
      status: finalAttempt ? 'failed' : 'pending',
      attempt,
      responseCode: response.status,
      nextRetryAt: finalAttempt ? null : getNextRetryAt(now, attempt),
    });

    if (!finalAttempt) {
      throw new RetryableWebhookError(`Webhook delivery failed with status ${response.status}`);
    }
  } catch (error) {
    if (error instanceof RetryableWebhookError) {
      throw error;
    }

    const finalAttempt = attempt >= maxAttempts;
    await updateDeliveryStatus({
      deliveryId: jobData.deliveryId,
      status: finalAttempt ? 'failed' : 'pending',
      attempt,
      nextRetryAt: finalAttempt ? null : getNextRetryAt(now, attempt),
    });

    if (!finalAttempt) {
      throw error instanceof Error ? error : new Error('Webhook delivery failed');
    }
  }
}

async function enqueueWebhookDelivery(data: WebhookJobData): Promise<void> {
  const q = getQueue();
  await q.add(WEBHOOK_JOB_NAME, data, getJobOptions(data.deliveryId));
}

async function deliverWithRetryInline(data: WebhookJobData): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1] ?? 0));
    }

    try {
      await processWebhookDeliveryJob(data, attempt, MAX_ATTEMPTS);
      const db = getDb();
      const [delivery] = await db
        .select({ status: schema.webhookDeliveries.status })
        .from(schema.webhookDeliveries)
        .where(eq(schema.webhookDeliveries.id, data.deliveryId));

      if (delivery?.status === 'success') {
        return;
      }
    } catch {
      // Retry loop continues until attempts are exhausted.
    }
  }
}

export function isWebhookQueueEnabled() {
  return env.WEBHOOK_QUEUE_ENABLED && env.NODE_ENV !== 'test';
}

export function startWebhookQueueWorker() {
  if (!isWebhookQueueEnabled()) return null;
  if (worker) return worker;

  worker = new Worker(
    env.WEBHOOK_QUEUE_NAME,
    async (job) => {
      const attempt = job.attemptsMade + 1;
      await processWebhookDeliveryJob(
        job.data as WebhookJobData,
        attempt,
        env.WEBHOOK_QUEUE_ATTEMPTS
      );
    },
    {
      connection: createRedisConnection(),
      concurrency: env.WEBHOOK_QUEUE_CONCURRENCY,
    }
  );

  worker.on('error', (err) => {
    console.error('Webhook queue worker error:', err);
  });

  worker.on('failed', (job, err) => {
    console.error(`Webhook job failed (${job?.id ?? 'unknown'}):`, err.message);
  });

  return worker;
}

export async function closeWebhookQueueConnections() {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}

export function signPayload(secret: string, body: string): string {
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);
  const data = encoder.encode(body);

  const hmac = new Bun.CryptoHasher('sha256', key).update(data).digest('hex');
  return `sha256=${hmac}`;
}

export async function dispatchWebhookEvent(
  userId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const db = getDb();

  const userWebhooks = await db
    .select()
    .from(schema.webhooks)
    .where(
      and(
        eq(schema.webhooks.userId, userId),
        eq(schema.webhooks.isActive, true)
      )
    );

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

  if (isWebhookQueueEnabled()) {
    startWebhookQueueWorker();
  }

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

    const jobData: WebhookJobData = {
      deliveryId,
      webhookId: webhook.id,
      url: webhook.url,
      secret: webhook.secret,
      payload,
    };

    if (isWebhookQueueEnabled()) {
      try {
        await enqueueWebhookDelivery(jobData);
      } catch (err) {
        console.error(`Failed to enqueue webhook delivery ${deliveryId}:`, err);
        await deliverWithRetryInline(jobData);
      }
    } else {
      deliverWithRetryInline(jobData).catch((err) => {
        console.error(`Webhook delivery ${deliveryId} failed:`, err);
      });
    }
  }
}
