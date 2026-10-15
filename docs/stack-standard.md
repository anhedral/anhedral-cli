# Supported application stack

Anhedral scaffolds ordinary TypeScript applications in a pnpm/Turborepo monorepo. Its bundled registry defines the supported recipes, dependencies, generated files, environment requirements and composition constraints. Application source, repositories, provider accounts and billing remain under the application owner's control.

## Bundled options

| Layer | Supported options | Generated foundation |
| --- | --- | --- |
| Workspace | pnpm/Turborepo, TypeScript, ESLint, shared UI | Official pinned shadcn monorepo bootstrap, workspace configuration and checks |
| Web | Vinext; Next.js | React, Tailwind, shadcn/ui and Lucide; Vinext on Workers by default, native Next.js on Vercel or explicit OpenNext on Workers |
| API | Hono | OpenAPI Worker application with selected service bindings |
| Cloudflare delivery | Void; explicit legacy Wrangler paths | Void provisions and publishes; Anhedral composes, controls audience policy and independently verifies |
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

Every generated project uses pnpm workspaces (`apps/*` and `packages/*`), one root `pnpm-lock.yaml`, and a registry-pinned Turborepo version. Root commands run the shared task graph; adding a second interface does not introduce a separate installer or lockfile. Application/service entry points live in `apps`, reusable implementation in `packages`. Extract shared code around actual consumers rather than moving every helper into a package.

Database-backed selections create the server-only `@workspace/db` package:

| Path | Responsibility |
| --- | --- |
| `packages/db/src/index.ts` | Database factory; the server supplies a connection string or D1 binding |
| `packages/db/src/schema.ts` | Shared Drizzle schema, including selected auth tables |
| `packages/db/src/migrate.ts` | Explicit migration entry point, separate from runtime exports |
| `packages/db/drizzle/` | Generated SQL, snapshots and migration journal |
| `packages/db/drizzle.config.ts` | Paths resolved relative to the configuration file, not the caller's working directory |

Only server consumers depend on `@workspace/db`; browser, mobile and extension interfaces use API contracts and endpoints. Reusable auth and other selected integrations remain independent packages. Each server is responsible for authentication, resource authorization and its environment. The database factory never loads environment files or migrates during application startup.

Run `pnpm db:generate` to generate SQL and review it before `pnpm db:migrate`. Both tasks disable Turbo caching and are excluded from build/check dependencies. D1 defaults to local migration; `pnpm db:migrate -- --remote` explicitly targets the configured database in the selected server Worker's `anhedral.cloudflare.json` (or `wrangler.jsonc` for legacy OpenNext). The Worker migration directory points to `packages/db/drizzle`. A single database migration owner coordinates all consumers.

Neon runtime queries keep the HTTP adapter and server-supplied `DATABASE_URL`. Migrations use a transactional WebSocket connection and a direct `DATABASE_URL_UNPOOLED`, supplied through the environment or `packages/db/.env.local`/`.env`. Generation does not require credentials; migration does. Test against the intended development branch before applying production changes. Provisioning runtime credentials does not automatically supply migration credentials.

Existing projects with `packages/db/migrations` require a deliberate move of SQL, metadata, configuration and deployment references. Do not regenerate or replay already-applied migrations to change the directory convention.

These are scaffolding recipes, not completed application features. Database migrations, authorization, provider resources, webhooks, email domains, product behavior and monitoring initialization require application-specific implementation and verification. Environment examples contain names and placeholders, never provider credentials.

Inspect exact current requirements before generation:

```sh
anhedral registry list --json
anhedral registry view better-auth --json
anhedral new my-app --hono --d1 --better-auth --r2 --dry-run --json
```

The default selects only Vinext on Cloudflare Workers, delivered through Void, plus the shared workspace and UI foundation. Add capabilities because the application needs them. The resolver adds required dependencies and rejects incompatible choices, including conflicting web frameworks, databases and identity providers. `--all` is unsupported. Native Next.js selects Vercel unless Cloudflare hosting is explicit. Some services require a Worker application; inspect the plan rather than assuming every selection can run on every client.

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

### Default Cloudflare delivery: Void

Void is the default Cloudflare delivery engine for new supported projects. Adopting its deployment tooling is separate from adopting its application framework. Preserve Vinext routing/rendering, Hono where a shared API is needed, pnpm/Turborepo, reusable packages, Better Auth and the selected database adapter. Deploy directly to the customer's Cloudflare account.

| Anhedral owns | Void owns |
| --- | --- |
| Stack selection, registry composition and multi-interface architecture | Supported Cloudflare builds and deployment mechanics |
| Customer account selection, authored resource declarations and shared-package contracts | Resource provisioning and resolved resource identities |
| Schema generation, SQL review and designation of one migration owner | Applying the designated reviewed deployment migrations |
| Audience requirements, hosting-policy orchestration and application authorization | Supported readiness and operational deployment primitives |
| Source provenance, independent provider checks and end-to-end product acceptance | Worker publication, deployment diagnostics and supported code rollback |

**Versions and configuration.** Pin `void@0.27.0` in each deployable app and require Node.js `>=24.21.0`. The adapter checks both the dependency pin and installed executable before execution. Record the delivery engine in `anhedral.project.json`. Each app keeps canonical declarations in `anhedral.cloudflare.json`, with `void.config.ts`, `env.ts` and `env.example`. Void generates its Cloudflare configuration and records resource identities in `void.lock.json`; generated defaults must not redefine authored capabilities or migration ownership.

**One engine per Cloudflare workspace.** Existing projects without an explicit Void marker retain Wrangler. Explicit Next.js/OpenNext on Cloudflare, Queues with dead-letter recovery and Basin selections also retain legacy delivery until their complete provisioning contracts are supported. Adding these capabilities to a Void workspace requires a deliberate engine migration; additive composition refuses to mix engines. Installing a newer CLI does not migrate existing hosting. `planVoidDelivery` remains a read-only migration review API. Native Next.js on Vercel retains its independent delivery path. Named Cloudflare environments are not flattened automatically; migrate deliberately to separate committed target configurations.

**Explicit resources and one writer.** Registry composition determines each server's capabilities. Shared packages receive bindings or connections through factories. Resource inference assists development; it does not establish transitive package discovery or capability isolation. Compare resolved/generated bindings against the selected capabilities, including auth- and migration-driven requirements. Anhedral `provision` reports the Void resource plan and defers creation to Void deployment. Deploy targets serially and serialize initial provisioning; never run a parallel Anhedral resource creator. Preserve existing D1/private R2 identities and independently inspect provider state after resolution.

**One migration owner.** Keep authoritative schemas, SQL, snapshots and journals in `packages/db`. Determine ownership from canonical authored configuration, not a resolved lock: Void may add conventional migration directories to database consumers. Exactly one server applies shared D1 migrations; other servers consume the binding without acquiring ownership. An explicit owner may be selected during migration planning. The deployment adapter prepares an ignored, ownership-checked, byte-identical app-local validation copy for Void 0.27.0; it refuses edited or unowned copies. The configured apply directory remains `packages/db/drizzle`, and the copy never becomes another source of migrations. Keep custom Drizzle generation and SQL review because Void does not automatically detect drift in `packages/db/src/schema.ts`. Preserve Neon's HTTP runtime adapter and separate transactional migration connection; adopting Void does not select Hyperdrive or `void/db`.

**Credentials and environments.** Provider authentication is separate from account selection, write permissions, Zero Trust setup and visitor identity. The adapter uses an explicitly supplied `CLOUDFLARE_API_TOKEN`, or retrieves structured Wrangler credentials and passes them only through the Void child process's environment. Credential values never become command arguments, source or deployment evidence. Wrangler login alone does not establish Access permissions. Establish private hosting protection before product publication.

Void reads one `.env` at each deployable app's project root and declares variables in `env.ts`. Use `env.example`; do not introduce unsupported `.env.*` companions or `.dev.vars` into that app. Map existing environment conventions deliberately. Production server secrets use noninteractive stdin; bulk sync is avoided because the pinned command prompts even in CI. Reject empty values, NUL bytes and terminal newlines rather than silently changing secret bytes. Exclude public `VITE_*`, `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` values from server-secret uploads. Public build-variable mappings require explicit review. Keep Neon migration credentials separate from runtime secrets.

**Activation, locks and verification.** Distinguish provisioned, uploaded, activated, ready and product-verified states. A failed command can leave resources or an active Worker. Initial activation may change only the allowed target `void.lock.json` files. Retain independently confirmed receipts and return `configuration-required`, with `activated: true` and `deployed: false`; review and commit the identities, then ship a clean committed release before product verification. Only recorded lock changes may carry across later targets; unrelated source edits still stop delivery. Commit locks before another checkout or CI deploys.

Require the pinned machine-readable JSONL deployment contract and independently correlate its Worker/version with 100% of active Cloudflare traffic and actual provider URLs. Console prose and a successful exit status are insufficient evidence. Correlate the checked invocation with exact source state before and after deployment; do not claim a provider-signed Git provenance guarantee. Check private-resource and audience policies around activation. Multiple Workers are not an atomic release. Readiness does not replace the application's meaningful live acceptance test.

Rollback delegates to Void and independently checks active versions. It restores code and only triggers covered by retained snapshots; it does not reverse SQL or cross incompatible Durable Object migration boundaries. Fresh-checkout recovery verifies current provider state, flags unsupported binding evidence and cannot reconstruct missing historical source-to-release mappings or product-verification results.

**Separate framework and platform decisions.** Native Void Pages, managed auth, typed WebSockets, Durable State, inbound-email handlers, the self-hosted Void Platform and connected-builder artifact publishing require separate recipes and acceptance. Deploying Vinext through Void does not make native-framework-only features available. Keep the self-hosted platform optional: its control plane, credentials, quotas and recovery are a separate operational commitment. Use the exact installed package's bundled Markdown documentation when assessing these paths.

**Acceptance status.** Actual generated Vinext/Hono builds, local workerd routing/assets/readiness, shared Better Auth/D1 flows and the read-only Wrangler-to-Void credential bridge have been exercised. Unit coverage checks ownership, secret transport, lock checkpoints and evidence rejection paths. These results do not establish complete remote compatibility. The current validation account still requires Zero Trust onboarding and usable Access authorization. Private first deployment, fresh-checkout resource reuse, full live user flows, failure recovery and remote rollback remain acceptance gates. Do not switch to public hosting to bypass private acceptance. Record results and reproducible checks in [Void verification](void-verification.md).

Upstream contracts: [Cloudflare deployment](https://void.cloud/integrations/cloudflare), [configuration](https://void.cloud/reference/config), [deployment CLI](https://void.cloud/reference/cli/deploy), and [package requirements](https://www.npmjs.com/package/void).

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

Framework-specific lint dependencies belong to the consuming application. The shared `packages/eslint-config` retains generic TypeScript, React, Hooks and Turbo rules; web applications declare their own Next API lint plugin and configuration. API and native-only workspaces must not inherit Next-specific tooling solely because the bootstrap started from a Next template.

Generated `pnpm audit:deps` runs the standard pnpm dependency audit and fails on high or critical advisories. Anhedral ships one temporary, exact-version pnpm patch for `braces@3.0.3`, described below. It does not suppress advisories or grant a release exception. Review the resolved lockfile for each generated profile: a clean CLI lockfile or direct-version catalog audit does not establish that a generated application’s transitive dependencies are clean. Removing an unused dependency path does not resolve other paths to the same vulnerable package.

### Temporary braces mitigation

When the resolved graph contains `braces@3.0.3`, new generation and actual additions copy the bundled `assets/patches/braces@3.0.3.patch` into `patches/`, merge an exact `patchedDependencies` mapping into `pnpm-workspace.yaml`, and resolve the lock again before frozen installation. Existing customer patch maps and files are preserved; conflicts require deliberate maintenance. Other versions do not receive this patch. Commit both the patch and updated workspace/lock files.

This is a local mitigation for [CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): nested brace/parenthesis parsing and direct AST traversal are limited to depth 100, and cyclic child/expansion-parent paths are rejected. It does not add expansion-width/range limits or replace the upstream glob API. Standard `pnpm audit:deps` still reports the affected upstream version and remains blocking. No advisory exception has been approved.

Review the mitigation on every release. Remove it when a verified supported upstream fix or compatible consumer migration makes it unnecessary; test existing application patterns before changing the limit. `pnpm test:patch` exercises a real frozen installation, normal glob/watch behavior and advisory visibility. The upstream MIT notice is distributed alongside the patch.
