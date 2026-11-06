# Development notes

## 2026-11-05 · Coordinated 0.21.0 release (#128)

Breaking 0.x change: `anhedral ui` is retired. Init defaults to editable shadcn
components; use upstream shadcn or any UI library. Existing source and required
upstream notices are preserved. CLI and plugin share the version and immutable
release artifacts; publication does not deploy Landing or update runtime pins.

## 2026-11-03 Project discovery and registration

Issue #111 adds native CLI project listing and metadata-only creation, paired with
Platform issue #509 and its reviewed public transport projection. Creation uses a
durable retry identity; optional linking checks live build authority and preserves
generated source identity. No provider activation or package publication is implied.

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

## 2026-11-01 Comprehensive maintenance implementation

Based on staging `2014a612`, code candidate `850fe692` implements C01–C12,
CLI Q01–Q03/Q08–Q10 and reviewed transport/document boundaries. Independent
review passed 56 focused tests with no remaining findings. The complete unit
suite passed 194 of 195 tests; one existing optional patch-byte test skipped.
Build, lint/typecheck, static security, exact plugin/archive preflight and the
67-module package boundary passed. Exact package smoke passed on Node 20.19,
22.12 and 26.8. The clean-candidate generated Next/OpenNext/workerd and local
Wrangler/D1 auth proof passed, retained resolved locks/receipts, and measured
976.83 KiB web gzip. Actual Turbo planning proved WXT outputs/env and disabled
native build caching. Runtime checks caught and repaired generated body-limit
413 translation; typed/generic server errors remain sanitized. Retention is an
owner-scoped example with consumer acceptance, never scheduled cleanup.
Evidence remains in `.artifacts/cli-final-*.log` and `.artifacts/next-runtime/`.
Windows process-tree cleanup, browser/native compilation/devices and live
provider acceptance were not exercised. No publication, provider activation,
production promotion or live migration is authorized by these checks.

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
