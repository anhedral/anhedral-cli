# Anhedral Stack additions

There is one current **Anhedral Stack**. `anhedral init` creates its web foundation with TanStack Start SSR/server functions and source-owned shadcn Anhedral UI. Add the remaining services only when needed.

```sh
anhedral init my-app
cd my-app
anhedral add backend --dry-run --json
anhedral add backend
anhedral add r2 stripe
anhedral stack status --json
```

| Selection | Source added | Requires |
| --- | --- | --- |
| `backend` | Hono API, Drizzle/D1, Better Auth and web sign-in starter | Anhedral Stack web foundation |
| `r2` | Private storage binding and authenticated owner-scoped file routes | `backend` |
| `stripe` | Subscription Checkout, signed webhooks and canonical entitlement checks | `backend` |

`backend` is one public selection; its provenance records the concrete Hono and database/auth capabilities. Use `--with-dependencies` to include missing prerequisites in the same planned source transaction. `stack list` describes this stack's additions. `status`/`doctor` check source completeness, not live service activation.

## Source protection

Additions never reinitialize an application. They plan all selected changes before writing, reject collisions and preserve unrelated JSON/JSONC settings. Composition adapters are fingerprinted in `anhedral.json`; modified adapters require reconciliation instead of silent replacement. Add product routes in `apps/api/src/index.ts`, custom types in `custom-environment.ts`, and auth method configuration in `auth-features.ts`/`auth.ts`.

Journaled transactions preserve recovery evidence and refuse ambiguous recreated files. Dependency installation follows source commit; a post-commit install failure keeps source for repair/retry. Reviewed dependency patches precede the frozen install. `--skip-install` writes source only. `--dry-run` performs no writes or network requests. Repeating an addition preserves source; normal installation may still retry dependencies.

There is no implicit capability removal or resource/data deletion. Existing applications retain their source and identity. Only the OJ/TanStack Start foundation and these three additions are supported.

## Local setup and validation

Minimal `pnpm dev` runs the web Worker. After backend is added, Vite also runs its auxiliary Hono Worker in the same process using isolated local D1 and optional R2. Copy `apps/api/.dev.vars.example` to `.dev.vars`; configure `PUBLIC_APP_URL` and a private `BETTER_AUTH_SECRET`. Never put server secrets in web/public variables.

Review initial SQL, then deliberately run `pnpm db:migrate --local`. For later schema additions, run `pnpm db:generate`, inspect the SQL and apply it explicitly. Remote migration requires deliberate `--remote` selection. Builds, startup and ordinary checks never migrate a configured database.

Better Auth methods start disabled. Configure credentials, email/policy, schema and client flows before enabling chosen methods. The sign-in page is an example, not automatic activation. R2 remains private and file routes enforce authenticated ownership.

Stripe adds source/schema, not a live payment service. Generate and review its billing migration before webhook tests. Configure test credentials, allowed prices and signed webhooks deliberately. Server-side canonical provider state controls entitlements; redirects, client claims and webhook ordering do not grant access. Live mode and real charges require separate activation.

## Source and hosting contracts

`anhedral.json` records nonsecret generator/capability versions and identity. Source provenance never grants hosting authority. The public deployment manifest uses runtime profile `anhedral-stack` for the web foundation and selected backend/R2/Stripe composition. Artifact identity, resource provisioning, secrets, migrations, runtime checks and production approval remain server-owned. See [the workflow](software-factory.md#platform-cli-access-and-source-upload).

Run `pnpm check` and `pnpm audit:deps` in generated applications. Framework/runtime, provider and browser acceptance are distinct; source installation alone establishes none of them.
