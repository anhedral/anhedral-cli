# Selected stack

Generated from the bundled Anhedral 0.11.1 registry. Project configuration lives in anhedral.json; setup and registry record the current selection and generated source, providers holds integration settings, and cloudflare/vercel hold selected hosting configuration. This document is refreshed by add. Keep product decisions in docs/architecture.md and acceptance evidence in docs/verification.md.

These are scaffolds and integration boundaries. Provider access, migrations, authorization and live behavior require the setup and checks listed below.

## Local Worker ports

| Application | HTTP | Inspector |
| --- | --- | --- |
| api | 8787 | 9231 |
| realtime | 8788 | 9232 |
| jobs | 8789 | 9233 |
| scheduled | 8790 | 9234 |
| workflows | 8791 | 9235 |

## workspace

pnpm workspace with one root lockfile, pinned Turborepo and shared checks.

Targets: `package.json`, `pnpm-workspace.yaml`, `turbo.json`.

## typescript

Shared TypeScript configuration.

Targets: `packages/typescript-config`.

## eslint

Shared ESLint configuration.

Targets: `packages/eslint-config`.

## hono

Shared Hono OpenAPI Worker.

Targets: `apps/api`.

Required setup:

- API Worker; application routes and authorization

Verify before delivery:

- Contract validation, unauthenticated rejection and resource ownership

## posthog

Server-side product analytics factory.

Targets: `packages/analytics`.
Environment: `POSTHOG_API_KEY`, `POSTHOG_HOST`.

Required setup:

- Analytics client factory; implement consent, event schema and privacy filtering

Credentials:

- POSTHOG_API_KEY; POSTHOG_HOST; separate privileged key if needed

Verify before delivery:

- Event receipt, consent behavior and redaction of private data

## basin

Cloudflare analytical stream binding and event helper.

Targets: `packages/basin`.

Worker configuration:

```json
{
  "pipelines": [
    {
      "binding": "ANALYTICS",
      "stream": "REPLACE_WITH_BASIN_STREAM_ID"
    }
  ]
}
```

Required setup:

- Basin dataset/stream, ANALYTICS binding, optional private R2 sink and authorized sink writes

Verify before delivery:

- Private ingestion, event delivery, query results and archive retrieval when selected

## d1

Reusable Drizzle D1 database package and explicit migration tooling.

Targets: `packages/db`, `apps/api`.

Worker configuration:

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "full-stack-db",
      "database_id": "REPLACE_WITH_D1_ID",
      "migrations_dir": "../../packages/db/drizzle"
    }
  ]
}
```

Required setup:

- D1 database, DB binding and reviewed migrations

Verify before delivery:

- Migration, constraints, transactional behavior and runtime queries

## better-auth

Database-backed identity schema and runtime routes.

Targets: `packages/auth`, `packages/db`, `apps/api`.
Environment: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

Required setup:

- Selected Neon or D1 database, auth schema, trusted origins and application routes

Credentials:

- BETTER_AUTH_SECRET; BETTER_AUTH_URL

Verify before delivery:

- Sign-in/out, session expiry, sign-up policy and resource authorization

## cron

Scheduled Worker.

Targets: `apps/scheduled`.

Required setup:

- Scheduled Worker and environment-specific Cron Triggers

Verify before delivery:

- Schedule, idempotency, failure visibility and overlapping runs

## kv

Eventually consistent cache binding.

Targets: `apps/api/wrangler.jsonc`.

Worker configuration:

```json
{
  "kv_namespaces": [
    {
      "binding": "CONFIG",
      "id": "REPLACE_WITH_KV_ID"
    }
  ]
}
```

Required setup:

- KV namespace and CONFIG binding

Verify before delivery:

- TTL and propagation behavior; never use KV as transactional authority

## queues

Queue producer binding, consumer and dead-letter handling.

Targets: `apps/jobs`, `apps/api/wrangler.jsonc`.

Worker configuration:

```json
{
  "queues": {
    "producers": [
      {
        "binding": "JOBS",
        "queue": "full-stack-jobs"
      }
    ]
  }
}
```

Required setup:

- Queue, producer/consumer bindings and failure handling

Verify before delivery:

- Retries, idempotency, concurrency and dead-letter recovery

## r2

Private file binding and authorization guidance.

Targets: `apps/api/private-files.md`.

Worker configuration:

```json
{
  "r2_buckets": [
    {
      "binding": "FILES",
      "bucket_name": "full-stack-private-files"
    }
  ]
}
```

Required setup:

- Private R2 bucket and FILES binding; authorized upload/download endpoints

Verify before delivery:

- Public bucket access disabled; file ownership enforced; clients receive no storage credentials

## realtime

Durable Object room Worker with authorization boundary.

Targets: `apps/realtime`.

Required setup:

- Realtime Worker, Durable Object namespace/migration and WebSocket authorization

Verify before delivery:

- Authorized room isolation, disconnect/reconnect and deployed WebSockets

## resend

Server-side email SDK factory.

Targets: `packages/email`.
Environment: `RESEND_API_KEY`.

Required setup:

- Verified sending domain, sender and server integration

Credentials:

- RESEND_API_KEY; webhook secret when used

Verify before delivery:

- Delivery, suppression/bounce handling and webhook verification; inbound routing is separate

## sentry

Platform-specific monitoring integration boundary.

Targets: `packages/observability`.
Environment: `SENTRY_DSN`.

Required setup:

- Integration boundary; install/init runtime SDKs and configure private source-map uploads

Credentials:

- SENTRY_DSN; source-map upload token when required

Verify before delivery:

- Captured runtime errors, source maps, privacy filtering and alert delivery

## stripe

Server-side billing SDK factory.

Targets: `packages/billing`.
Environment: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

Required setup:

- Products/prices, signed webhooks and entitlement implementation

Credentials:

- STRIPE_SECRET_KEY; STRIPE_WEBHOOK_SECRET

Verify before delivery:

- Test purchase/cancellation, webhook replay and transactional idempotency

## ui

Shared shadcn/ui, React, Tailwind and Lucide foundation for web apps.

Targets: `packages/ui`.

## vinext

Vinext web application on Cloudflare Workers.

Targets: `apps/web`.

Required setup:

- Vinext React application and Cloudflare Worker

Verify before delivery:

- Web flows, accessibility, production Worker build and deployed preview

## workers-ai

Workers AI runtime binding.

Targets: `apps/api/wrangler.jsonc`.

Worker configuration:

```json
{
  "ai": {
    "binding": "AI"
  }
}
```

Required setup:

- AI binding and selected model invocation

Verify before delivery:

- Supported model behavior, authorization and usage limits

## workflows

Durable multi-step Worker.

Targets: `apps/workflows`.

Required setup:

- Workflow Worker/binding and resumable steps

Verify before delivery:

- Retry/resume, idempotency, cancellation and failure recovery
