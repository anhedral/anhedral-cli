---
name: anhedral-init
description: "Generate the Anhedral Stack: start with web UI, then add backend, private storage and Stripe when needed."
---

# Anhedral Init

Use the single current Anhedral Stack. Inspect/preserve the destination and use the explicitly reviewed CLI version. Preview `anhedral init <directory> --dry-run --json`, then apply the same options. `--skip-install --no-git` generates offline. Init creates only the web foundation: TanStack Start SSR/server functions and source-owned shadcn Anhedral UI.

Read emitted README/AGENTS and run `pnpm dev`. Observe its actual URL and validate browser behavior before reporting it working. Use `anhedral ui` for web UI and `anhedral stack list/status/doctor` for source inspection. There is no stack selector, mobile option or separate public stack registry.

When required, preview/apply `anhedral add backend` to compose Hono, Better Auth and Drizzle/D1 together. Add `r2` for private storage or `stripe` for subscriptions; `--with-dependencies` includes missing backend prerequisites. Preserve customized composition files. Configure private API environment values, deliberately review/apply local SQL with `pnpm db:migrate --local`, and explicitly enable selected auth methods after email/credential/policy setup. Vite then runs web and API Workers with local resources.

Hono owns privileged business/auth/database/storage work. Web server functions call scoped API bindings; never import another application's source or expose provider secrets in public variables. After adding Stripe, run `pnpm db:generate`, review SQL and deliberately migrate before webhook tests. Configure allowed prices, test credentials and canonical entitlement checks. Source generation never provisions, migrates, activates payments or deploys.

Keep historical generators, native/client recipes and protocol values as compatibility details. Do not advertise them as current options or restore retired auth/ship/provider-management commands. See ../../references/capabilities.md, ../../references/stack-standard.md and ../anhedral-design/SKILL.md.

Generation needs no Platform account. Optional remote tools use separate OAuth consent and project roles. Read metadata for projects, variable names, deployment receipts and logs. Initiate secure browser imports for secrets; never ask for values in chat or pass them in MCP arguments. CLI imports use owner-only files or stdin, with offline names/types-only dry runs. Platform runtime admission and production approval remain authoritative; local source compatibility is not live hosted readiness.
