# Anhedral

[![CI](https://github.com/anhedral/anhedral-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/anhedral/anhedral-cli/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/anhedral)](https://www.npmjs.com/package/anhedral)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

Anhedral creates TypeScript application workspaces and helps deliver them to your own cloud accounts. Start with a web app, add the interfaces and services your product needs, and keep the source code, infrastructure, data and billing under your control.

The default is **Vinext, React, Tailwind, shadcn/ui and Lucide on Cloudflare Workers**, with pnpm and Turborepo. The CLI generates the foundation and handles supported setup and delivery operations. You or your coding agent implement the product.

## Start locally

Use **Node.js 24.21.0 or newer** and **pnpm 10.34.5**. Initialize on Linux, macOS or WSL.

```sh
npm install --global anhedral

# Inspect the default selection; no writes or network requests.
anhedral init my-app --dry-run --json

# Generate source, install dependencies and start development.
anhedral init my-app
cd my-app
pnpm dev
```

Initialization downloads the pinned upstream starter and installs dependencies. It does not provision cloud services or deploy the app. Follow the generated README for local addresses and any setup required by your selection. You can also run the CLI with `pnpm dlx anhedral@latest`; pin a version for repeatable automation.

## Defaults

Plain `anhedral init my-app` creates a Vinext web application. It includes no database, application identity provider, billing, email or analytics service.

| Area          | Default                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------- |
| Application   | Vinext and React on Cloudflare Workers                                                          |
| UI            | TypeScript, Tailwind, shadcn/ui conventions and Lucide                                          |
| Workspace     | pnpm workspaces and Turborepo, even for one application                                         |
| Tooling       | Shared TypeScript and ESLint configuration packages; root checks and dependency audit           |
| Delivery      | Void for supported Cloudflare selections                                                        |
| Source        | Deployable code in `apps/*`, reusable code in `packages/*`                                      |
| Configuration | One root `anhedral.json` and `pnpm-lock.yaml`; secrets and local delivery history stay separate |

The registry has four foundation entries: `workspace`, `typescript`, `eslint` and `ui`. The first three accompany every project; the shared UI foundation accompanies web applications.

## Choose the applications

Combine these flags after `anhedral init my-app`. Vinext and Next.js are alternatives; web, API, mobile, desktop and extension applications can otherwise coexist.

| Selection                     | Generates                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| Default, or `--vinext`        | Vinext web application on Cloudflare Workers                                        |
| `--next`                      | Native Next.js web application on Vercel                                            |
| `--next --hosting=cloudflare` | Next.js on Workers through OpenNext                                                 |
| `--hono`                      | Shared Hono API Worker with OpenAPI/Zod contracts                                   |
| `--expo`                      | Expo/React Native, Expo Router, NativeWind and React Native Reusables configuration |
| `--electron`                  | Electron/React desktop application, Vite and packaging configuration                |
| `--wxt`                       | WXT/React Chrome side-panel extension                                               |

Explicit application flags replace the default application selection. `--expo` generates mobile alone; `--vinext --expo` selects both. If you select only add-ons, such as `--neon`, the resolver includes a default web application. Use web server routes for a web-only backend, or select Hono for an API shared by several clients.

## Choose data and identity

| Selection       | Generates                                                             | Selection rule                                        |
| --------------- | --------------------------------------------------------------------- | ----------------------------------------------------- |
| `--d1`          | Shared Drizzle/SQLite database package and migrations                 | Cloudflare runtime; alternative to Neon               |
| `--neon`        | Shared Drizzle/PostgreSQL package using Neon HTTP                     | Server required; separate direct migration connection |
| `--better-auth` | Auth factory, database schema and server auth routes                  | Adds D1 when no database is selected; can use Neon    |
| `--clerk`       | Managed web identity integration and/or backend authentication helper | Alternative to Better Auth; server required           |
| `--local-data`  | Device-local persistence interface                                    | Implement platform adapters and synchronization       |

Database code lives in `packages/db`, including schemas and explicit migration tooling. Browser and device clients call server endpoints. Hosting audience protection and application resource authorization are separate from selecting an identity provider.

## Choose services and integrations

These are optional foundations. The generated scope column distinguishes bindings and Workers from SDK factories and integration guidance.

| Selection         | Purpose                           | Generated scope                                                                          |
| ----------------- | --------------------------------- | ---------------------------------------------------------------------------------------- |
| `--r2`            | Private files                     | R2 Worker binding and authorization guidance                                             |
| `--kv`            | Cache/configuration               | Eventually consistent Worker binding                                                     |
| `--realtime`      | WebSocket rooms                   | Separate Durable Object Worker; implement room authorization                             |
| `--neon-realtime` | Live PostgreSQL query results     | Server/client factories and Drizzle adapter; adds Neon; manual branch activation         |
| `--stream`        | One-to-many live video            | Cloudflare Stream WHIP/WHEP; server management factory; manual activation and product UI |
| `--queues`        | Background jobs                   | Producer, consumer and dead-letter configuration; implement processing/idempotency       |
| `--cron`          | Scheduled work                    | Separate Worker with an hourly starter schedule                                          |
| `--workflows`     | Durable multi-step work           | Separate Worker with a starter validation step                                           |
| `--workers-ai`    | Cloudflare inference              | Worker AI binding; implement model calls                                                 |
| `--openai`        | Direct OpenAI integration         | Server SDK factory in `packages/ai`                                                      |
| `--ai-sdk`        | AI streaming/provider abstraction | AI SDK exports with an OpenAI provider; alternative to `--openai`                        |
| `--resend`        | Transactional email               | Server SDK factory in `packages/email`                                                   |
| `--stripe`        | Payments/subscriptions            | Server SDK factory in `packages/billing`                                                 |
| `--revenuecat`    | Cross-store entitlements          | Integration guidance; explicitly requires `--stripe`; install platform SDKs              |
| `--sentry`        | Error/crash monitoring            | Integration boundary and redaction fields; initialize platform SDKs                      |
| `--posthog`       | Product analytics                 | Server analytics factory                                                                 |
| `--basin`         | Cloudflare analytical events      | Private stream binding and event helper                                                  |
| `--styling`       | Shared design tokens              | Light/dark tokens and Tailwind preset; automatically included with Expo/WXT              |

Live video (`--stream`), room messaging (`--realtime`) and live SQL (`--neon-realtime`) can coexist. See [live video setup and limits](docs/stack-standard.md#live-video-with-cloudflare-stream). PostHog and Basin can coexist with separate packages. Workers AI can accompany either AI SDK choice. Provider setup supports selected resources for Neon, Clerk, Resend, Stripe, RevenueCat, Sentry, PostHog and OpenAI; credentials, permissions and remaining owner steps are described in the [provider reference](docs/software-factory.md#provider-configuration).

### Composition rules

- Choose one web framework, one database and one identity provider. `--openai` and `--ai-sdk` are alternatives.
- Database/auth, Stream and Neon Realtime selections need a compatible server. For mobile with PostgreSQL, use `--expo --hono --neon`.
- Native Next.js/Vercel plus Worker-bound capabilities such as D1 or R2 automatically adds Hono on Cloudflare.
- Explicit OpenNext, Queues or Basin uses Wrangler for the Cloudflare workspace. Other supported Cloudflare selections use Void. `add` rejects changes that switch an existing engine or relocate runtime source.
- Neon Realtime requires Neon and manual Realtime configuration. RevenueCat requires an explicit Stripe selection.

Examples:

```sh
# Web with database-backed identity; Better Auth adds D1.
anhedral init my-app --better-auth

# Web, shared API, mobile and PostgreSQL.
anhedral init my-app --vinext --hono --expo --neon

# Vercel web with a Cloudflare API and private files.
anhedral init my-app --next --r2

# Live broadcasts with independent room messaging and SQL subscriptions.
anhedral init my-app --stream --neon-realtime --realtime
```

Inspect the full catalog and preview later additions:

```sh
anhedral registry list
anhedral registry view resend --json
anhedral add resend --cwd my-app --dry-run --json
anhedral add resend --cwd my-app
```

Generated entry points live in `apps/*`, shared code in `packages/*`, and Anhedral configuration in one root `anhedral.json`. Read the [source-only full-stack example](https://github.com/anhedral/anhedral-cli/tree/main/examples/full-stack) to see a larger project without creating services.

## Build and deliver

Implement the product, configure selected integrations and review database migrations. Then use the [software factory](docs/software-factory.md) to check provider access, connect the intended account and audience, commit source, ship and verify real user flows.

```sh
anhedral auth --status --json
anhedral doctor --providers --json
# Select the intended account and audience, then commit source/configuration.
anhedral connect --audience private --allow-email owner@example.com
git add .
git commit -m "Implement application and delivery configuration"
anhedral ship --dry-run --json
anhedral ship --json
anhedral verify --json
```

Replace the example member with the intended user. Private Cloudflare hosting requires Zero Trust and scoped Access permissions; native Vercel uses its own connect options in the factory. Implement a meaningful `test:live` script before `verify`. Actual shipping can create resources, apply reviewed deployment migrations and publish code. Provider permissions, account eligibility and usage charges still apply. A generated starter or successful deployment does not establish a working product.

Cloudflare and Vercel have automated delivery and provider evidence checks. Mixed delivery runs Cloudflare before Vercel and can partially succeed. Expo shipping returns verified EAS build artifacts; store submission is separate. Electron and extension projects include local build/package tooling, with signing and distribution handled through their platform workflows.

Use the [stack standard](docs/stack-standard.md) for destinations, compatibility, migration ownership, environment files and the remaining implementation requirements for every option. Exact dependency versions live in the [source catalog](https://github.com/anhedral/anhedral-cli/blob/main/src/dependencies.ts).

## Use with Codex

```sh
codex plugin marketplace add anhedral/anhedral-cli
codex plugin add anhedral@anhedral
```

Select **Try now**, or start with:

> Create a new project using [@Anhedral](plugin://anhedral@anhedral). Start by explaining the stack and asking me what it should be about.

The plugin guides implementation using the same stack and workflow. Its optional inspector shows project structure, setup, recorded delivery evidence and explicit service controls. Opening it does not deploy the app. The CLI works independently.

## Read next

| Document                                     | Use it to answer                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| [Stack standard](docs/stack-standard.md)     | What should the application contain, and how should it fit together?     |
| [Software factory](docs/software-factory.md) | How do I turn a brief into a tested, delivered and maintainable product? |

The [verification record](docs/verification.md) keeps dated code reviews, provider evidence and remaining acceptance gaps together. Provider setup, CLI behavior, dashboard development and the release process are sections of the software factory.

Use `anhedral --help` and `anhedral help <command>` for command options. `--cwd` selects the project; `--json` produces structured output. Use its [provider configuration](docs/software-factory.md#provider-configuration), [CLI behavior](docs/software-factory.md#cli-behavior), [Codex dashboard](docs/software-factory.md#project-dashboard) and [release process](docs/software-factory.md#maintain-and-release-the-cli) sections for details.

## Work on the CLI

```sh
pnpm install --frozen-lockfile
pnpm build
node dist/bin.js init ../my-test-app --dry-run --json
pnpm test:all
```

`pnpm test:integration` installs and checks generated projects. Inspector development uses `pnpm plugin:build`, `pnpm plugin:check` and `pnpm plugin:preview`; its dependencies and lockfile live in `plugins/codex/inspector`. Building the checkout does not update an installed CLI or plugin. See the [contribution guide](https://github.com/anhedral/anhedral-cli/blob/main/.github/CONTRIBUTING.md) for the development and review process.

Anhedral is open source under the [Apache License 2.0](LICENSE). Generated applications are source code that developers can customize and license for their products, preserving upstream notices. Report bugs in [issues](https://github.com/anhedral/anhedral-cli/issues) and vulnerabilities through [private security reporting](https://github.com/anhedral/anhedral-cli/security/advisories/new).
