# Optional billing reference

This generated Expo web/iOS/Android application uses Hono, Better Auth, Drizzle/D1 and a private R2 binding. Stripe and RevenueCat are explicitly selected additions. `/billing` reads server-verified entitlement snapshots; the browser uses server-created Stripe Checkout/portal sessions, while native builds use RevenueCat offerings, purchases, restore and store management. Native SDK state never grants server access.

Reproduce from a built CLI checkout into a fresh destination:

```sh
node dist/bin.js init /tmp/billing-reference --stripe --revenuecat --no-git
```

The retained configuration uses `setup.root: "."` for portability. No account, product, payment, store or cloud service is activated. Source and the dependency lockfile are retained; exports, modules and private local configuration are ignored.

From this directory:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm dev
```

Copy each app's environment example to its ignored local runtime file and supply the intended development configuration. Better Auth requires a generated secret and the actual product origin. Native `EXPO_PUBLIC_API_URL` must reach the product from the device; `localhost` on a phone does not address the development computer. The static browser gateway uses same-origin `/api` and requires a new export/restart for web code changes. Metro is available through `pnpm --dir apps/mobile start`, `ios` and `android`.

Reviewed generated SQL is retained in `packages/db/drizzle`. Apply it only to the explicitly chosen local fixture before testing sessions/data. Builds and checks do not apply migrations. No configured database was migrated as part of generation.

Read `packages/billing/README.md` for exact provider configuration, webhook authentication, identity mapping, entitlement freshness, retry/reconciliation and restore/transfer policies. Stripe requires server-selected plan mappings and HTTPS product URLs. RevenueCat requires correctly scoped project/app/runtime credentials, platform public SDK keys, offerings and store setup. The native SDK identity is synchronized with the verified Hono identity; purchase operations and logout are fenced across account changes. SDK logout failures cannot prevent application-session revocation.

Native bundling checks:

```sh
pnpm --dir apps/mobile exec expo export --platform ios --output-dir .output/ios
pnpm --dir apps/mobile exec expo export --platform android --output-dir .output/android
```

Local lint/type/Fallow/dependency/build checks and native exports establish source/bundler compatibility. Compiled API tests with mocked provider responses and local workerd/D1/browser proofs are separate evidence. They do not verify real Stripe/RevenueCat accounts, Apple/Google purchases, device session persistence, signing, production deployment or live payment acceptance. Real store development builds and sandbox purchases remain required before enabling purchases for users.

From the parent CLI checkout, `pnpm test:billing` runs the compiled API/SQL/SDK acceptance fixture with synthetic provider HTTP. See [verification](docs/verification.md) for exact scope and remaining provider/device acceptance. Server configuration supports sandbox-only loopback HTTP for local development; production requires HTTPS.
