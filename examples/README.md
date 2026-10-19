# Local source examples

[Billing reference](billing-reference/) demonstrates the current full Cloudflare default—Expo web/iOS/Android, Hono, Better Auth, Drizzle/D1 and private R2—with optional Stripe and RevenueCat enabled. It includes shared entitlements, Checkout/portal, native purchase/restore adapters and reviewed SQL. Its full checks and native exports passed; provider responses in billing acceptance tests are synthetic. See [verification](billing-reference/docs/verification.md) for scope and limits.

[Universal reference](universal-reference/) preserves the earlier universal profile: Expo universal web/iOS/Android, Cloudflare static-asset/API gateway, Hono, isolated D1 and Better Auth browser/native session wiring. Browser/API behavior and iOS/Android exports are validated separately; exports are not device or store acceptance. See its own README for setup and scope. Billing is independently optional and requires its own configured provider/store acceptance; it is not implied by this reference.

[Full stack](full-stack/) preserves the explicit historical Vinext profile with all standard service foundations: Vinext, Hono, D1/Drizzle, Better Auth, R2, KV, realtime, Queues, cron, Workflows, Workers AI, Resend, Stripe, Sentry, PostHog and Basin.

| Directory                                                           | What to inspect                                                                  |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `full-stack/anhedral.json`                                          | Project identity, selection, provider settings, hosting and generated provenance |
| `full-stack/apps/web`                                               | Vinext web interface and a small source overview page                            |
| `full-stack/apps/api`                                               | Hono/OpenAPI API, Better Auth handlers and service bindings                      |
| `full-stack/apps/realtime`                                          | Durable Object realtime rooms                                                    |
| `full-stack/apps/jobs`                                              | Queue consumers and dead-letter recovery                                         |
| `full-stack/apps/scheduled`                                         | Cron Worker                                                                      |
| `full-stack/apps/workflows`                                         | Workflow Worker                                                                  |
| `full-stack/packages/db`                                            | Reusable database factory, schema, migration entrypoint and reviewed SQL         |
| `full-stack/packages/auth`                                          | Shared Better Auth factory                                                       |
| `full-stack/packages/ui`                                            | Shared UI and an example service card                                            |
| `full-stack/packages/{email,billing,observability,analytics,basin}` | Integration factories                                                            |
| `full-stack/docs/stack.md`                                          | Resolved capabilities, packages, environment names and setup requirements        |

The historical `full-stack` example is source only. Nothing has been provisioned or shipped, no provider account is connected, and environment files contain placeholders. Dependency installation and lockfile resolution are intentionally incomplete; `doctor` reports the missing lockfile. Queues and Basin select the supported Wrangler delivery path for this combination.

See [generation notes](full-stack/docs/example.md) for the source provenance and selected CLI flags. Its Vinext interface is an explicit compatibility selection, not the current universal default.
