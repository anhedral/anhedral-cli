# Development notes

## 2026-11-08 Coordinated 0.22.0 release

Breaking 0.x release: deployment plans and candidate receipts omit private runtime
metadata. Use the matching Platform API and refresh saved plans with `--new`.
Source versions and runtime admission remain independently reviewed. Release
preparation uses the existing action with exact artifact identities (#132).

## 2026-11-08 Public receipt boundary

Local client contracts omit internal plan policy/image fields and candidate admission
metadata. The owner snapshot also reconciles deployment response validation. The reviewed
snapshot is exported from immutable owner commit
`c2b6bc60de8852173c7dc8e0cfe544d13ef41a5f`; source hashes and provenance are
verified together. Client boundary, credential and deployment fixtures pass.

## 2026-11-05 · Coordinated 0.21.0 release (#128)

Breaking 0.x change: `anhedral ui` is retired. Init defaults to editable shadcn
components; use upstream shadcn or any UI library. Existing source and required
upstream notices are preserved. CLI and plugin share the version and immutable
release artifacts; publication does not deploy Landing or update runtime pins.

## 2026-11-03 CLI-only plugin guidance

User direction removes the direct plugin-to-Platform MCP/OAuth pathway. Both host
manifests and shared skills describe CLI usage, while package/publication guards
reject connection files, remote apps and hooks. Exact-archive host acceptance
checks both CLI skills with no MCP servers. Existing Platform CLI commands remain.
Public release artifacts require a separate coordinated versioned publication.

## 2026-11-03 Shared Codex and Claude Code distribution

The shared distribution lives in `plugin/` with host-specific manifests and one
set of CLI skills/references. Both marketplaces pin the same immutable release
source. Builds keep identities synchronized; publication remains a separate step.

## 2026-11-02 Web launch initializer

`codex/web-launch-init` starts at staging `4749139`. Broader source is retained on
`codex/preserved-progressive-stack-20261102`; local changes on
`codex/preserved-cli-local-20261102` (`f4aedda09790a82fecb71f7f0db8ab886466ef45`).
The primary checkout is unchanged. Init creates TanStack Start/UI only; `add backend`
adds Hono/Better Auth/Drizzle-D1 together, then R2/Stripe independently. Legacy
source remains. Provenance v2 is separate from hosted admission. Compiled local
acceptance covers SSR, sessions and R2 ownership; no publication/provider activation.

## 2026-11-02 Filesystem recovery and runtime scope follow-up

Based on staging `c4dda0f`, fixes preserve recreated post-crash source and retain
ambiguous journal/backup evidence. Original backup fingerprints support rollback
replay; legacy unverifiable states stop for inspection. Real init/add recover
before source preflight; dry runs remain non-mutating. Abrupt command regressions
cover orphan staging, journal/install interruption, recreation and restore replay.
UI JSON reads reject nonregular/oversized targets and retain consumer config links.
Exact auth/receipt helper changes select the runtime proof; the receipt unit test
runs in the fast gate. Build, lint/typecheck/hygiene, boundary, plugin, exact
package/installed smoke and 27 focused checks passed. Full unit validation passed
214 of 215 tests; one existing optional patch-byte check skipped. Compiled runtime
helpers/templates are unchanged; no additional generated Next build was needed.
No provider/database operation, package publication or deployment was performed.

## 2026-11-01 — Platform client recovery fixes

Based on staging `1096f7f`, the public `cliPreparationSchema` block was reviewed
against Platform `e786cd642075bbb7d73d2047a93434b5aeb1d5f9` and fingerprinted through the explicit deployment
contract sync. Private hosting/build policy exports were omitted; existing source
scanning, public exports and runtime pins were preserved. Invalid environment, staging
and log selectors fail before credentials/network access; helper execution is
bounded, local logout cleanup failures remain visible, and saved staging receipts
are checked against their request identity. The existing package allowlist omitted
the environment/operations public provenance and license assets introduced in #98;
those exact paths are now both required and allowed. Build, 58 focused regressions,
lint/typecheck, static security, explicit contract fingerprints, plugin checks and
package-file policy and the installed exact-package/generated-app smoke passed. `check:boundaries` is unavailable on this staging base;
the pending primary-checkout boundary implementation was not imported. No provider operation, production
promotion or package publication is part of this change.

Keep public CLI notes within 100 lines and the repository within 20 Markdown files.
Private operational evidence stays outside this repository; history remains in Git.

## 2026-11-03 — OJ single-stack cutover

CLI 0.19.0 is a breaking source candidate: one OJ/TanStack Start/shadcn foundation.
Legacy generators, SDK aliases and native UI paths are removed. Backend adds Hono,
Better Auth and D1 together; R2 and Stripe extend it. Projects list/create are integrated.

The seven-file public contract is pinned to `47d921f53ce7b57a683b840a89025f5e35aef0fa`.
Additions upgrade canonical launchers atomically and preserve customization conflicts.
Canonical documents use side-effect CSS; only exact prior documents auto-upgrade.
Affected custom documents require reconciliation; safe customer documents stay untouched.

Build, lint, package checks and source tests passed. Runtime artifacts remain immutable
per reviewed source checkpoint. No package/plugin publication occurred from this checkout.
