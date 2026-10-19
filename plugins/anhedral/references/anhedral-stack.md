# Anhedral progressive stack

**Start minimal. Add capabilities for real needs. Select `--preset full-product`
when the complete foundation is appropriate.**

```mermaid
%%{init: {"flowchart": {"curve": "linear", "nodeSpacing": 35, "rankSpacing": 50, "padding": 18}}}%%
flowchart TB
  subgraph minimal["1 · Minimal default"]
    client["Expo · web / iOS / Android<br/>React Native Reusables · shadcn conventions<br/>NativeWind · shared tokens"]
    web["Cloudflare static web Worker"]
    client -->|"web export"| web
  end

  subgraph optional["2 · Optional capabilities · choose independently"]
    backend["Hono API · Cloudflare Workers<br/>Public contracts · authorization"]
    core["Data, accounts and files<br/>Drizzle / D1 · Better Auth · private R2 · KV"]
    compute["AI, analytics and processing<br/>Workers AI · Analytics Engine · Basin<br/>Images · Queues · Cron · Workflows"]
    media["Realtime and video<br/>Durable Object rooms · RealtimeKit<br/>Stream live / uploaded video"]
    payments["Payments<br/>Stripe web · RevenueCat native<br/>Shared entitlements enforced by Hono"]
    clients["Additional client<br/>WXT browser side panel"]
    operations["External operations<br/>Resend email · Sentry monitoring"]
    backend -.-> core
    backend -.-> compute
    backend -.-> media
    backend -.-> payments
    backend -.-> operations
    clients -.->|"when a backend is needed"| backend
  end

  web ~~~ clients
  web -.->|"add API service binding"| backend
  client -.->|"native HTTPS when selected"| backend

  subgraph full["3 · Full-product preset · selection summary"]
    preset["Minimal app + all capabilities above<br/>22 selected products · no provider activation"]
  end
  core ~~~ preset
  compute ~~~ preset
  media ~~~ preset
  payments ~~~ preset
  operations ~~~ preset
```

Solid lines show the minimal delivery path. Dashed lines summarize optional
integrations, not every network request or deployment. The full-product group is a
selection summary, not another runtime. Grouped capabilities remain separate
services; their exact connections depend on the implemented product.

## Minimal default

| Part | Default |
| --- | --- |
| Client | Expo + React Native + Expo Router |
| Components | React Native Reusables with **shadcn conventions** |
| Styling | NativeWind + shared design tokens |
| Workspace | TypeScript + pnpm + Turborepo; shared TypeScript/ESLint configuration |
| Web hosting | Static Expo export on a Cloudflare asset Worker |
| Native delivery | Local development; EAS and app stores when requested |

Plain `anhedral init my-app` creates no API, auth, database, storage binding or
billing package. Static dynamic routes need build-time paths; SSR is a deliberate
alternative.

**Growth is additive.** `hono` adds the API and contracts. `d1` adds Hono and SQL.
`better-auth` adds Hono and a database. `r2` adds private server-side file storage.
Dependencies resolve automatically: an AI tool can have an API without accounts,
and an anonymous app can use SQL. Additions preserve edited source; backend or
hosting-engine migrations require explicit review.

## Payments and AI

| Add | What it supplies |
| --- | --- |
| `stripe` | Web Checkout/customer portal; Hono, identity and durable billing state |
| `revenuecat` | Native purchase/restore/manage flows; shared identity and entitlements |
| `workers-ai` | Hono + AI binding; no implicit accounts, database or subscriptions |

Stripe and RevenueCat are independent. Hono verifies webhooks, reconciles provider
state and enforces paid access. Native purchases use Apple/Google billing;
RevenueCat synchronizes subscription state. Client purchase results never authorize
server operations. AI routes still need models, validation and usage limits.

## Services, add-ons and alternatives

| Capability | Selection | Scope |
| --- | --- | --- |
| Analytics | `analytics-engine`, `basin` | Event dataset/helper; private Pipelines stream |
| Images | `images` | Binding and private raw-byte transform helper |
| Video | `video`, `stream` | Private uploaded-video helper; WHIP/WHEP live input helper |
| Conferencing | `realtimekit` | Server meeting and participant-token helpers |
| App messaging | `realtime` | Durable Object room Worker |
| Jobs | `queues`, `cron`, `workflows` | Queue/DLQ, scheduled and durable Worker foundations |
| Cache | `kv` | Eventually consistent configuration/cache |
| Extension | `wxt` | Browser side panel API, entrypoints and permissions |
| Operations | `resend`, `sentry` | Email factory and monitoring integration boundary |
| **Next.js on Vercel** | `next` | Usual explicit web frontend alternative |
| **Vinext on Cloudflare** | `vinext` | Additional explicit web frontend alternative |
| Data / identity alternatives | `neon`, `clerk` | Replace D1 / Better Auth |
| Specialized additions | `neon-realtime`, `openai` / `ai-sdk`, `posthog`, `electron`, `local-data` | Live SQL, alternative AI, product analytics, desktop or local persistence |

**Full-product includes:** Expo, WXT, Hono, Better Auth, D1, R2, KV, Stripe,
RevenueCat, Workers AI, Analytics Engine, Basin, Images, RealtimeKit, Durable Object
rooms, uploaded video, live Stream video, Queues, Cron, Workflows, Resend and Sentry.
Explicit Next.js/Vinext, Neon and Clerk replace their corresponding preset defaults.

Cloudflare hosts selected web/API, data, storage, AI and media services. Payment
providers, app stores, Resend, Sentry and Vercel remain external. Media travels
directly between clients and media services; Hono handles authorization and token
issuance. Provider activation, product routes/UI and real acceptance remain work
after scaffolding—especially room authorization, media clients and job processing.

```sh
anhedral init my-app
anhedral add better-auth --cwd my-app --dry-run --json
anhedral init complete --preset full-product --dry-run --json
```

Deployable code lives in `apps/*`; shared code lives in `packages/*`. Contracts,
database, auth, billing and service packages appear when selected. Small apps avoid
unneeded infrastructure; complex products use the same boundaries with more
capabilities.
