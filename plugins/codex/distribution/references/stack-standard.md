# Stack standard

Anhedral generates one application architecture. The public CLI is maintained as an open-source application factory, separate from the hosted Anhedral platform control plane.

## Default application

| Owner | Responsibility |
| --- | --- |
| apps/mobile | Expo web/iOS/Android interface, NativeWind and React Native Reusables |
| apps/mobile/worker | Static web assets and private API transport |
| apps/api | Hono Worker, authentication, application routes and authorization |
| packages/contracts | Framework-independent schemas, JSON contracts and transport |
| packages/db | Drizzle/D1 schema and explicit migrations |
| packages/auth | Better Auth server construction and session contracts |
| packages/styling | Shared colors, spacing and light/dark tokens |

Plain `anhedral init my-app` includes Expo, Hono, D1, private R2, supporting Better Auth and styling. TypeScript, pnpm, Turborepo and shared checks are supporting infrastructure. There is no frontend, database, hosting or preset selection menu.

D1 is the supported database. Neon/PostgreSQL is not an available addition in this release. A future migration would require schema conversion, data movement and validation; it is not a connection-string change.

## Private files

R2 is accessed through the API's authenticated owner-scoped file routes, never public bucket access or client storage credentials. Authorize every object operation server-side. Bound upload sizes and reject caller-controlled ownership; test anonymous and cross-user rejection as well as successful upload/download/delete. Buckets and database bindings are provisioned explicitly after source generation.

## Identity

Better Auth is supporting core infrastructure rather than a selectable catalog alternative. Use its verified session subject for file ownership and billing identity. Application identity is separate from provider-management authentication and hosted Platform accounts. Keep auth secrets on the server, configure trusted origins, and apply reviewed auth migrations explicitly. Native session handling and HTTPS device origins need their own acceptance.

## Only two optional additions

| Addition | Scope |
| --- | --- |
| stripe | Authenticated web checkout/customer portal, webhooks, reconciliation and server entitlements |
| revenuecat | Native purchase/restore/manage adapters, provider reconciliation and shared server entitlements |

```sh
anhedral init my-app --stripe
anhedral init my-app --revenuecat
anhedral init my-app --stripe --revenuecat
anhedral add stripe --cwd my-app --dry-run --json
anhedral add revenuecat --cwd my-app
```

Stripe and RevenueCat are independent. Configure products, prices/offerings, environment, application IDs, credentials and webhook endpoints in the intended accounts. Use server-verified provider state for access; client purchase callbacks and redirects never grant entitlements. Preserve replay handling, durable reconciliation, expiry and fail-closed behavior. No real payment or provider activation occurs during generation.

## Runtime boundaries

Hono owns privileged behavior. Applications do not import each other's source. Shared schema/transport stays framework-independent. Use request-scoped database and service factories. Private responses must not enter shared caches. No credentials or raw secrets in clients, generated source, logs or Git.

Cloudflare Workers host the web gateway and API. Wrangler owns local Worker development and delivery. Native signing, device/store acceptance and store submission remain separate from a web deployment or Expo export. See [workflow](software-factory.md) for supported commands and evidence boundaries.

## Breaking scope reduction in 0.14

The former 33-product catalog is retired. The remaining eight recipe records describe six always-present components plus Stripe and RevenueCat. Registry inspection may show supporting records; it does not make those records independently selectable additions. Legacy application source and provider resources are never deleted or migrated by this change. Preserve old CLI pins for old projects and retain dated verification as historical evidence.
