---
name: anhedral-init
description: "Start a new Anhedral application from a brief: choose capabilities, review the CLI dry run and generate a foundation for development."
---

# Anhedral Init

Turn the brief into users, core flows, data/access boundaries and observable
acceptance criteria. Ask for an app idea only when none exists. Inspect the
destination first; continue an existing application instead of initializing over it.

Default to the smallest useful Expo web/iOS/Android app in `apps/mobile`, with
official Base UI Nova shadcn on web, native React Native counterparts, shared tokens,
TypeScript, pnpm and Turborepo. Plain init includes Hono, Drizzle/D1, Better Auth and private R2; payments and other integrations remain optional. --preset minimal keeps a client-only app.

Select capabilities from actual flows: Hono for server logic/secrets, Drizzle/D1
for persistence, Better Auth for accounts, R2 for private files. The CLI resolves
dependencies automatically: auth adds server/database; billing adds server,
identity and durable state. AI or image processing alone does not require accounts
or billing. Use `--expo --hono` for a connected universal app; `--hono` alone is
API-only, and `--wxt` alone is a standalone browser side panel.

Use `--preset full-product` when a complete foundation is requested. Read the
bundled [stack registry](../../references/stack-registry.json) for component
contracts and the [selection guidance](../../references/stack-standard.md#progressive-selection-and-full-product-preset)
for defaults and overrides. Use the selected CLI's dry run for the exact resolved
preset selection.
This generates compatible scaffolds and bindings; provider activation, product
implementation and acceptance remain separate. It does not activate every vendor
or conflicting alternative.

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
