# Anhedral CLI

> [!WARNING]
> Under construction. Commands, generated source and managed integration are evolving.

Generate the **Anhedral Stack** as editable source. Start with web UI, then add the backend, private storage and payments when needed. There is one current stack and one CLI generator; no stack selector or separate public stack registry is required.

## Start

```sh
anhedral init my-app
cd my-app
pnpm dev
```

Init creates `apps/web` and shared tooling with OJ and TanStack Start server rendering/server functions and source-owned Anhedral UI built on shadcn. It does not add an API, database, authentication, storage or payments. Preview with `anhedral init my-app --dry-run --json`; use `--skip-install --no-git` for offline source generation.

## Add services

```sh
anhedral add backend --dry-run --json
anhedral add backend
anhedral add r2
anhedral add stripe
```

`backend` adds Hono, Better Auth and Drizzle/D1 together in one source transaction. `r2` adds private storage; `stripe` adds subscriptions. Both require the backend. Include missing prerequisites explicitly with `anhedral add r2 stripe --with-dependencies`.

After adding backend, configure `apps/api/.dev.vars` from its example, review the initial SQL and apply it deliberately with `pnpm db:migrate --local`. The OJ development server then runs the web and auxiliary API Workers with local resources. Authentication methods start disabled and need explicit configuration. After adding Stripe, run `pnpm db:generate`, review the billing SQL and migrate before testing webhooks. Builds/startup never migrate databases or activate providers.

Use `anhedral stack list`, `status` and `doctor` to inspect the Anhedral Stack and its additions. These checks describe source completeness, not live provider readiness. Current public generation is web-only. OJ runs development and builds. Historical generators and framework aliases are removed.

## Update an existing project

Update your agent plugin through its host and select the matching published CLI version. Preview `anhedral stack update --dry-run --json`, review the returned diffs/conflicts, then apply `anhedral stack update --expect-plan <planId> --json`. Updates preserve authored source and stop on customized-file conflicts or a changed plan. They refresh generated runtime/configuration and deployment provenance without running project scripts or installing dependencies. Validate dependencies and the application separately before upload/deployment. See [the operating workflow](docs/software-factory.md).

## Source-owned UI

```sh
anhedral ui list
anhedral ui add card --web
anhedral ui diff card --web
anhedral ui doctor --web
```

UI commands operate on Anhedral Stack web applications. Components are editable source copied through the pinned official shadcn installer. Preserve local edits, semantic theme tokens and MIT attribution. See [UI ownership](docs/ui.md).

## Optional Platform access

Local generation requires no account. After browser-approved `login`, use `projects list --human` to discover projects and team IDs. Register your generated application with `projects create --name <name> --link --human`, or connect an existing project with `link --project <uuid> --team <uuid>`. `source upload --dry-run` inspects packaging without uploading; `source upload` sends a resumable immutable checkpoint.

`deploy plan --manifest <file>`, `deploy prepare` and `deploy status` submit intent and read candidate receipts. Platform independently checks current authority, exact artifacts and runtime admission. Upload/build success does not publish production. Plans report current runtime compatibility and actionable remediation; candidate preparation does not require another person to review the CLI artifact. The current manifest runtime profile is `anhedral-stack`; an application cannot approve itself for hosting.

`env list/import/set` manages variable metadata and private imports. Send values through an owner-only file or stdin, never command arguments or chat. `staging status/deploy` operates on ready candidates. `production status` reads production history; `production deploy --candidate <uuid> --name <slug>` requests publication with your existing production permissions, without a second approver for self-service teams. Explicit independent-review team policy remains enforced; `logs` reads redacted runtime events. The Codex and Claude Code plugin provides CLI usage guidance; authentication and managed project operations run through the CLI. See [the operating workflow](docs/software-factory.md#platform-cli-access-and-source-upload).

## Help and automation

Run `anhedral --help` or `anhedral help <command>` for contextual examples. Use `--json` for machine-readable stdout, `--quiet` to suppress ordinary output, and `--non-interactive` to avoid approval polling. Platform retains compact JSON by default; `--human` selects readable summaries. Errors remain on stderr with a numeric failure status and recovery guidance.

```sh
anhedral completion bash > ~/.anhedral-completion.bash
# Or print zsh completion without changing your shell profile:
anhedral completion zsh
```

## Development and ownership

Use `pnpm install --frozen-lockfile`, `pnpm build` and focused tests when developing this repository. Generated applications use the versions recorded in their manifests. Run their `pnpm check` and `pnpm audit:deps` before deployment. Existing applications are never reinitialized or silently migrated.

See [stack conventions](docs/stack-standard.md), [additions](docs/capabilities.md), [UI](docs/ui.md) and [workflow](docs/software-factory.md).

Apache-2.0. Generated applications are editable source that consumers may customize and license for their products. Retain applicable MIT notices for copied upstream UI source.
