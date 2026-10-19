---
name: anhedral-init
description: "Start a new Anhedral application from a brief: choose capabilities, review the CLI dry run and generate a foundation for development."
---

# Anhedral Init

Turn the brief into users, core flows, data/access boundaries and observable
acceptance criteria. Ask for an app idea only when none exists. Inspect the
destination first; continue an existing application instead of initializing over it.

Default to the smallest useful Expo web/iOS/Android app in `apps/mobile`, with
React Native Reusables using shadcn conventions, NativeWind, shared tokens,
TypeScript, pnpm and Turborepo. Cloudflare serves its static web export. No API,
auth, database, R2 or payment provider is selected by plain init.

Select capabilities from actual flows: Hono for server logic/secrets, Drizzle/D1
for persistence, Better Auth for accounts, R2 for private files. The CLI resolves
dependencies automatically: auth adds server/database; billing adds server,
identity and durable state. AI or image processing alone does not require accounts
or billing. Use `--expo --hono` for a connected universal app; `--hono` alone is
API-only, and `--wxt` alone is a standalone browser side panel.

Use `--preset full-product` when a complete foundation is requested. It selects
Expo, WXT, Hono, D1, Better Auth, R2, KV, Stripe/RevenueCat, Workers AI, Analytics
Engine, Basin/Pipelines, Durable Object rooms, RealtimeKit, Images, Stream live and
uploaded video, Queues/Cron/Workflows, Resend and Sentry. This generates compatible
scaffolds and bindings; provider activation, product implementation and acceptance
remain separate. It does not activate every vendor or conflicting alternative.

Next.js on Vercel (`--next`) is the usual explicit web alternative; Vinext on
Cloudflare (`--vinext`) is also available. Explicit Neon and Clerk replace the full
preset's D1 and Better Auth. Preserve suitable existing architectures and edited
source. Keep the generated SDK pin; read [runtime guidance](../anhedral-dev/references/cross-platform.md)
for static routing, native origins and development loops.

Pin the CLI version, check Node/pnpm and preview the chosen selection:

```sh
anhedral registry list --json
anhedral init my-app --dry-run --json
# Complete product foundation, only when requested:
anhedral init complete --preset full-product --dry-run --json
anhedral init my-app
```

Use identical flags for preview/generation. For unpublished work build and use the
local CLI; installed CLI/plugin and hosted executor versions may differ. Init
installs a foundation; it does not provision services or deploy.

Continue with [Dev](../anhedral-dev/SKILL.md) for implementation and verification.
Load [Design](../anhedral-design/SKILL.md) for interface work,
[Auth](../anhedral-auth/SKILL.md) for sessions,
[Billing](../anhedral-billing/SKILL.md) for selected payment providers or legacy
billing migrations, and [Hosting](../anhedral-hosting/SKILL.md) for requested delivery.
Generated clients and screens still require runtime/device acceptance.

Read generated README, AGENTS, scripts, lockfile and `anhedral.json`. Preserve its
identity/configuration when continuing development.

Read the bundled [stack standard](../../references/stack-standard.md) when choosing capabilities and the [progressive stack](../../references/anhedral-stack.md) for the concise architecture overview.
