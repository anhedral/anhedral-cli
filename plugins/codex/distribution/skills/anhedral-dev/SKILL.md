---
name: anhedral-dev
description: "Implement, debug and extend an Anhedral application using its generated workspace, local runtime, supported capability additions and meaningful verification."
---

# Anhedral Dev

For a project selected in the plugin dashboard, use `get_project_context` with
its catalog ID to resolve the source directory before inspecting or editing it.
If the intended project is unclear, use `list_projects` to identify it; do not
infer a source path from its display name. These tools are optional when the user
has already supplied the source directory and do not grant filesystem access.

Inspect the app's instructions, source, Git state and `anhedral.json`. Preserve
user work and suitable existing architecture. Use the selected CLI version and
workspace scripts; do not reinitialize an app to add features.

When server capabilities are selected, Hono owns server behavior in `apps/api`; web routes
only adapt/proxy calls. Put public schemas and HTTP transport in
`packages/contracts`, database schema/migrations in `packages/db`, and auth
factories in `packages/auth`. Apps never import another app’s source. Use the
API request’s lazy `database` factory; never import server packages in clients.
When Hono is selected, check `/api/health` directly and through any generated web
proxy. Check authenticated `/api/session` only when application authentication
is selected and that route is implemented. Preserve cookie, origin and cache
protections when extending the proxy.

## Development loop

1. Identify the user flow and observable acceptance criteria. Read the relevant
   source and version-matched framework documentation before changing it.
2. Run the workspace's development command, usually `pnpm dev`. Use actual server
   output for addresses and reuse running services. Configure only needed local
   integrations with isolated data.
3. Implement the flow end to end: UI, server behavior, persistence, validation and
   loading/error/empty states. Keep credentials/database access server-side and
   enforce identity and resource ownership there.
4. Run generated checks/builds and tests relevant to the changed behavior. Exercise
   the real runtime/UI, fix failures and rerun affected checks. Keep configured
   database migrations separate from builds/tests.
5. Report what works and what was checked. Distinguish local fixtures, configured
   services and verified live integrations. Update the architecture record when
   ownership or integration boundaries change.

Keep deployable apps in `apps/*` and reusable code in `packages/*`. New universal
frontends live in `apps/mobile` with Expo, official Base UI Nova shadcn web components, native counterparts and shared design tokens. Reuse accessible native primitives and platform adapters;
keep reusable components in shared packages when multiple clients consume them. Explicit Next.js on Vercel or Vinext on Cloudflare apps use shared shadcn UI. Reuse the generated
compiler, lint and Tailwind configuration. Preserve existing conventions when maintaining an adopted app.

## Add capabilities

Inspect the selected CLI's catalog and preview supported additions:

```sh
anhedral registry view resend --json
anhedral add resend --cwd my-app --dry-run --json
anhedral add resend --cwd my-app
```

Apply the same conflict-free selection. Preserve edited files and registry receipts;
resolve unsupported runtime changes deliberately rather than bypassing add checks.
`anhedral inspect my-app --json` reads declarations and recorded delivery evidence,
not current provider health.

## Task-specific guidance

- [Design](../anhedral-design/SKILL.md): interface structure, styling and interaction.
- [Auth](../anhedral-auth/SKILL.md): provider login, application sessions and ownership.
- [Billing](../anhedral-billing/SKILL.md): optional Stripe/RevenueCat purchases and shared entitlements.
- [Hosting](../anhedral-hosting/SKILL.md): requested provisioning, delivery and live verification.

For Expo development, read [cross-platform runtime](references/cross-platform.md)
for gateway routing, native origins, exports and the local development loop.
[Development tools](references/development-tools.md) covers optional code analysis,
GitHub and browser verification; load only what the task needs.

Plain init includes Hono, Drizzle/D1, Better Auth, private R2 and shared UI. Use --preset minimal for a client-only app. Add AI, payments and WXT
only for concrete needs; dependency resolution supplies prerequisites. Enforce
file ownership in Hono before exposing
R2 routes; a private bucket binding does not authorize application users.

For selected WXT extensions, use the browser side panel API when the product needs
a side panel. Configure WXT entrypoints, browser permissions and the extension
auth adapter; call Hono for shared backend behavior. Verify API support and side
panel lifecycle in each target browser rather than assuming cross-browser parity.

Use `registry view` and generated service guides for selected Cloudflare capabilities:
Workers AI, Analytics Engine/Basin, Images, Stream uploads/live video, RealtimeKit,
Durable Object rooms and jobs. RealtimeKit conferencing, Stream broadcasts and
Durable Object app messaging are different integrations. Bindings and server
factories still need authorized product routes, client UI and real acceptance.
Adding Hono wires an existing Expo gateway without regenerating screens; auth adds
`/sign-in` and `/account`, which must be linked from product navigation. Preserve
edited-source conflict checks and existing backend/delivery ownership.

Use the bundled [software factory](../../references/software-factory.md) for repository, implementation and verification workflows. For audits or cleanup, follow its [evidence-driven maintenance](../../references/software-factory.md#evidence-driven-maintenance) guidance.
