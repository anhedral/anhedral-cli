---
name: anhedral-auth
description: "Maintain Better Auth sessions and owner authorization in the Anhedral core stack."
---

# Anhedral Auth

Better Auth is supporting core identity, not an optional provider choice. Inspect the generated packages/auth, D1 schema, Hono routes and Next.js browser and Expo native session adapters. Use the verified server session subject for ownership. Clients cannot choose account or tenant authority.

Keep auth secrets private; configure canonical HTTPS API origins, native schemes and trusted callback origins. Preserve cookie/origin/cache protections and bounded validation. Apply reviewed migrations explicitly, never during builds/tests/startup against a configured database.

Exercise sign-in/out, expiry, account switching, anonymous rejection and cross-user file/data isolation. Native session storage, redirects and HTTPS device access need device acceptance. Provider-management credentials and Platform sessions are distinct from generated-application accounts. Stripe/RevenueCat identity must come from the authenticated Hono billing endpoint.

Generated managed email is server-only. A complete API broker binding/scope/secret
requires verified email; absent setup preserves standalone sessions and partial
setup fails closed. Keep the scope's public origin and native scheme exact. Test
verification, resend, reset expiry/replay and reset session revocation with a local
sink. Do not send real email or provision a provider during tests. Publishing the
CLI does not update pinned hosted execution images or existing application source.
