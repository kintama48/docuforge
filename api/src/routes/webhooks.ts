import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { flexibleAuth } from '../middleware/auth';
import { noCache } from '../middleware/cache';
import { zValidator, createWebhookSchema, updateWebhookSchema } from '../lib/validation';
import { generateWebhookId } from '../lib/id';
import { NotFoundError, LimitExceededError } from '../lib/errors';
import { env } from '../config/env';
import { assertSafeWebhookUrl } from '../lib/webhook-url';

const webhooks = new Hono();

// Webhook config must always be fresh
webhooks.use('*', noCache);

// POST /v1/webhooks - Register a webhook
webhooks.post('/', flexibleAuth, zValidator('json', createWebhookSchema), async (c) => {
  const { url, events } = c.req.valid('json');
  const { userId } = c.get('auth');
  const db = getDb();
  const normalizedUrl = assertSafeWebhookUrl(url, env.NODE_ENV !== 'production');

  // Check webhook limit per user
  const existing = await db
    .select({ id: schema.webhooks.id })
    .from(schema.webhooks)
    .where(and(eq(schema.webhooks.userId, userId), eq(schema.webhooks.isActive, true)));

  if (existing.length >= env.WEBHOOK_MAX_PER_USER) {
    throw new LimitExceededError(`Maximum ${env.WEBHOOK_MAX_PER_USER} webhooks per user`, {});
  }

  // Generate secret (32 bytes hex)
  const secretBytes = crypto.getRandomValues(new Uint8Array(32));
  const secret = Array.from(secretBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

  const id = generateWebhookId();
  const now = Date.now();

  await db.insert(schema.webhooks).values({
    id,
    userId,
    url: normalizedUrl,
    events,
    secret,
    isActive: true,
    createdAt: now,
  });

  // Return with secret visible (only on creation)
  return c.json({
    data: { id, url: normalizedUrl, events, secret, is_active: true, created_at: new Date(now).toISOString() },
  }, 201);
});

// GET /v1/webhooks - List user's webhooks
webhooks.get('/', flexibleAuth, async (c) => {
  const { userId } = c.get('auth');
  const db = getDb();

  const results = await db
    .select({
      id: schema.webhooks.id,
      url: schema.webhooks.url,
      events: schema.webhooks.events,
      isActive: schema.webhooks.isActive,
      createdAt: schema.webhooks.createdAt,
    })
    .from(schema.webhooks)
    .where(eq(schema.webhooks.userId, userId))
    .orderBy(desc(schema.webhooks.createdAt));

  return c.json({
    data: results.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      is_active: w.isActive,
      created_at: new Date(w.createdAt).toISOString(),
    })),
  });
});

// GET /v1/webhooks/:id - Get webhook details
webhooks.get('/:id', flexibleAuth, async (c) => {
  const { userId } = c.get('auth');
  const webhookId = c.req.param('id');
  const db = getDb();

  const [webhook] = await db
    .select()
    .from(schema.webhooks)
    .where(and(eq(schema.webhooks.id, webhookId), eq(schema.webhooks.userId, userId)));

  if (!webhook) {
    throw new NotFoundError('Webhook not found');
  }

  // Get recent deliveries
  const deliveries = await db
    .select()
    .from(schema.webhookDeliveries)
    .where(eq(schema.webhookDeliveries.webhookId, webhookId))
    .orderBy(desc(schema.webhookDeliveries.createdAt))
    .limit(20);

  return c.json({
    data: {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      is_active: webhook.isActive,
      created_at: new Date(webhook.createdAt).toISOString(),
      recent_deliveries: deliveries.map((d) => ({
        id: d.id,
        event: d.event,
        status: d.status,
        attempts: d.attempts,
        response_code: d.responseCode,
        created_at: new Date(d.createdAt).toISOString(),
      })),
    },
  });
});

// PATCH /v1/webhooks/:id - Update webhook
webhooks.patch('/:id', flexibleAuth, zValidator('json', updateWebhookSchema), async (c) => {
  const { userId } = c.get('auth');
  const webhookId = c.req.param('id');
  const body = c.req.valid('json');
  const db = getDb();

  const [webhook] = await db
    .select()
    .from(schema.webhooks)
    .where(and(eq(schema.webhooks.id, webhookId), eq(schema.webhooks.userId, userId)));

  if (!webhook) {
    throw new NotFoundError('Webhook not found');
  }
  const normalizedUrl = body.url !== undefined
    ? assertSafeWebhookUrl(body.url, env.NODE_ENV !== 'production')
    : undefined;

  const updates: Record<string, unknown> = {};
  if (normalizedUrl !== undefined) updates.url = normalizedUrl;
  if (body.events !== undefined) updates.events = body.events;
  if (body.is_active !== undefined) updates.isActive = body.is_active;

  await db
    .update(schema.webhooks)
    .set(updates)
    .where(eq(schema.webhooks.id, webhookId));

  return c.json({
    data: {
      id: webhook.id,
      url: normalizedUrl ?? webhook.url,
      events: body.events ?? webhook.events,
      is_active: body.is_active ?? webhook.isActive,
      created_at: new Date(webhook.createdAt).toISOString(),
    },
  });
});

// DELETE /v1/webhooks/:id - Delete webhook
webhooks.delete('/:id', flexibleAuth, async (c) => {
  const { userId } = c.get('auth');
  const webhookId = c.req.param('id');
  const db = getDb();

  const [webhook] = await db
    .select({ id: schema.webhooks.id })
    .from(schema.webhooks)
    .where(and(eq(schema.webhooks.id, webhookId), eq(schema.webhooks.userId, userId)));

  if (!webhook) {
    throw new NotFoundError('Webhook not found');
  }

  await db.delete(schema.webhooks).where(eq(schema.webhooks.id, webhookId));

  return c.json({ data: { deleted: true } });
});

export default webhooks;
