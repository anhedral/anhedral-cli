# Local source examples

[Full stack](full-stack/) shows the default Cloudflare provider choices with all standard service foundations: Vinext, Hono, D1/Drizzle, Better Auth, R2, KV, realtime, Queues, cron, Workflows, Workers AI, Resend, Stripe, Sentry, PostHog and Basin.

| Directory | What to inspect |
| --- | --- |
| `full-stack/anhedral.json` | Project identity, selection, provider settings, hosting and generated provenance |
| `full-stack/apps/web` | Vinext web interface and a small source overview page |
| `full-stack/apps/api` | Hono/OpenAPI API, Better Auth handlers and service bindings |
| `full-stack/apps/realtime` | Durable Object realtime rooms |
| `full-stack/apps/jobs` | Queue consumers and dead-letter recovery |
| `full-stack/apps/scheduled` | Cron Worker |
| `full-stack/apps/workflows` | Workflow Worker |
| `full-stack/packages/db` | Reusable database factory, schema, migration entrypoint and reviewed SQL |
| `full-stack/packages/auth` | Shared Better Auth factory |
| `full-stack/packages/ui` | Shared UI and an example service card |
| `full-stack/packages/{email,billing,observability,analytics,basin}` | Integration factories |
| `full-stack/docs/stack.md` | Resolved capabilities, packages, environment names and setup requirements |

This is source only. Nothing has been provisioned or shipped, no provider account is connected, and environment files contain placeholders. Dependency installation and lockfile resolution are intentionally incomplete; `doctor` reports the missing lockfile. Queues and Basin select the supported Wrangler delivery path for this combination.

See [generation notes](full-stack/docs/example.md) for the source provenance and selected CLI flags. Native clients and alternative providers are separate optional selections.
