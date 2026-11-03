# Development notes

## 2026-11-03 Claude Code plugin from the shared distribution

`plugins/codex/distribution` now also carries `.claude-plugin/plugin.json` and
`.mcp.json`; root `.claude-plugin/marketplace.json` pins the same `plugin-v<version>`
tag path as the Codex marketplace. Skills and references are shared unchanged.
Packaging, source publication and release policy validate both manifests; build
syncs both versions. `claude plugin validate --strict` passed for the distribution
and marketplace. A headless `--plugin-dir` session listed and invoked both skills
and registered `plugin:anhedral:anhedral`; a temporary local marketplace installed,
inventoried and uninstalled cleanly. The remote endpoint returned HTTP 404, so no
OAuth login was exercised. Existing `plugin-v0.18.0` tags predate the Claude files.

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

## 2026-10-31 — CLI discovery and scripting compatibility

Candidate implementation `18d8513` on `codex/cli-design-increments`, based on
staging `11c0f7c`, implements contextual example-based help, shared argument
parsing, consistent reporters and typed recovery, offline Bash/zsh completion
and opt-in `whoami --context`. Platform keeps compact implicit JSON; `--human`
is opt-in, explicit JSON survives quiet, and numeric failure status remains 1.
The public init parser preserves its return shape, Git defaults and legacy
identical booleans; empty explicit paths fail before writes.

Independent agent review repaired extra leaf help arguments and empty-directory
handling; final review found no further actionable defects. Node 24.14.0
`pnpm release:check` passed: 155 tests passed, one conditional patch unit test
skipped, followed by successful explicit braces/node-forge install regressions,
packed generated-project installation and packlist checks (751125 packed bytes).
Type/format/hygiene, release/security policy and OSV checks passed. Plugin check
and the 20/20 Markdown budget passed. Bash and zsh syntax/behavior ran locally;
Linux CI may skip zsh when unavailable. New suites are in the required CI gate.
PR #97 targets staging; hosted validation and retained exact-package acceptance
are tracked there. No npm/plugin publication, main promotion, provider activation
or database changes were performed. Presentation-only work does not establish
live Platform or native-device acceptance.

Keep public CLI notes within 100 lines and the repository within 20 Markdown files.
Private operational evidence stays outside this repository; history remains in Git.
