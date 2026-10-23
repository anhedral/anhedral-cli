---
name: anhedral-billing
description: "Implement optional Stripe and RevenueCat with shared server-enforced entitlements."
---

# Anhedral Billing

Stripe and RevenueCat are the only optional additions and can be selected independently. Inspect anhedral.json, generated packages/billing and its README. Preview anhedral add stripe/revenuecat before applying. Preserve edited-source fingerprints and the pinned generator version.

Hono owns checkout, customer portal, provider reconciliation and access decisions. Public contracts belong in packages/contracts; billing schema/migrations in packages/db. Configure allowed plans, entitlement keys, environment, origin and provider project/app IDs. Keep all server secrets private; only native public SDK keys belong in Expo.

Derive provider identity from the authenticated Better Auth subject via Hono. Client-supplied account IDs, purchase callbacks and success redirects never authorize paid routes. Preserve raw-body webhook verification, environment/scope checks, durable replay receipts, canonical reconciliation, concurrency fencing, expiry and retry recovery. Keep credits/quotas separate from subscription state.

Use Stripe Checkout/customer portal on web and RevenueCat purchase/restore/manage on native. Test duplicate/reordered events, account changes, purchase retries, refunds/revocation and provider outages. Distinguish fixture tests, OpenNext web builds, Expo native exports, EAS builds, device/store sandbox tests and live-provider acceptance. Never make real payments or activate live billing without explicit authorization.
