# __APP_NAME__

A Turborepo workspace with a TanStack Start web application. Run `anhedral stack status` in this directory to see the installed clients and services.

## Run locally

Use the Node.js and pnpm versions declared in `package.json`. If you skipped installation during setup, run `pnpm install` first.

```sh
pnpm dev
```

Open http://localhost:3000. Edit `apps/web/src/routes/index.tsx` for the home page and `apps/web/src/routes/__root.tsx` for the shared layout. UI components live in `apps/web/src/components/ui`. You can use any UI library.

## Check your changes

```sh
pnpm check       # Lint, typecheck, test, and build
pnpm audit:deps  # Audit installed dependencies
```

## Add services

Select services individually or use `add backend` for the API, database and authentication together.

```sh
pnpm dlx anhedral@latest add api db auth  # Hono, Drizzle ORM on Neon Postgres and Better Auth
pnpm dlx anhedral@latest add storage  # Private files on R2
pnpm dlx anhedral@latest add payment  # Stripe subscriptions
```

After adding a service, follow the environment and migration instructions before running it locally. [Service setup](https://github.com/anhedral/anhedral-cli/blob/v__CLI_VERSION__/docs/capabilities.md#local-setup-and-validation)

## Update the stack

```sh
pnpm dlx anhedral@latest stack update --dry-run --human
```

Review the current and proposed dependency pins, lockfiles and source changes. Run the apply command printed by the preview, then run `pnpm install --frozen-lockfile` and `pnpm check`.
