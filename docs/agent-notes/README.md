# Development notes

2026-11-21 — The generated examples check runs the four progressive CLI stages and verifies their source formatting and snapshot contents. The generated project README and agent instructions live in `assets/launch/`. See the [contributor guide](../../.github/CONTRIBUTING.md).

0.24.0 includes the source upload protections, dependency fixes, managed stack updates, and progressive examples from PR #164. Windows uploads require WSL. Private environment input files inside a project must use an always-excluded path.

2026-11-21: Restricted environment file inputs and anchored source-upload traversal at open directories. Ten focused tests passed on macOS and Linux. Native Windows uploads require WSL.

2026-11-21: Stack updates now refresh fingerprinted composition adapters and print the version-pinned apply command. Additions reject newer source versions before changing project files.

2026-11-21: Reviewed the CLI and progressive examples at `143a0c7`. Generated tooling resolved advisory-affected esbuild and minimatch versions. The updated generator scopes overrides to those versions. The runtime smoke now checks the generated lockfile and local feature tests. Private state, source ignore rules and deploy manifests use bounded descriptor reads.

2026-11-20: CLI and plugin 0.23.0 rename the storage and payment additions. Projects retain R2 and Stripe provider identifiers. The release audit required the backend generator to use the same audited Hono 4.13.18 pin as the CLI workspace.

2026-11-15: Updated CLI dependencies and TypeScript compiler; retained Node 20 types
for the supported minimum runtime. Generated dependency compositions, shipped patches
and runtime admission remain independently reviewed. No npm/plugin publication.

## 2026-11-11 Environment parser alignment

Starting CLI staging: `360f0b8`. Imported the licensed portable environment parser
from reviewed Platform main; provenance records the exact owner revision. File,
stdin and parser admission now share the exported byte limit. Typed parse errors
preserve value-free messages. Focused environment, deployment and boundary suites
passed 20 tests; TypeScript compilation, contract snapshots, source hygiene,
static security, release policy and changed-source formatting passed. No provider
operations, generated-app builds or publication were performed.

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
