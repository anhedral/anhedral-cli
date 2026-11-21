# Anhedral CLI

> [!WARNING]
> **Under heavy construction.** CLI commands and generated app code may change.

Build an app one addition at a time. Generated applications are editable source. Start with a TanStack Start web app and ShadCN components. Add a backend when you need an API, authentication, or a database. Then choose storage, payments, or both.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/anhedral/anhedral-cli/staging/docs/assets/anhedral-stack.png">
  <img src="https://raw.githubusercontent.com/anhedral/anhedral-cli/staging/docs/assets/anhedral-stack-light.png" alt="The CLI creates a TanStack Start web app. The optional backend supports private file storage and subscription payments. An Expo client with Anhedral UI is upcoming.">
</picture>

**Upcoming** — `anhedral add cross-platform` will add an Expo client with Anhedral UI.

## How to use

Create and run a web app locally without an account.

```sh
pnpm dlx anhedral@latest init my-app
cd my-app
pnpm dev
```

From the project directory, add a backend and list the available additions.

```sh
pnpm dlx anhedral@latest add backend
pnpm dlx anhedral@latest stack list
```

In the published 0.22.1 CLI, use `add r2` for storage and `add stripe` for payments. Use `--dry-run` to preview an addition. Compare the [example snapshots](https://github.com/anhedral/anhedral-cli/tree/staging/examples) or follow the [service setup guide](docs/capabilities.md) to configure providers and apply migrations.

Use the CLI directly or through the Codex and Claude Code plugin. To host on Anhedral, sign in, link a project, upload source, and deploy. [Platform workflow](docs/software-factory.md) · [Stack reference](docs/stack-standard.md)

Apache-2.0. Retain the included third-party notices when distributing generated source.
