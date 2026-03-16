import { Hono } from 'hono';
import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { eq } from 'drizzle-orm';
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

type PlanTier = 'free' | 'dev' | 'starter' | 'pro';

type BillingEvent = {
  type: string;
  data: { object: Record<string, unknown> };
};

interface BillingClient {
  createCustomer(params: {
    email: string;
    metadata: Record<string, string>;
  }): Promise<{ id: string }>;
  createCheckoutSession(params: {
    customerId: string;
    plan: Exclude<PlanTier, 'free'>;
    planId: string;
    userId: string;
    locale: EmailLocale;
  }): Promise<{ url: string }>;
  constructEvent(body: string, signature: string, webhookSecret: string): Promise<BillingEvent>;
}

let billingClient: BillingClient | null = null;

function providerName(): 'Paddle' | 'Lemon Squeezy' {
  return env.BILLING_PROVIDER === 'paddle' ? 'Paddle' : 'Lemon Squeezy';
}

function providerPlanId(plan: Exclude<PlanTier, 'free'>): string {
  if (env.BILLING_PROVIDER === 'paddle') {
    if (plan === 'dev') return env.PADDLE_PRICE_ID_DEV;
    if (plan === 'starter') return env.PADDLE_PRICE_ID_STARTER;
    return env.PADDLE_PRICE_ID_PRO;
  }
  if (plan === 'dev') return env.LEMONSQUEEZY_VARIANT_ID_DEV;
  if (plan === 'starter') return env.LEMONSQUEEZY_VARIANT_ID_STARTER;
  return env.LEMONSQUEEZY_VARIANT_ID_PRO;
}

function providerWebhookSecret(): string {
  if (env.BILLING_PROVIDER === 'paddle') {
    return env.PADDLE_WEBHOOK_SECRET;
  }
  return env.LEMONSQUEEZY_WEBHOOK_SECRET;
}

function providerSignatureHeader(c: Context): string | undefined {
  if (env.BILLING_PROVIDER === 'paddle') {
    return c.req.header('x-billing-signature') ?? c.req.header('paddle-signature');
  }
  return c.req.header('x-billing-signature') ?? c.req.header('x-signature');
}

function parseSignatureHeader(signature: string): { timestamp: string; v1: string } | null {
  const parts = signature.split(',').map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const v1 = parts.find((part) => part.startsWith('v1='))?.slice(3);
  if (!timestamp || !v1) return null;
  return { timestamp, v1 };
}

function verifySignature(body: string, signature: string, secret: string): boolean {
  const parsed = parseSignatureHeader(signature);
  if (!parsed) return false;

  const expected = createHmac('sha256', secret).update(`${parsed.timestamp}.${body}`).digest('hex');
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(parsed.v1);
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function resolveCheckoutUrl(plan: Exclude<PlanTier, 'free'>): string {
  const billingPath = `/billing/checkout?provider=${env.BILLING_PROVIDER}&plan=${plan}`;
  return `${env.APP_URL}${billingPath}`;
}

function createDefaultBillingClient(): BillingClient {
  return {
    async createCustomer() {
      return { id: `cust_${crypto.randomUUID()}` };
    },
    async createCheckoutSession({ plan }) {
      return { url: resolveCheckoutUrl(plan) };
    },
    async constructEvent(body, signature, webhookSecret) {
      if (!verifySignature(body, signature, webhookSecret)) {
        throw new ValidationError('Invalid webhook signature');
      }
      return JSON.parse(body) as BillingEvent;
    },
  };
}

function getBillingClient(): BillingClient {
  if (!billingClient) {
    billingClient = createDefaultBillingClient();
  }
  return billingClient;
}

export function setBillingClient(client: BillingClient | null) {
  billingClient = client;
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
  if (!priceId) return 'free';
  if (env.BILLING_PROVIDER === 'paddle') {
    if (priceId === env.PADDLE_PRICE_ID_PRO) return 'pro';
    if (priceId === env.PADDLE_PRICE_ID_STARTER) return 'starter';
    if (priceId === env.PADDLE_PRICE_ID_DEV) return 'dev';
    return 'free';
  }
  if (priceId === env.LEMONSQUEEZY_VARIANT_ID_PRO) {
    return 'pro';
  }
  if (priceId === env.LEMONSQUEEZY_VARIANT_ID_STARTER) {
    return 'starter';
  }
  if (priceId === env.LEMONSQUEEZY_VARIANT_ID_DEV) {
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
  const billingProvider = getBillingClient();
  const locale = resolveLocaleFromContext(c);

  // Get or create billing customer
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));

  if (!user) {
    throw new InternalError('User not found');
  }

  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customer = await billingProvider.createCustomer({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;

    await db.update(schema.users).set({ stripeCustomerId: customerId }).where(eq(schema.users.id, userId));
  }
  if (!customerId) {
    throw new InternalError('Failed to resolve billing customer');
  }

  const priceId = providerPlanId(plan);

  if (!priceId) {
    throw new InternalError(`${providerName()} plan ID not configured`);
  }

  const session = await billingProvider.createCheckoutSession({
    customerId,
    plan,
    planId: priceId,
    userId: user.id,
    locale,
  });

  return c.json({ checkout_url: session.url });
});

// POST /v1/billing/webhook - provider webhook
billing.post('/billing/webhook', requireConsumerBillingPath, async (c) => {
  const billingProvider = getBillingClient();
  const signature = providerSignatureHeader(c);
  const webhookSecret = providerWebhookSecret();

  if (!signature || !webhookSecret) {
    throw new ValidationError('Missing webhook signature');
  }

  const body = await c.req.text();

  let event: BillingEvent;
  try {
    event = await billingProvider.constructEvent(body, signature, webhookSecret);
  } catch {
    throw new ValidationError('Invalid webhook signature');
  }

  const db = getDb();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Record<string, unknown>;
      const metadata =
        typeof session.metadata === 'object' && session.metadata !== null
          ? (session.metadata as Record<string, unknown>)
          : {};
      const userId = typeof metadata.userId === 'string' ? metadata.userId : null;
      const plan = normalizePlanTier(typeof metadata.plan === 'string' ? metadata.plan : 'free');

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
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
            updatedAt: Date.now(),
          })
          .where(eq(schema.users.id, userId));

        if (user) {
          const locale = resolveLocaleFromMetadata(metadata);
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
      const subscription = event.data.object as Record<string, unknown>;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : '';
      if (!customerId) break;

      // Determine plan from price
      const items = (subscription.items as { data?: Array<{ price?: { id?: string } }> } | undefined)?.data ?? [];
      const priceId = items[0]?.price?.id;
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
        const metadata =
          typeof subscription.metadata === 'object' && subscription.metadata !== null
            ? (subscription.metadata as Record<string, unknown>)
            : {};
        const locale = resolveLocaleFromMetadata(metadata);
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
      const subscription = event.data.object as Record<string, unknown>;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : '';
      if (!customerId) break;

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
        const metadata =
          typeof subscription.metadata === 'object' && subscription.metadata !== null
            ? (subscription.metadata as Record<string, unknown>)
            : {};
        const locale = resolveLocaleFromMetadata(metadata);
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
