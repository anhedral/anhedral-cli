# full\-stack

Initialized from the official shadcn pnpm/Turborepo monorepo, with the Anhedral Application Stack & Delivery Standard.

Initial selection: basin, better-auth, cron, d1, hono, kv, posthog, queues, r2, realtime, resend, sentry, stripe, vinext, workers-ai, workflows. Project configuration is recorded in anhedral.json: identity, setup, standard, registry, providers, and the selected cloudflare/vercel hosting sections. Current selections and additions are summarized in [docs/stack.md](docs/stack.md). Vinext App Router on Cloudflare Workers.

Run pnpm install, commit pnpm-lock.yaml, then pnpm dev. Run pnpm check for lint, types, Fallow audit, tests and build. Without a Git comparison base, audit runs the full Fallow gate. Add meaningful product tests and integration checks as behavior is implemented. The tests task runs only workspaces that define tests; init does not claim product verification.

Build with pnpm build, then pnpm --dir apps/web preview to exercise the production Worker. Vinext provides a Next-compatible API surface; native Next.js is an explicit framework option. Initialization does not provision infrastructure or deploy.

Security gate: pnpm audit:deps preserves the standard pnpm audit JSON in .anhedral-audit-report.json and blocks high or critical findings except the two exact verified braces/node-forge mitigations. Resolve findings through compatible upstream dependency updates. If the lock contains braces@3.0.3, Anhedral supplies a temporary exact-version pnpm patch in patches/ and records it in pnpm-workspace.yaml. It bounds nesting to 100 and rejects cyclic AST traversal; commit the patch and updated lock. When node-forge@1.4.0 occurs, a second exact patch fixes RSA DigestAlgorithm/NULL validation in the Node source and both shipped browser bundles. Only GHSA-vfj7-8cjw-p6xm for patched braces@3.0.3 and GHSA-86w9-cpqp-85rv for patched node-forge@1.4.0 can pass after verifying the exact advisory and version, effective pnpm patch map, and patch SHA-256. Runtime regressions across the affected entrypoints run in the Anhedral CLI repository tests. Upstream findings stay visible; missing or altered patch configuration and unrelated high/critical findings block delivery.



packages/db/src owns the reusable database factory, schema and migration entry point. Generated SQL lives in packages/db/drizzle; the config resolves paths from its own directory. Run pnpm db:generate, review SQL, then pnpm db:migrate. These tasks are uncached and separate from application builds. D1 defaults to local; pass -- --remote explicitly for the selected Worker database. Browser and native interfaces use an API, never database credentials.

Core Better Auth tables are included in the Drizzle schema. Review and apply migrations before using /api/auth. Configure BETTER_AUTH_SECRET, BETTER_AUTH_URL and trusted origins for the correct environment.


FILES is a private R2 binding. Implement authentication and file-level authorization before exposing file routes. Clients never receive R2 credentials.

Durable Object rooms support hibernating WebSockets; the public entrypoint remains disabled until room authorization and short-lived tickets are implemented.

Queue processing retries unimplemented jobs and uses a dead-letter queue. Add product processing and transactional idempotency before acknowledging messages.

Basin uses a Pipelines stream binding. Configure its stream, sink, R2/catalog and SQL in client-owned infrastructure; it is distinct from operational logs.


The root pnpm test command runs workspace test tasks; no application tests or test:live script are generated. Implement them for the product before verification.

Provider packages are SDK factories or integration boundaries, not finished business features. Connect only needed packages to server entrypoints. Billing needs verified webhooks and idempotent consumption; RevenueCat adds cross-store entitlement configuration. Local data needs a platform-specific SQLite/filesystem adapter. Sentry needs a platform SDK and runtime initialization. Native auth and subscriptions need platform-specific setup.

When the product needs a domain, purchase it in the client's GoDaddy account, then add its zone to the client's Cloudflare account and configure Cloudflare nameservers. The client retains registration, renewal, billing and recovery ownership. Verify DNS records and zone activation before connecting application domains and mail. Inbound mail uses Cloudflare Email Routing. Outbound business and application mail defaults to Cloudflare Email Sending; Resend is an alternative when selected. Configure the selected mail provider before use; init does not provision domains or mail services. GitHub Actions runs PR checks and never deploys automatically. Respect existing authorization; request only missing approval for paid activation, material spending, architecture changes or release.
