import { Hono } from 'hono';
import type { Context } from 'hono';

import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { getDb, schema } from '../db/client';
import { flexibleAuth, jwtAuth } from '../middleware/auth';
import { noCache } from '../middleware/cache';
import { zValidator, createCheckoutSchema } from '../lib/validation';
import { checkCredits, formatUsageResponse } from '../services/usage';
import { checkAiCredits, formatAiUsageResponse } from '../services/ai-usage';
import { ValidationError, InternalError, NotFoundError } from '../lib/errors';
import { env, getPlanLimit } from '../config/env';

const billing = new Hono();

// Usage, checkout, and webhook — all must be fresh
billing.use('*', noCache);

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (env.BILLING_PROVIDER === 'paddle') {
    throw new InternalError('Paddle billing provider is not enabled in this deployment');
  }
  if (env.BILLING_PROVIDER === 'lemonsqueezy') {
    throw new InternalError('Lemon Squeezy billing provider is not enabled in this deployment');
  }

  if (env.BILLING_PROVIDER !== 'stripe') {
    throw new InternalError(`Unsupported billing provider: ${env.BILLING_PROVIDER}`);
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia',
    });
  }
  return stripeClient;
}

export function setStripeClient(client: Stripe | null) {
  stripeClient = client;
}

async function requireConsoleBillingPath(c: Context, next: () => Promise<void>) {
  if (!c.req.path.startsWith('/console/')) {
    throw new NotFoundError('Not found');
  }
  await next();
}

async function requireConsumerBillingPath(c: Context, next: () => Promise<void>) {
  if (!c.req.path.startsWith('/v1/')) {
    throw new NotFoundError('Not found');
  }
  await next();
}

// GET /v1/usage - Get usage stats
billing.get('/usage', requireConsoleBillingPath, flexibleAuth, async (c) => {
  const { userId } = c.get('auth');
  const [credits, aiCredits] = await Promise.all([
    checkCredits(userId),
    checkAiCredits(userId),
  ]);
  return c.json({
    ...formatUsageResponse(credits),
    ...formatAiUsageResponse(aiCredits),
  });
});

// POST /v1/billing/checkout - Create checkout session
billing.post(
  '/billing/checkout',
  requireConsoleBillingPath,
  jwtAuth,
  zValidator('json', createCheckoutSchema),
  async (c) => {
  const { plan } = c.req.valid('json');
  const { userId } = c.get('auth');
  const db = getDb();
  const stripe = getStripe();

  // Get or create Stripe customer
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));

  if (!user) {
    throw new InternalError('User not found');
  }

  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;

    await db.update(schema.users).set({ stripeCustomerId: customerId }).where(eq(schema.users.id, userId));
  }

  // Get price ID
  const priceByPlan: Record<'dev' | 'starter' | 'pro', string> = {
    dev: env.STRIPE_DEV_PRICE_ID,
    starter: env.STRIPE_STARTER_PRICE_ID,
    pro: env.STRIPE_PRO_PRICE_ID,
  };
  const priceId = priceByPlan[plan];

  if (!priceId) {
    throw new InternalError('Price not configured');
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/billing/cancel`,
    metadata: { userId: user.id, plan },
  });

  return c.json({ checkout_url: session.url });
});

// POST /v1/billing/webhook - Stripe webhook
billing.post('/billing/webhook', requireConsumerBillingPath, async (c) => {
  const stripe = getStripe();
  const signature = c.req.header('stripe-signature');
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    throw new ValidationError('Missing webhook signature');
  }

  const body = await c.req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch {
    throw new ValidationError('Invalid webhook signature');
  }

  const db = getDb();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan as 'dev' | 'starter' | 'pro' | undefined;

      if (userId && plan) {
        await db
          .update(schema.users)
          .set({
            planTier: plan,
            planRenders: getPlanLimit(plan),
            stripeCustomerId: session.customer as string,
            updatedAt: Date.now(),
          })
          .where(eq(schema.users.id, userId));
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Determine plan from price
      const priceId = subscription.items.data[0]?.price?.id;
      let plan: string = 'free';

      if (priceId === env.STRIPE_PRO_PRICE_ID) {
        plan = 'pro';
      } else if (priceId === env.STRIPE_STARTER_PRICE_ID) {
        plan = 'starter';
      } else if (priceId === env.STRIPE_DEV_PRICE_ID) {
        plan = 'dev';
      }

      await db
        .update(schema.users)
        .set({
          planTier: plan,
          planRenders: getPlanLimit(plan),
          updatedAt: Date.now(),
        })
        .where(eq(schema.users.stripeCustomerId, customerId));
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Downgrade to free
      await db
        .update(schema.users)
        .set({
          planTier: 'free',
          planRenders: getPlanLimit('free'),
          updatedAt: Date.now(),
        })
        .where(eq(schema.users.stripeCustomerId, customerId));
      break;
    }
  }

  return c.json({ received: true });
});

export default billing;
