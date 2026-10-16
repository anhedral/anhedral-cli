# Anhedral

[![CI](https://github.com/anhedral/anhedral-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/anhedral/anhedral-cli/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/anhedral)](https://www.npmjs.com/package/anhedral)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

Anhedral scaffolds source code, guides authentication, then provisions, configures, and deploys the supported stack wherever provider APIs allow.

You own the code, provider accounts, infrastructure, data, and billing. The CLI provides the foundation and delivery tools; application features remain development work. Anhedral offers feature development and ongoing maintenance for businesses that want that work delivered for them.

## Get started

Supported Cloudflare workspaces use Void 0.27.0 and require Node.js 24.21.0+ and pnpm 10.34.5. Explicit OpenNext, Queues and Basin selections use Wrangler. Other workspace profiles require Node.js 22.13+ on 22.x or Node.js 24+. Initialize on Linux, macOS, or WSL.

Void owns Cloudflare provisioning, secret uploads and deployment. Anhedral retains stack composition, shared packages, customer ownership and independent release/product verification. Explicit OpenNext, Queues and Basin profiles use Anhedral’s Wrangler delivery path. Initialization creates source without deploying it.

```sh
npm install --global anhedral

# Preview the stack without creating project files or cloud resources
anhedral init my-app --dry-run --json

# Generate a project and start development
anhedral init my-app
cd my-app
pnpm dev
```

You can also run the CLI with `pnpm dlx anhedral@latest`. Initialization downloads the upstream shadcn starter and installs dependencies; it does not create cloud resources or deploy your app.

## Choose your stack

The default is **Vinext, React, TypeScript, Tailwind, shadcn/ui, and Lucide on Cloudflare Workers**, organized as a pnpm/Turborepo monorepo.

| Application | Option |
| --- | --- |
| Web on Cloudflare Workers | Default |
| Native Next.js on Vercel | `--next` |
| Mobile with Expo | `--expo` |
| Desktop with Electron | `--electron` |
| Browser extension with WXT | `--wxt` |
| Shared API with Hono | `--hono` |

Add capabilities when needed: D1 or Neon for data, Better Auth or Clerk for identity, R2 for files, and selected AI, billing, email, analytics, or background services.

```sh
anhedral init my-app --d1 --better-auth
anhedral init mobile-app --expo
anhedral init product --next --hono --d1 --r2
anhedral registry list
anhedral registry view resend --json
```

Optional `--neon-realtime` adds Neon live SQL foundations with separate server/client exports in `packages/neon-realtime`; it selects Neon and needs a server runtime. `--realtime` remains Cloudflare Durable Object WebSocket rooms. Neon Realtime is beta: enable the intended branch, allowed origins and secret manually, then implement authenticated, scoped query sealing and subscriptions. Initialization does not provision or verify Realtime. See the [stack standard](docs/stack-standard.md#neon-realtime).

The project keeps Anhedral metadata in one committed root `anhedral.json`, with named sections for identity, stack selection, registry provenance, integrations and selected hosting. Credentials and delivery history remain in ignored runtime files and `.anhedral/`.

The bundled registry contains recipes maintained and tested by Anhedral. Generated source belongs to your project and stays editable. External registries are unsupported. Preview additions before applying them:

```sh
anhedral add resend stripe --cwd my-app --dry-run --json
anhedral add resend stripe --cwd my-app
```

See the [stack standard](docs/stack-standard.md) for supported combinations and architecture guidance.

## Authenticate and ship

Implement your app, configure its selected services, review migrations, and commit the source before delivery. The generated README explains the remaining setup. Run these commands from your project directory.

```sh
anhedral auth
anhedral auth --status --json
anhedral connect --audience private --allow-email owner@example.com
anhedral ship --dry-run --json
anhedral ship --json
anhedral verify --json
```

Replace the example email with the intended member. Private Workers hosting requires Cloudflare Zero Trust and the necessary Access permissions. Authentication does not establish every provisioning permission or complete service setup.

For Wrangler profiles, changed resource IDs stop `ship` before deployment for review and a commit. Void can activate a target before recording new resource identities in `void.lock.json`; it then returns `configuration-required` with the activation receipts retained. Review and commit those locks, then ship the clean configuration. It never commits source automatically. Shipping runs project checks and records delivery results. `verify` exercises your application's live acceptance test; a successful scaffold or deployment alone does not prove its features work.

Provider eligibility, subscriptions, usage limits, and charges remain your responsibility. Some setup requires owner action. Expo delivery returns EAS build links; it does not submit apps to stores.

See [delivery and recovery](docs/delivery-workflow.md) and [provider configuration](docs/provider-configuration.md) for account selection, deployment, migration, rollback, and integration requirements.

## Use with Codex

```sh
codex plugin marketplace add anhedral/anhedral-cli
codex plugin add anhedral@anhedral
```

Select **Try now**, or start with:

> Create a new project using [@Anhedral](plugin://anhedral@anhedral). Start by explaining the stack and asking me what it should be about.

The plugin guides stack selection, feature development, setup, and verification. Its optional inspector displays local stack, setup, and recorded delivery evidence. It does not monitor live health or perform provisioning when opened. The CLI also works independently.

## Commands and documentation

Use `anhedral --help` or `anhedral help <command>` for options and examples. `--cwd` selects a project; `--json` provides structured output.

- [CLI usage](docs/cli-design.md)
- [Stack standard](docs/stack-standard.md)
- [Delivery and recovery](docs/delivery-workflow.md)
- [Provider configuration](docs/provider-configuration.md)
- [Plugin development](docs/plugin-ui.md)

## Development and contributions

```sh
pnpm install --frozen-lockfile
pnpm test:all
pnpm test:integration
```

The root test command reuses a verified inspector runtime or installs its frozen dependencies and builds it when missing/stale. Preparing that runtime requires Node 22.13+ on 22.x or Node 24+; older CLI test lanes consume the verified CI runtime artifact. For inspector-specific checks, run `pnpm --dir plugins/codex/inspector install --frozen-lockfile` and `pnpm plugin:check`. Development builds require matching CLI and plugin versions; they do not update installed releases automatically.

Focused fixes, tests, and documentation contributions are welcome. See [contributing](https://github.com/anhedral/anhedral-cli/blob/main/.github/CONTRIBUTING.md), [code of conduct](https://github.com/anhedral/anhedral-cli/blob/main/.github/CODE_OF_CONDUCT.md), and [security reporting](https://github.com/anhedral/anhedral-cli/blob/main/.github/SECURITY.md). Report reproducible problems in [issues](https://github.com/anhedral/anhedral-cli/issues) and vulnerabilities through [private reporting](https://github.com/anhedral/anhedral-cli/security/advisories/new).

Anhedral is open source under the [Apache License 2.0](LICENSE). Generated applications are source code that developers can customize and license for their products, preserving applicable upstream notices.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src` | CLI and application scaffolding |
| `plugins/codex/inspector` | Optional project inspector and MCP runtime sources |
| `plugins/codex/distribution` | Plugin manifest, assets, skill and bundled runtime |
| `scripts`, `tests` | Build, release and verification tooling |
| `docs` | Canonical architecture, delivery and development documentation |

Run CLI commands from the repository root. `pnpm plugin:build`, `pnpm plugin:check` and `pnpm plugin:preview` delegate to the inspector application. The inspector owns its own dependencies and lockfile. Its build copies the bundled server and dashboard into `plugins/codex/distribution/runtime`; release packaging includes only the distribution directory. Shared project and provider logic stays in `src` so the CLI and plugin use the same implementation.
