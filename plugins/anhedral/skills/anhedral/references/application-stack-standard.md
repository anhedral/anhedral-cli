# Anhedral Application Stack & Delivery Standard

Anhedral builds client-owned applications using established frameworks and provider tools. Default web apps use Vinext, React, TypeScript, Tailwind, shadcn/ui and Lucide on Cloudflare Workers. Native Next.js on Vercel is the established alternative. React is the UI layer within these full-stack frameworks, not a standalone web-app recipe. Add components only when the product needs them, prefer free-first plans where suitable, and keep source, accounts, data, billing and recovery customer-owned.

Respect existing account, budget, audience and release authorization. Request only missing approval for paid activation, material spending, architecture changes or release.

## Stack selection

Cloudflare first. **Default** = preferred when needed; **Option** = choose for the stated requirement. Alternatives are grouped beside their defaults. Preserve justified existing stacks.

### Foundation and clients

| Capability | Default — when | Options — when |
| --- | --- | --- |
| Shared source | **Default:** [TypeScript](https://www.typescriptlang.org/docs/), [pnpm](https://pnpm.io/), [Turborepo](https://turborepo.dev/docs), [Zod](https://zod.dev/) — shared code, builds and validation. | — |
| Web | **Default:** [Vinext + React](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) — full-stack web on Workers. | **Option:** [Next.js + OpenNext](https://opennext.js.org/cloudflare) — existing Next app on Workers; [Next.js + Vercel](https://vercel.com/docs/frameworks/nextjs) — native Next hosting. |
| UI | **Default:** [Tailwind](https://tailwindcss.com/docs/), [shadcn/ui](https://ui.shadcn.com/docs) — web styling/components. | **Option:** [CSS Modules](https://nextjs.org/docs/app/getting-started/css) — bespoke styling or existing CSS. |
| Mobile | **Default:** [Expo](https://docs.expo.dev/) — React Native iOS/Android. | **Option:** [SwiftUI](https://developer.apple.com/documentation/swiftui) / [Compose](https://developer.android.com/compose) — platform-specific UI; [Flutter](https://docs.flutter.dev/) — Dart shared UI; [Capacitor](https://capacitorjs.com/docs) — package web UI with native access. |
| Desktop | **Default:** [Electron](https://www.electronjs.org/docs/latest/) — reuse web UI with Chromium/Node. | **Option:** [Tauri](https://v2.tauri.app/) — smaller system-webview packages; [GPUI](https://github.com/zed-industries/zed/blob/main/crates/gpui/README.md) — GPU-rendered Rust UI, separate UI code and pre-1.0 APIs; [SwiftUI/AppKit](https://developer.apple.com/documentation/appkit) — Apple-specific desktop experience. |
| Extensions | **Default:** [WXT](https://wxt.dev/guide/introduction.html) — browser extensions. | **Option:** [Chrome extension APIs](https://developer.chrome.com/docs/extensions) — direct implementation or existing extension. |

### Backend and data

| Capability | Default — when | Options — when |
| --- | --- | --- |
| API/runtime | **Default:** [Workers](https://developers.cloudflare.com/workers/) + [Hono](https://hono.dev/docs/getting-started/cloudflare-workers) — APIs, webhooks and services. | **Option:** framework server routes — integrated web backend; [Containers](https://developers.cloudflare.com/containers/) — Linux/native dependencies. |
| Database | **Default:** [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver) + [Drizzle](https://orm.drizzle.team/docs/connect-neon) — direct HTTP for CRUD and independent queries; no Hyperdrive required. | **Option:** [Hyperdrive + Neon](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/neon/) — pg/postgres.js, connection reuse or optional caching, justified by workload/latency measurements; Neon WebSocket driver — session/interactive transactions; [D1 + Drizzle](https://orm.drizzle.team/docs/sqlite/connect-cloudflare-d1) — Worker-native SQLite; [SQLite](https://www.sqlite.org/docs.html) / [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) — local/offline data. |
| Authentication | **Default:** [Better Auth](https://better-auth.com/docs/adapters/drizzle) — own identities, sessions and organizations. | **Option:** [Clerk](https://clerk.com/docs) — managed authentication and identity features. |
| Files | **Default:** [R2](https://developers.cloudflare.com/r2/) — uploads, attachments and archives. | **Option:** local files — device-only apps; existing S3-compatible storage — migration has no benefit. |
| Realtime/state | **Default:** [Durable Objects + hibernating WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) — rooms, presence and coordinated events. | **Option:** [SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) — one-way updates; polling — infrequent changes; [KV](https://developers.cloudflare.com/kv/) — read-heavy, eventually consistent cache/config. |
| Background work | **Default:** [Queues](https://developers.cloudflare.com/queues/) — jobs/retries; [Workflows](https://developers.cloudflare.com/workflows/) — durable multi-step work; [Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/) — schedules. | **Option:** [DO alarms](https://developers.cloudflare.com/durable-objects/api/alarms/) — entity timers; [K2](https://developers.cloudflare.com/k2/) — retained replayable streams, beta acceptable. |
| Placement | **Default:** standard Workers placement — request-proximate execution. | **Option:** [Placement](https://developers.cloudflare.com/workers/configuration/placement/) — database/backend round trips dominate. |

Start with direct Neon HTTP; use non-interactive transaction batches where suitable, or WebSocket/standard-driver transactions when interactive sessions are needed. Benchmark before adding Hyperdrive. Its pooling operates on Cloudflare infrastructure; Neon PgBouncer operates near Postgres. With Hyperdrive use pg/postgres.js against Neon’s non-pooled endpoint, not the Neon serverless driver or stacked poolers. Disable result caching for authoritative auth, permissions, entitlements and balances. Neither Neon nor D1 is universally faster/cheaper; offline sync remains application work.

### AI, media and communication

| Capability | Default — when | Options — when |
| --- | --- | --- |
| Inference | **Default:** [Workers AI](https://developers.cloudflare.com/workers-ai/) — supported models fit; [AI Gateway](https://developers.cloudflare.com/ai-gateway/) — routing/controls/telemetry. | **Option:** [OpenAI/other providers through Gateway](https://developers.cloudflare.com/ai-gateway/usage/providers/) — required models; [AI SDK](https://ai-sdk.dev/docs/introduction) — shared model interfaces and streaming UI. |
| Retrieval/agents | **Default:** [AI Search](https://developers.cloudflare.com/ai-search/) — managed RAG. | **Option:** [Vectorize](https://developers.cloudflare.com/vectorize/) — custom vector pipeline; [Agents SDK](https://developers.cloudflare.com/agents/) — stateful agents. |
| Isolated execution | — | **Option:** [Sandboxes](https://developers.cloudflare.com/sandbox/) — user/agent code; [Browser Run](https://developers.cloudflare.com/browser-run/) — automation, screenshots/PDFs; [Containers](https://developers.cloudflare.com/containers/) — custom runtime. |
| Calls | **Default:** [RealtimeKit](https://developers.cloudflare.com/realtime/realtimekit/) — audio/video/screensharing. | **Option:** [Realtime SFU + TURN](https://developers.cloudflare.com/realtime/) — custom WebRTC; [LiveKit](https://docs.livekit.io/) — existing ecosystem or voice-agent requirements. |
| Images/video | **Default:** [Images](https://developers.cloudflare.com/images/) — transforms/delivery; [Stream](https://developers.cloudflare.com/stream/) — encoding/playback/live video. | **Option:** [R2](https://developers.cloudflare.com/r2/) — originals/downloads without managed processing; [Media over QUIC](https://developers.cloudflare.com/moq/) — specialized low-latency transport. |
| Email | **Default:** [Email Service](https://developers.cloudflare.com/email-service/) — email workflows, sending beta acceptable. | **Option:** [Resend](https://resend.com/docs) — established transactional email provider. |
| Notifications | **Default:** [Expo Push](https://docs.expo.dev/push-notifications/overview/) — Expo mobile notifications. | **Option:** [APNs](https://developer.apple.com/documentation/usernotifications) / [FCM](https://firebase.google.com/docs/cloud-messaging) — direct native delivery; [Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) — browser notifications. |

Durable Objects coordinate calls/events; SFU/TURN handle media. WebSockets do not replace background push.

### Commerce and access

| Capability | Default — when | Options — when |
| --- | --- | --- |
| Web billing | **Default:** [Stripe Checkout](https://docs.stripe.com/payments/checkout) + [Billing](https://docs.stripe.com/billing) — payments, subscriptions and usage billing. | **Option:** [Connect](https://docs.stripe.com/connect) — marketplaces/payouts; [Tax](https://docs.stripe.com/tax) — tax calculation. |
| Cross-store purchases | **Default:** [RevenueCat](https://www.revenuecat.com/docs/web/integrations/stripe) — supported store/web subscriptions and entitlements. | **Option:** [StoreKit](https://developer.apple.com/documentation/storekit) / [Play Billing](https://developer.android.com/google/play/billing) — own purchase lifecycle integrations. |
| Access enforcement | **Default:** Workers + chosen database — entitlement projections, seats, grants and credit/usage ledger. | **Option:** [Monetization Gateway](https://developers.cloudflare.com/monetization-gateway/) — eligible x402 requests, closed beta acceptable. |

Stripe/stores remain purchase authorities; RevenueCat does not cover every Stripe pricing model. Verify webhooks, process idempotently and reconcile refunds/restores. Cloudflare hosts enforcement; it does not replace payment processing.

### Security, analytics and operations

| Capability | Default — when | Options — when |
| --- | --- | --- |
| Public protection | **Default:** [DNS/TLS](https://developers.cloudflare.com/directory/), [WAF](https://developers.cloudflare.com/waf/), [Turnstile](https://developers.cloudflare.com/turnstile/) — domains, HTTPS and abuse controls. | **Option:** [API Shield](https://developers.cloudflare.com/api-shield/) — additional API protection; [Access + Tunnel](https://developers.cloudflare.com/cloudflare-one/) — staff tools/private origins. |
| Specialized security/networking | — | **Option:** [Load Balancing](https://developers.cloudflare.com/load-balancing/) — multiple origins; [Spectrum](https://developers.cloudflare.com/spectrum/) — TCP/UDP proxying; [Data Localization](https://developers.cloudflare.com/data-localization/) — regional processing requirements. |
| Credentials | **Default:** [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/) — server credentials. | **Option:** [Secrets Store](https://developers.cloudflare.com/secrets-store/) — shared account secrets, beta acceptable. |
| Website analytics | **Default:** [free Web Analytics](https://www.cloudflare.com/web-analytics/) — traffic/performance. | **Option:** [PostHog](https://posthog.com/docs) — product funnels, cohorts and replay. |
| Operational telemetry | **Default:** [Workers Observability](https://developers.cloudflare.com/workers/observability/) — logs/traces/errors. | **Option:** [Sentry](https://docs.sentry.io/platforms/javascript/) — cross-client error monitoring; [Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/) — custom telemetry; [Basin](https://developers.cloudflare.com/basin/) — event ingestion and analytical SQL on R2/Iceberg. |
| Feature delivery | — | **Option:** [Flagship](https://developers.cloudflare.com/flagship/) — targeted exposure; [PostHog](https://posthog.com/docs/feature-flags) — existing flags/experiments. |
| Content/source tooling | — | **Option:** [Artifacts](https://developers.cloudflare.com/artifacts/) — durable versioned source/artifacts, beta acceptable; [GitHub](https://docs.github.com/) — customer-owned Git source. |
| Customer platforms | — | **Option:** [Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/) — customer domains; [Workers for Platforms](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/) — customer code. |

### Development, releases and accounts

| Capability | Default — when | Options — when |
| --- | --- | --- |
| Agent tooling | **Default:** [Cloudflare Codex plugin](https://developers.cloudflare.com/agent-setup/codex/) — Cloudflare Skills/MCP and agent operations. | **Option:** [cf CLI](https://developers.cloudflare.com/cf/) — broad API/project operations, beta acceptable. |
| Cloud releases | **Default:** [Wrangler](https://developers.cloudflare.com/workers/wrangler/) + [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) — Worker development/releases. | **Option:** [GitHub Actions](https://docs.github.com/en/actions) — custom CI; [Vercel](https://vercel.com/docs/deployments) — selected native Next stack. |
| Native builds | **Default:** [EAS](https://docs.expo.dev/build/introduction/) — hosted Expo builds. | **Option:** [local Expo builds](https://docs.expo.dev/build-reference/local-builds/) — local CI; platform toolchains — GPUI/Tauri/native clients. |
| Distribution/accounts | **Default:** customer-owned [Apple](https://developer.apple.com/programs/), [Play](https://play.google.com/console/about/), [Chrome](https://developer.chrome.com/docs/webstore/register) accounts — selected stores. | **Option:** direct desktop distribution — signed/notarized packages; [free Cloudflare account creation](https://developers.cloudflare.com/changelog/post/2026-08-04-free-dashboard-button/) — eligible separate customer accounts. |

Use customer-owned resources. Implement backup/recovery, authorization, replay, offline sync and ledger correctness explicitly. Select specialized capabilities as needed; alternatives are choices, not dependencies to install together.

The CLI generates Vinext, Next.js, Expo, Electron, WXT and Hono applications plus selected provider starters. Neon starters use the direct serverless HTTP driver with Drizzle. Alternatives in the table require deliberate project implementation. A starter does not establish configured infrastructure or working product behavior. The bundled capability registry and `new --dry-run --json` describe generated requirements.

The bundled stack registry in `src/stack-registry.ts` owns each item’s identity, version, source recipe, setup requirements, environment variables, bindings, destinations and composition constraints. Product IDs and capability views derive from that catalog. Foundations include pnpm/Turborepo, TypeScript, ESLint and shared UI; the official shadcn bootstrap is pinned in `src/dependencies.ts`. The resolver validates selections and orders dependencies; focused modules under `src/scaffold/` install the resolved recipes inside the staging transaction. `registry list|view` exposes the catalog, dry-run plans expose concrete destinations, and `anhedral.registry.json` records installed recipes and local workspace references. Package names must be unique, workspace references must resolve, and dependency cycles fail before commit. `doctor` verifies the installed receipt and workspace graph against the setup plan. To add a supported part, declare one catalog entry with its recipe and composition policy, then exercise composition and rollback in the registry tests. Build and release tooling regenerate matching plugin catalogs. Incremental `add` stages bundled or declarative local/HTTPS registry items, resolves dependencies, rejects unsafe paths and installation hooks, and refuses to replace edited source. Receipts record source integrity and generated-file hashes. Runtime relocation and older projects without fingerprints require explicit migration. This is an Anhedral recipe schema; shadcn JSON interoperability is not supported. Stack alternatives without generator recipes remain deliberate implementation choices.

## Implementation rules

- Start new projects with the official shadcn pnpm/Turborepo monorepo; use `apps/*` and genuinely shared `packages/*`. Web/Electron use React, TypeScript, Tailwind, shadcn/ui and Lucide; Expo uses React Native Reusables; WXT uses Chrome Side Panel. Preserve suitable existing architecture.
- Vinext is the default Worker framework; verify its actual compatibility. Native Next.js uses Vercel; explicit Next.js on Workers uses OpenNext. Shared/mobile APIs use Hono/OpenAPI; web-only endpoints can use framework routes.
- Select one database and one identity provider. Generator alternatives remain deliberate flags, not automatic migrations. Better Auth requires a database; authentication is optional. Configure origins/sessions and enforce tenant/resource authorization server-side. Hosting privacy is separate from product identity.
- Keep R2 private and authorize file operations in Workers. Keep secrets server-side, environments separate and migrations reviewed. KV is not authoritative transactional state. Bound retries, concurrency, AI usage and paid consumption; implement idempotency, quotas and recovery.
- Use customer-owned source, accounts, billing and recovery. Domain registration/brokerage uses GoDaddy and Cloudflare DNS; preserve existing mail/DNSSEC. Configure actual sender domains and inbound destinations; routing does not migrate mailboxes.
- Codex and browser/native tools implement and verify product flows; Fallow audits TS/JS. A starter, installed package or successful deployment does not prove a configured integration or working application.
- Record decisions and connections in the application's `docs/architecture.md`; keep tested behavior, environment, release/source identity and unresolved gaps in `docs/verification.md`. Update these existing files after relevant changes.

Follow the [delivery workflow](delivery-workflow.md) for release, acceptance and recovery. The [managed-hosting contract](https://github.com/anhedral/anhedral-init/blob/main/docs/managed-hosting-architecture.md) describes an undeployed client/backend boundary, not an available service. Installed versions, publication and live acceptance require separate evidence.

## Maintenance

This file owns stack choices; the delivery guide owns lifecycle/acceptance; the managed contract owns its API; sponsorship owns support information. Update the owning file in the same change when behavior or provider requirements change. Remove stale claims and unused options. Verify current official guidance when selecting a provider; beta availability is not guaranteed. Do not add catalogs, duplicated analyses or progress reports to `docs`. The plugin's bundled stack/delivery files are generated copies, never separate sources of truth.

Generated `pnpm audit:deps` checks all dependencies and verifies reviewed security backports against patch hashes, installed package hashes and regression checks. Unknown advisories and altered backports fail closed.
