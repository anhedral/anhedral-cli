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

## Choose what to generate

An explicit selection chooses the requested applications; include the web option when you want web alongside another interface.

| Project                            | Command                                            |
| ---------------------------------- | -------------------------------------------------- |
| Default web app                    | `anhedral init my-app`                             |
| Web with D1 and Better Auth        | `anhedral init my-app --vinext --d1 --better-auth` |
| Web and shared API with PostgreSQL | `anhedral init my-app --vinext --hono --neon`      |
| Native Next.js on Vercel           | `anhedral init my-app --next`                      |
| Expo mobile app                    | `anhedral init my-app --expo`                      |
| Electron desktop app               | `anhedral init my-app --electron`                  |
| WXT browser extension              | `anhedral init my-app --wxt`                       |

Inspect available services and preview additions:

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
anhedral ship --dry-run --json
```

These commands help inspect readiness; actual shipping can create resources, apply reviewed deployment migrations and publish code. Provider permissions, account eligibility and usage charges still apply. A generated starter or successful deployment does not establish a working product.

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

Use `anhedral --help` and `anhedral help <command>` for command options. `--cwd` selects the project; `--json` produces structured output. Detailed references cover [provider configuration](docs/provider-configuration.md), [CLI behavior](docs/cli-design.md) and the [Codex inspector](docs/plugin-ui.md).

## Work on the CLI

```sh
pnpm install --frozen-lockfile
pnpm build
node dist/bin.js init ../my-test-app --dry-run --json
pnpm test:all
```

`pnpm test:integration` installs and checks generated projects. Inspector development uses `pnpm plugin:build`, `pnpm plugin:check` and `pnpm plugin:preview`; its dependencies and lockfile live in `plugins/codex/inspector`. Building the checkout does not update an installed CLI or plugin. See the [contribution guide](https://github.com/anhedral/anhedral-cli/blob/main/.github/CONTRIBUTING.md) for the development and review process.

Anhedral is open source under the [Apache License 2.0](LICENSE). Generated applications are source code that developers can customize and license for their products, preserving upstream notices. Report bugs in [issues](https://github.com/anhedral/anhedral-cli/issues) and vulnerabilities through [private security reporting](https://github.com/anhedral/anhedral-cli/security/advisories/new).
