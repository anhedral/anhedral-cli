---
name: anhedral-init
description: "Start with TanStack Start and Anhedral UI, then add the web backend, storage and Stripe when needed."
---

# Anhedral Init

Inspect and preserve the destination. Use the explicitly selected reviewed CLI version. Preview `anhedral init <directory> --dry-run --json`, then apply the same options. `--skip-install --no-git` generates offline. Init creates only TanStack Start SSR/server functions and source-owned Anhedral UI. Do not add an API, database, authentication, storage or payments by default. Generation provisions no resources or credentials.

Read emitted README.md and AGENTS.md, then run `pnpm dev` for the minimal web app. When a feature needs backend services, preview `anhedral add backend --dry-run --json` and apply the same selection; it composes Hono, Better Auth and Drizzle/D1 together. Configure the API's private environment values; auth methods start disabled. Deliberately apply reviewed SQL to isolated local D1 with `pnpm db:migrate --local`. Vite then owns the web Worker and auxiliary Hono Worker in one process, with local D1 and optional R2. Observe the actual URL and validate the browser flow before reporting it working. Reuse an appropriate server. Builds/startup never migrate databases. See ../../references/capabilities.md and ../anhedral-design/SKILL.md.

Use `anhedral ui` for source-owned UI and `anhedral stack list/status/doctor` to inspect source. Select `add r2` or `add stripe` only when required; use `--with-dependencies` to include missing backend prerequisites. Preview additions with `--dry-run --json` before applying. Keep server rendering and server functions in the web app; privileged business/auth/database/storage operations belong to Hono through the API service binding. Never import another application's source or expose provider secrets to web/public variables.

Expo/native UI, RevenueCat, WXT/Side Panel, GPUI, realtime and AI recipes remain open-source options outside the Platform launch's supported hosting, migration and testing scope. Do not add them to a launch app by default. Legacy Next.js applications retain their reviewed source and progressive workflow; init does not migrate them. Preserve edited adapters, dependencies and identity. Retaining an optional recipe is not a compatibility or device/store acceptance promise.

The CLI requires no Platform account for generation. TanStack source composition version 2 does not establish live Platform hosting readiness. Matching Platform source/runtime integration is separately implemented, reviewed and adopted. Do not substitute unreleased CLI source into Platform's pinned artifacts. Do not invoke retired operational auth, inspect, ship or provider-management commands.

Source additions do not provision, migrate or deploy. Auth methods require deliberate credentials, email/policy and schema setup. After adding Stripe, generate and review its billing SQL with `pnpm db:generate`, then deliberately migrate before accepting webhooks. Configure Stripe's allowed products, provider scope and billing environment; derive subscription access from server-verified canonical state. No live payment is authorized by source generation.

For linked Anhedral projects, optional remote Platform tools use OAuth consent and current project roles. Use metadata reads for project, variable names, deployment status and logs. Start browser imports for secrets; never request their values in chat or pass them in MCP arguments. CLI imports use `anhedral env import --environment staging|production --file <private-file>` or `--stdin`; `--dry-run` returns names/types only. CLI and plugin OAuth credentials remain separate. Production retains Platform approval.
