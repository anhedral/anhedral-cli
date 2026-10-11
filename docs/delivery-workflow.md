# Build and deliver an application

Codex implements the product; the CLI supplies scaffolding, selected resource reconciliation and source/provider evidence. Customer-account delivery exists. Managed hosting has a local client foundation, not an operated service. Start with users, flows, audience, budget and observable acceptance criteria; preserve suitable existing apps.

## Plan and implement

1. Choose only needed components from the [stack standard](application-stack-standard.md). Record decisions, ownership, environment/cost assumptions and actual connections in the application's `docs/architecture.md`.
2. Match installed plugin, registry `cliVersion` and executable versions. Check Node/pnpm, Git identity, toolchains and customer provider access. For unpublished development use `pnpm build` and `node dist/bin.js`; never silently substitute `@latest`.
3. Inspect `new <unused-directory> <flags> --dry-run --json`, then generate with those choices. Review README, AGENTS, setup manifests and resolved lockfile. For initialized apps, preview `add <directory> <items...> --dry-run --json`; additions protect edited source and record registry provenance. Use `--registry <file|https-url>` for reviewed declarative registries. Older projects and runtime relocation require explicit migration. `doctor --providers --json` checks access without configuring infrastructure or certifying production.
4. Implement screens, APIs, persistence, authorization and integration behavior. Replace placeholders with working flows. Configure real secrets, origins and reviewed migrations using provider tools; starters do not establish setup completion. Keep credentials out of source, logs and handoffs.

## Source and release authority

Use customer-owned accounts and a reviewed clean commit. Default to a private repository in the selected account; organizations require selection.

```sh
anhedral repository my-app --create --json
```

This verifies the app's Git root, owner, visibility, write access and exact remote commit. Reuse matching origins without `--create`; do not replace remotes, change visibility or force-push. Connected repository identity is retained and rechecked.

Choose one release path per change: checked `ship`, or checks followed by an authorized Git push, active production confirmation and `adopt`. Git integration can deploy independently of CLI checks; configure required CI/branch/deployment policy explicitly. Do not routinely deploy the same commit twice.

## Cloudflare delivery

Vinext/Workers is the default web recipe. Explicit Next.js on Workers uses `--next --hosting=cloudflare`. Select persistence, identity and AI from the standard. Cloudflare manifests use `anhedral.project.json`; mixed apps append `--provider cloudflare` to lifecycle operations.

```sh
anhedral connect my-app --audience private --allow-email owner@example.com
anhedral provision my-app --dry-run --json
anhedral provision my-app --json
anhedral ship my-app --dry-run --json
anhedral ship my-app --json
```

Connect verifies the sole accessible or explicitly selected `--account` and preserves audience/account choices. Public access requires authorization. Private hosting needs Zero Trust and scoped Access/Workers permissions; verify routes, domains and previews before and after deployment. Whole-Worker Access does not cover WebSockets: design and verify private realtime separately.

Provision reconciles D1, private R2, KV and Queues/dead-letter queues; it does not implement schemas or integrations. Configure reviewed migrations, direct Neon (or selected Hyperdrive), Basin and external providers separately. The Neon starter uses direct serverless HTTP with a server-side DATABASE_URL. Reconcile partial operations before retrying. Shipping requires clean source, checks account/bindings, runs application checks and confirms active versions/traffic. Multiple Workers are not an atomic release; web deploys last by default.

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

## Acceptance and operating limits

Run relevant lint/types/Fallow, dependency audits, meaningful tests and actual runtime builds. Exercise browser flows, installed extension permissions, packaged desktop behavior and signed/native device flows where selected. Deployment or HTTP 200 alone does not establish product completion.

Verify anonymous rejection at primary/deployment URLs, permitted-user login, denied-user and cross-tenant behavior. Verify selected private files, realtime reconnect/replay, duplicate jobs/webhooks, bounded AI, purchase/restore/refund, email/push and offline conflicts. Provider-authenticated requests do not prove visitor login or app authorization. Protected automation may use Vercel curl or authorized origin-scoped Trusted Sources; never weaken protection for testing.

Record service quotas, maximum retries/concurrency/AI work, alert ownership and shutdown controls within the authorized budget. Test spikes, duplicate execution, partial deployment and backup restoration. Review migrations and compatibility before rollback; code rollback does not restore data.

## Operations and handoff

| Command | Boundary |
| --- | --- |
| `register` | Stable app identity; generated apps register automatically. |
| `status --refresh` | Independently refresh provider state. |
| `manage` / `manage --local` | Provider overview / explicitly historical local view. |
| `adopt` | Verify active Vercel Git source/repository and record its checked release; no push/deploy. |
| `recover` | Reconcile current provider state after cloning; no invented historical tests/releases. |
| `verify` | Run meaningful root `test:live` with actual URL/release and source/provider checks. |
| `rollback --release <id> --data-compatible` | Restore recorded code after compatibility review; no migration reversal/data restore. |

Open the actual app URL or installable artifact and exercise acceptance. Maintain the application's existing `docs/verification.md`: exact versions, source/release, repository, provider identity, audience, configured versus tested integrations, reproducible results and remaining actions. Refresh after changes; acceptance becomes stale when production changes. After rollback, restore matching clean source before verifying.

Committed manifests preserve identity. Ignored `.anhedral/` receipts are local history; back them up when needed. Before removing an interrupted shared lock, confirm no active process and inspect provider state. Maintain alerts, dependencies, costs and tested recovery. Recurring monitoring requires an authorized schedule. Release artifacts need exact contents, secret checks and integrity verification; never replace published version bytes.

## Evidence and maintenance

Local/mocked coverage is distinct from live GitHub/Vercel private setup, fresh-clone recovery, installed fresh-chat workflow and connected integrations. Retained HTTP/CRUD/redeploy/rollback runs prove only their tested profile. Sites' inventory, visitor connectors and managed sharing require separate platform implementation. No operated managed backend or issued app URL is established here; see the [managed contract](https://github.com/anhedral/anhedral-init/blob/main/docs/managed-hosting-architecture.md).

Before release, check the exact candidate's runtime, current dependency advisories, remote CI, installed-plugin and selected provider/native acceptance. Unresolved high-severity production audit failures block shipping. Keep dated results with release/test artifacts. Update this guide when commands, lifecycle or acceptance requirements change, and regenerate its bundled plugin copy.
