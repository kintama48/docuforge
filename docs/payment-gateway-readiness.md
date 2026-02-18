# Payment Gateway Readiness (Pakistan)

Last updated: February 17, 2026

## 1) Executive summary

Yes, you can use **Paddle** or **Lemon Squeezy** from Pakistan.

As of February 17, 2026:
- **Paddle** says it works globally except an unsupported-country list; Pakistan is not listed there.
- **Lemon Squeezy** lists **Pakistan** in supported bank-payout countries.

For this codebase, both are now supported behind a provider switch with billing optional/disabled mode.

## 2) Current code readiness (today)

Current implementation is provider-switched:
- Backend uses `BILLING_ENABLED` and `BILLING_PROVIDER=none|paddle|lemonsqueezy`.
- `/v1/billing/checkout` returns hosted checkout URL from active provider.
- `/v1/billing/webhook` verifies provider signatures and maps events to plan changes.
- Frontend reads `NEXT_PUBLIC_BILLING_ENABLED` + `NEXT_PUBLIC_BILLING_PROVIDER` to enable/disable upgrade UX.

## 3) Paddle vs Lemon Squeezy (Pakistan-focused)

| Topic | Paddle | Lemon Squeezy |
|---|---|---|
| Pakistan seller feasibility | Likely yes (Pakistan not in Paddle unsupported list) | Yes (Pakistan appears in supported bank payout country list) |
| Merchant of Record | Yes | Yes |
| Base published pricing | 5% + $0.50 | 5% + $0.50 |
| Additional published fees | Some payout situations may involve SWIFT fee | Docs list additional platform add-ons: +1.5% international, +1.5% PayPal, +0.5% subscriptions |
| Payout cadence | Monthly cycle; threshold min $100 | Twice monthly; minimum threshold $50 |
| Payout methods | Wire transfer or Payoneer | Bank or PayPal |
| Fit for DocuForge | Strong for predictable subscription economics | Viable, but fee model needs careful margin check for non-US/subscription mix |

## 4) Recommendation

Primary recommendation: **Paddle first**.

Reason:
- Cleaner fee predictability for subscription-heavy SaaS.
- Good operational fit as a MoR.
- Pakistan feasibility appears acceptable from official docs.

Fallback: **Lemon Squeezy** if:
- Paddle onboarding is slow for your entity profile, or
- You specifically prefer LS payout flow/product tooling.

## 5) Go-live checklist

Use this as a tick-off sheet.

| Done | Priority | Area | Check |
|---|---|---|---|
| [ ] | P0 | Legal | Terms, Privacy, Refund policy pages are live and production-ready. |
| [ ] | P0 | Company docs | Business verification docs prepared (entity docs, ownership, address). |
| [ ] | P0 | Provider onboarding | Paddle/LS account approved for selling. |
| [ ] | P0 | Product catalog | Starter/Pro products and recurring prices created in provider dashboard. |
| [ ] | P0 | Backend | Introduce `BILLING_PROVIDER` switch and provider adapters. |
| [ ] | P0 | Backend | Implement provider webhook signature verification. |
| [ ] | P0 | Backend | Map provider event -> `users.planTier` and `planRenders`. |
| [ ] | P0 | Frontend | Upgrade flow uses provider checkout URL/session correctly. |
| [ ] | P0 | Frontend | Billing portal/manage-subscription link configured and tested. |
| [ ] | P0 | QA | Sandbox E2E: upgrade, downgrade, cancel, failed payment, webhook replay. |
| [ ] | P0 | Ops | Idempotency + replay protection for webhook handlers. |
| [ ] | P1 | Finance | Reconcile payout report with internal order events for one cycle. |
| [ ] | P1 | Support | Customer billing FAQ and refund process documented. |

## 6) Suggested env plan

### Add provider-agnostic switch
- `BILLING_ENABLED=true|false`
- `BILLING_PROVIDER=none|paddle|lemonsqueezy`

### If using Paddle (suggested)
- `PADDLE_API_KEY`
- `PADDLE_CLIENT_TOKEN`
- `PADDLE_WEBHOOK_SECRET`
- `PADDLE_ENV=sandbox|production`
- `PADDLE_PRICE_ID_STARTER`
- `PADDLE_PRICE_ID_PRO`

### If using Lemon Squeezy
- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `LEMONSQUEEZY_STORE_ID`
- `LEMONSQUEEZY_VARIANT_ID_STARTER`
- `LEMONSQUEEZY_VARIANT_ID_PRO`

## 7) Migration sequence (safe path)

1. Add provider abstraction (`BillingProvider` interface).
2. Keep billing disabled while onboarding early users (`BILLING_ENABLED=false`).
3. Configure Paddle in staging and run webhook lifecycle tests.
4. Optionally configure Lemon Squeezy in staging as fallback provider.
5. Feature-flag cutover by environment (`BILLING_PROVIDER=paddle` in staging first).
6. Production cutover during low-traffic window.

## 8) Sources (official docs)

- Paddle supported countries: https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle
- Paddle payouts schedule/methods: https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid
- Paddle pricing: https://www.paddle.com/pricing
- Paddle MoR/tax handling: https://www.paddle.com/help/sell/tax/how-paddle-handles-vat-on-your-behalf
- Lemon Squeezy supported countries: https://docs.lemonsqueezy.com/help/getting-started/supported-countries
- Lemon Squeezy fees: https://docs.lemonsqueezy.com/help/getting-started/fees
- Lemon Squeezy payout schedule: https://docs.lemonsqueezy.com/help/getting-started/getting-paid
- Lemon Squeezy pricing: https://www.lemonsqueezy.com/pricing
- Lemon Squeezy MoR/payment methods: https://docs.lemonsqueezy.com/help/checkout/payment-methods

## 9) Important note

Country support, onboarding acceptance, and fees can change. Re-validate all links above on your actual signup day before committing to one provider.
