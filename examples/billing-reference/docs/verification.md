# Local billing reference verification

The final reference passed `pnpm check` and iOS/Android Hermes exports. Its source selects the Cloudflare default plus optional Stripe/RevenueCat, with migrations generated but never applied to a configured database by a build.

From the parent CLI checkout, run `pnpm test:billing` after installing/building the reference. It runs the compiled Hono Worker and real Better Auth/Drizzle/Stripe SDK against in-memory SQLite and synthetic provider HTTP, forbidding external networking. It exercises account isolation, checkout ownership/idempotency/open-session reuse, existing-subscription conflicts, raw signed webhooks, shared grants, refunds, expiry, transfers, environment scope, replay/order, concurrent fencing and outage/retry recovery. Temporary test bundles/state are removed.

Real local workerd, the web/API service binding, D1, private R2 and headless Chrome also verified health, signup/session/account reload and sign-out. Native SDK mocks separately tested account-change serialization and logout failure. Exports and mocks do not verify an installed device application, signing, Apple/Google purchases or configured Stripe/RevenueCat services.

No financial provider accounts were accessed or mutated, purchases made, resources provisioned, remote SQL applied, deployment performed or package published. Complete owner-controlled provider setup and real sandbox/device acceptance before enabling billing for users.
