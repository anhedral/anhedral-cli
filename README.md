<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/brand/anhedral-wordmark-white-transparent.png">
    <img src="docs/assets/brand/anhedral-wordmark-black-transparent.png" alt="Anhedral" width="464" height="60">
  </picture>
</h1>

[![CI](https://github.com/anhedral/anhedral-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/anhedral/anhedral-cli/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/anhedral)](https://www.npmjs.com/package/anhedral)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

> 🚧 **Under construction.** Anhedral is in active development; features and APIs may change.

Anhedral creates TypeScript application workspaces and helps deliver them to your own cloud accounts. Start with a connected universal application, add the optional services your product needs, and keep the source code, infrastructure, data and billing under your control.

The default is **Expo web/iOS/Android + Hono + Drizzle/D1 + private R2 + Better Auth**, with TypeScript, pnpm and Turborepo. Browser UI uses official **Base UI Nova shadcn** source; native counterparts share its design tokens and support system/light/dark appearance. Cloudflare hosts the static web gateway and Hono API. Optional payments, AI, email and media remain explicit. Use `--preset minimal` for a client-only Expo app with the same design system. Initialization does not activate services.

## Start locally

Use **Node.js 24.21.0 or newer** and **pnpm 10.34.5**. Initialize on Linux, macOS or WSL.

```sh
npm install --global anhedral

# Inspect the default selection; no writes or network requests.
anhedral init my-app --dry-run --json

# Generate source, install dependencies and start development.
anhedral init my-app
cd my-app
pnpm dev
```

Initialization creates the selected frontend and API foundations, downloads any required pinned upstream starter and installs dependencies. It does not provision cloud services or deploy the app. Follow the generated README for local addresses and any setup required by your selection. You can also run the CLI with `pnpm dlx anhedral@latest`; pin a version for repeatable automation.

### Choose a starting point

```sh
anhedral init my-app                              # Connected Expo/Hono/D1/private R2 app
anhedral init my-app --better-auth                # Add Hono, D1 and accounts
anhedral init my-app --next --r2                   # Next/Vercel + Cloudflare API/files
anhedral init my-app --preset full-product        # Complete compatible foundation
anhedral add workers-ai --cwd my-app --dry-run --json  # Preview growth
anhedral add workers-ai --cwd my-app               # Apply it
```

Use `--dry-run --json` to preview any init/add selection. Run `anhedral registry list`
for recipes, `anhedral registry view <recipe> --json` for details, and
`anhedral help <command>` for command flags. `--cwd` selects an existing project.

[Stack and preset](#progressive-stack) · [Application options](#choose-the-applications) ·
[Data/auth](#choose-data-and-identity) · [Services](#choose-services-and-integrations) ·
[Platform options and documentation](#platform-options-and-documentation) ·
[Delivery](#build-and-deliver) · [Codex plugin](#use-with-codex)

## Progressive stack

Plain init creates the connected default stack and shared design system. Add optional capabilities for
real requirements, or use `--preset full-product` for the complete compatible
foundation. [See the concise stack page](docs/anhedral-stack.md).

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/anhedral/anhedral-cli/main/docs/assets/anhedral-stack.png">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/anhedral/anhedral-cli/main/docs/assets/anhedral-stack-light.png">
  <img alt="Anhedral progressive stack: Expo web, iOS and Android connected to Hono, Better Auth, Drizzle/D1 and private R2, with shared UI and workspace tools." src="https://raw.githubusercontent.com/anhedral/anhedral-cli/main/docs/assets/anhedral-stack.png" width="1200">
</picture>

The diagram shows the basic connected app: Expo web/iOS/Android, Hono, Better Auth,
Drizzle/D1 and private R2, with shared UI, contracts and workspace tooling.
Plain init includes Expo, Hono, accounts, Drizzle/D1 and private R2.
All additional capabilities and alternatives are listed below.

| Need | Selection | Added automatically |
| --- | --- | --- |
| Connected app | Plain init | Expo, Hono, Drizzle/D1, Better Auth, private R2 and shared UI |
| Minimal client | `--preset minimal` | Expo, shared UI/tokens and workspace tooling |
| Server logic | `--expo --hono` | Hono API and public contracts |
| Persistence | `--d1` | Hono and Drizzle/D1 |
| Accounts | `--better-auth` | Hono, a database and browser/native auth |
| AI | `--workers-ai` | AI binding on the default foundation; no implicit billing |
| Full product | `--preset full-product` | All compatible Cloudflare layers, WXT, payments, email and monitoring |

The full preset includes Expo, WXT side panel, Hono, Better Auth, D1, R2, KV,
Stripe, RevenueCat, Workers AI, Analytics Engine, Basin/Pipelines, Images,
RealtimeKit, Durable Object rooms, uploaded/live Stream video, Queues, Cron,
Workflows, Resend and Sentry. Bindings and helpers still need product logic,
provider setup and real acceptance. Init never provisions or activates services.

```sh
anhedral init complete --preset full-product --dry-run --json
anhedral add better-auth --cwd my-app --dry-run --json
anhedral add workers-ai images --cwd my-app --dry-run --json
anhedral add stripe revenuecat --cwd my-app --dry-run --json
```

Additions preserve edited source and reject conflicting regeneration or backend
relocation. Auth additions expose `/sign-in` and `/account` for product navigation.

## Choose the applications

Expo on Cloudflare is the minimal universal default. **Next.js on Vercel**
(`--next`) is the usual explicit web alternative; **Vinext on Cloudflare**
(`--vinext`) is also available. `--hono`, `--wxt` and `--electron` alone select
standalone applications; combine them with `--expo` when desired. Explicit Neon
or Clerk replace the full preset's D1 or Better Auth selections. OpenNext remains
an explicit compatibility profile (`--next --hosting=cloudflare`).

| Selection | Client / hosting |
| --- | --- |
| Default / `--expo` | Expo Router + React Native; web export on Cloudflare, iOS/Android binaries on devices |
| `--next` | Next.js on Vercel |
| `--vinext` | Vinext on Cloudflare |
| `--next --hosting=cloudflare` | Next.js through OpenNext on Cloudflare |
| `--hono` | Standalone Hono API on Cloudflare Workers |
| `--wxt` | Browser extension with side panel; browser-hosted client |
| `--electron` | Desktop app; locally packaged binaries |

Native delivery can use EAS Build; Apple/Google distribute store binaries. Cloudflare
hosts the web/API services, not native or desktop binaries. Explicit web alternatives
replace the preset's implicit Expo; add `--expo` when you also want native clients.

Every workspace uses pnpm and Turborepo with shared TypeScript/ESLint configuration
and one root lockfile. Public contracts appear with Hono; server auth, database
and billing packages appear only when selected. Root `pnpm dev` serves exported
Expo web on 3000 and Hono on 8787 when present. Native Metro uses
`pnpm --dir apps/mobile start`. Browser changes need a re-export; this is not HMR.
Keep SDK 57 pinned and provide build-time paths for static dynamic routes.

## Choose data and identity

| Selection       | Generates                                                             | Selection rule                                        |
| --------------- | --------------------------------------------------------------------- | ----------------------------------------------------- |
| `--d1`          | Shared Drizzle/SQLite database package and migrations                 | Cloudflare runtime; alternative to Neon               |
| `--neon`        | Shared Drizzle/PostgreSQL package using Neon HTTP                     | Server required; separate direct migration connection |
| `--better-auth` | Auth factory, database schema and server auth routes                  | Adds D1 when no database is selected; can use Neon    |
| `--clerk`       | Managed web identity integration and/or backend authentication helper | Alternative to Better Auth; server required           |
| `--local-data`  | Device-local persistence interface                                    | Implement platform adapters and synchronization       |

Database code lives in `packages/db`, including schemas and explicit migration tooling. Browser and device clients call server endpoints. Hosting audience protection and application resource authorization are separate from selecting an identity provider.

## Choose services and integrations

Private R2 and every service below are optional; full-product selects the complete compatible set. The generated scope column distinguishes bindings and Workers from SDK factories and integration guidance.

| Selection         | Purpose                           | Generated scope                                                                          |
| ----------------- | --------------------------------- | ---------------------------------------------------------------------------------------- |
| `--r2`            | Private files                     | R2 Worker binding and authorization guidance                                             |
| `--analytics-engine` | Custom event analytics | Dataset binding and privacy-safe server event helper |
| `--images` | Image processing | Images binding and private raw-byte transform helper |
| `--realtimekit` | Audio/video conferencing | Meeting/participant-token helpers; client SDK/UI remains product work |
| `--video` | Uploaded video | Private Stream upload helper; implement processing checks and signed playback |
| `--kv`            | Cache/configuration               | Eventually consistent Worker binding                                                     |
| `--realtime`      | WebSocket rooms                   | Separate Durable Object Worker; implement room authorization                             |
| `--neon-realtime` | Live PostgreSQL query results     | Server/client factories and Drizzle adapter; adds Neon; manual branch activation         |
| `--stream`        | One-to-many live video            | Cloudflare Stream WHIP/WHEP; server management factory; manual activation and product UI |
| `--queues`        | Background jobs                   | Producer, consumer and dead-letter configuration; implement processing/idempotency       |
| `--cron`          | Scheduled work                    | Separate Worker with an hourly starter schedule                                          |
| `--workflows`     | Durable multi-step work           | Separate Worker with a starter validation step                                           |
| `--workers-ai`    | Cloudflare inference              | Worker AI binding; implement model calls                                                 |
| `--openai`        | Direct OpenAI integration         | Server SDK factory in `packages/ai`                                                      |
| `--ai-sdk`        | AI streaming/provider abstraction | AI SDK exports with an OpenAI provider; alternative to `--openai`                        |
| `--resend`        | Transactional email               | Server SDK factory in `packages/email`                                                   |
| `--stripe`        | Payments/subscriptions            | Hono Checkout/portal/webhooks, DB projection and server entitlement guard                |
| `--revenuecat`    | Cross-store entitlements          | Native purchase/restore/manage plus Hono webhooks and shared entitlement projection      |
| `--sentry`        | Error/crash monitoring            | Integration boundary and redaction fields; initialize platform SDKs                      |
| `--posthog`       | Product analytics                 | Server analytics factory                                                                 |
| `--basin`         | Cloudflare analytical events      | Private stream binding and event helper                                                  |
| `--styling`       | Shared design tokens              | Light/dark tokens and Tailwind preset; automatically included with Expo/WXT              |

Live video (`--stream`), room messaging (`--realtime`) and live SQL (`--neon-realtime`) can coexist. See [live video setup and limits](docs/stack-standard.md#live-video-with-cloudflare-stream). PostHog and Basin can coexist with separate packages. Workers AI can accompany either AI SDK choice. Provider setup supports selected resources for Neon, Clerk, Resend, Stripe, RevenueCat, Sentry, PostHog and OpenAI; credentials, permissions and remaining owner steps are described in the [provider reference](docs/software-factory.md#provider-configuration).

### Composition rules

- Choose one web framework, one database and one identity provider; D1 and Better Auth are the defaults when data/identity is needed. `--openai` and `--ai-sdk` are alternatives.
- Database/auth, Stream and Neon Realtime selections need a compatible server. For mobile with PostgreSQL, use `--expo --hono --neon`.
- New server capabilities introduce Hono on Cloudflare, including for Next.js/Vercel. Existing apps retain runtime ownership during `add`.
- New Expo workspaces, explicit OpenNext, Queues, Basin, Images and Analytics Engine use Wrangler for the Cloudflare workspace. Other supported Cloudflare selections use Void. `add` rejects changes that switch an existing engine or relocate runtime source.
- Neon Realtime requires Neon and manual Realtime configuration. Stripe and RevenueCat are independently optional; WXT is an optional browser-extension interface.

Examples:

```sh
# Web with database-backed identity; Better Auth adds D1.
anhedral init my-app --better-auth

# Universal web/iOS/Android, shared API and PostgreSQL.
anhedral init my-app --expo --neon

# Vercel web with a Cloudflare API and private files.
anhedral init my-app --next --r2

# Live broadcasts with independent room messaging and SQL subscriptions.
anhedral init my-app --stream --neon-realtime --realtime
```

Inspect the full catalog and preview later additions:

```sh
anhedral registry list
anhedral registry view resend --json
anhedral add resend --cwd my-app --dry-run --json
anhedral add resend --cwd my-app
```

Generated entry points live in `apps/*`, shared code in `packages/*`, and Anhedral configuration in one root `anhedral.json`. Read the [source-only full-stack example](https://github.com/anhedral/anhedral-cli/tree/main/examples/full-stack) to see a larger project without creating services.

## Platform options and documentation

The tables above list generator selections. The wider stack below includes
**manual integrations and provider features**, not additional CLI flags or implied
full-product services. Select them for a concrete need and confirm account eligibility.
Each name links to its upstream documentation; the [stack standard](docs/stack-standard.md)
is authoritative for what Anhedral generates.

| Area | Technologies and documentation |
| --- | --- |
| Shared workspace | [Cloudflare API transport](https://developers.cloudflare.com/api/) · [pnpm](https://pnpm.io/) · [Turborepo](https://turborepo.dev/) · [TypeScript](https://typescriptlang.org/) · [ESLint](https://eslint.org/) · [Shared styling](https://ui.shadcn.com/) · [Zod](https://zod.dev/) |
| Web frontends | [Vinext](https://github.com/cloudflare/vinext) · [React](https://react.dev/) · [Tailwind](https://tailwindcss.com/) · [shadcn/ui](https://ui.shadcn.com/) · [Lucide](https://lucide.dev/) · [Next.js / Vercel](https://vercel.com/docs/frameworks/nextjs) · [Next.js / OpenNext](https://opennext.js.org/cloudflare) · [CSS Modules](https://nextjs.org/docs/app/getting-started/css) |
| Runtime & API | [Workers](https://developers.cloudflare.com/workers/) · [Hono](https://hono.dev/) · [Framework server routes](https://nextjs.org/docs/app/getting-started/route-handlers) · [Containers](https://developers.cloudflare.com/containers/) · [Smart Placement](https://developers.cloudflare.com/workers/configuration/placement/) · [DNS / TLS](https://developers.cloudflare.com/ssl/) · [WAF](https://developers.cloudflare.com/waf/) · [Turnstile](https://developers.cloudflare.com/turnstile/) · [API Shield](https://developers.cloudflare.com/api-shield/) · [Access / Tunnel](https://developers.cloudflare.com/cloudflare-one/) · [Load Balancing](https://developers.cloudflare.com/load-balancing/) · [Spectrum](https://developers.cloudflare.com/spectrum/) · [Data Localization](https://developers.cloudflare.com/data-localization/) · [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/) · [Secrets Store](https://developers.cloudflare.com/secrets-store/) · [Cloudflare for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/) · [Workers for Platforms](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/) |
| Cloudflare delivery | [Void](https://void.cloud/integrations/cloudflare) · [Wrangler](https://developers.cloudflare.com/workers/wrangler/) · [Vercel](https://vercel.com/) · [Git / GitHub](https://docs.github.com/) · [GitHub Actions](https://docs.github.com/en/actions) · [electron-builder](https://www.electron.build/) · [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) · [Cloudflare Codex plugin](https://developers.cloudflare.com/agent-setup/codex/) · [cf CLI](https://developers.cloudflare.com/cf/) · [Artifacts](https://developers.cloudflare.com/artifacts/) |
| Native, desktop & extensions | [Expo](https://expo.dev/) · [NativeWind](https://nativewind.dev/) · [React Native Reusables](https://reactnativereusables.com/) · [EAS](https://docs.expo.dev/build/introduction/) · [Electron](https://electronjs.org/) · [WXT](https://wxt.dev/) · [SwiftUI](https://developer.apple.com/documentation/swiftui) · [Compose](https://developer.android.com/develop/ui/compose) · [Flutter](https://docs.flutter.dev/) · [Capacitor](https://capacitorjs.com/docs) · [Local Expo builds](https://docs.expo.dev/build-reference/local-builds/) · [Tauri](https://v2.tauri.app/) · [GPUI](https://www.gpui.rs/) · [SwiftUI / AppKit](https://developer.apple.com/documentation/appkit) · [Browser extension APIs](https://developer.chrome.com/docs/extensions) |
| Data & identity | [Neon Realtime](https://neon.com/docs/realtime/overview) · [D1](https://developers.cloudflare.com/d1/) · [Neon](https://neon.com/) · [Local data](https://sqlite.org/) · [Drizzle](https://orm.drizzle.team/) · [Better Auth](https://better-auth.com/) · [Clerk](https://clerk.com/) · [SQLite](https://sqlite.org/docs.html) · [Hyperdrive / Neon](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/neon/) · [Neon WebSocket driver](https://neon.com/docs/serverless/serverless-driver) · [D1 / Drizzle](https://orm.drizzle.team/docs/connect-cloudflare-d1) · [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) |
| Files & realtime | [R2](https://developers.cloudflare.com/r2/) · [KV](https://developers.cloudflare.com/kv/) · [Durable Objects](https://developers.cloudflare.com/durable-objects/) · [Local files](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) · [S3-compatible storage](https://developers.cloudflare.com/r2/api/s3/api/) · [Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) · [Polling](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) |
| Background work | [Queues](https://developers.cloudflare.com/queues/) · [Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/) · [Workflows](https://developers.cloudflare.com/workflows/) · [Durable Object alarms](https://developers.cloudflare.com/durable-objects/api/alarms/) · [K2](https://developers.cloudflare.com/k2/) |
| AI integrations | [Workers AI](https://developers.cloudflare.com/workers-ai/) · [OpenAI](https://platform.openai.com/docs) · [AI SDK](https://ai-sdk.dev/docs) · [AI Gateway](https://developers.cloudflare.com/ai-gateway/) · [AI Search](https://developers.cloudflare.com/ai-search/) · [Vectorize](https://developers.cloudflare.com/vectorize/) · [Agents SDK](https://developers.cloudflare.com/agents/) · [Sandboxes](https://developers.cloudflare.com/sandbox/) · [Browser Run](https://developers.cloudflare.com/browser-run/) |
| Payments | [Stripe](https://docs.stripe.com) · [RevenueCat](https://www.revenuecat.com/docs/) · [Stripe Checkout](https://docs.stripe.com/payments/checkout) · [Stripe Connect](https://docs.stripe.com/connect) · [Stripe Tax](https://docs.stripe.com/tax) · [StoreKit](https://developer.apple.com/documentation/storekit) · [Play Billing](https://developer.android.com/google/play/billing) · [Monetization Gateway](https://developers.cloudflare.com/monetization-gateway/) |
| Media & communication | [Uploaded video](https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/) · [Resend](https://resend.com/docs) · [Email Service](https://developers.cloudflare.com/email-service/) · [Expo Push](https://docs.expo.dev/push-notifications/overview/) · [Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) · [RealtimeKit](https://developers.cloudflare.com/realtime/realtimekit/) · [Realtime SFU / TURN](https://developers.cloudflare.com/realtime/) · [LiveKit](https://docs.livekit.io/) · [Images](https://developers.cloudflare.com/images/) · [Stream](https://developers.cloudflare.com/stream/) · [Media over QUIC](https://developers.cloudflare.com/moq/) |
| Observability & analytics | [Sentry](https://docs.sentry.io/) · [PostHog](https://posthog.com/docs) · [Basin](https://developers.cloudflare.com/basin/) · [Workers Observability](https://developers.cloudflare.com/workers/observability/) · [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/) · [Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/) · [Flagship](https://developers.cloudflare.com/flagship/) · [PostHog feature flags](https://posthog.com/docs/feature-flags) |

### Cloudflare runtime and operations

| Concern | Configuration / documentation |
| --- | --- |
| Placement | [Smart Placement](https://developers.cloudflare.com/workers/configuration/placement/): opt-in `placement: { mode: "smart" }` near dependencies. Regional/host hints are alternatives. Affects fetch handling, not RPC placement; static assets normally stay at the edge. Not a data-residency guarantee. |
| Service boundaries | [Service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/) for Worker-to-Worker HTTP/RPC; native clients use public HTTPS with application authorization. |
| Web delivery | [Static Assets](https://developers.cloudflare.com/workers/static-assets/), asset-first versus Worker-first routing, SPA fallback and custom domains. |
| Cache | [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/): keys, TTLs and invalidation; keep private responses out of shared caches. KV is eventually consistent; use Durable Objects for coordination. |
| Runtime contract | Pin [compatibility dates](https://developers.cloudflare.com/workers/configuration/compatibility-dates/) and [flags](https://developers.cloudflare.com/workers/configuration/compatibility-flags/); enable Node compatibility only where needed. Review [limits](https://developers.cloudflare.com/workers/platform/limits/) and [pricing](https://developers.cloudflare.com/workers/platform/pricing/) before production. |
| Data placement and recovery | [D1 read replication](https://developers.cloudflare.com/d1/best-practices/read-replication/), [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) and [R2 location constraints](https://developers.cloudflare.com/r2/reference/data-location/); choose consistency, recovery and residency deliberately. |
| Protection | [Rate limiting bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), WAF, Turnstile and Access complement application authorization. Keep provider secrets server-side. |
| Delivery and visibility | [Preview URLs](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/), [gradual deployments](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/), rollback and [OpenTelemetry export](https://developers.cloudflare.com/observability/export/opentelemetry/). |

### Client delivery, quality and design

| Area | Options and documentation |
| --- | --- |
| Expo delivery | [EAS Build](https://docs.expo.dev/build/introduction/), [local builds](https://docs.expo.dev/build-reference/local-builds/), [store submission](https://docs.expo.dev/deploy/submit-to-app-stores/), [EAS Update](https://docs.expo.dev/eas-update/introduction/) and [push notifications](https://docs.expo.dev/push-notifications/overview/). |
| Extension UX | [WXT](https://wxt.dev/) + [Chrome sidePanel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel); declare permissions and validate packaged behavior. |
| Billing | [Stripe Checkout](https://docs.stripe.com/payments/checkout), [customer portal](https://docs.stripe.com/customer-management), [RevenueCat entitlements](https://www.revenuecat.com/docs/getting-started/entitlements), StoreKit and Play Billing. Hono verifies webhooks and enforces shared entitlements; neither provider requires the other. |
| Tests | [Playwright](https://playwright.dev/docs/intro), [Cloudflare Vitest integration](https://developers.cloudflare.com/workers/testing/vitest-integration/) and [Fallow](https://fallow.tools/docs/); test native/store flows on their actual platforms. |
| Design | Official **Base UI Nova shadcn** on Expo web; React Native counterparts with shared tokens, native touch targets and system text scaling. [Vercel guidelines](https://vercel.com/design/guidelines), [Typeset](https://ui.shadcn.com/typeset), [shadcn MCP](https://ui.shadcn.com/docs/mcp), [React Bits](https://reactbits.dev/get-started/introduction/) and [vgpu](https://vgpu.sh) are optional references/tools; DOM components are not automatically native-compatible. |

## Build and deliver

Implement the product, configure selected integrations and review database migrations. Then use the [software factory](docs/software-factory.md) to check provider access, connect the intended account and audience, commit source, ship and verify real user flows.

```sh
anhedral auth --status --json
anhedral doctor --providers --json
# Select the intended account and audience, then commit source/configuration.
anhedral connect --audience private --allow-email owner@example.com
git add .
git commit -m "Implement application and delivery configuration"
anhedral ship --dry-run --json
anhedral ship --json
anhedral verify --json
```

Replace the example member with the intended user. Private Cloudflare hosting requires Zero Trust and scoped Access permissions; native Vercel uses its own connect options in the factory. Implement a meaningful `test:live` script before `verify`. Actual shipping can create resources, apply reviewed deployment migrations and publish code. Provider permissions, account eligibility and usage charges still apply. A generated starter or successful deployment does not establish a working product.

Cloudflare and Vercel have automated delivery and provider evidence checks. Mixed delivery runs Cloudflare before Vercel and can partially succeed. Expo native shipping with an explicit platform returns verified EAS build artifacts; store submission is separate. Electron and extension projects include local build/package tooling, with signing and distribution handled through their platform workflows.

Use the [stack standard](docs/stack-standard.md) for destinations, compatibility, migration ownership, environment files and the remaining implementation requirements for every option. Exact dependency versions live in the [source catalog](https://github.com/anhedral/anhedral-cli/blob/main/src/dependencies.ts).

## Use with Codex

```sh
codex plugin marketplace add anhedral/anhedral-cli
codex plugin add anhedral@anhedral
```

Select **Try now**, or start with:

> Create a new project using [@Anhedral](plugin://anhedral@anhedral). Start by explaining the stack and asking me what it should be about.

The plugin ships six focused skills: Init, Dev, Design, Auth, Billing and Hosting. They guide implementation using the same stack and workflow. Its optional inspector shows project structure, setup, recorded delivery evidence and explicit service controls. Opening it does not deploy the app. The CLI works independently.

## Read next

| Document                                     | Use it to answer                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| [Stack standard](docs/stack-standard.md)     | What should the application contain, and how should it fit together?     |
| [Software factory](docs/software-factory.md) | How do I turn a brief into a tested, delivered and maintainable product? |

The [verification record](docs/verification.md) keeps dated code reviews, provider evidence and remaining acceptance gaps together. Provider setup, CLI behavior, dashboard development and the release process are sections of the software factory.

Use `anhedral --help` and `anhedral help <command>` for command options. `--cwd` selects the project; `--json` produces structured output. Use its [provider configuration](docs/software-factory.md#provider-configuration), [CLI behavior](docs/software-factory.md#cli-behavior), [Codex dashboard](docs/software-factory.md#project-dashboard) and [release process](docs/software-factory.md#maintain-and-release-the-cli) sections for details.

## Work on the CLI

```sh
pnpm install --frozen-lockfile
pnpm build
node dist/bin.js init ../my-test-app --dry-run --json
pnpm test:all
```

`pnpm test:integration` installs and checks generated projects. Inspector development uses `pnpm plugin:build`, `pnpm plugin:check` and `pnpm plugin:preview`; its dependencies and lockfile live in `plugins/codex/inspector`. Building the checkout does not update an installed CLI or plugin. See the [contribution guide](https://github.com/anhedral/anhedral-cli/blob/main/.github/CONTRIBUTING.md) for the development and review process.

Anhedral is open source under the [Apache License 2.0](LICENSE). Generated applications are source code that developers can customize and license for their products, preserving upstream notices. Report bugs in [issues](https://github.com/anhedral/anhedral-cli/issues) and vulnerabilities through [private security reporting](https://github.com/anhedral/anhedral-cli/security/advisories/new).
