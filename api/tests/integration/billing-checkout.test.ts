/**
 * Integration tests for billing checkout and webhook flows.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createApp } from '../../src/app';
import { initTestDb, getDb, resetDb, schema } from '../../src/db/client';
import { setupTestEnv, createTestUser, getAuthHeaders } from '../setup';
import { createTestJwt } from '../helpers/auth';
import { setBillingClient } from '../../src/routes/billing';
import { env } from '../../src/config/env';
import { eq } from 'drizzle-orm';
import { clearMockEmails, listMockEmails } from '../../src/services/email';

const originalEnv = { ...process.env };

function createBillingStub() {
  let customerCreateCalls = 0;
  let sessionCreateCalls = 0;
  let shouldThrowSignature = false;

  const stub = {
    createCustomer: async () => {
      customerCreateCalls += 1;
      return { id: 'cus_test' };
    },
    createCheckoutSession: async () => {
      sessionCreateCalls += 1;
      return { url: 'https://checkout.test/session' };
    },
    constructEvent: async (body: string) => {
      if (shouldThrowSignature) {
        throw new Error('invalid signature');
      }
      return JSON.parse(body);
    },
    __state: {
      get customerCalls() {
        return customerCreateCalls;
      },
      get sessionCalls() {
        return sessionCreateCalls;
      },
      setThrowSignature(value: boolean) {
        shouldThrowSignature = value;
      },
    },
  };

  return stub;
}

describe('Billing checkout and webhook', () => {
  let app: ReturnType<typeof createApp>;
  let billingStub: ReturnType<typeof createBillingStub>;

  beforeEach(async () => {
    setupTestEnv('http://127.0.0.1:3001');
    await initTestDb();
    billingStub = createBillingStub();
    setBillingClient(billingStub as any);
    app = createApp();
    clearMockEmails();
  });

  afterEach(() => {
    clearMockEmails();
    setBillingClient(null);
    resetDb();
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  it('creates checkout session and stores stripe customer', async () => {
    const user = await createTestUser(getDb() as any);

    const response = await app.request('/console/billing/checkout', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({ plan: 'starter' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.checkout_url).toBe('https://checkout.test/session');
    expect(billingStub.__state.customerCalls).toBe(1);
    expect(billingStub.__state.sessionCalls).toBe(1);

    const db = getDb();
    const [record] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
    expect(record?.stripeCustomerId).toBe('cus_test');
  });

  it('creates checkout session for dev plan', async () => {
    const user = await createTestUser(getDb() as any);

    const response = await app.request('/console/billing/checkout', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({ plan: 'dev' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.checkout_url).toBe('https://checkout.test/session');
  });

  it('returns internal error when user is missing', async () => {
    const token = await createTestJwt('usr_missing', 'missing@example.com');

    const response = await app.request('/console/billing/checkout', {
      method: 'POST',
      headers: {
        Cookie: `${env.AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plan: 'starter' }),
    });

    expect(response.status).toBe(500);
  });

  it('fails when price is not configured', async () => {
    const originalPriceId = env.PADDLE_PRICE_ID_STARTER;
    env.PADDLE_PRICE_ID_STARTER = '';

    const user = await createTestUser(getDb() as any);
    const db = getDb();
    await db
      .update(schema.users)
      .set({ stripeCustomerId: 'cus_existing' })
      .where(eq(schema.users.id, user.id));

    const response = await app.request('/console/billing/checkout', {
      method: 'POST',
      headers: getAuthHeaders(user, false),
      body: JSON.stringify({ plan: 'starter' }),
    });

    env.PADDLE_PRICE_ID_STARTER = originalPriceId;
    expect(response.status).toBe(500);
  });

  it('rejects webhook without signature', async () => {
    const response = await app.request('/v1/billing/webhook', {
      method: 'POST',
      body: JSON.stringify({ type: 'checkout.session.completed', data: { object: {} } }),
    });

    expect(response.status).toBe(422);
  });

  it('rejects webhook with invalid signature', async () => {
    billingStub.__state.setThrowSignature(true);

    const response = await app.request('/v1/billing/webhook', {
      method: 'POST',
      headers: { 'x-billing-signature': 'sig' },
      body: JSON.stringify({ type: 'checkout.session.completed', data: { object: {} } }),
    });

    expect(response.status).toBe(422);
  });

  it('handles checkout session completed webhook', async () => {
    const user = await createTestUser(getDb() as any);

    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_checkout',
          metadata: { userId: user.id, plan: 'starter' },
        },
      },
    };

    const response = await app.request('/v1/billing/webhook', {
      method: 'POST',
      headers: { 'x-billing-signature': 'sig' },
      body: JSON.stringify(event),
    });

    expect(response.status).toBe(200);

    const db = getDb();
    const [record] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
    expect(record?.planTier).toBe('starter');
    expect(record?.stripeCustomerId).toBe('cus_checkout');

    const billingEmail = listMockEmails().at(-1);
    expect(billingEmail).toBeDefined();
    expect(billingEmail?.subject).toContain('subscription is active');
    expect(billingEmail?.from).toBe('billing@test.docuforge.local');
    expect(billingEmail?.replyTo).toBe('billing@test.docuforge.local');
  });

  it('handles subscription updated and deleted webhooks', async () => {
    const user = await createTestUser(getDb() as any);
    const db = getDb();
    await db
      .update(schema.users)
      .set({ stripeCustomerId: 'cus_sub' })
      .where(eq(schema.users.id, user.id));

    const updateEvent = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_sub',
          items: { data: [{ price: { id: process.env.PADDLE_PRICE_ID_PRO } }] },
        },
      },
    };

    const updateResponse = await app.request('/v1/billing/webhook', {
      method: 'POST',
      headers: { 'x-billing-signature': 'sig' },
      body: JSON.stringify(updateEvent),
    });
    expect(updateResponse.status).toBe(200);

    const [updated] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
    expect(updated?.planTier).toBe('pro');

    const devUpdateEvent = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_sub',
          items: { data: [{ price: { id: process.env.PADDLE_PRICE_ID_DEV } }] },
        },
      },
    };

    const devUpdateResponse = await app.request('/v1/billing/webhook', {
      method: 'POST',
      headers: { 'x-billing-signature': 'sig' },
      body: JSON.stringify(devUpdateEvent),
    });
    expect(devUpdateResponse.status).toBe(200);

    const [devUpdated] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
    expect(devUpdated?.planTier).toBe('dev');

    const planChangedEmail = listMockEmails().at(-1);
    expect(planChangedEmail).toBeDefined();
    expect(planChangedEmail?.subject).toContain('plan was updated');
    expect(planChangedEmail?.from).toBe('billing@test.docuforge.local');

    const deleteEvent = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          customer: 'cus_sub',
        },
      },
    };

    const deleteResponse = await app.request('/v1/billing/webhook', {
      method: 'POST',
      headers: { 'x-billing-signature': 'sig' },
      body: JSON.stringify(deleteEvent),
    });
    expect(deleteResponse.status).toBe(200);

    const [deleted] = await db.select().from(schema.users).where(eq(schema.users.id, user.id));
    expect(deleted?.planTier).toBe('free');

    const canceledEmail = listMockEmails().at(-1);
    expect(canceledEmail).toBeDefined();
    expect(canceledEmail?.subject).toContain('subscription was canceled');
    expect(canceledEmail?.from).toBe('billing@test.docuforge.local');
  });
});
