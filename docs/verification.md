# Production candidate verification

## Final branch checks for 0.11.1 — 2026-10-16

Hosted CI on the first wrap-up commit exposed colored preview URLs, a Vinext RSC chunk-layout defect, a generated Neon factory complexity finding and the unused brace-expansion 3.x catalog advisory described below. Preview discovery now strips terminal controls while preserving diagnostics. An RSC-only final bundler output hook keeps server chunks beside Vinext's real emitted manifests, preserving client/SSR layouts and avoiding copied or synthesized modules. A two-entry Rolldown reproduction goes from one broken import to none; a cached real Void/Vinext build validates 55 server modules with no missing imports. The generated runtime harness now checks emitted relative module imports before workerd starts. The Neon factory separates URL parsing from SDK creation and passes the generated health gate; source-backed SDK sealing still passes. The approved example received only the matching build-config and override corrections, with refreshed source fingerprints.

After those corrections, the local suite passed 690 tests with two explicit skips (692 total); focused follow-up checks also passed. Hosted CI must pass again on the corrected commit before merge/release.

The final local CLI suite passed 686 tests with two explicit skips (688 total). Root lint, type checking, source hygiene, release policy, static security scanning and both real frozen pnpm patch installation suites passed. Built the CLI and inspector together, packed the CLI tarball and plugin ZIP, verified their integrity and scanned the artifacts for secrets. The approved full-stack example remains source-only under `examples/full-stack`, with one root `anhedral.json` and no provisioned resources.

The release must use a successful hosted CI candidate from the exact final main commit. Local registry DNS and listener restrictions remain as described below; the hosted generated-profile matrix, fresh packed installations, advisory refresh and inspector browser checks are release gates. Local archives are preparation evidence, not publication evidence.

## Neon Realtime option — 2026-10-16

Added optional `--neon-realtime` as live PostgreSQL query foundations, independently of `--realtime` Durable Object rooms. It selects Neon, rejects D1, requires a server and preserves the single root `anhedral.json`. Better Auth database defaults now resolve consistently regardless of flag order. The package separates server sealing and browser subscriptions; shipping reads the branch secret only from the selected backend's private runtime file. Realtime activation, allowed origins and product authorization remain manual application setup.

Reviewed the official [overview](https://neon.com/docs/realtime/overview), [query/authorization guide](https://neon.com/docs/realtime/guides/queries), [subscription guide](https://neon.com/docs/realtime/guides/subscribing) and [Drizzle example](https://neon.com/docs/realtime/examples/drizzle). Exact SDK pins are `@neon/realtime@0.1.0` and `@neon/realtime-drizzle@0.1.0`, checked against the official [October 14 release commit](https://github.com/neondatabase/neon-pkgs/commit/36f8c44bbbb52d978f243700c211c25e13f16928). The adapter's Drizzle peer range includes the existing `0.45.4` pin. Existing Neon HTTP runtime and direct transactional migration tooling are retained.

Local evidence:

- Full CLI unit run: 680 passed, two skipped, zero failures (682 total). Six additional feature tests passed separately after they were added.
- The content matrix generated 166 compatible single-option/runtime selections; all 2,646 option pairs resolved deterministically or failed selection validation. Composition also covered both realtime options together.
- Build, root lint, static security policy and package allowlist passed.
- Generated secret handling tests cover Void, Wrangler and native Vercel, backend isolation, Better Auth coexistence, invalid/missing credentials and tracked-file rejection.
- Authentic SDK source from the exact release commit was bundled for a browser target with cached esbuild and real Drizzle `0.45.4` / Neon serverless `1.2.0`. Local sealing produced randomized encrypted capabilities, stable same-query fingerprints, distinct user-scoped fingerprints and approximately 60-second expiry. Alias enforcement and Drizzle date/timestamp parsers were exercised. Client construction/close opened no socket. Fail-fast fetch/WebSocket replacements ruled out network activity.
- The committed `tests/test-generated-neon-realtime.mjs` passed against actual generated database/server/client factories with those source-backed SDK bundles. It is wired into the native Vercel and Hono/Neon generated integration profiles for execution against fresh installed dependencies in CI.

Limits: registry DNS is unavailable here, so SDK evidence uses official release source rather than a fresh published npm installation. The optional dynamic `ws` import remains in the browser bundle; source bundling passed, but workerd compilation and live subscription behavior are unverified. Branch activation, allowed origins, authorization, renewal/revocation and reconnect behavior need a real application's acceptance tests. No provider service was enabled, provisioned or deployed. Earlier release-candidate artifacts below predate this option and must be rebuilt for any release.

Verified locally on 2026-10-16 with Node.js 26.8.2 and pnpm 10.34.5.
Repository: https://github.com/anhedral/anhedral-cli, branch
`codex/project-services-dashboard`. The checkout contains uncommitted work;
this record does not identify a published release or a deployed source commit.

## Dependency management

The CLI and bundled plugin target version 0.11.1. The installed development
plugin is 0.11.0; verification used the checkout's built 0.11.1 CLI and plugin
runtime. Existing project reorganization, Void integration and reviewed braces
and node-forge patches were preserved.

Security override versions now live in `src/dependencies.ts`, alongside other
generated dependency pins. The catalog audit includes their actual package
coordinates, Renovate discovers the pins, and static policy rejects literal
override versions outside the catalog. A regression test generates Vinext,
Next.js/Cloudflare, WXT and Electron workspaces and checks every selected
override against the audited catalog. Override versions and selection rules
are unchanged.

## Completed checks

- Root and inspector frozen lockfile installs passed offline with scripts disabled.
- CLI and inspector production builds passed.
- Type checking, formatting, source hygiene, release policy and static security checks passed.
- The full CLI unit suite passed after consistency fixes: 657 passed, two explicitly skipped.
- The generated-override catalog regression passed for all four profiles.
- Package allowlist passed: 214 files in the CLI tarball.
- CLI tarball and plugin ZIP creation, artifact integrity verification and release secret scanning passed.

## Remaining release gates

- `pnpm audit:osv` cannot resolve `api.osv.dev` in this execution environment.
- Packed CLI fresh-install smoke testing was stopped after registry access stalled.
- `pnpm plugin:check` passed type checking and build, with 59 of 60 inspector tests
  passing. The preview test failed because this environment rejects listening on
  `127.0.0.1` with `EPERM`; its HTTP behavior remains unverified here.
- Generated application integration builds, browser tests, supported Node-version
  and operating-system matrices must still pass in CI.

No publication or production deployment was performed. Run the full CI matrix
on the intended committed source, then use the existing reviewed-candidate
release workflow with that commit and the CLI/plugin integrity values produced
by CI. Local artifacts are candidates and do not replace successful CI evidence.

## Dependency patch simplification

Renamed the installer to `src/dependency-patches.ts` and removed its braces-only compatibility entry point. The exact patches, upstream notices, customer-content conflict checks, LF attributes, and transactional generation/add behavior are retained.

Generated audit policy is reduced from 480 to 167 lines. It preserves raw pnpm JSON, validates reports, blocks unrelated high/critical findings, and allows only the reviewed exact advisory/version pairs with the effective pnpm patch mapping and reviewed patch SHA-256. pnpm returns absolute configured paths; policy tests cover both relative and absolute mappings. Frozen installation owns patch application and lockfile consistency; audit no longer certifies installed package trees or executes package code.

Regression probes now live only under `tests/support/`. The install fixtures no longer depend on live advisory-service responses. `npm_config_offline=true pnpm test:patch` passed with cached public packages: frozen patch installation, changed-patch rejection, braces depth/cycle and glob/watch behavior, and node-forge valid/malformed signatures through Node and both browser bundles. Deterministic audit tests cover exact exceptions, report failures, changed patches, and missing/wrong configuration.

The rebuilt CLI and inspector, full CLI suite (649 passed, two skips), focused audit-policy tests, lint, static security policy, and package allowlist passed. The stale inspector build initially blocked one unit test; rebuilding the inspector resolved it. Fresh packed installation and current external advisory-service checks retain the limitations listed above. No publication or deployment was performed.

## Consistency fixes

The owner excluded backward compatibility and upgrades of existing projects. No upgrade workflow or compatibility layer was added; current-version validation remains.

Completed fixes:

- Capability metadata and its tests now describe the implemented service status, analytics and bounded database readers; schedule execution remains unsupported and provider status is distinct from application health.
- Vercel provider names are normalized and bounded independently of package/directory names, including punctuation and long names.
- Generation/setup/diagnostics share runtime eligibility and Void selection policy. Doctor requires the pinned pnpm version.
- Root unit tests verify/reuse the inspector runtime, or install its frozen dependencies and rebuild it before packaging tests. The offline test run exercised repair of a stale runtime; the final run reused the verified result. Older CLI Node lanes continue to consume the verified CI artifact.
- Neon runtime provisioning leaves the migration package's credentials untouched. Provider next actions and generated documentation require a separate direct DATABASE_URL_UNPOOLED, SQL generation/review and explicit migration.
- Generator subprocesses have bounded execution in both verbose and captured-output modes, with timeout regressions.
- CLI and inspector use a shared service-operation dispatcher. CLI discovery includes unbound resource receipts. KV key metadata follows provider cursors; D1 schema is preserved for empty tables. D1/Neon queries use bounded projections, SQL masking and explicit row ordering; live writes can still shift offset pages.
- The generated-profile runner now invokes the existing Void fresh-build/production-preview harness after ordinary checks. The full hosted generated matrix remains unverified here.
- Generated guidance states explicitly that starters contain no application tests or test:live script. Obsolete catalog snapshot documentation is corrected.

Validation passed: CLI build; 657 CLI tests with two skips; 43 focused consistency/cursor tests; lint (including type checking, formatting, source hygiene and release policy); static security policy; offline patch install/runtime regressions; package allowlist (214 files). A real in-memory SQLite experiment additionally verified SQL masking before fetched rows, truncation, ordering and empty-table schema. Inspector type checking/build and 59 tests passed; its one preview-listener test still fails with environment EPERM on 127.0.0.1. Browser/provider acceptance, external advisory refresh and fresh packed dependency installation retain the limitations above.

No provider mutations, publication, production deployment or source commit were performed.

## Continued review: runtime state and preview failure handling

Fixed source receipt/addition transaction policy to exclude disposable Void/Vinext caches, generated Wrangler configuration and app migration mirrors. Authored database source remains tracked. The addition regression includes runtime state and a cached symlink and exercises the real staged addition path.

Fixed the generated production-preview harness to observe process errors/closure immediately, cap retained diagnostics, bound startup/build/HTTP waits, terminate process groups and escalate termination. Five real subprocess regressions cover early exit, spawn failure, ignored SIGTERM, descendant-held output pipes and excessive startup output. These tests require no listening socket.

Validation passed: CLI build; full offline CLI unit suite (663 passed, two skipped, zero failures); focused registry/preview tests (18 passed); lint; static security policy; package allowlist (214 files); and git diff whitespace checks. Root unit preparation rebuilt and verified the inspector runtime after the source change. The actual generated workerd preview, hosted matrix, fresh dependency resolution and live provider acceptance remain subject to the limitations recorded above. No provider mutations, publication or source commit were performed.

## Multistage independent review

Four subagents independently reviewed CLI/registry contracts, generated applications, delivery/provider recovery, and repository/plugin/release coherence. Cross-reviews checked each track's fixes; a final scan checked grammar, exports, state formats and documentation together.

Fixed the native-only workspace addition path so its first Cloudflare application selects the actual Void/Wrangler engine, including already registered zero-target workspaces while preserving identity/account/audience. Root engine requirements derive directly from selection. Registration now validates current setup provenance before writes and requires an explicit delivery engine. Removed the `new` compatibility alias, ambiguous add-directory parser, Wrangler-to-Void migration planner/candidate output, provider schema-1 migration, old catalog import and historical CLI-only release-verification fallback. Current OpenNext/Queues/Basin Wrangler profiles and current rollback/recovery remain supported. The private catalog now consistently uses projects naming. Updated canonical/bundled instructions and separated root/inspector Node type-definition update rules.

Generated audit guidance now describes configuration/hash verification accurately. Void backend Vite configs restore declared inspector ports and enforce strict HTTP ports. The generated API profile opts into isolated local D1/Better Auth acceptance: reviewed local SQL, ephemeral credentials, matching local origin, signup/login/session/incorrect-password/revocation assertions and cleanup. Two reviewers checked persistence, environment and adapter contracts against cached pinned sources. This gate is wired but was not executed here; no workerd runtime success is claimed.

Final validation: CLI build passed; full offline unit suite 662 passed, two skipped, zero failures (664 total); focused grammar/readiness/addition checks 30 passed; lint, static security policy, package allowlist (214 files), offline braces/forge installation/runtime regressions and whitespace checks passed. Inspector type checking/build passed and 59 tests passed; its listener test remains blocked by `listen EPERM` on 127.0.0.1. The inspector browser fixture was updated to the simplified options API and explicit engine marker and passed type checking. The packed smoke was attempted offline and stopped at ENOTCACHED for @neondatabase/serverless because that smoke intentionally uses an empty isolated npm cache. Hosted matrices, actual new auth preview, browser/provider acceptance and external advisory refresh remain unverified for this source. No provider mutation, publication, deployment or source commit was performed.

## Continued generated-runtime and package review

A further independent review reproduced a packaging hole: deleting MCP configuration allowed the packer to skip runtime verification and accept an incomplete plugin distribution. The packer now requires the current skill, documentation references, MCP entrypoint, manifest assets and runtime files and always verifies runtime integrity. Regressions remove required files or redirect the MCP entrypoint and assert rejection. Cross-review found no additional packaging defect.

Corrected public/server environment guidance against cached pinned Vinext sources. Vinext already loads app .env for local builds and maps NEXT_PUBLIC_*; Vite client values use VITE_*. Production public values belong in the build environment. Full ship can read protected untracked server values and send them through stdin to void secret; the old blanket claim that local dotenv values are never uploaded was inaccurate. Generated guidance and canonical/bundled references now agree. The Void evidence document's current version contract requires explicit engines; earlier local evidence is clearly labeled historical.

Generated a new current Hono/D1/Better Auth/R2 workspace using the repository bootstrap fixture and real composer, then linked cached dependency installations. All direct pins in the API, auth and database packages were checked against installed versions. This was not a fresh upstream bootstrap or frozen dependency installation. The actual Vite build passed, and the actual compiled health/OpenAPI handlers passed direct Node execution.

Added and ran tests/test-generated-auth.mjs against that freshly compiled output. It loads the shipped 0000_better_auth.sql into a private in-memory SQLite database, supplies the small D1 prepared-statement interface used by the actual Drizzle adapter, and dispatches requests to the real compiled generated handler. Actual Better Auth/Drizzle signup, login, session lookup, incorrect-password rejection and logout/session revocation passed. The shared assertion helper now accepts an injected transport and requires HTTP 200 for the revoked-session lookup before accepting null. This repeatable test runs in the isolated generated API CI profile before the separate workerd preview gate. It does not emulate or certify workerd, D1 provider behavior, Access, business authorization or cross-app identity.

Wrangler generated the declared binding types but its runtime-type phase stopped at listen EPERM on 127.0.0.1; the subsequent generated tsc/lint steps were therefore not run in that attempt. Actual workerd preview and the full hosted generated profile remain unverified here.

Validation: CLI build; full offline unit suite 663 passed, two skipped, zero failures (665 total); focused plugin/documentation/environment tests passed; lint, static security policy, package allowlist (214 files) and whitespace checks passed. Created a complete CLI tarball and plugin ZIP together in .artifacts/release-codebase-review, independently verified their identity/integrity, and passed the release secret scan. This is a local uncommitted candidate, not publication or hosted release acceptance. Fresh isolated npm installation and current external advisory refresh retain the earlier limitations. No provider mutation, publication, deployment or source commit was performed.

## Single root project configuration

The owner requested one anhedral.json instead of multiple Anhedral metadata files at the project root. The generator, additive composition, registration, provider setup/auth/runtime, Cloudflare/Vercel delivery and recovery, doctor, catalog and inspector now use the same envelope with identity, standard, setup, registry, providers and selected cloudflare/vercel sections. Old root filenames are neither read nor migrated. Tool-owned manifests and private .anhedral runtime journals remain separate.

Section updates validate bounded input, preserve unrelated sections, reject malformed envelopes without exposing their contents, write atomically, and share the existing source transaction lock. An interprocess regression confirms that competing configuration writers cannot overwrite each other's sections. The registry excludes the configuration file from recursive file hashing and retains independent configuration fingerprints; edited sections that regeneration would change still conflict, and whole-document comparisons detect concurrent changes. Tests cover preview immutability and preservation of provider settings and connected hosting identity. Inspector metadata is read once with persection error isolation; corrupt hosting data does not hide unrelated valid sections.

The source-only examples/full-stack now contains only anhedral.json for Anhedral root metadata. Its identity, sixteen selected services/options, six targets and unconfigured provider/account state are preserved. Example syntax/workspace validation and security checks pass; doctor still reports only the intentionally missing dependency lockfile. No services were provisioned or shipped.

Validation: CLI build; full offline unit suite 668 passed, two skipped, zero failures (670 total); focused configuration/addition checks 22 passed before the additional preservation regression; provider/auth/runtime/shipping suite 278 passed; inspector source section/catalog tests passed; lint, static security policy, package allowlist (216 files) and whitespace checks passed. Canonical/bundled instructions and browser fixtures use the unified file. Hosted/browser/workerd/live-provider and fresh dependency installation limitations remain as previously recorded. No provider mutation, deployment, publication or source commit was performed.

Inspector follow-up: type checking/build passed, 61 tests passed and the one preview-listener test remains blocked by listen EPERM on 127.0.0.1. Rebuilt runtime source/integrity checks passed.


## Retired unused brace-expansion 3.x override

The fresh OSV catalog scan flagged `brace-expansion@3.0.9` under GHSA-3jxr-9vmj-r5cp. The maintainer and reviewed GitHub advisory identify fixes on the 1.x, 2.x and 5.x lines, with no repaired 3.x version listed. The 3.x coordinate came from a blanket catalog override; it is absent from the CLI/inspector lockfiles and from all 18 accessible cached generated lockfiles inspected in the task temp directories and repository artifacts. Those generated locks contained 1.1.21 and 5.0.12.

Removed the unused 3.x catalog pin and generated major override while retaining reviewed 1.1.21, 2.1.7 and 5.0.12 overrides. No advisory exception, audit relaxation or new patch was introduced. Catalog/override regressions assert the retained coordinates and absence of the unused 3.x override. A coordinated rebuild, fresh OSV scan and generated-profile verification remain necessary before release.
