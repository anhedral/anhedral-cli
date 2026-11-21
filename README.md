# Anhedral CLI

> [!WARNING]
> **Under heavy construction.** CLI commands and generated app code may change.

Build an app one addition at a time. Generated applications are editable source. Start with a TanStack Start web app and ShadCN components. Add a backend when you need an API, authentication, or a database. Then choose storage, payments, or both.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/anhedral/anhedral-cli/v0.24.1/docs/assets/anhedral-stack.png">
  <img src="https://raw.githubusercontent.com/anhedral/anhedral-cli/v0.24.1/docs/assets/anhedral-stack-light.png" alt="The CLI creates a TanStack Start web app. The optional backend supports private file storage and subscription payments. An Expo client with Anhedral UI is upcoming.">
</picture>

**Upcoming** — `pnpm dlx anhedral@latest add cross-platform` will add an Expo client with Anhedral UI.

## How to use

Start with the web app and stop at the stage you need. Storage and payments each require the backend and can be added independently.

```sh
# Create the web app
pnpm dlx anhedral@latest init my-app
cd my-app

# Add an API, authentication, and a database
pnpm dlx anhedral@latest add backend

# Add private file storage
pnpm dlx anhedral@latest add storage

# Add subscription payments
pnpm dlx anhedral@latest add payment
```

Run `pnpm dev` in the project directory to start the app. If you added services, configure them first. [Service setup](docs/capabilities.md) · [Source snapshot for each stage](https://github.com/anhedral/anhedral-cli/tree/v0.24.1/examples)

Upgrading from 0.22.1? Replace `add r2` with `add storage` and `add stripe` with `add payment`. Existing projects keep their R2 and Stripe configuration.

### Command reference

Use `pnpm dlx anhedral@latest <command>`. For arguments and flags, run `pnpm dlx anhedral@latest help <command>`.

| Task | Commands |
| --- | --- |
| Generate source | `init`, `add` |
| Inspect or update the stack | `stack list`, `stack status`, `stack doctor`, `stack update` |
| Manage your session | `login`, `whoami`, `logout` |
| Connect a project | `projects list`, `projects create`, `link`, `unlink` |
| Upload source | `source upload`, `source status` |
| Configure environment variables | `env list`, `env set`, `env import` |
| Prepare a deployment | `deploy plan`, `deploy prepare`, `deploy status` |
| Deploy to staging | `staging deploy`, `staging status` |
| Publish to production | `production deploy`, `production status` |
| Read runtime logs | `logs` |
| Get help and shell completions | `help`, `--version`, `completion bash`, `completion zsh` |

Use the CLI directly or through the Codex and Claude Code plugin. To host on Anhedral, sign in, link a project, upload source, and deploy. [Platform workflow](docs/software-factory.md) · [Stack reference](docs/stack-standard.md)

Apache-2.0. Retain the included third-party notices when distributing generated source.
