---
name: anhedral-billing
description: "Configure, implement and debug optional Stripe and RevenueCat billing in Anhedral apps, with shared server-enforced entitlements across web, iOS and Android."
---

# Anhedral Billing

Inspect `anhedral.json`, the selected CLI version and generated
`packages/billing/README.md` before changing billing. Hono owns payment actions and
access decisions; public contracts belong in `packages/contracts`, server billing
in `packages/billing`, and schema/migrations in `packages/db`.

## Select and configure

Stripe and RevenueCat are independently optional; full-product selects both.
Their CLI additions resolve Hono, identity and durable database dependencies. Preserve the selected providers;
preview compatible additions with `anhedral add <provider> --cwd my-app --dry-run --json`
before applying the same selection. Existing guidance/scaffold receipts retain
their provenance: review an explicit migration to the entitlement implementation,
preserving edited source and historical evidence rather than reinitializing.

Configure allowed plans, entitlement keys, canonical origin, environment and scoped
provider project/app IDs. Keep Stripe and RevenueCat server secrets in Hono; only
platform SDK public keys and API origins belong in clients. RevenueCat server API
credentials differ from CLI management credentials. Review SQL migrations against
the intended database explicitly; builds/tests must not migrate configured databases.

## Identity and access

Use the verified application auth subject as provider identity. Obtain native
RevenueCat identity from Hono's authenticated `/api/billing/identity`; never link
accounts by email or a caller-supplied user ID. Serialize native SDK account
transitions, ignore stale callbacks and revoke the application session even if
vendor logout fails. Use [Auth](../anhedral-auth/SKILL.md) for session integration.

Hono unions verified provider grants and enforces paid routes with `assertEntitled`.
When Stripe is enabled, exclude RevenueCat's Stripe-origin mirror grants to prevent
stale duplicate access. Stripe purchases are not automatically imported into
RevenueCat. Client purchase results and success redirects never authorize access.
Keep transactional credits/quotas separate from subscription entitlement state.

## Payments and reconciliation

Use Stripe Checkout/customer portal on web and RevenueCat purchase, restore and
manage flows on native. Checkout accepts an allowed `{ plan }` and UUID
`Idempotency-Key`; reuse the key for retries of one intent. Hono controls customer,
price and return URL. Preserve existing-subscription and pending-checkout guards.

Verify Stripe signatures over the raw body and RevenueCat's configured webhook
authentication; validate environment/project/app scope. Preserve durable event
receipts, canonical provider reconciliation, concurrent-write fencing and scheduled
retry recovery. Follow the generated implementation's cache/expiry contract;
failed reconciliation must not become a permanent grant or silently lost event.

## Verify

Exercise account isolation/switching, checkout retries, purchases/restores,
cancellation versus expiry, refunds/revocation, invalid/duplicate/reordered webhooks
and provider outages/recovery. Test Hono authorization, not only client UI state.
Distinguish fixtures, exports, EAS builds, physical-device store sandbox tests and
live-provider evidence. Use reachable HTTPS for device testing. Follow
[Hosting](../anhedral-hosting/SKILL.md) for requested delivery and verify deployed
webhook routes, secrets and retry scheduling within the requested environment.
