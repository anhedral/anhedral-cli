# Development notes

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
