---
name: anhedral-dev
description: "Implement and verify applications using the maintained Anhedral core stack."
---

# Anhedral Dev

Inspect Git state, project instructions, anhedral.json and the pinned CLI. Preserve source edits. The supported architecture is Next.js web + Expo native + Hono + Drizzle/D1 + private R2, Better Auth and shared styling; only Stripe and RevenueCat can be added.

Hono owns authentication, authorization, persistence and private files. Contracts/transport live in packages/contracts; schema/migrations in packages/db; auth in packages/auth. Applications never import another application's source. Keep provider credentials server-side.

Implement complete vertical flows, loading/error/empty states and bounded validation. Private R2 routes must use the authenticated owner and reject cross-user access. Verify upload/download/delete and denied access, health/session transport and actual persistence. Keep explicit migrations separate from builds/tests and use isolated local data.

Use generated development/check commands. Next.js web and native Metro are separate development pipelines. Verify OpenNext SSR/RSC on Workers rather than treating a static export as the web application. Run meaningful generated checks and exercise actual runtime flows. Report fixture, browser, device and live-provider evidence separately.

For billing additions preview `anhedral add stripe --dry-run --json` or `anhedral add revenuecat --dry-run --json`, then apply the same addition. Preserve receipt fingerprints and exact generator version. No other capability additions are supported.
