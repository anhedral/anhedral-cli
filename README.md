# Anhedral CLI

> [!WARNING]
> **Under construction.** Anhedral CLI is under active development. Commands, generated source and integrations are evolving, and breaking changes are expected. Commands and source-generation details are documented below.

Anhedral CLI starts with TanStack Start server rendering/server functions and source-owned Anhedral UI. Add the Hono/Better Auth/Drizzle-D1 backend together when needed, then private R2 storage or Stripe subscriptions. The Platform launch is web-only; the broader open-source source catalog remains available outside launch support.

## Start a project

```sh
anhedral init my-app
cd my-app
```

Init creates `apps/web` and shared tooling, without an API, database, authentication, storage or payments. The web application includes source-owned shadcn Button, Input and Label components. Preview with `anhedral init my-app --dry-run --json`; `--skip-install --no-git` leaves dependency installation and Git setup to you.

Run `pnpm dev` to start the minimal web application. Add services progressively:

```sh
anhedral add backend --dry-run --json
anhedral add backend
anhedral add r2
anhedral add stripe
# Or include missing backend prerequisites in one planned addition:
anhedral add r2 stripe --with-dependencies
```

`add backend` atomically composes Hono, Better Auth and Drizzle/D1 into `apps/api` and `packages/db`. After adding it, copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars`, configure `PUBLIC_APP_URL` and a private `BETTER_AUTH_SECRET`, and follow the emitted README. Apply reviewed SQL deliberately to isolated local D1 with `pnpm db:migrate --local`. The same Vite process then serves the web Worker and auxiliary Hono Worker; R2 is local when selected. Builds and startup never migrate databases. Better Auth methods remain disabled until explicitly configured and enabled. After adding Stripe, generate and review its SQL with `pnpm db:generate`, then apply the migration before testing webhooks.

Generation creates no provider resources, live credentials or managed deployment. TanStack source composition uses version 2 and remains distinct from artifact/runtime acceptance and reviewed runtime pins. Matching Platform source/runtime integration is developed separately; local source support does not establish live hosted admission. Existing applications are not migrated. The exported legacy `scaffoldStandardProject` programmatic generator retains its Next.js/OpenNext behavior.

## Command help, scripts and shell completion

Run `anhedral --help` for a command index, then `anhedral help source upload`
or `anhedral source upload --help` for contextual options and examples. Init
accepts the directory before or after options. Use `--` to end option parsing;
for example, `anhedral init --dry-run --json -- -my-app` previews a literal
flag-looking directory. An explicit empty directory is rejected.

`--json` requests machine-readable results on stdout. Errors go to stderr as
`{error, code, nextAction}` with additive category/retryability information;
failures continue to exit 1. Post-commit errors include committed paths and explain
how to finish the failed follow-up without regenerating source. Human diagnostic
and progress messages do not enter JSON stdout.

Platform commands retain their compact JSON default for existing scripts. Use
`--human` for readable summaries, or keep `--json` explicit in automation.
`--quiet` suppresses ordinary output, including implicit Platform JSON, while
`--quiet --json` retains the requested JSON result. Errors remain visible.
`--non-interactive` prevents interactive approval polling; `login --resume` is
an explicit request to redeem an existing approval, including in CI. CI or a
redirected input/output stream never implies consent or starts a new polling flow.

Generate completion without network access or automatic shell-profile changes:

```sh
anhedral completion bash > ~/.anhedral-completion.bash
source ~/.anhedral-completion.bash
```

For zsh, generate `anhedral completion zsh > ~/.anhedral-completion.zsh`, initialize
completion with `autoload -Uz compinit && compinit`, then
`source ~/.anhedral-completion.zsh`. Add the source command to your shell profile
only if you want it enabled in future sessions. Completion includes local command,
capability and component names and file/directory arguments; it never discovers
remote projects or reads credentials.

## Link and upload source

Local staging includes browser-approved `login`, `link --project <uuid> --team <uuid>`,
`source upload`, `source status`, and `deploy plan|prepare|status`. Deployment
preparation runs an isolated build only after exact runtime admission; otherwise it awaits runtime. Platform access is disabled until separately
configured; upload never deploys or enables hosted admission. Run
`source upload --dry-run` offline to inspect the source archive. See
[Platform access and secure resumable upload](docs/software-factory.md#platform-cli-access-and-source-upload)
for credential storage, API origin selection and interruption recovery.

Manage linked-project configuration with `anhedral env list` or
`anhedral env import --environment staging --file .env.local --dry-run`.
Remove `--dry-run` to submit a private import after signing in and linking the
project. Files must be owner-only. Values never appear in CLI arguments, output
or saved retry state; production changes require Platform policy approval.
The optional plugin connects to Platform through OAuth for project tools and
browser-based secret imports. See [the Platform workflow](docs/software-factory.md#platform-cli-access-and-source-upload).
Use `anhedral staging status` or `anhedral staging deploy --candidate <uuid>` for
verified candidates, and `anhedral logs --environment staging --level error` for
redacted runtime events. Production release requests retain Platform approval.

## Source additions and launch scope

The starter includes only TanStack Start and Anhedral UI. `add backend` is a convenience selection for `hono` plus `database-auth`; installed state records those concrete capabilities. Use `anhedral stack status` or `anhedral stack doctor` to inspect source completeness, and `anhedral stack list` for the complete catalog. `add` plans editable source changes, protects customized composition adapters, and installs dependencies unless `--skip-install` is selected. Missing prerequisites require explicit selection or `--with-dependencies`.

| Launch source | State after init |
| --- | --- |
| TanStack Start and Anhedral UI | Included |
| Hono, Drizzle/D1 and Better Auth | Optional: `add backend` |
| Private R2 storage | Optional after backend: `add r2` |
| Stripe subscriptions | Optional after backend: `add stripe` |

Expo, native UI, RevenueCat, WXT/Side Panel, GPUI, events, RTC and AI recipes remain in the open-source catalog. These are outside the initial Platform launch's hosting, migration and testing promise. Legacy Next.js projects retain their progressive addition workflow; retaining a recipe does not establish compatibility with every foundation or provider readiness. See [the capability guide](docs/capabilities.md) for prerequisites, source protection and activation responsibilities.

## Anhedral UI

```sh
anhedral ui list
anhedral ui add card --web
anhedral ui diff card --web
anhedral ui doctor --web
```

Anhedral UI is a small catalog and CLI over official shadcn on web and React Native Reusables on native. Components are copied into your application. Native resolution prefers a reviewed Anhedral extension when one exists, then RNR; unsupported components are reported. You own and customize the installed source.

For an existing Expo app, complete the upstream React Native Reusables NativeWind 4 setup first, then use `anhedral ui init --native`. Ambiguous workspaces require `--web`, `--native`, `--all` or an application-specific `--cwd`.

Install additional components as needed with `anhedral ui add`. Use `ui list` to explore availability, `ui diff` to review changes and `ui doctor` to check setup. Legacy web/native projects can share semantic theme tokens while retaining separate component source. The launch starter is web-only.

## Documentation

See [stack standard](docs/stack-standard.md), [workflow](docs/software-factory.md), [UI commands](docs/ui.md) and [stack additions](docs/capabilities.md).

## Develop the CLI

For source development, run `pnpm install --frozen-lockfile && pnpm build`, then `node dist/bin.js init my-app`.

Apache-2.0. Generated applications are editable source that consumers may customize and license for their own products. Retain the applicable MIT notices for copied upstream UI source.
