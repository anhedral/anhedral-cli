# Anhedral

Anhedral is open source under the [Apache License 2.0](LICENSE).
Generated applications are editable source that developers can customize and license for their products.

One command creates one stack:

- **Next.js App Router** for the web, with DOM shadcn UI and Cloudflare OpenNext.
- **Expo** for iOS and Android, with the Anhedral-maintained native shadcn port using StyleSheet and shared tokens.
- **Hono** on Cloudflare Workers for application APIs and authorization.
- **Drizzle / D1** for SQL persistence and explicit migrations.
- **Private R2** for authenticated, owner-scoped files.
- Supporting Better Auth sessions, shared public contracts and design tokens.

The only optional additions are **Stripe** for web billing and **RevenueCat** for native purchases. They can be selected independently or together. Provider accounts, activation, product configuration and acceptance remain explicit work.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/anhedral-stack.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/anhedral-stack-light.png">
  <img alt="Next.js web and Expo iOS/Android connect to Hono, Drizzle/D1 and private R2. Stripe and RevenueCat are optional payment additions." src="docs/assets/anhedral-stack-light.png" width="1200">
</picture>

CLI 0.15 is a source preview and is not yet published to npm. Build this repository
with `pnpm install --frozen-lockfile && pnpm build`, then use its local CLI.
For the examples below, replace `anhedral` with `node /path/to/anhedral-cli/dist/bin.js`
until the matching version is published.

```sh
node /path/to/anhedral-cli/dist/bin.js init my-app
cd my-app
pnpm dev
```

Initialization writes source locally, installs dependencies and initializes Git unless requested otherwise. Generation does not create cloud resources, apply remote migrations or deploy.

```sh
anhedral init my-app --dry-run --json
anhedral init my-app --stripe --revenuecat
anhedral add stripe --cwd my-app --dry-run --json
anhedral add stripe --cwd my-app
```

Use `--skip-install --no-git` for source-only generation. This mode requires no network. Keep the project CLI version pinned before applying additions; edited-source conflicts are preserved rather than overwritten.

Deployable applications live in `apps/web`, `apps/mobile` and `apps/api`; shared contracts, database, auth and styling live in `packages`. The API owns data access and authorization. Clients never receive provider management credentials.

Read the [stack standard](docs/stack-standard.md), [development and delivery workflow](docs/software-factory.md), [architecture diagram](docs/anhedral-stack.md), and [verification record](docs/verification.md).

Version 0.15 separates Next.js web from Expo native. Web uses the full App Router with SSR and React Server Components through OpenNext; Expo has no browser build. The focused catalog retains only Stripe and RevenueCat additions. Existing applications are not automatically migrated or reinitialized; retain their pinned older CLI until a reviewed migration is available. Historical versions remain in Git history and release tags.
