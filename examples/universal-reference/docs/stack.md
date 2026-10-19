# Selected stack

Generated from the bundled Anhedral 0.12.0 registry. Project configuration lives in anhedral.json; setup and registry record the current selection and generated source, providers holds integration settings, and cloudflare/vercel hold selected hosting configuration. This document is refreshed by add. Keep product decisions in docs/architecture.md and acceptance evidence in docs/verification.md.

These are scaffolds and integration boundaries. Provider access, migrations, authorization and live behavior require the setup and checks listed below.

## Local Worker ports

| Application | HTTP | Inspector |
| --- | --- | --- |
| api | 8787 | 9231 |

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

## d1

Reusable Drizzle D1 database package and explicit migration tooling.

Targets: `packages/db`, `apps/api`.

Worker configuration:

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "universal-reference-db",
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

## styling

Shared platform-independent styling tokens.

Targets: `packages/styling`.

Required setup:

- Shared light/dark tokens and Tailwind v3 preset for Expo/WXT; adapt platform typography and components

Verify before delivery:

- Consistency across selected interfaces; preserve platform-specific components

## expo

Universal Expo web, iOS and Android client with a Cloudflare asset/API gateway.

Targets: `apps/mobile`.
Environment: `EXPO_PUBLIC_API_URL`.

Required setup:

- Expo universal client, Cloudflare web assets/API gateway; native adapters, signing and store configuration

Credentials:

- Platform signing credentials; EAS access when used

Verify before delivery:

- Native simulator/device flows and signed native build; web export alone is insufficient

## better-auth

Database-backed identity schema and runtime routes.

Targets: `packages/auth`, `packages/db`, `apps/api`, `apps/mobile`.
Environment: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

Required setup:

- Selected Neon or D1 database, auth schema, trusted origins and application routes

Credentials:

- BETTER_AUTH_SECRET; BETTER_AUTH_URL

Verify before delivery:

- Sign-in/out, session expiry, sign-up policy and resource authorization
