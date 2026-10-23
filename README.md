# Anhedral

Anhedral is open source under the [Apache License 2.0](LICENSE).
Generated applications are editable source that developers can customize and license for their products.

One command creates one stack:

- **Expo** for web, iOS and Android, with React Native Reusables and NativeWind.
- **Hono** on Cloudflare Workers for application APIs and authorization.
- **Drizzle / D1** for SQL persistence and explicit migrations.
- **Private R2** for authenticated, owner-scoped files.
- Supporting Better Auth sessions, public contracts and shared styling.

The only optional additions are **Stripe** for web billing and **RevenueCat** for native purchases. They can be selected independently or together. Provider accounts, activation, product configuration and acceptance remain explicit work.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/anhedral-stack.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/assets/anhedral-stack-light.png">
  <img alt="Expo web, iOS and Android connect to Hono, Drizzle/D1 and private R2. Stripe and RevenueCat are optional payment additions." src="docs/assets/anhedral-stack-light.png" width="1200">
</picture>

The commands below target the 0.14 release. Until it is published, build this repository with `pnpm install && pnpm build` and use `node /path/to/anhedral-cli/dist/bin.js` in place of `anhedral`.

```sh
pnpm dlx anhedral@0.14.0 init my-app
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

Deployable applications live in `apps/mobile` and `apps/api`; shared contracts, database, auth and styling live in `packages`. The API owns data access and authorization. Clients never receive provider management credentials.

Read the [stack standard](docs/stack-standard.md), [development and delivery workflow](docs/software-factory.md), [architecture diagram](docs/anhedral-stack.md), and [verification record](docs/verification.md).

Version 0.14 is a deliberate breaking scope reduction. Alternative frontends, databases, hosting engines, media/AI/background-service recipes and generic integration stubs were retired. Existing applications are not automatically migrated or reinitialized; retain their pinned older CLI until a reviewed migration is available. Historical versions remain in Git history and release tags.
