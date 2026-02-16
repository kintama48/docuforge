# Payment Gateway Setup Guide for DocuForge

**Last Updated**: February 2026

This guide covers payment gateway options for DocuForge (a PDF generation API SaaS), with specific focus on Pakistan-based LLC operations and international payment processing.

---

## Table of Contents

1. [Paddle vs Stripe for Pakistan/LLC](#1-paddle-vs-stripe-for-pakistanllc)
2. [Paddle Billing Setup](#2-paddle-billing-setup)
3. [Paddle Integration Steps](#3-paddle-integration-steps)
4. [Migration Plan: Stripe to Paddle](#4-migration-plan-stripe-to-paddle)
5. [Paddle Payout Requirements](#5-paddle-payout-requirements)
6. [Tax Handling with Paddle](#6-tax-handling-with-paddle)
7. [Alternative: LemonSqueezy](#7-alternative-lemonsqueezy)

---

## 1. Paddle vs Stripe for Pakistan/LLC

### Stripe Availability in Pakistan

**Stripe is NOT officially supported in Pakistan.** Stripe does not support local bank payouts to Pakistani bank accounts, and you cannot directly connect a Pakistani bank account to Stripe.

#### Workarounds for Stripe

If you still want to use Stripe from Pakistan, there are three main workarounds:

1. **Payoneer Method** (Most Common)
   - Get a US receiving account through Payoneer
   - Add the Payoneer account details to Stripe as your payout method
   - Transfer time: 1-2 days
   - Fees: 2-3% on withdrawals
   - **Important**: Name on Payoneer account must match Stripe account name
   - **Sources**: [Stripe Withdrawal to Pakistani Bank](https://webzeto.com/stripe-withdrawal-to-pakistani-bank/), [Stripe Payout to Pakistan](https://webzeto.com/stripe-payout-to-pakistan/)

2. **Wise (formerly TransferWise)**
   - Provides international account details (US, UK, EU)
   - Use these details to receive Stripe payouts
   - Better currency conversion rates than Payoneer
   - **Source**: [How to Withdraw Money from Stripe in Pakistan](https://medium.com/contentalogist/how-to-withdraw-money-from-stripe-in-pakistan-01cdc2beee6e)

3. **Stripe Atlas + Foreign Company**
   - Register a US LLC via Stripe Atlas ($500 + ongoing compliance fees)
   - Get US business bank account and Stripe merchant account
   - Allows entrepreneurs from 140+ countries to incorporate in Delaware
   - Full Stripe platform access as a US company
   - **Sources**: [Stripe Atlas](https://stripe.com/atlas), [Stripe Atlas Review](https://rapidr.io/blog/stripe-atlas/)

**Recommendation**: While Stripe can work via workarounds, these add complexity, fees, and compliance overhead. For Pakistan-based operations, a Merchant of Record (MoR) solution like Paddle is simpler.

---

### Paddle Availability for Pakistan

**Paddle supports sellers globally**, including Pakistan, with two key advantages:

1. **Direct Payouts**: Paddle can payout "anywhere in the world with exception to sanctioned countries" (Pakistan is NOT sanctioned)
2. **Merchant of Record Model**: Paddle acts as the legal seller, handling all tax, compliance, and regulatory burden

**Payout Methods**:
- Wire transfer (bank transfer)
- Payoneer

**Payout Fees**:
- Most countries: No fees
- Some countries: $15 SWIFT fee may apply

**Sources**: [Paddle Payout Information](https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid), [Paddle Supported Countries](https://developer.paddle.com/concepts/sell/supported-countries-locales)

---

### Cost Comparison

| Provider | Transaction Fee | International Fee | Monthly Fee | Payout to Pakistan |
|----------|----------------|-------------------|-------------|-------------------|
| **Stripe** | 2.9% + $0.30 | Varies | $0 | Via Payoneer/Wise (2-3% extra) |
| **Paddle** | 5% + $0.50 | Included | $0 | Direct ($15 SWIFT fee possible) |
| **LemonSqueezy** | 5% + $0.50 | +1.5% | $0 | 110+ countries (Pakistan TBD) |

**Analysis**: Paddle's 5% fee is higher than Stripe's base rate, but when you factor in:
- Stripe's 2-3% Payoneer withdrawal fee
- Tax compliance costs (Paddle handles all VAT/GST)
- Reduced development complexity
- No separate payment processor relationships

**Paddle becomes cost-competitive and operationally simpler** for international SaaS with Pakistan-based operations.

**Sources**: [Paddle Pricing](https://dodopayments.com/blogs/paddle-review), [SaaS Fee Calculator](https://saasfeecalc.com/)

---

## 2. Paddle Billing Setup

### Prerequisites

Before applying to Paddle as a vendor, ensure you have:

1. **Legal Business Entity**
   - LLC, Corporation, or registered business
   - Sole traders/individuals also supported

2. **Website Requirements**
   - **Legal Pages** (all must be accessible):
     - Terms and Conditions
     - Privacy Policy
     - Refund/Return Policy
   - **Contact Page** with:
     - Email address
     - Phone number
   - **Professional appearance**: Paddle reviews your site for legitimacy

3. **Business Verification Documents**

   For **Companies/LLCs**:
   - Government-issued legal document showing:
     - Legal business name
     - Business address
     - Registration number
     - Ownership structure (shareholders with 25%+ ownership)
     - Names of owners and key stakeholders

   For **Individuals/Sole Traders**:
   - No ownership documents needed

4. **Payment Processing History** (Optional but helpful)
   - Last 3 months of processing statements from existing payment processor
   - Shows total volume, refunds, chargebacks
   - **New businesses**: If you don't have this, Paddle will take that into account

**Sources**: [Paddle Business Verification](https://www.paddle.com/help/start/account-verification/what-is-business-verification), [Paddle Account Verification](https://www.paddle.com/help/start/account-verification), [Getting Approved on Paddle](https://msalinas92.medium.com/how-i-got-my-saas-platform-approved-on-paddle-without-losing-my-mind-738e7f70cc45)

---

### Application Process

1. **Sign up at Paddle.com**
   - Go to [paddle.com](https://www.paddle.com/)
   - Create vendor account

2. **Complete Business Profile**
   - Business name, address, contact info
   - Tax identification details
   - Bank account or Payoneer details for payouts

3. **Submit Verification Documents**
   - Upload company registration documents
   - Ownership breakdown (if company)

4. **Domain & Website Verification**
   - Paddle will review your website
   - Ensure all legal pages are live and accessible
   - Contact information must be visible

5. **Review Timeline**
   - Manual review: 2-4 business days (typical)
   - May take longer if additional information is needed

**Tip**: Have your website fully ready before applying. Incomplete sites cause delays or rejections.

**Source**: [Preparing Your Website for Paddle Verification](https://www.boathouse.co/paddle-video-series-episode/2-preparing-your-website-for-paddle-verification)

---

## 3. Paddle Integration Steps

### Overview

Paddle Billing provides:
- Unified API for payments, subscriptions, tax, and metrics
- Paddle.js for frontend checkout
- Webhook events for backend subscription management
- Official SDKs for Node.js, Go, PHP, Python

**Sources**: [Paddle API Reference](https://developer.paddle.com/api-reference/overview), [Paddle Developer Home](https://developer.paddle.com/)

---

### Step 1: Create Products and Prices

You must create products and prices before accepting payments.

**Product Structure**:
- **Product**: Describes the item (name, description, image)
- **Price**: Describes billing (amount, currency, interval)
- One product can have multiple prices (e.g., monthly vs annual)

#### Via Paddle Dashboard

1. Go to **Catalog** > **Products**
2. Click **Create Product**
3. Enter product details:
   - Name: "DocuForge Pro Plan"
   - Description: "Professional PDF generation with 50,000 renders/month"
   - Image (optional)
4. Add Prices:
   - Amount: $29.00
   - Billing Interval: Monthly
   - Currency: USD
5. Save and note the `price_id` (e.g., `pri_01h1vjes1y1x1z2w3v4u5t6s7r`)

#### Via API

```bash
curl -X POST https://api.paddle.com/prices \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "DocuForge Pro - Monthly",
    "product_id": "pro_01h1vjes1y1x1z2w3v4u5t6s7r",
    "unit_price": {
      "amount": "2900",
      "currency_code": "USD"
    },
    "billing_cycle": {
      "interval": "month",
      "frequency": 1
    }
  }'
```

**Note**: You cannot create subscriptions directly via API. Paddle automatically creates subscriptions when customers complete checkout or when you issue invoices.

**Sources**: [Create Products and Prices](https://developer.paddle.com/build/products/create-products-prices), [Paddle Prices API](https://developer.paddle.com/api-reference/prices/overview), [Paddle Subscriptions](https://developer.paddle.com/api-reference/subscriptions/overview)

---

### Step 2: Frontend Integration (Paddle.js)

Paddle.js is a lightweight JavaScript library for building checkout experiences.

#### Installation

**Option 1: Script Tag (Recommended for Next.js)**

```html
<script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>
```

**Option 2: NPM Module**

```bash
npm install @paddle/paddle-js
```

```typescript
import { initializePaddle } from '@paddle/paddle-js';

const paddle = await initializePaddle({
  environment: 'production', // or 'sandbox' for testing
  token: 'YOUR_CLIENT_SIDE_TOKEN', // Get from Paddle dashboard
});
```

#### Create Checkout Component (React/Next.js)

```typescript
// components/PaddleCheckout.tsx
'use client';

import { useEffect, useState } from 'react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';

export function PaddleCheckout({ priceId }: { priceId: string }) {
  const [paddle, setPaddle] = useState<Paddle>();

  useEffect(() => {
    initializePaddle({
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
    }).then((paddleInstance) => {
      if (paddleInstance) {
        setPaddle(paddleInstance);
      }
    });
  }, []);

  const openCheckout = () => {
    if (!paddle) return;

    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customData: {
        userId: 'usr_12345', // Pass your user ID for webhook handling
      },
      successCallback: (data) => {
        console.log('Checkout completed:', data);
        // Redirect to success page
        window.location.href = '/billing/success';
      },
    });
  };

  return (
    <button onClick={openCheckout} disabled={!paddle}>
      Subscribe to Pro Plan
    </button>
  );
}
```

**Key Parameters**:
- `items`: Array of price IDs and quantities
- `customData`: Arbitrary metadata (e.g., userId, plan name) sent to webhooks
- `successCallback`: Called when payment succeeds
- `customer`: Prefill customer email/address (optional)

**Sources**: [Paddle.js Integration Guide](https://medium.com/@deiucanta/how-to-integrate-paddle-js-with-next-js-280991461fce), [Paddle Next.js Starter Kit](https://github.com/PaddleHQ/paddle-nextjs-starter-kit), [Load Paddle.js as Module](https://developer.paddle.com/changelog/2023/paddlejs-es-module-typescript-wrapper)

---

### Step 3: Backend Integration (Webhooks)

Paddle sends webhook events for all subscription lifecycle events.

#### Install Paddle SDK

```bash
bun add @paddle/paddle-node-sdk
# or
npm install @paddle/paddle-node-sdk
```

#### Initialize Paddle Client

```typescript
// src/lib/paddle.ts
import { Paddle } from '@paddle/paddle-node-sdk';

let paddleClient: Paddle | null = null;

export function getPaddle(): Paddle {
  if (!paddleClient) {
    paddleClient = new Paddle(process.env.PADDLE_API_KEY!, {
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
    });
  }
  return paddleClient;
}

// For testing
export function setPaddleClient(client: Paddle | null) {
  paddleClient = client;
}
```

#### Webhook Route (Bun/Hono)

```typescript
// src/routes/billing.ts
import { Hono } from 'hono';
import { getPaddle } from '../lib/paddle';
import { getDb, schema } from '../db/client';
import { eq } from 'drizzle-orm';
import { env, getPlanLimit } from '../config/env';

const billing = new Hono();

billing.post('/billing/webhook', async (c) => {
  const paddle = getPaddle();
  const signature = c.req.header('paddle-signature');

  if (!signature) {
    return c.json({ error: 'Missing signature' }, 401);
  }

  const rawBody = await c.req.text();

  // Verify webhook signature
  const secretKey = env.PADDLE_WEBHOOK_SECRET;
  const eventData = paddle.webhooks.unmarshal(rawBody, secretKey, signature);

  if (!eventData) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  const db = getDb();

  // Handle events
  switch (eventData.eventType) {
    case 'transaction.completed': {
      // First payment completed, subscription created
      const transaction = eventData.data;
      const customData = transaction.custom_data as { userId?: string; plan?: string };
      const userId = customData?.userId;
      const plan = customData?.plan || 'starter';

      if (userId) {
        await db
          .update(schema.users)
          .set({
            paddleCustomerId: transaction.customer_id,
            planTier: plan,
            planRenders: getPlanLimit(plan),
            updatedAt: Date.now(),
          })
          .where(eq(schema.users.id, userId));
      }
      break;
    }

    case 'subscription.created': {
      // Subscription was created (includes transaction_id)
      const subscription = eventData.data;
      // You can match this with transaction.completed via transaction_id
      console.log('Subscription created:', subscription.id);
      break;
    }

    case 'subscription.updated': {
      // Subscription was updated (plan change, payment method, etc.)
      const subscription = eventData.data;
      const customerId = subscription.customer_id;

      // Determine plan from price ID
      const priceId = subscription.items[0]?.price?.id;
      let plan = 'free';

      if (priceId === env.PADDLE_PRO_PRICE_ID) {
        plan = 'pro';
      } else if (priceId === env.PADDLE_STARTER_PRICE_ID) {
        plan = 'starter';
      }

      await db
        .update(schema.users)
        .set({
          planTier: plan,
          planRenders: getPlanLimit(plan),
          updatedAt: Date.now(),
        })
        .where(eq(schema.users.paddleCustomerId, customerId));
      break;
    }

    case 'subscription.canceled': {
      // Subscription was canceled (ends at period end)
      const subscription = eventData.data;
      // Don't downgrade yet - subscription is still active until scheduled_change
      console.log('Subscription canceled, ends at:', subscription.scheduled_change?.effective_at);
      break;
    }

    case 'subscription.paused': {
      // Subscription was paused
      const subscription = eventData.data;
      const customerId = subscription.customer_id;

      await db
        .update(schema.users)
        .set({
          planTier: 'free',
          planRenders: getPlanLimit('free'),
          updatedAt: Date.now(),
        })
        .where(eq(schema.users.paddleCustomerId, customerId));
      break;
    }

    case 'subscription.trialing': {
      // Subscription entered trial period
      const subscription = eventData.data;
      // Grant access during trial
      break;
    }

    case 'transaction.payment_failed': {
      // Payment failed, subscription may be past_due
      const transaction = eventData.data;
      console.error('Payment failed for customer:', transaction.customer_id);
      // Send email notification to customer
      break;
    }
  }

  return c.json({ received: true });
});

export default billing;
```

**Key Events**:

| Event | When | Action |
|-------|------|--------|
| `transaction.completed` | First payment succeeds | Provision access, create user subscription record |
| `subscription.created` | Subscription created after transaction | Match via `transaction_id` field |
| `subscription.updated` | Plan change, payment update | Update user's plan tier |
| `subscription.canceled` | User cancels (at period end) | Log cancellation, access continues until `effective_at` |
| `subscription.paused` | Subscription paused | Downgrade to free tier |
| `subscription.resumed` | Paused subscription resumed | Restore plan access |
| `transaction.payment_failed` | Payment fails (card decline, etc.) | Send dunning email, mark as past_due |

**Important**: `subscription.created` includes a `transaction_id` field that links to the `transaction.completed` event. Other subscription events don't have this field.

**Sources**: [Paddle Webhooks Overview](https://developer.paddle.com/webhooks/overview), [subscription.created Event](https://developer.paddle.com/webhooks/subscriptions/subscription-created), [subscription.updated Event](https://developer.paddle.com/webhooks/subscriptions/subscription-updated), [Handle Provisioning](https://developer.paddle.com/build/subscriptions/provision-access-webhooks)

---

### Step 4: Test with Webhook Simulator

Paddle provides a webhook simulator to test without completing real checkouts.

1. Go to Paddle Dashboard > Developer Tools > Webhook Simulator
2. Select event type (e.g., `transaction.completed`)
3. Fire webhook to your endpoint
4. Verify your handler processes it correctly

**Source**: [Paddle Webhook Simulator](https://developer.paddle.com/changelog/2024/webhook-simulator)

---

## 4. Migration Plan: Stripe to Paddle

### Files to Change

Based on your current Stripe implementation:

| File | Changes Needed |
|------|----------------|
| `/src/routes/billing.ts` | Replace Stripe client with Paddle SDK, update checkout creation, webhook handling |
| `/src/db/schema.ts` | Rename `stripeCustomerId` to `paddleCustomerId` |
| `/src/config/env.ts` | Replace Stripe env vars with Paddle vars |
| `.env.example` | Update to Paddle credentials |
| `/tests/integration/billing-checkout.test.ts` | Update test to mock Paddle checkout |
| `/tests/e2e/billing-flow.test.ts` | Update E2E test for Paddle flow |
| `/tests/helpers/mock-stripe.ts` | Rename to `mock-paddle.ts`, mock Paddle SDK |
| `/tests/unit/mock-stripe.test.ts` | Rename to `mock-paddle.test.ts` |

---

### Environment Variables Changes

**Remove (Stripe)**:
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
```

**Add (Paddle)**:
```bash
# Paddle
PADDLE_API_KEY=your_paddle_api_key
PADDLE_WEBHOOK_SECRET=your_paddle_webhook_secret
PADDLE_STARTER_PRICE_ID=pri_01h...
PADDLE_PRO_PRICE_ID=pri_01h...
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=your_client_token
```

**How to Get These**:
- `PADDLE_API_KEY`: Paddle Dashboard > Developer Tools > Authentication
- `PADDLE_WEBHOOK_SECRET`: Paddle Dashboard > Developer Tools > Notifications > Create Notification Destination
- `PADDLE_*_PRICE_ID`: Create products/prices in Paddle Catalog, copy price IDs
- `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`: Paddle Dashboard > Developer Tools > Authentication (client-side token for Paddle.js)

---

### Database Schema Migration

```typescript
// migrations/001_stripe_to_paddle.sql
ALTER TABLE users RENAME COLUMN stripe_customer_id TO paddle_customer_id;
```

Or if using Drizzle ORM:

```typescript
// src/db/schema.ts (before)
export const users = sqliteTable('users', {
  // ...
  stripeCustomerId: text('stripe_customer_id'),
});

// src/db/schema.ts (after)
export const users = sqliteTable('users', {
  // ...
  paddleCustomerId: text('paddle_customer_id'),
});
```

Then generate and run migration:

```bash
bun run drizzle-kit generate:sqlite
bun run drizzle-kit migrate
```

---

### Webhook Events Comparison

| Stripe Event | Paddle Event | Notes |
|--------------|--------------|-------|
| `checkout.session.completed` | `transaction.completed` | Provision access |
| `customer.subscription.created` | `subscription.created` | Links to transaction via `transaction_id` |
| `customer.subscription.updated` | `subscription.updated` | Plan changes, payment updates |
| `customer.subscription.deleted` | `subscription.canceled` | Immediate cancellation |
| N/A | `subscription.paused` | Paddle supports pausing |
| N/A | `subscription.resumed` | Resume paused subscription |
| `invoice.payment_failed` | `transaction.payment_failed` | Dunning flow |

**Key Difference**: Paddle's `subscription.created` includes `transaction_id` to link with the initial payment. Stripe doesn't have this direct link.

---

### Testing Migration

1. **Sandbox Environment**: Use Paddle Sandbox for testing
   - Separate API keys for sandbox
   - Test cards: See [Paddle test payment methods](https://developer.paddle.com/concepts/payment-methods/test-cards)

2. **Parallel Run (Optional)**:
   - Keep both Stripe and Paddle integrated temporarily
   - Use feature flag to switch between providers
   - Migrate existing customers gradually

3. **Webhook Testing**:
   - Use Paddle Webhook Simulator for all events
   - Verify database updates correctly
   - Check error handling

4. **End-to-End Test**:
   - Complete a full checkout flow in sandbox
   - Verify subscription creation
   - Test cancellation flow

---

## 5. Paddle Payout Requirements

### Payout Schedule

- **Payout Creation**: 1st of each month (if balance > threshold)
- **Payment Sent**: By the 15th of each month
- **Arrival Time**: Up to 3 business days after payment sent
- **Minimum Threshold**: $100 (configurable in settings)

**Important**: You cannot withdraw on-demand. Payouts are monthly and automatic.

**Sources**: [When and How Do I Get Paid](https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid), [Paddle Payout Schedule](https://www.chargeblast.com/blog/stripe-vs-paddle-what-to-know-about-payout-delays)

---

### Payout Methods

1. **Bank Transfer (Wire Transfer)**
   - Direct transfer to your business bank account
   - Requires: Bank name, account number, SWIFT/IBAN
   - Fee: $0 for most countries, $15 SWIFT fee for some

2. **Payoneer**
   - Receive to Payoneer account
   - Transfer to local Pakistani bank from Payoneer
   - Payoneer fees apply for local withdrawal

**Recommendation for Pakistan**: Use Payoneer to receive Paddle payouts, then withdraw to Pakistani bank account. This is the most reliable method.

**Source**: [Paddle Payout Methods](https://www.paddle.com/help/manage/get-paid/can-i-change-my-payout-method)

---

### Documents Needed for Payout Setup

1. **Business Bank Account Details**:
   - Account holder name (must match business name)
   - Bank account number
   - SWIFT/BIC code
   - Bank address
   - IBAN (if applicable)

2. **Tax Information**:
   - Business Tax ID / NTN (National Tax Number for Pakistan)
   - VAT registration number (if applicable)

3. **Identity Verification** (for beneficial owners):
   - Passport or government-issued ID
   - Proof of address (utility bill, bank statement)

**Note**: Paddle may request additional documents during verification.

---

### Payout Currencies

Paddle supports payouts in:
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)

For Pakistan, **USD payouts are recommended**:
- Most banks accept USD wire transfers
- Better exchange rates than converting through multiple currencies
- Payoneer handles USD well

---

### Changing Payout Method

- Make changes at least **1 week before month-end**
- Changes after this cannot guarantee correct payout method for current cycle
- Update in: Paddle Dashboard > Settings > Payouts

**Source**: [Paddle Payout Settings](https://www.paddle.com/help/manage/get-paid/how-do-i-set-up-my-payout-settings)

---

## 6. Tax Handling with Paddle

### Merchant of Record Advantage

**This is Paddle's killer feature**: Paddle acts as the Merchant of Record (MoR), meaning:

1. **Paddle is the legal seller** of your products to end customers
2. **You sell to Paddle**, Paddle resells to customers
3. **All tax liability is on Paddle**, not you

**What This Means**:
- You don't need to register for VAT in EU countries
- You don't need to file GST returns in Australia, India, etc.
- You don't handle sales tax for US states
- You don't track tax nexus thresholds
- You don't deal with chargebacks legally

**Sources**: [How Paddle Handles VAT](https://www.paddle.com/help/sell/tax/how-paddle-handles-vat-on-your-behalf), [Paddle Tax Compliance](https://www.paddle.com/billing/tax-and-compliance)

---

### Tax Coverage

Paddle is registered in **100+ jurisdictions** and handles:

- **VAT (Value Added Tax)**: EU, UK, Norway, Switzerland
- **GST (Goods and Services Tax)**: Australia, India, New Zealand, Singapore, Canada
- **Sales Tax**: US states (where applicable for digital goods)
- **Other local taxes**: Automatically applied based on customer location

**How It Works**:
1. Customer provides their location during checkout
2. Paddle calculates applicable tax rate
3. Tax is added to the transaction
4. Paddle collects the tax
5. Paddle remits tax to the relevant authority

**You never touch the tax money or file returns.**

**Sources**: [Paddle VAT Responsibilities](https://www.paddle.com/help/start/intro-to-paddle/how-paddle-is-able-to-take-on-your-vat-and-tax-responsibilities), [MoR Explained](https://www.paddle.com/blog/what-is-merchant-of-record)

---

### Invoicing

Paddle handles all customer invoicing:
- Invoices are issued in Paddle's name (as MoR)
- VAT/GST is calculated and displayed correctly
- Customers receive invoices automatically via email
- Downloadable from Paddle-hosted customer portal

You can customize:
- Invoice branding (logo, colors)
- Business information displayed
- Invoice line item descriptions

**Source**: [Understanding VAT and Invoices](https://usermaven.com/docs/account-settings/vat-and-invoices)

---

### Your Tax Obligations (Pakistan)

While Paddle handles sales tax, **you still have tax obligations in Pakistan**:

1. **Income Tax**:
   - Revenue from Paddle is business income
   - File income tax returns with FBR (Federal Board of Revenue)
   - Keep records of Paddle payout statements

2. **Corporate Tax (if LLC)**:
   - Pay corporate tax on profits
   - Consult local accountant for rates and filing

3. **Bookkeeping**:
   - Download Paddle's payout reconciliation reports
   - Paddle provides CSV/PDF reports with:
     - Gross revenue
     - Paddle fees
     - Tax remitted
     - Net payout amount
   - Use these for accounting and tax filing

**Source**: [Paddle Payout Reconciliation Reports](https://developer.paddle.com/build/finance/reports/payout-reconciliation)

---

## 7. Alternative: LemonSqueezy

If Paddle doesn't work out, **LemonSqueezy** is another MoR alternative:

### LemonSqueezy Overview

- **Merchant of Record**: Like Paddle
- **Pricing**: 5% + $0.50 per transaction, + 1.5% for international payments
- **Country Support**: 135+ countries for payments, 110+ for payouts
- **Tax Handling**: Automatic VAT/GST compliance

**Disadvantage vs Paddle**:
- **Extra 1.5% fee** for international payments (most SaaS sales are international)
- Smaller than Paddle, less mature platform
- Mixed reviews about merchant onboarding (delays, rejections for South Asian merchants)

**Pakistan Support**: Not explicitly confirmed in search results. Contact LemonSqueezy support to verify.

**Sources**: [LemonSqueezy Supported Countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries), [Paddle vs LemonSqueezy](https://www.paddle.com/compare/lemon-squeezy), [LemonSqueezy Alternatives](https://dodopayments.com/blogs/top-5-alternatives-to-lemon-squeezy)

---

### Other Alternatives

1. **FastSpring**: Another MoR, focused on software/SaaS, similar to Paddle
2. **Gumroad**: Simple, but 10% fee (very high)
3. **Chargebee**: Subscription management, but NOT a MoR (you handle tax)
4. **Recurly**: Similar to Chargebee, not a MoR

**Recommendation**: Stick with Paddle. It's the most mature MoR for SaaS, with best payout coverage and tax handling.

---

## Summary & Recommendations

### For Pakistan-Based LLC Operating DocuForge:

1. **Use Paddle Billing**
   - Direct payout support to Pakistan via Payoneer or wire transfer
   - Handles all international tax compliance (VAT, GST, sales tax)
   - No need for Stripe workarounds (Payoneer, Wise, etc.)
   - Simple integration with Node.js/Bun

2. **Set Up Payoneer**
   - Create Payoneer account for receiving Paddle payouts
   - Link Payoneer to local Pakistani bank for withdrawals
   - Ensure business name matches across Paddle, Payoneer, and bank

3. **Migration Path**
   - Apply for Paddle vendor account (have legal pages ready)
   - Set up products/prices in Paddle Catalog
   - Test integration in Paddle Sandbox
   - Migrate database schema (stripe_customer_id → paddle_customer_id)
   - Update environment variables
   - Rewrite billing routes and webhook handlers
   - Test thoroughly with Webhook Simulator
   - Deploy and monitor

4. **Tax Compliance**
   - Let Paddle handle all international sales tax
   - Focus on Pakistan income/corporate tax obligations
   - Download monthly payout reports for bookkeeping
   - Consult local accountant for FBR filing

5. **Cost Analysis**
   - Paddle: 5% + $0.50 per transaction (includes tax handling)
   - Stripe: 2.9% + $0.30 + 2-3% Payoneer fee + tax compliance costs
   - **Paddle is simpler and comparable in total cost**

---

## Additional Resources

### Official Documentation
- [Paddle Developer Docs](https://developer.paddle.com/)
- [Paddle API Reference](https://developer.paddle.com/api-reference/overview)
- [Paddle Billing Guide](https://developer.paddle.com/build/subscriptions/provision-access-webhooks)
- [Paddle Next.js Starter Kit](https://github.com/PaddleHQ/paddle-nextjs-starter-kit)

### Community Resources
- [Paddle Integration for SaaS (TypeScript/Next.js)](https://www.averagedevs.com/blog/paddle-integration-for-saas)
- [Paddle + Next.js Supabase Tutorial](https://makerkit.dev/docs/next-supabase-turbo/billing/paddle)
- [Stripe vs Paddle Comparison (2026)](https://designrevision.com/blog/stripe-vs-paddle)

### Support
- **Paddle Support**: support@paddle.com
- **Paddle Community**: [Paddle Discord](https://discord.gg/paddle) (check Paddle website for link)

---

**Document Version**: 1.0
**Author**: DocuForge Team
**Last Reviewed**: February 14, 2026

---

## Appendix: Quick Reference

### Paddle Pricing
- **Transaction Fee**: 5% + $0.50
- **Monthly Fee**: $0
- **Setup Fee**: $0
- **International Fees**: Included

### Paddle Payouts (Pakistan)
- **Schedule**: Monthly (by 15th)
- **Minimum**: $100
- **Methods**: Wire transfer, Payoneer
- **Fee**: $0-$15 depending on country/method

### Key Webhook Events
- `transaction.completed` - First payment succeeds
- `subscription.created` - Subscription created
- `subscription.updated` - Plan/payment changed
- `subscription.canceled` - Subscription ends
- `transaction.payment_failed` - Payment declined

### Environment Variables
```bash
PADDLE_API_KEY=your_api_key
PADDLE_WEBHOOK_SECRET=your_webhook_secret
PADDLE_STARTER_PRICE_ID=pri_starter
PADDLE_PRO_PRICE_ID=pri_pro
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=client_token
```

### Database Schema Change
```sql
ALTER TABLE users RENAME COLUMN stripe_customer_id TO paddle_customer_id;
```
