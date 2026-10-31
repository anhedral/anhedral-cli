# Development notes

## 2026-10-31 — CLI 0.18.0 source preparation

Prepare reviewed Platform login, source handoff and build-status commands for a
minor release. Hosting stays disabled and Windows credential storage unsupported.
The generated glob pin includes GHSA-3g3m-2fjr-6pw4 cancellation remediation.
This source checkpoint does not publish npm or update an installed plugin.

## 2026-10-30 — Isolated build admission

Local staging consumes the shared build-state/receipt schemas. Exact build-only
runtime admission is owned by Platform; deploy prepare/status surface building,
built and failed without granting hosted capabilities. Plans remain immutable.
Build, lint/security, 121 unit tests (one existing skip), packlist and installed
package smoke passed. Platform native builds and D1 identity/session continuity
passed, with root checks/build. No npm publication or deployment occurred.

## 2026-10-30 — Deployment planning and candidate reservation

Local staging adds deploy plan/prepare/status, immutable sealed-source plans and
response-loss recovery. Real API/isolated PostgreSQL fixtures exercise the built
CLI, stale routing, identity-change rejection and held candidate capabilities.
Candidates await runtime admission; no build, preview, provider deployment or
configured-database migration occurred. Build, lint, security policy, 121 unit
tests (one existing skip), packlist and installed-package checks passed, alongside
Platform root checks/build and the real CLI planning/reservation fixtures.

## 2026-10-30 — Platform access and resumable source

Local staging adds browser-approved CLI-only login, secure credential storage,
origin/principal-bound project links and immutable resumable source requests.
Platform fixtures exercise the built CLI against real Hono and isolated SQL,
including a lost chunk response and candidate source sealing. Hosted admission
and deployed access remain disabled. Build, lint, security policy, 121 unit tests
(one existing skip), packlist and installed-package smoke passed, as did Platform
root checks/build and the real CLI login/upload integration. No npm publication,
provider deployment or configured-database migration occurred.

## 2026-10-30 — CLI/Platform contract checkpoint

Local staging adds portable deployment schemas and a hash-checked Platform source
snapshot, plus composition provenance that preserves unknown legacy versions and
existing identity. Build, lint, unit/composition fixtures, packlist and installed
package smoke passed. This does not admit a hosted runtime, provision resources,
publish npm or update an installed plugin. The origin/binding adapter and pinned runtime acceptance are implemented in
Platform local staging; see [capabilities](../capabilities.md).

## 2026-10-27 — CLI 0.17.0 preparation

Prepare the preserved native-port retirement for a reviewed release. This is a
breaking 0.x change: the legacy programmatic Expo initializer now fails before
writes. Use progressive `add expo` and `add native-ui`; existing generated
applications and Platform's immutable runtime pins are unchanged.

Release validation and exact candidate integrities are recorded in the release
PR and retained artifacts. Publish only the verified main candidate through the
existing trusted-publishing workflow; source promotion alone is not publication.

## 2026-10-26 — Superseded native port retirement

Archived all 493 uncommitted file entries from the old port at
`4033cab2f068ebc021803d6730e9e04cbc274081`, including tracked changes and untracked
source, without modifying its working tree or index. Clean staging baseline:
`6303150`. Local recovery package:
`$HOME/Documents/Codex/2026-10-26/legacy-native-port-archive/`.
Its standalone Git bundle and source tar restore all 995 files with matching
SHA-256 hashes; the archive records evidence retention/exclusions and restore checks.
Restoration also verified all 324 baseline files and 338076 local evidence files/links.
Both reviewed shallow upstream caches restore offline with their Git boundaries intact.
Original ignored material stays in the old checkout. No archive is published.

Removed the old source assets, generator, native dependency pins, harness, parity
scripts and CI installation path from staging. Replaced the compatibility reference
with recovery/migration instructions. Programmatic `expo` product selection fails
before writes; use progressive `add expo` and `add native-ui` instead. Existing
generated applications and Platform artifact pins are unchanged. New UI routing,
RNR/NativeWind templates, shared tokens and attribution remain.

Validation: CLI build; 112 unit tests passed, one existing optional skip; lint/type
and static security checks; 20/20 Markdown budget; skills-only plugin check;
actual packed install/init/UI catalog/API-add smoke; compiled Next/OpenNext local
runtime and Worker bundle budget. Packlist: 160 files, under 1 MB,
with a regression check excluding legacy native assets and compiled generators.
This is local source/package validation, not a publication or native-device run.

Keep only active work and unresolved gaps in this rolling log, with brief dated
entries showing revision and result. Retire completed entries; Git keeps their
history. Keep the entire file within 100 lines, enforced by CI.
Promote lasting instructions into an existing guide. Store generated/raw reports
in ignored `.artifacts/`, without credentials or customer data. Previous notes
and verification records remain in Git history; they are not current runbooks.

The repository permits at most 20 tracked Markdown files in total, including
README, AGENTS, skills, bundled references and this log. Update existing files
instead of adding another document.
