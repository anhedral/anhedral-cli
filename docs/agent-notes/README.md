# Development notes

## 2026-11-08 Public API boundary

Removed internal deployment plan/source exports and synthetic internal plan fixtures
from the licensed public contract projection. Customer manifests and receipts remain.
This is a breaking removal for consumers importing those server plan exports;
use the CLI's versioned plan/prepare commands. README and plugin metadata describe
the API client and agent workflow. Exact owner revision and file hashes live in
`assets/contracts/deployment-provenance.json`.

Current staging reconciliation passed build, lint, unit tests, strict plugin
validation, dependency audit, patch regressions and packed CLI checks. Optional
real-host update acceptance remains separate. Publication and Platform/runtime
admission remain independent; these changes do not publish a new package.

## 2026-11-08 Coordinated 0.22.0 release

Breaking 0.x release: deployment plans and candidate receipts omit private runtime
metadata. Use the matching Platform API and refresh saved plans with `--new`.
Source versions and runtime admission remain independently reviewed. Release
preparation uses the existing action with exact artifact identities (#132).

Current source and release procedures are in [the workflow](../software-factory.md).
Completed migration and verification narratives remain in Git history. Keep public
CLI notes within 100 lines and the repository within 20 Markdown files; private
operational evidence stays outside this repository.
