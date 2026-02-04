import { Hono } from 'hono';

import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { getDb, schema } from '../db/client';
import { flexibleAuth, jwtAuth } from '../middleware/auth';
import { zValidator, createCheckoutSchema } from '../lib/validation';
import { checkCredits, formatUsageResponse } from '../services/usage';
import { ValidationError, InternalError } from '../lib/errors';
import { getPlanLimit } from '../config/env';

const billing = new Hono();

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-01-27.acacia',
    });
  }
  return stripeClient;
}

// GET /v1/usage - Get usage stats
billing.get('/usage', flexibleAuth, async (c) => {
  const { userId } = c.get('auth');
  const credits = await checkCredits(userId);
  return c.json(formatUsageResponse(credits));
});

// POST /v1/billing/checkout - Create checkout session
billing.post('/billing/checkout', jwtAuth, zValidator('json', createCheckoutSchema), async (c) => {
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
  const priceId =
    plan === 'pro' ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_STARTER_PRICE_ID;

  if (!priceId) {
    throw new InternalError('Price not configured');
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_URL || 'http://localhost:3000'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/billing/cancel`,
    metadata: { userId: user.id, plan },
  });

  return c.json({ checkout_url: session.url });
});

// POST /v1/billing/webhook - Stripe webhook
billing.post('/billing/webhook', async (c) => {
  const stripe = getStripe();
  const signature = c.req.header('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
      const plan = session.metadata?.plan as 'starter' | 'pro' | undefined;

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

      if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
        plan = 'pro';
      } else if (priceId === process.env.STRIPE_STARTER_PRICE_ID) {
        plan = 'starter';
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
