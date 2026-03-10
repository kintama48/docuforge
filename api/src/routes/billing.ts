import { Hono } from 'hono';
import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';

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
import { sendTransactionalEmail } from '../services/email';
import { resolveEmailLocale, type EmailLocale } from '../services/email-locale';
import {
  renderEmailTemplate,
  type EmailTemplateId,
  type EmailTemplateInputById,
} from '../services/email-templates';
import { resolveEmailSenderForTemplate } from '../services/email-sender';

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

type PlanTier = 'free' | 'dev' | 'starter' | 'pro';

function planLabel(plan: PlanTier): string {
  switch (plan) {
    case 'dev':
      return 'Dev';
    case 'starter':
      return 'Starter';
    case 'pro':
      return 'Pro';
    case 'free':
    default:
      return 'Free';
  }
}

function resolvePlanFromPriceId(priceId: string | undefined): PlanTier {
  if (priceId === env.STRIPE_PRO_PRICE_ID) {
    return 'pro';
  }
  if (priceId === env.STRIPE_STARTER_PRICE_ID) {
    return 'starter';
  }
  if (priceId === env.STRIPE_DEV_PRICE_ID) {
    return 'dev';
  }
  return 'free';
}

function normalizePlanTier(value: string): PlanTier {
  if (value === 'pro' || value === 'starter' || value === 'dev') {
    return value;
  }
  return 'free';
}

function resolveLocaleFromContext(c: Context): EmailLocale {
  return resolveEmailLocale({
    headerLocale: c.req.header('x-docuforge-locale'),
    cookieLocale: getCookie(c, 'docuforge-locale') || null,
    acceptLanguage: c.req.header('Accept-Language'),
  });
}

function resolveLocaleFromMetadata(metadata: Record<string, unknown> | null | undefined): EmailLocale {
  const rawLocale = typeof metadata?.locale === 'string' ? metadata.locale : null;
  return resolveEmailLocale({
    headerLocale: rawLocale,
    cookieLocale: null,
    acceptLanguage: null,
  });
}

async function sendTemplatedEmail<K extends EmailTemplateId>(
  templateId: K,
  to: string,
  input: EmailTemplateInputById[K]
): Promise<void> {
  const template = renderEmailTemplate(templateId, input);
  const sender = resolveEmailSenderForTemplate(templateId);
  await sendTransactionalEmail({
    to,
    subject: template.subject,
    text: template.text,
    html: template.html,
    from: sender.from,
    replyTo: sender.replyTo,
  });
}

async function sendBillingEmail<K extends EmailTemplateId>(
  templateId: K,
  to: string,
  input: EmailTemplateInputById[K]
): Promise<void> {
  try {
    await sendTemplatedEmail(templateId, to, input);
  } catch (err) {
    console.error('Failed to send billing email', err);
  }
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
  const locale = resolveLocaleFromContext(c);

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
    metadata: { userId: user.id, plan, locale },
    subscription_data: {
      metadata: { userId: user.id, locale },
    },
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
      const plan = normalizePlanTier(typeof session.metadata?.plan === 'string' ? session.metadata.plan : 'free');

      if (userId && plan !== 'free') {
        const [user] = await db
          .select({
            id: schema.users.id,
            email: schema.users.email,
          })
          .from(schema.users)
          .where(eq(schema.users.id, userId));

        await db
          .update(schema.users)
          .set({
            planTier: plan,
            planRenders: getPlanLimit(plan),
            stripeCustomerId: session.customer as string,
            updatedAt: Date.now(),
          })
          .where(eq(schema.users.id, userId));

        if (user) {
          const locale = resolveLocaleFromMetadata(session.metadata);
          await sendBillingEmail('billing_subscription_started', user.email, {
            locale,
            planName: planLabel(plan),
            manageBillingUrl: `${env.APP_URL}/settings`,
          });
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Determine plan from price
      const priceId = subscription.items.data[0]?.price?.id;
      const plan = resolvePlanFromPriceId(priceId);

      const [user] = await db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          planTier: schema.users.planTier,
        })
        .from(schema.users)
        .where(eq(schema.users.stripeCustomerId, customerId));

      await db
        .update(schema.users)
        .set({
          planTier: plan,
          planRenders: getPlanLimit(plan),
          updatedAt: Date.now(),
        })
        .where(eq(schema.users.stripeCustomerId, customerId));

      if (user && user.planTier !== plan && user.planTier !== 'free' && plan !== 'free') {
        const locale = resolveLocaleFromMetadata(subscription.metadata);
        const previousPlan = normalizePlanTier(user.planTier);
        await sendBillingEmail('billing_plan_changed', user.email, {
          locale,
          previousPlanName: planLabel(previousPlan),
          planName: planLabel(plan),
          manageBillingUrl: `${env.APP_URL}/settings`,
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const [user] = await db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          planTier: schema.users.planTier,
        })
        .from(schema.users)
        .where(eq(schema.users.stripeCustomerId, customerId));

      // Downgrade to free
      await db
        .update(schema.users)
        .set({
          planTier: 'free',
          planRenders: getPlanLimit('free'),
          updatedAt: Date.now(),
        })
        .where(eq(schema.users.stripeCustomerId, customerId));

      if (user && user.planTier !== 'free') {
        const locale = resolveLocaleFromMetadata(subscription.metadata);
        const previousPlan = normalizePlanTier(user.planTier);
        await sendBillingEmail('billing_subscription_canceled', user.email, {
          locale,
          previousPlanName: planLabel(previousPlan),
          restartBillingUrl: `${env.APP_URL}/pricing`,
          supportEmail: env.EMAIL_FROM_SUPPORT,
        });
      }
      break;
    }
  }

  return c.json({ received: true });
});

export default billing;
