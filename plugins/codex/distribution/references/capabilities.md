# Progressive stack additions

New projects start with Next.js, OpenNext for Cloudflare Workers and Anhedral UI. Add only the parts required by the product. Nothing is called a commercial tier, and the specific “if needed” decisions remain open.

```sh
anhedral init my-app
cd my-app
anhedral stack list
anhedral add hono --dry-run --json
anhedral add hono
anhedral add database-auth
anhedral stack status --json
```

`anhedral add` writes editable source and local configuration, then installs dependencies unless `--skip-install` is selected. It does not create provider resources, install credentials, run migrations, deploy, publish clients, update installed plugins or register a managed project. These are source composition commands, separate from Anhedral Cloud operations.

## Capabilities

| Name | Adds | Required source capabilities |
| --- | --- | --- |
| `hono` | API Worker, web proxy/service binding, health route | Next.js foundation |
| `database-auth` | Drizzle/D1, Better Auth, schema/migration tooling, web sign-in starter | `hono` |
| `r2` | Private R2 binding and authenticated owner-scoped file routes | `database-auth` |
| `stripe` | Stripe SDK, Checkout subscription starter, signed webhook receipts, canonical access checks | `database-auth` |
| `realtime` | Authenticated D1-backed events and resumable SSE | `database-auth` |
| `rtc` | Cloudflare Realtime SFU session/track adapter with ownership checks | `database-auth` |
| `ai` | Workers AI binding, authenticated text-generation route and atomic daily quota | `database-auth` |
| `expo` | Expo app and Better Auth/SecureStore client | `database-auth` |
| `native-ui` | NativeWind 4, shared theme CSS, RNR Button/Text starter, portal/root adapter, UI catalog metadata | `expo` |
| `revenuecat` | Native subscription SDK/UI, scoped webhooks and server-side entitlement reconciliation | `expo`, `stripe` |
| `wxt` | WXT React extension, scoped API host permission and editable popup | `database-auth` |
| `side-panel` | Chromium Side Panel entrypoint and background registration | `wxt` |
| `gpui` | Rust/GPUI desktop application and native build scripts | `database-auth` |

The progression is Next.js → Hono → database/auth, followed by independently selected branches. These are Anhedral's source-builder rules, not intrinsic restrictions of those technologies. `anhedral ui` still requires only the target Next.js or Expo application; it has no backend prerequisite. See [UI commands](ui.md).

```sh
anhedral add expo native-ui --dry-run --json
anhedral add side-panel --with-dependencies --dry-run --json
anhedral add r2 stripe
anhedral add realtime rtc ai
```

Missing prerequisites stop the command before writes. Explicitly list the parents in the same command, or choose `--with-dependencies` to include them in dependency order. There is no `add all` shortcut that silently chooses every optional branch.

## Protecting existing applications

Additions require an Anhedral workspace with a Next.js foundation. They do not reinitialize it. All selected recipes are planned in memory before any installation. A late collision rejects the entire plan. JSON/JSONC changes preserve unrelated keys and comments; existing bindings and dependency pins that conflict require reconciliation. New source files never replace existing files.

CLI-owned composition adapters are fingerprinted in `anhedral.json`. Their edits are protected too: if an adapter was customized, a later addition stops rather than replacing it. Add business routes in `apps/api/src/index.ts`, custom binding/variable types in `custom-environment.ts`, auth methods in `auth-features.ts`/`auth.ts`, and native product UI in `apps/mobile/App.tsx`. Keep additional application behavior outside composition adapters.

Source writes use the existing journaled transaction/recovery implementation. Dependency resolution/install follows source commit; if installation fails, the CLI reports a post-commit error and retains the source for review and retry. Reviewed dependency patches are configured before the frozen install. `--skip-install` leaves dependency resolution/patch staging to a subsequent normal CLI installation or explicit consumer setup. `--dry-run` makes no writes or network requests, including transaction metadata.

Repeated additions leave source unchanged; the normal command still resolves and installs dependencies so it can recover from an earlier install failure. Use `--skip-install` for a source-only no-op. There is no removal command, provider deletion or implicit D1/R2 data deletion. An inconsistent parent/child declaration is rejected. Earlier full-stack generators and arbitrary custom layouts are not automatically adopted or overlaid; inspect their source and reconcile conflicts explicitly.

## Source state and activation

New minimal foundations and progressive additions record nonsecret `composition`
provenance in `anhedral.json`: generator version, capability source versions and
application identity contract. Legacy source versions remain unknown (`null`);
adding a capability does not relabel older source. Source-only dry runs and failed
transactions preserve the existing manifest. Retained programmatic registry
compositions keep their original metadata and require separate hosting review.

The portable `anhedral/deployment` export supplies versioned manifest, plan,
event/result/error and compatibility schemas. Optional deployment intent requires
explicit environment and visibility; credentials and local project links do not
belong in it. Installed source is never a hosting approval. The first proposed
managed profile preserves standalone Better Auth/D1 identity; it cannot silently
substitute Platform's application-service auth template. No CLI artifact is admitted
for that profile until the origin/binding adapter and pinned runtime are accepted.

Platform owns the canonical transport source. Import a reviewed local export with
`node scripts/sync-deployment-contract.mjs <export-directory>` and use `--check`
to detect drift. `assets/contracts/deployment-provenance.json` records exact hashes
and the source checkout revision; uncommitted bytes are identified by those hashes.
The snapshot includes shared synthetic acceptance fixtures and has no database or
provider imports. It does not update Platform runtime pins or enable deployment.

`stack list` shows the complete catalog. `stack status` reports `locked`, `available`, `installed` or `incomplete` source state. `stack doctor` exits unsuccessfully when declared source is missing. Neither command inspects live providers or proves deployment/activation. An installed capability can still need credentials, migrations, resource IDs and runtime verification.

The intended operational sequence remains source selection → resource provisioning → bindings/secrets/migrations → runtime validation/deployment → verified active service. Client binaries run on their target platforms, independently of Cloudflare server deployments.

## Configuration and local validation

Run dependency installation, inspect the generated files, then run `pnpm check`. The normal `add` path resolves lockfiles, stages any applicable reviewed patches and performs a frozen install. The consumer's `audit:deps` retains raw findings and accepts only the existing reviewed exact patches. Source-only generation does not apply a patch to a dependency that has not been resolved yet.

For API development, use the web service binding in production and `API_INTERNAL_URL=http://127.0.0.1:8787` in `apps/web/.env.local` locally. Copy selected API values from `apps/api/.dev.vars.example` to `.dev.vars`; never put server secrets in client public variables. Set a sufficiently long auth secret and the actual `PUBLIC_APP_URL` before enabling identity-dependent features.

D1's initial resource ID is deliberately a placeholder. Configure the actual D1 identity and private R2 bucket yourself. Keep R2 public access disabled. Generate and review additional SQL, then deliberately apply it to an isolated local database:

```sh
pnpm db:generate
pnpm db:migrate --local
```

Builds and startup never migrate. Remote migration requires explicit `--remote` and deliberate resource selection. No configured database is migrated by this repository's tests.

Better Auth starts with email/password disabled, and no OAuth, passkeys, MFA or organization plugins silently activated. Enable chosen methods explicitly after configuring their credentials, email/policies, schemas and client flows. The included sign-in UI is an email/password example, not automatic method activation. Regenerate/review migrations when adding auth plugins.

## Payments

The included routes form a subscription starter, rather than a complete commerce product. Choose the allowed Stripe price and RevenueCat entitlement. `BILLING_PROVIDER` selects `stripe`, `revenuecat` or `either` for the shared server access guard. The default billing environment is `sandbox`; a deliberate `BILLING_ENVIRONMENT=live` selection must match the provider key and webhook environment. The CLI sets neither live credentials nor live mode.

Checkout derives identity from the authenticated session, uses a server-selected price and requires an idempotency key. Stripe verifies the untouched body/signature through the web proxy. RevenueCat validates its configured authorization header, app scope and environment. D1 receipts deduplicate delivery. Webhook order, redirects and SDK callbacks never grant access.

The server re-reads canonical provider state, checks identity/product/environment/expiry, and fails closed on unavailable or unconfigured providers. Reuse `requireSession` and `requireEntitlement` on paid application routes. `/api/billing/access` demonstrates that guard. SDK account changes are serialized; native sign-out disconnects purchases before clearing the app session. One-time fulfillment, credits, tax, marketplace/Connect, pricing and store-policy decisions remain application work.

Use provider test credentials and store sandboxes for acceptance. No real charge, live activation, signing or store submission is part of `add` or these tests.

## Events, RTC and AI

Events are durable, owner-scoped D1 records. SSE uses `(created_at, id)` cursors and `Last-Event-ID`; batches do not advance past undelivered records. The starter is a private event feed, not an automatic room/membership model. Choose retention and application topics deliberately.

The initial RTC adapter uses Cloudflare Realtime SFU. It provides session creation, tracks, renegotiation and close operations, keeps app secrets server-side, bounds session allocation and checks session ownership. Remote tracks are limited to the same authenticated user's sessions. A multi-user product must add its reviewed room/membership rules and WebRTC client flow. Configure provider lifecycle/retention and validate media behavior before rollout; an adapter install is not a working conference UI.

Workers AI requires explicit model and daily quota configuration. Authentication and an atomic D1 counter gate requests; failed provider calls consume quota as well. No model or provider resource is activated by generation. Alternative realtime/AI provider choices remain application decisions.

## Additional clients

Expo uses public API configuration and SecureStore-backed Better Auth cookies. Set the device-reachable `EXPO_PUBLIC_API_URL`, and add the exact generated scheme origin to the API's `AUTH_TRUSTED_ORIGINS`. Native API helpers preserve the verified session; a browser Origin cannot be bypassed by an `expo-origin` header. Rebuild native clients when native dependencies/configuration change; Expo exports do not establish device or store acceptance.

`native-ui` adds a bounded Button/Text bootstrap from RNR, not the legacy native fork. Shared semantic CSS is imported from `packages/styling`. Use `anhedral ui add` for other components and retain MIT attribution. The audit configuration treats the two upstream button variant exports as intentional public UI APIs. Its narrow runner/peer dependency entries account for Babel/NativeWind usage that static import analysis cannot see; source, duplication and complexity checks remain enabled.

WXT defaults to Chromium Manifest V3, with an explicit API-origin host permission. Side Panel support is Chromium-specific. Configure extension authentication and browser acceptance separately; no extension is installed into a user's browser by the CLI.

GPUI uses the upstream `runtime_shaders` feature, without a vendored fork or web renderer. Rust and platform libraries are required. Its application is a native starter; backend account UX, packaging, signing and distribution belong to the product. Commit the generated Cargo lockfile after resolving native dependencies.


## Repository acceptance fixture

After generating/installing a local consumer under this CLI checkout's `.artifacts/`, mark it with `.anhedral-fixture.json` containing `{"fixture":true}` and run `node tests/test-capability-runtime.mjs <fixture-directory>`. The fixture must include R2, Stripe, RevenueCat, events, RTC and AI source. This test refuses other paths, applies SQL only to isolated Miniflare D1, blocks unexpected outbound requests, and restores its temporary auth-method opt-in. Its billing providers are local read-only fixtures. Keep this marker out of deployed application source. Keep revision-scoped build results and limitations in the CLI repository’s `docs/agent-notes/`.
