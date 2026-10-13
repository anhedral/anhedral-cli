# Supported application stack

Anhedral scaffolds ordinary TypeScript applications in a pnpm/Turborepo monorepo. Its bundled registry defines the supported recipes, dependencies, generated files, environment requirements and composition constraints. Application source, repositories, provider accounts and billing remain under the application owner's control.

## Bundled options

| Layer | Supported options | Generated foundation |
| --- | --- | --- |
| Workspace | pnpm/Turborepo, TypeScript, ESLint, shared UI | Official pinned shadcn monorepo bootstrap, workspace configuration and checks |
| Web | Vinext; Next.js | React, Tailwind, shadcn/ui and Lucide; Vinext on Workers by default, native Next.js on Vercel or explicit OpenNext on Workers |
| API | Hono | OpenAPI Worker application with selected service bindings |
| Mobile | Expo | React Native Reusables and NativeWind; native builds require platform toolchains |
| Desktop | Electron | React application; packaging, signing and distribution require platform-specific setup |
| Browser extension | WXT | React popup and Chrome side panel; installation and store distribution are separate steps |
| Data | D1, Neon, local data | Drizzle schemas for D1/Neon; direct Neon serverless HTTP; device-local data foundations |
| Identity | Better Auth, Clerk | Server/client configuration and selected schema or provider middleware |
| Worker services | R2, KV, realtime, Queues, cron, Workflows | Private storage bindings, cache/config bindings, Durable Object WebSocket rooms and job/schedule foundations |
| AI | Workers AI, OpenAI, AI SDK | Server-side inference bindings or SDK factories |
| Email | Resend | Server-side transactional email client |
| Payments | Stripe, RevenueCat | Payment/entitlement integration foundations |
| Monitoring and analytics | Sentry, PostHog, Basin | Runtime SDK factories or analytical ingestion configuration |
| Shared styling | Styling | Tokens and presets for compatible native and extension clients |

These are scaffolding recipes, not completed application features. Database migrations, authorization, provider resources, webhooks, email domains, product behavior and monitoring initialization require application-specific implementation and verification. Environment examples contain names and placeholders, never provider credentials.

Inspect exact current requirements before generation:

```sh
anhedral registry list --json
anhedral registry view better-auth --json
anhedral new my-app --hono --d1 --better-auth --r2 --dry-run --json
```

The default selects only Vinext on Cloudflare Workers. Add capabilities because the application needs them. The resolver adds required dependencies and rejects incompatible choices, including conflicting web frameworks, databases and identity providers. `--all` is unsupported. Native Next.js selects Vercel unless Cloudflare hosting is explicit. Some services require a Worker application; inspect the plan rather than assuming every selection can run on every client.

## Source layout and composition

Use `apps/*` for applications and services, and `packages/*` for shared code. Generated `docs/stack.md` lists the resolved options, destinations, environment names and setup requirements. `anhedral.setup.json` records setup requirements; `anhedral.registry.json` records recipe versions, generated-file fingerprints and workspace references.

The catalog in `src/stack-registry.ts` owns recipe identity and composition rules. Dependencies and the official shadcn bootstrap are pinned in `src/dependencies.ts`. Recipes under `src/scaffold/` compose the resolved selection inside a staging transaction. Workspace names must be unique, references must resolve, and dependency cycles fail before commit.

Incremental `add` uses only the bundled catalog maintained with the CLI. External registries and custom registry payloads are unsupported. Additions preserve edited and untracked source, refresh generated stack documentation and record provenance. Runtime relocation and older projects without compatible receipts require deliberate migration.

```sh
anhedral add my-app resend stripe --dry-run --json
anhedral add my-app resend stripe
anhedral doctor my-app --json
```

This catalog uses an Anhedral recipe schema; it is not a shadcn registry payload. The plugin's catalog and documentation are generated from the same maintained sources.

## Provider access and delivery

`anhedral auth <app>` derives required providers from the selected stack. `--status` checks access without opening login; noninteractive and JSON calls report blockers. A provider session or accessible API endpoint is not proof of all resource permissions or completed integration setup. Provider administration credentials remain separate from application runtime secrets.

`ship` coordinates selected integration provisioning, private runtime configuration and supported hosting delivery. [Provider configuration](provider-configuration.md) documents the eight API adapters, required management credentials and owner prerequisites. Authentication checks alone do not establish every write permission. If resolved bindings change tracked configuration, review and commit them before repeating the command. Expo delivery verifies the selected account/project/source and returns a build-page link while queued or a download link when complete; store submission remains separate.

The CLI provides the foundation and delivery workflow. Product features, design, custom integrations and maintenance remain development work; Anhedral offers these services to businesses.

## Application requirements

- Keep server credentials out of client bundles and version control. Configure separate environments and review database migrations.
- Select one database and one identity provider. Implement resource and tenant authorization in the application; hosting access protection does not replace product identity.
- Keep R2 private and authorize file operations. KV is eventually consistent and should not hold authoritative transactional state.
- Implement webhooks and jobs idempotently. Bound retries, concurrency and paid usage; verify recovery and data compatibility before rollback.
- Verify the actual runtime: Vinext/Vite on Workers, Next.js/OpenNext on Workers, or native Next.js on Vercel. Generated native clients need device, packaging and signing checks appropriate to their target.
- Run generated checks and exercise product flows. Initialization, installed SDKs and successful builds do not prove provider configuration or production acceptance.

Follow the [delivery workflow](delivery-workflow.md) for the supported customer-account deployment, verification and recovery commands.

## Maintenance and verification

Update the catalog, recipe and relevant documentation together when supported behavior changes. Regenerate plugin references with `pnpm build`; do not edit generated copies independently. Verify supported selection combinations and packaged output before release.

Generated `pnpm audit:deps` checks dependencies and verifies reviewed security backports against patch hashes, installed package hashes and regression checks. Unknown advisories and altered backports remain blocking.
