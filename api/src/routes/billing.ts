import { createHmac, timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '../db/client';
import { flexibleAuth, jwtAuth } from '../middleware/auth';
import { noCache } from '../middleware/cache';
import { zValidator, createCheckoutSchema } from '../lib/validation';
import { checkCredits, formatUsageResponse } from '../services/usage';
import { ValidationError, InternalError } from '../lib/errors';
import { env, getPlanLimit } from '../config/env';

const billing = new Hono();

// Usage, checkout, and webhook — all must be fresh
billing.use('*', noCache);

type PlanTier = 'starter' | 'pro';

type BillingEvent = {
  userId?: string;
  email?: string;
  customerId?: string;
  plan?: PlanTier;
  action: 'upgrade' | 'downgrade' | 'ignore';
};

function getSuccessUrl() {
  return env.BILLING_SUCCESS_URL || `${env.APP_URL}/settings?upgraded=true`;
}

function isBillingActive() {
  return env.BILLING_ENABLED && env.BILLING_PROVIDER !== 'none';
}

function normalizePlan(value: unknown): PlanTier | undefined {
  if (value === 'starter' || value === 'pro') {
    return value;
  }
  return undefined;
}

function mapPaddlePriceToPlan(priceId: unknown): PlanTier | undefined {
  const id = typeof priceId === 'string' ? priceId : '';
  if (id && id === env.PADDLE_PRICE_ID_PRO) return 'pro';
  if (id && id === env.PADDLE_PRICE_ID_STARTER) return 'starter';
  return undefined;
}

function mapLemonVariantToPlan(variantId: unknown): PlanTier | undefined {
  const id = String(variantId || '');
  if (id && id === env.LEMONSQUEEZY_VARIANT_ID_PRO) return 'pro';
  if (id && id === env.LEMONSQUEEZY_VARIANT_ID_STARTER) return 'starter';
  return undefined;
}

function secureCompareHex(left: string, right: string): boolean {
  try {
    const leftBuf = Buffer.from(left, 'hex');
    const rightBuf = Buffer.from(right, 'hex');
    if (leftBuf.length === 0 || rightBuf.length === 0 || leftBuf.length !== rightBuf.length) {
      return false;
    }
    return timingSafeEqual(leftBuf, rightBuf);
  } catch {
    return false;
  }
}

function verifyPaddleSignature(rawBody: string, signatureHeader: string): boolean {
  const secret = env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return false;

  const parts = signatureHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  const values = new Map<string, string>();
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value) values.set(key, value);
  }

  const ts = values.get('ts');
  const h1 = values.get('h1');
  if (!ts || !h1) return false;

  const expected = createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex');
  return secureCompareHex(expected, h1);
}

function verifyLemonSignature(rawBody: string, signatureHeader: string): boolean {
  const secret = env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return secureCompareHex(expected, signatureHeader);
}

async function createPaddleCheckout(user: { id: string; email: string }, plan: PlanTier) {
  const priceId = plan === 'pro' ? env.PADDLE_PRICE_ID_PRO : env.PADDLE_PRICE_ID_STARTER;
  if (!priceId || !env.PADDLE_API_KEY) {
    throw new InternalError('Paddle billing is not configured');
  }

  const response = await fetch(`${env.PADDLE_API_URL}/transactions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PADDLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{ price_id: priceId, quantity: 1 }],
      collection_mode: 'automatic',
      custom_data: {
        userId: user.id,
        plan,
      },
      checkout: {
        success_url: getSuccessUrl(),
      },
    }),
  });

  if (!response.ok) {
    throw new InternalError('Failed to create Paddle checkout');
  }

  const payload = await response.json() as {
    data?: { checkout?: { url?: string } };
  };
  const checkoutUrl = payload.data?.checkout?.url;
  if (!checkoutUrl) {
    throw new InternalError('Paddle checkout URL missing from response');
  }
  return checkoutUrl;
}

async function createLemonCheckout(user: { id: string; email: string }, plan: PlanTier) {
  const variantId =
    plan === 'pro' ? env.LEMONSQUEEZY_VARIANT_ID_PRO : env.LEMONSQUEEZY_VARIANT_ID_STARTER;
  if (!variantId || !env.LEMONSQUEEZY_API_KEY || !env.LEMONSQUEEZY_STORE_ID) {
    throw new InternalError('Lemon Squeezy billing is not configured');
  }

  const response = await fetch(`${env.LEMONSQUEEZY_API_URL}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: user.email,
            custom: {
              userId: user.id,
              plan,
            },
          },
          product_options: {
            redirect_url: getSuccessUrl(),
          },
          checkout_options: {
            embed: false,
          },
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: env.LEMONSQUEEZY_STORE_ID,
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: variantId,
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new InternalError('Failed to create Lemon Squeezy checkout');
  }

  const payload = await response.json() as {
    data?: { attributes?: { url?: string } };
  };
  const checkoutUrl = payload.data?.attributes?.url;
  if (!checkoutUrl) {
    throw new InternalError('Lemon Squeezy checkout URL missing from response');
  }
  return checkoutUrl;
}

function parsePaddleWebhook(body: unknown): BillingEvent {
  const payload = (body || {}) as {
    event_type?: string;
    data?: Record<string, unknown>;
  };
  const eventType = payload.event_type || '';
  const data = payload.data || {};
  const customData = (data.custom_data || data.customData || {}) as Record<string, unknown>;
  const nestedCustomer = (data.customer || {}) as Record<string, unknown>;
  const items = Array.isArray(data.items) ? data.items : [];
  const firstItem = (items[0] || {}) as Record<string, unknown>;
  const price = (firstItem.price || {}) as Record<string, unknown>;

  const plan =
    normalizePlan(customData.plan) ||
    mapPaddlePriceToPlan(price.id) ||
    mapPaddlePriceToPlan(data.price_id);
  const userId = typeof customData.userId === 'string' ? customData.userId : undefined;
  const email =
    (typeof nestedCustomer.email === 'string' && nestedCustomer.email) ||
    (typeof data.customer_email === 'string' && data.customer_email) ||
    undefined;
  const customerId =
    (typeof data.customer_id === 'string' && data.customer_id) ||
    (typeof nestedCustomer.id === 'string' && nestedCustomer.id) ||
    undefined;

  if (
    eventType === 'transaction.completed' ||
    eventType === 'subscription.created' ||
    eventType === 'subscription.updated'
  ) {
    return {
      userId,
      email,
      customerId,
      plan,
      action: plan ? 'upgrade' : 'ignore',
    };
  }

  if (eventType === 'subscription.canceled' || eventType === 'subscription.cancelled') {
    return {
      userId,
      email,
      customerId,
      action: 'downgrade',
    };
  }

  return { action: 'ignore' };
}

function parseLemonWebhook(body: unknown): BillingEvent {
  const payload = (body || {}) as {
    meta?: { event_name?: string };
    data?: {
      id?: string;
      attributes?: Record<string, unknown>;
    };
  };
  const eventName = payload.meta?.event_name || '';
  const attributes = payload.data?.attributes || {};
  const customData = ((attributes.custom_data ||
    (attributes.checkout_data as Record<string, unknown> | undefined)?.custom ||
    {}) as Record<string, unknown>);

  const plan =
    normalizePlan(customData.plan) ||
    mapLemonVariantToPlan(attributes.variant_id);
  const userId = typeof customData.userId === 'string' ? customData.userId : undefined;
  const email =
    (typeof attributes.user_email === 'string' && attributes.user_email) ||
    (typeof attributes.customer_email === 'string' && attributes.customer_email) ||
    (typeof attributes.email === 'string' && attributes.email) ||
    undefined;
  const customerId =
    (typeof attributes.customer_id === 'number' || typeof attributes.customer_id === 'string')
      ? String(attributes.customer_id)
      : payload.data?.id;

  if (
    eventName === 'order_created' ||
    eventName === 'subscription_created' ||
    eventName === 'subscription_updated'
  ) {
    return {
      userId,
      email,
      customerId,
      plan,
      action: plan ? 'upgrade' : 'ignore',
    };
  }

  if (
    eventName === 'subscription_cancelled' ||
    eventName === 'subscription_expired' ||
    eventName === 'subscription_paused'
  ) {
    return {
      userId,
      email,
      customerId,
      action: 'downgrade',
    };
  }

  return { action: 'ignore' };
}

async function findUserIdForEvent(event: BillingEvent): Promise<string | null> {
  const db = getDb();

  if (event.userId) {
    return event.userId;
  }

  if (event.customerId) {
    const [userByCustomer] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.billingCustomerId, event.customerId));
    if (userByCustomer?.id) return userByCustomer.id;
  }

  if (event.email) {
    const [userByEmail] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, event.email));
    if (userByEmail?.id) return userByEmail.id;
  }

  return null;
}

async function applyBillingEvent(event: BillingEvent): Promise<boolean> {
  const userId = await findUserIdForEvent(event);
  if (!userId) return false;

  const db = getDb();
  if (event.action === 'downgrade') {
    await db
      .update(schema.users)
      .set({
        planTier: 'free',
        planRenders: getPlanLimit('free'),
        updatedAt: Date.now(),
      })
      .where(eq(schema.users.id, userId));
    return true;
  }

  if (event.action === 'upgrade' && event.plan) {
    await db
      .update(schema.users)
      .set({
        planTier: event.plan,
        planRenders: getPlanLimit(event.plan),
        billingCustomerId: event.customerId ?? null,
        updatedAt: Date.now(),
      })
      .where(eq(schema.users.id, userId));
    return true;
  }

  return false;
}

// GET /v1/usage - Get usage stats
billing.get('/usage', flexibleAuth, async (c) => {
  const { userId } = c.get('auth');
  const credits = await checkCredits(userId);
  return c.json(formatUsageResponse(credits));
});

// POST /v1/billing/checkout - Create checkout session
billing.post('/billing/checkout', jwtAuth, zValidator('json', createCheckoutSchema), async (c) => {
  if (!isBillingActive()) {
    return c.json(
      {
        error: 'billing_disabled',
        message: 'Billing is currently disabled',
      },
      503
    );
  }

  const { plan } = c.req.valid('json');
  const { userId } = c.get('auth');
  const db = getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));

  if (!user) {
    throw new InternalError('User not found');
  }

  let checkoutUrl: string;
  if (env.BILLING_PROVIDER === 'paddle') {
    checkoutUrl = await createPaddleCheckout({ id: user.id, email: user.email }, plan);
  } else if (env.BILLING_PROVIDER === 'lemonsqueezy') {
    checkoutUrl = await createLemonCheckout({ id: user.id, email: user.email }, plan);
  } else {
    throw new InternalError('No active billing provider configured');
  }

  return c.json({ checkout_url: checkoutUrl, provider: env.BILLING_PROVIDER });
});

// POST /v1/billing/webhook - Provider webhook
billing.post('/billing/webhook', async (c) => {
  if (!isBillingActive()) {
    return c.json({ received: true, ignored: 'billing_disabled' });
  }

  const rawBody = await c.req.text();
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new ValidationError('Invalid JSON payload');
  }

  let event: BillingEvent = { action: 'ignore' };

  if (env.BILLING_PROVIDER === 'paddle') {
    const signature = c.req.header('paddle-signature');
    if (!signature) {
      throw new ValidationError('Missing webhook signature');
    }
    if (!verifyPaddleSignature(rawBody, signature)) {
      throw new ValidationError('Invalid webhook signature');
    }
    event = parsePaddleWebhook(payload);
  } else if (env.BILLING_PROVIDER === 'lemonsqueezy') {
    const signature = c.req.header('x-signature');
    if (!signature) {
      throw new ValidationError('Missing webhook signature');
    }
    if (!verifyLemonSignature(rawBody, signature)) {
      throw new ValidationError('Invalid webhook signature');
    }
    event = parseLemonWebhook(payload);
  }

  if (event.action === 'ignore') {
    return c.json({ received: true, ignored: true });
  }

  const applied = await applyBillingEvent(event);
  if (!applied) {
    return c.json({ received: true, ignored: 'user_not_found' });
  }

  return c.json({ received: true });
});

export default billing;
