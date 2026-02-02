/**
 * Stripe webhook helpers for testing.
 * Generates fake webhook events and signs them with test secret.
 */
import { createHmac } from 'crypto';

export type StripeEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted';

export interface CheckoutSessionData {
  customerId: string;
  subscriptionId: string;
  priceId: string;
  planTier: 'starter' | 'pro';
}

export interface SubscriptionData {
  customerId: string;
  subscriptionId: string;
  priceId: string;
  status: 'active' | 'canceled' | 'past_due';
  planTier: 'starter' | 'pro' | 'free';
}

interface StripeEvent {
  id: string;
  object: 'event';
  api_version: string;
  created: number;
  type: StripeEventType;
  data: {
    object: Record<string, unknown>;
  };
}

/**
 * Generate a fake checkout.session.completed event.
 */
export function createCheckoutCompletedEvent(data: CheckoutSessionData): StripeEvent {
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        object: 'checkout.session',
        customer: data.customerId,
        subscription: data.subscriptionId,
        mode: 'subscription',
        payment_status: 'paid',
        status: 'complete',
        metadata: {
          plan_tier: data.planTier,
        },
        line_items: {
          data: [
            {
              price: {
                id: data.priceId,
              },
            },
          ],
        },
      },
    },
  };
}

/**
 * Generate a fake customer.subscription.updated event.
 */
export function createSubscriptionUpdatedEvent(data: SubscriptionData): StripeEvent {
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: data.subscriptionId,
        object: 'subscription',
        customer: data.customerId,
        status: data.status,
        items: {
          data: [
            {
              price: {
                id: data.priceId,
              },
            },
          ],
        },
        metadata: {
          plan_tier: data.planTier,
        },
      },
    },
  };
}

/**
 * Generate a fake customer.subscription.deleted event.
 */
export function createSubscriptionDeletedEvent(data: {
  customerId: string;
  subscriptionId: string;
}): StripeEvent {
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: data.subscriptionId,
        object: 'subscription',
        customer: data.customerId,
        status: 'canceled',
      },
    },
  };
}

/**
 * Sign a webhook payload using Stripe's signature scheme.
 * @param payload The JSON payload as a string
 * @param secret The webhook secret (e.g., 'whsec_test_secret')
 * @param timestamp Optional timestamp (defaults to now)
 * @returns The Stripe-Signature header value
 */
export function signWebhook(payload: string, secret: string, timestamp?: number): string {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${payload}`;
  const signature = createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${ts},v1=${signature}`;
}

/**
 * Create a signed webhook request body and headers.
 */
export function createSignedWebhook<T extends StripeEvent>(
  event: T,
  secret: string
): { body: string; signature: string; timestamp: number } {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify(event);
  const signature = signWebhook(body, secret, timestamp);

  return {
    body,
    signature,
    timestamp,
  };
}

/**
 * Create an unsigned or incorrectly signed webhook for testing rejection.
 */
export function createInvalidSignedWebhook<T extends StripeEvent>(event: T): {
  body: string;
  signature: string;
} {
  const body = JSON.stringify(event);
  // Invalid signature
  return {
    body,
    signature: 't=123,v1=invalid_signature_for_testing',
  };
}

/**
 * Test webhook secret constant.
 */
export const TEST_WEBHOOK_SECRET = 'whsec_test_secret_12345';
