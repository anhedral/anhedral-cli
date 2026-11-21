# example-app

A TanStack Start web app with editable ShadCN components.

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

Run the backend command first, then add storage or payment as needed.

```sh
pnpm dlx anhedral@latest add backend  # Hono, Better Auth, and Drizzle/D1
pnpm dlx anhedral@latest add storage  # Private files on R2
pnpm dlx anhedral@latest add payment  # Stripe subscriptions
```

After adding a service, follow the environment and migration instructions before running it locally. [Service setup](https://github.com/anhedral/anhedral-cli/blob/v0.24.1/docs/capabilities.md#local-setup-and-validation)

## Update the stack

```sh
pnpm dlx anhedral@latest stack update --dry-run --human
```

Review the diff and run the version-pinned apply command it prints. Then run `pnpm install` and `pnpm check`.
