/**
 * Integration tests for provider-switched billing checkout and webhook flows.
 */
import { createHmac } from 'node:crypto';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { eq } from 'drizzle-orm';
import { createApp } from '../../src/app';
import { initTestDb, getDb, resetDb, schema } from '../../src/db/client';
import { setupTestEnv, createTestUser, getAuthHeaders } from '../setup';
import { createTestJwt } from '../helpers/auth';
import { reloadEnv, env } from '../../src/config/env';

const originalEnv = { ...process.env };

describe('Billing checkout and webhook', () => {
  let app: ReturnType<typeof createApp>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    setupTestEnv('http://127.0.0.1:3001');
    await initTestDb();
    app = createApp();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetDb();
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
    reloadEnv();
  });

  it('returns 503 when billing is disabled', async () => {
    process.env.BILLING_ENABLED = 'false';
    process.env.BILLING_PROVIDER = 'none';
    reloadEnv();

    const user = await createTestUser(getDb() as any);
    const response = await app.request('/v1/billing/checkout', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({ plan: 'starter' }),
    });

    expect(response.status).toBe(503);
  });

  it('creates a Paddle checkout URL', async () => {
    process.env.BILLING_ENABLED = 'true';
    process.env.BILLING_PROVIDER = 'paddle';
    process.env.PADDLE_API_KEY = 'pdl_test';
    process.env.PADDLE_WEBHOOK_SECRET = 'pdl_whsec';
    process.env.PADDLE_PRICE_ID_DEV = 'pri_dev';
    process.env.PADDLE_PRICE_ID_STARTER = 'pri_start';
    process.env.PADDLE_PRICE_ID_PRO = 'pri_pro';
    reloadEnv();

    let providerCalls = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/transactions')) {
        providerCalls += 1;
      }
      return new Response(
        JSON.stringify({
          data: {
            checkout: {
              url: 'https://checkout.paddle.test/session',
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const user = await createTestUser(getDb() as any);
    const response = await app.request('/v1/billing/checkout', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({ plan: 'starter' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.checkout_url).toBe('https://checkout.paddle.test/session');
    expect(body.provider).toBe('paddle');
    expect(providerCalls).toBe(1);
  });

  it('creates a Lemon Squeezy checkout URL', async () => {
    process.env.BILLING_ENABLED = 'true';
    process.env.BILLING_PROVIDER = 'lemonsqueezy';
    process.env.LEMONSQUEEZY_API_KEY = 'ls_test';
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'ls_whsec';
    process.env.LEMONSQUEEZY_STORE_ID = '111';
    process.env.LEMONSQUEEZY_VARIANT_ID_DEV = '999';
    process.env.LEMONSQUEEZY_VARIANT_ID_STARTER = '222';
    process.env.LEMONSQUEEZY_VARIANT_ID_PRO = '333';
    reloadEnv();

    let providerCalls = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/checkouts')) {
        providerCalls += 1;
      }
      return new Response(
        JSON.stringify({
          data: {
            attributes: {
              url: 'https://checkout.lemonsqueezy.test/session',
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/vnd.api+json' } }
      );
    }) as typeof fetch;

    const user = await createTestUser(getDb() as any);
    const response = await app.request('/v1/billing/checkout', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({ plan: 'pro' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.checkout_url).toBe('https://checkout.lemonsqueezy.test/session');
    expect(body.provider).toBe('lemonsqueezy');
    expect(providerCalls).toBe(1);
  });

  it('returns internal error when user is missing', async () => {
    process.env.BILLING_ENABLED = 'true';
    process.env.BILLING_PROVIDER = 'paddle';
    process.env.PADDLE_API_KEY = 'pdl_test';
    process.env.PADDLE_WEBHOOK_SECRET = 'pdl_whsec';
    process.env.PADDLE_PRICE_ID_DEV = 'pri_dev';
    process.env.PADDLE_PRICE_ID_STARTER = 'pri_start';
    process.env.PADDLE_PRICE_ID_PRO = 'pri_pro';
    reloadEnv();

    const token = await createTestJwt('usr_missing', 'missing@example.com');
    const response = await app.request('/v1/billing/checkout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plan: 'starter' }),
    });

    expect(response.status).toBe(500);
  });

  it('rejects webhook without signature (paddle)', async () => {
    process.env.BILLING_ENABLED = 'true';
    process.env.BILLING_PROVIDER = 'paddle';
    process.env.PADDLE_API_KEY = 'pdl_test';
    process.env.PADDLE_WEBHOOK_SECRET = 'pdl_whsec';
    process.env.PADDLE_PRICE_ID_DEV = 'pri_dev';
    process.env.PADDLE_PRICE_ID_STARTER = 'pri_start';
    process.env.PADDLE_PRICE_ID_PRO = 'pri_pro';
    reloadEnv();

    const response = await app.request('/v1/billing/webhook', {
      method: 'POST',
      body: JSON.stringify({ event_type: 'transaction.completed' }),
    });

    expect(response.status).toBe(422);
  });

  it('rejects webhook with invalid signature (lemonsqueezy)', async () => {
    process.env.BILLING_ENABLED = 'true';
    process.env.BILLING_PROVIDER = 'lemonsqueezy';
    process.env.LEMONSQUEEZY_API_KEY = 'ls_test';
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'ls_whsec';
    process.env.LEMONSQUEEZY_STORE_ID = '111';
    process.env.LEMONSQUEEZY_VARIANT_ID_DEV = '999';
    process.env.LEMONSQUEEZY_VARIANT_ID_STARTER = '222';
    process.env.LEMONSQUEEZY_VARIANT_ID_PRO = '333';
    reloadEnv();

    const response = await app.request('/v1/billing/webhook', {
      method: 'POST',
      headers: { 'x-signature': 'invalid' },
      body: JSON.stringify({ meta: { event_name: 'subscription_created' } }),
    });

    expect(response.status).toBe(422);
  });

  it('handles Paddle upgrade and cancel webhooks', async () => {
    process.env.BILLING_ENABLED = 'true';
    process.env.BILLING_PROVIDER = 'paddle';
    process.env.PADDLE_API_KEY = 'pdl_test';
    process.env.PADDLE_WEBHOOK_SECRET = 'pdl_whsec';
    process.env.PADDLE_PRICE_ID_DEV = 'pri_dev';
    process.env.PADDLE_PRICE_ID_STARTER = 'pri_start';
    process.env.PADDLE_PRICE_ID_PRO = 'pri_pro';
    reloadEnv();

    const user = await createTestUser(getDb() as any);
    const db = getDb();

    const upgradePayload = {
      event_type: 'transaction.completed',
      data: {
        customer_id: 'cus_paddle_1',
        custom_data: {
          userId: user.id,
          plan: 'starter',
        },
      },
    };
    const upgradeBody = JSON.stringify(upgradePayload);
    const ts = Math.floor(Date.now() / 1000).toString();
    const h1 = createHmac('sha256', env.PADDLE_WEBHOOK_SECRET || '')
      .update(`${ts}:${upgradeBody}`)
      .digest('hex');

    const upgradeResponse = await app.request('/v1/billing/webhook', {
      method: 'POST',
      headers: {
        'paddle-signature': `ts=${ts};h1=${h1}`,
      },
      body: upgradeBody,
    });
    expect(upgradeResponse.status).toBe(200);

    const [upgraded] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
    expect(upgraded?.planTier).toBe('starter');

    const cancelPayload = {
      event_type: 'subscription.canceled',
      data: {
        customer_id: 'cus_paddle_1',
      },
    };
    const cancelBody = JSON.stringify(cancelPayload);
    const cancelTs = (Math.floor(Date.now() / 1000) + 1).toString();
    const cancelH1 = createHmac('sha256', env.PADDLE_WEBHOOK_SECRET || '')
      .update(`${cancelTs}:${cancelBody}`)
      .digest('hex');

    const cancelResponse = await app.request('/v1/billing/webhook', {
      method: 'POST',
      headers: {
        'paddle-signature': `ts=${cancelTs};h1=${cancelH1}`,
      },
      body: cancelBody,
    });
    expect(cancelResponse.status).toBe(200);

    const [downgraded] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
    expect(downgraded?.planTier).toBe('free');
  });
});
