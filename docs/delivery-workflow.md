# Build and deliver an application

The CLI supplies the source foundation, provider access checks and supported delivery operations. Feature design, product implementation, custom integrations and ongoing maintenance are development work. Anhedral offers these services; scaffolding and successful deployment do not establish a finished product.

Codex implements the product; the CLI supplies scaffolding, selected resource reconciliation and source/provider evidence. Delivery uses your own Cloudflare or Vercel account. Start with users, flows, audience, budget and observable acceptance criteria; preserve suitable existing apps.

## Plan and implement

1. Choose only needed components from the [stack standard](https://github.com/anhedral/anhedral-cli/blob/main/docs/stack-standard.md). Record decisions, ownership, environment/cost assumptions and actual connections in the application's `docs/architecture.md`.
2. Match installed plugin, registry `cliVersion` and executable versions. Check Node/pnpm, Git identity, toolchains and customer provider access. For unpublished development use `pnpm build` and `node dist/bin.js`; never silently substitute `@latest`.
3. Inspect `init <unused-directory> <flags> --dry-run --json`, then generate with those choices. Review README, AGENTS, setup manifests and resolved lockfile. For initialized apps, preview `add <directory> <items...> --dry-run --json`; additions protect edited source and record registry provenance. Select only items from the bundled Anhedral catalog. If a web addition reports `filesChecked: false`, the preview covers selection and targets only; the actual transaction checks generated-file conflicts before committing. Older projects and runtime relocation require explicit migration. `doctor --providers --json` checks access without configuring infrastructure or certifying production.
4. Implement screens, APIs, persistence, authorization and integration behavior. Replace placeholders with working flows. Configure real secrets, origins and reviewed migrations using provider tools; starters do not establish setup completion. Keep credentials out of source, logs and handoffs.

## Provider authentication

Run `anhedral auth <directory>` for the selected stack. `--status` checks existing access without opening login; `--provider <name>` limits the check to a required provider. JSON and `--non-interactive` never start login prompts. Missing credentials, insufficient permissions and unverified access return a nonzero exit status. Environment-supplied API credentials stay out of output and committed configuration. Authentication does not activate subscriptions, select hosting audience or configure integration resources.

## Source and release authority

Complete the selected integrations' nonsecret account/resource choices in `anhedral.providers.json`. See [provider configuration](provider-configuration.md) for supported adapters, management credentials, private runtime files, retry behavior, provider prerequisites and verification limits. `ship --dry-run` previews their missing settings without provider operations.

Use customer-owned accounts and a reviewed clean commit. Default to a private repository in the selected account; organizations require selection.

```sh
anhedral repository my-app --create --json
```

This verifies the app's Git root, owner, visibility, write access and exact remote commit. Reuse matching origins without `--create`; do not replace remotes, change visibility or force-push. Connected repository identity is retained and rechecked.

Choose one release path per change: checked `ship`, or checks followed by an authorized Git push, active production confirmation and `adopt`. Git integration can deploy independently of CLI checks; configure required CI/branch/deployment policy explicitly. Do not routinely deploy the same commit twice.

## Cloudflare delivery

Vinext/Workers is the default web recipe. Explicit Next.js on Workers uses `--next --hosting=cloudflare`. Select persistence, identity and AI from the standard. Cloudflare manifests use `anhedral.project.json`. Default `ship` coordinates Cloudflare services before the Vercel web app in mixed projects. Use `--provider cloudflare` or `--provider vercel` to operate on one hosting target explicitly; standalone `provision` is Cloudflare-only. New supported projects use Void; existing projects and explicit OpenNext, queue/DLQ and Basin selections retain the legacy engine.

```sh
anhedral connect my-app --audience private --allow-email owner@example.com
anhedral provision my-app --dry-run --json
anhedral ship my-app --dry-run --json
anhedral ship my-app --json
```

Connect verifies the sole accessible or explicitly selected `--account` and preserves audience/account choices. Public access requires authorization. Private hosting needs Zero Trust and scoped Access/Workers permissions; verify routes, domains and previews before and after deployment. Whole-Worker Access does not cover WebSockets: design and verify private realtime separately.

For Void projects, `provision` reports the resource plan and defers writes to Void deployment. It never runs Anhedral's resource creator in parallel. The migration owner prepares an ignored, byte-identical validation copy from `packages/db/drizzle`; Void validates its apply set against the shared SQL. Other consumers receive no migration copy. Generate and review SQL with the shared Drizzle configuration first; Void does not inspect shared-package schema drift automatically. Void deploys targets serially, records actual IDs in each app's `void.lock.json`, and applies reviewed deployment migrations. The first activation may require reviewing and committing new locks before shipping a clean release; successful target activation is recorded separately from source completion and product verification. Subsequent deployments reuse the committed identities. Legacy provision reconciles D1, private R2, KV and Queues/dead-letter queues; it does not implement schemas or integrations. Full `ship` also configures the selected integration adapters and private Basin streams. Review database migrations and application-specific integrations separately; developer-added Hyperdrive, Basin sinks and transforms need an explicit provider workflow. Void apps use `anhedral.cloudflare.json`, `void.config.ts` and `env.ts`; copy `env.example` to the app's private `.env`. Do not add `.env.local`, `.env.production`, `.env.example` or `.dev.vars` alongside Void's local environment file. Secret commands use noninteractive stdin; public build variables stay in the build environment. The Neon starter uses direct serverless HTTP with a server-side DATABASE_URL. Reconcile partial operations before retrying. Shipping requires clean source, checks account/bindings, runs application checks and confirms active versions/traffic. Void's pinned structured JSONL receipt is correlated with the active Cloudflare version independently; diagnostic prose is never a success receipt. Missing/ambiguous receipts or provider drift stop acceptance. Multiple Workers are not an atomic release; web deploys last by default. Code rollback delegates to Void for Void projects and does not undo database migrations or incompatible Durable Object class changes.

See [Void verification and handoff](void-verification.md) for the pinned evidence contract, reproducible checks, live acceptance results and outstanding gates.

## Native Next.js/Vercel delivery

Select `--next`, authenticate the intended customer account and choose an eligible plan. Hobby is personal/non-commercial; commercial use requires an eligible existing plan.

```sh
anhedral connect my-app --scope customer-team --audience private --use personal --create --git
pnpm --dir my-app run check
anhedral repository my-app --json
# Wait for the connected production Git deployment.
anhedral adopt my-app --json
anhedral verify my-app --json
```

Connect checks project/framework/root, repository link and audience. New private projects establish independently verified all-deployment Vercel Authentication before code or Git deployment. Hosting membership is separate from product identity; do not add members, seats or paid upgrades automatically. Existing protection changes need authorization. Mixed apps provision/ship Cloudflare services first, then verify the web-to-service flow.

## Mobile build handoff

Use `ship --platform ios|android --profile <eas-profile>`. Set an explicit Expo owner and slug in static `app.json`; project creation/linking stops for review and a commit. Subsequent builds check the linked identity, configure only public mobile keys, and use the pinned EAS CLI. A queued build returns a build-page link; repeat the same command to inspect that build without submitting another. Completed artifacts must match the selected project and source commit before returning a download URL. It does not submit to a store. Simulator builds cannot be submitted to TestFlight. Signed iOS builds require Apple credentials; Android APK builds can be installed directly.

## Acceptance and operating limits

Run relevant lint/types/Fallow, dependency audits, meaningful tests and actual runtime builds. Exercise browser flows, installed extension permissions, packaged desktop behavior and signed/native device flows where selected. Deployment or HTTP 200 alone does not establish product completion.

Verify anonymous rejection at primary/deployment URLs, permitted-user login, denied-user and cross-tenant behavior. Verify selected private files, realtime reconnect/replay, duplicate jobs/webhooks, bounded AI, purchase/restore/refund, email/push and offline conflicts. Provider-authenticated requests do not prove visitor login or app authorization. Protected automation may use Vercel curl or authorized origin-scoped Trusted Sources; never weaken protection for testing.

Record service quotas, maximum retries/concurrency/AI work, alert ownership and shutdown controls within the authorized budget. Test spikes, duplicate execution, partial deployment and backup restoration. Review migrations and compatibility before rollback; code rollback does not restore data.

## Operations and handoff

| Command                                     | Boundary                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `register`                                  | Stable app identity; generated apps register automatically.                                |
| `status --refresh`                          | Independently refresh provider state.                                                      |
| `manage` / `manage --local`                 | Provider overview / explicitly historical local view.                                      |
| `adopt`                                     | Verify active Vercel Git source/repository and record its checked release; no push/deploy. |
| `recover`                                   | Reconcile current provider state after cloning; no invented historical tests/releases.     |
| `verify`                                    | Run meaningful root `test:live` with actual URL/release and source/provider checks.        |
| `rollback --release <id> --data-compatible` | Restore recorded code after compatibility review; no migration reversal/data restore.      |

Open the actual app URL or installable artifact and exercise acceptance. Maintain the application's existing `docs/verification.md`: exact versions, source/release, repository, provider identity, audience, configured versus tested integrations, reproducible results and remaining actions. Refresh after changes; acceptance becomes stale when production changes. After rollback, restore matching clean source before verifying.

Committed manifests preserve identity. Ignored `.anhedral/` receipts are local history; back them up when needed. Before removing an interrupted shared lock, confirm no active process and inspect provider state. Maintain alerts, dependencies, costs and tested recovery. Recurring monitoring requires an authorized schedule. Release artifacts need exact contents, secret checks and integrity verification; never replace published version bytes.

## Evidence and maintenance

Before release, check the exact candidate's runtime, current dependency advisories, remote CI, installed-plugin and selected provider/native acceptance. Unresolved high-severity production audit failures block shipping. Keep dated results with release/test artifacts. Update this guide when commands, lifecycle or acceptance requirements change, and regenerate its bundled plugin copy.

### Interrupted local delivery locks

Use `anhedral recover --lock [directory]` only after an interrupted command. This releases a lock only when its recorded process is proven dead on the same host. It never replays provider operations or deletes delivery receipts. Inspect status and receipts before retrying. Live, foreign, legacy, malformed, and uncertain locks are preserved. A leftover `.anhedral/ship.guard` requires manual inspection; the CLI cannot safely infer its ownership. Do not combine local lock recovery with `--provider` or `--refresh`.
