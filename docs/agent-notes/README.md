# Development notes

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

## 2026-10-31 — Public CLI boundary review candidate

Keep consumer manifests and Platform client messages public. Hosting policy,
artifact allowlists and isolated-builder enforcement remain server-owned.
Release and upload checks share credential patterns. Public content hashes track
only this repository's reviewed contracts; private checkout revisions are omitted.
Publication remains paused pending review. Node 24 build, type/format/hygiene,
release/security policies, OSV, full unit suite, dependency patch installs and
packed installation/packlist checks passed. The optional native-device test is
not run. Focused checks cover public contract drift, credential rejection and
local plugin pointer preparation. Exact package/plugin review artifacts remain
local; no tag, package publication, provider activation or database change occurs.

Keep this rolling log focused on public CLI changes and unresolved limitations.
Record private operational evidence outside the public repository. Historical
commits remain unchanged. Keep this file within 100 lines and the repository
within its 20 tracked Markdown file budget.
