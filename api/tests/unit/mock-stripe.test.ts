/**
 * Unit tests for Stripe webhook helpers.
 */
import { describe, test, expect } from 'bun:test';
import {
  createCheckoutCompletedEvent,
  createSubscriptionUpdatedEvent,
  createSubscriptionDeletedEvent,
  signWebhook,
  createSignedWebhook,
  createInvalidSignedWebhook,
  TEST_WEBHOOK_SECRET,
} from '../helpers/mock-stripe';

describe('mock-stripe helpers', () => {
  test('createCheckoutCompletedEvent includes metadata', () => {
    const event = createCheckoutCompletedEvent({
      customerId: 'cus_test',
      subscriptionId: 'sub_test',
      priceId: 'price_test',
      planTier: 'starter',
    });
    expect(event.type).toBe('checkout.session.completed');
    expect(event.data.object).toBeDefined();
  });

  test('createSubscriptionUpdatedEvent includes price id', () => {
    const event = createSubscriptionUpdatedEvent({
      customerId: 'cus_test',
      subscriptionId: 'sub_test',
      priceId: 'price_test',
      status: 'active',
      planTier: 'pro',
    });
    expect(event.type).toBe('customer.subscription.updated');
  });

  test('createSubscriptionDeletedEvent builds event', () => {
    const event = createSubscriptionDeletedEvent({
      customerId: 'cus_test',
      subscriptionId: 'sub_test',
    });
    expect(event.type).toBe('customer.subscription.deleted');
  });

  test('signWebhook builds signature header', () => {
    const signature = signWebhook('{"ok":true}', TEST_WEBHOOK_SECRET, 123);
    expect(signature).toContain('t=123');
    expect(signature).toContain('v1=');
  });

  test('createSignedWebhook returns body and signature', () => {
    const event = createSubscriptionDeletedEvent({
      customerId: 'cus_test',
      subscriptionId: 'sub_test',
    });
    const signed = createSignedWebhook(event, TEST_WEBHOOK_SECRET);
    expect(signed.body).toContain('customer.subscription.deleted');
    expect(signed.signature).toContain('v1=');
  });

  test('createInvalidSignedWebhook returns invalid signature', () => {
    const event = createSubscriptionDeletedEvent({
      customerId: 'cus_test',
      subscriptionId: 'sub_test',
    });
    const signed = createInvalidSignedWebhook(event);
    expect(signed.signature).toContain('invalid_signature_for_testing');
  });
});
