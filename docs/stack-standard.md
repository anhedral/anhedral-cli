# Stack standard

Anhedral generates one application architecture. The public CLI is maintained as an open-source application factory, separate from the hosted Anhedral platform control plane.

## Default application

| Owner | Responsibility |
| --- | --- |
| apps/web | Next.js App Router web application, DOM shadcn UI, SSR/RSC and Cloudflare OpenNext |
| apps/mobile | Expo iOS/Android application, NativeWind and the Anhedral native shadcn port |
| apps/api | Hono Worker, authentication, application routes and authorization |
| packages/contracts | Framework-independent schemas, JSON contracts and transport |
| packages/db | Drizzle/D1 schema and explicit migrations |
| packages/auth | Better Auth server construction and session contracts |
| packages/styling | Shared colors, spacing and light/dark tokens |

Plain `anhedral init my-app` includes Next.js web, Expo native, Hono, D1, private R2, supporting Better Auth and styling. TypeScript, pnpm, Turborepo and shared checks are supporting infrastructure. There is no frontend, database, hosting or preset selection menu.

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

Cloudflare Workers host the OpenNext web application and Hono API. The web Worker calls Hono through its `ANHEDRAL_API` service binding. Next server rendering and actions adapt requests to Hono; they never own database/auth-server access. Web UI uses DOM shadcn components; native UI uses the Anhedral-maintained shadcn port. Both share contracts and design tokens. Native signing, device/store acceptance and store submission remain separate from OpenNext deployment. See [workflow](software-factory.md) for supported commands and evidence boundaries.

## Version compatibility

Version 0.15 replaces Expo web with full Next.js App Router through OpenNext and keeps Expo for iOS/Android only. The former broad catalog remains retired. Core records are always present; only Stripe and RevenueCat can be selected as additions. Registry inspection may show supporting records; it does not make those records independently selectable additions. Legacy application source and provider resources are never deleted or migrated by this change. Preserve old CLI pins for old projects and retain dated verification as historical evidence.
