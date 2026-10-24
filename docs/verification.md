# Next.js web and Expo native architecture — October 23, 2026

CLI 0.15 source preparation separates full Next.js App Router web (SSR/RSC through
Cloudflare OpenNext) from Expo iOS/Android. The UI contracts are DOM shadcn for web
and the Anhedral-maintained React Native port of shadcn for native, with shared
semantic tokens and public API contracts. Hono, Drizzle/D1 and private R2 remain
core; Stripe and RevenueCat remain the only additions.

The canonical diagram was regenerated in both themes as self-contained SVG and
1920×1080 PNG using the existing local Chrome renderer. The same SVG bytes are
mirrored by the Platform landing. This is documentation/artwork verification;
it does not establish generated-app, installed-plugin, native-device, provider,
hosted-image or production acceptance. Record runtime evidence separately.

## Next development proxy response framing — October 23, 2026

The Platform Linux image proof reproduced a failed `/api/health` response through
actual Next dev: Node fetch decoded the Hono sidecar's gzip body, but the generated
proxy retained its compressed `Content-Encoding` and `Content-Length`. The next
HTTP client attempted to decode the already-decoded response and failed.

The development HTTP proxy now removes those stale wire headers before Next
frames the response. The production service-binding path retains its existing
response handling. A real loopback HTTP server supplies a gzip response in the
regression test; all five Next web tests pass. `pnpm build` and `pnpm lint` also
pass, including typecheck, formatting, source hygiene and release-policy checks.
This evidence does not establish a deployed Platform runtime; its image and live
initialization are verified separately in the Platform repository.

The full `pnpm release:check` passed: 550 unit tests passed with one existing
skip, frozen patch installation checks passed, and packed CLI smoke and packlist
checks passed. Linux Next dev returned `200 {"ok":true}` through `/api/health`
and `200 null` through `/api/auth/get-session` after applying the generated fix.

## CLI 0.15 generated runtime acceptance — October 23, 2026

The implementation agent recorded the following local evidence for the unpublished
0.15 source preview, with Next.js web separate from Expo native:

- Complete generated `pnpm check` passed: lint, typechecks, Fallow with zero issues,
  dependency audit, available tests and builds. A manual fixture rsync temporarily
  overwrote its patch policy; after restoring the ordinary-init policy, the full
  check passed. This was a test-harness issue, not an initialization result.
- The packed tarball completed ordinary initialization, including staged dependency
  resolution, patches and frozen installation; doctor and target checks passed.
- Both iOS and Android Hermes exports passed, with output retained locally at
  `/tmp/anhedral-next-native-final-export`. This is export evidence, not device,
  screen-reader, store or native interaction acceptance.
- Production OpenNext running in local workerd passed SSR/RSC, guarded account,
  cookie roundtrip, signup, reload, sign-in/sign-out and rejected native-origin
  checks. Browser acceptance reported zero errors. The final typography-only
  OpenNext rebuild passed: 5474.81 KiB upload, 1130.07 KiB gzip and 44 assets;
  its additional browser/layout rerun was still pending when this entry was written.
- Root Turbopack development reached first compile/browser readiness in 4825 ms.
  A source edit reached HMR in 790 ms, preserving window state with zero browser
  errors. Webpack development failed reproducibly in
  `WasmHash._updateWithBuffer` with an undefined `length`; production webpack and
  OpenNext builds passed. The supported default development path uses Turbopack.

A small warm-workerd comparison used three fresh Chrome contexts before the final
heading CSS adjustment. Next readiness was 115/90/78 ms, transferred bytes were
172418/172089/172092 and FCP was 72/40/40 ms. The earlier Expo baseline medians
were 149 ms readiness, 438928 transferred bytes and 48 ms FCP. These are tiny local
samples with a warm server, not universal performance claims or live deployment
measurements. They do not establish a consistent FCP improvement.

No npm publication, installed-plugin update, hosted-image activation, production
deployment, real payment or physical-device acceptance is established by these
checks. Final serialized CLI/plugin/reference checks follow this documentation
update and must be recorded separately if they expose further failures.

# Focused core verification — October 23, 2026

The 0.14.0 source intentionally narrows initialization to Expo + Hono + Drizzle/D1 + private R2, supporting Better Auth and styling, with only Stripe and RevenueCat additions. This supersedes the older catalog scope in the historical evidence below. Existing applications/resources were not migrated or deleted. Compiled 0.13 output was preserved locally before rebuilding; output and credentials remain ignored rather than committed.

Validation of this change:

- CLI build, typecheck, formatting/hygiene, release policy and static security passed.
- Complete CLI unit suite after the streamlining pass: 545 passed, one platform-conditional skip, zero failures (546 tests).
- Codex plugin check: typecheck/build and 61 tests passed; browser smoke 11/11 passed using installed Chrome.
- Packed CLI installed/executed successfully; packlist allowlist passed (222 files, approximately 543 KB compressed at this validation).
- OSV audit passed for all 56 unique locked/catalog dependency versions.
- Generated all four supported selections in isolated tests; offline init, authored-source preservation, addition rollback/conflicts, private secret exclusion and generator provenance covered.
- Private-file route tests against real Hono passed: anonymous and cross-user rejection, upload/download/delete, origin protection, actual streamed size enforcement and misleading Content-Length.
- Installed generated both-payment workspace: lint and typecheck across seven packages, Fallow audit with zero issues, dependency audit under existing reviewed local-patch policy, Hono Worker bundle, Expo web export and gateway bundle passed. Generated pnpm test currently has no default product tests; successful execution alone is not test coverage.
- Real local workerd: exported Expo routes, gateway service binding, isolated local D1 authentication/session/revocation and native scheme/origin handling passed.
- Actual generated Hono/Better Auth/Drizzle signup/login/session/revocation passed with in-memory SQLite. Generated Stripe/RevenueCat billing reconciliation tests passed with synthetic vendor responses, including idempotency, webhook replay/order, ownership/CSRF, expiry/revocation, provider union and outage/retry recovery.

The follow-up streamlining pass removed obsolete alternate-stack adapters and unused bootstrap test fixtures, aligned human help/plugin defaults with the supported stack, and removed a retired dependency's secret-scanner exemption. Regression tests cover actual core catalog paths and payment-only suggestions. CLI build/lint/static security, all unit tests, plugin check (61 tests), packed smoke and package allowlist passed again. The final package remains 222 files, approximately 543 KB compressed. README instructions distinguish the source candidate from a published npm release.

Worktree recovery review also recovered a one-line inspector safe-area correction: project details now retain host top padding through the shared CSS variable. Two new browser regressions exercise 24px and 112px insets through project/tab/list navigation. Plugin typecheck/build and all 61 plugin tests passed; browser smoke passed 13/13 using installed Chrome. This simulates the host layout contract and does not claim installed native-host acceptance.

The CLI presentation follow-up restores a connected static default-stack diagram in both themes, with only Stripe and RevenueCat marked optional. The README, stack guide, npm documentation and plugin references carry valid image targets. Only the two PNGs are added to the npm package; editable SVG/layout/logo source remains documentation source. CLI build/lint, documentation/plugin contracts, packed smoke and packlist passed (224 files, approximately 793 KB compressed). The platform landing mirrors the canonical SVGs rather than maintaining a second diagram layout. Artwork does not certify provider activation or deployment.

Local staging acceptance generated a fresh core application through ordinary init, including dependency installation and Git initialization. Drizzle generation reported no schema changes; the generated lint, typechecks, Fallow/dependency audit and web/Worker builds passed. Local D1 migrations were applied explicitly. Browser acceptance reproduced a return-to-sign-in race after sign-out: the API accepted the new session while the account hook still held the earlier anonymous state. The generator now mounts the session hook on sign-in and awaits its refresh after server verification, before navigating. This follows the supported [Better Auth session hook](https://better-auth.com/docs/basic-usage#use-session).

The expanded real-workerd browser regression passed signup, protected account, reload, sign-out, sign-in again, another reload and mobile viewport checks in a newly generated application. Local D1 session/revocation and native scheme/origin transport checks passed. Independent live local R2 checks exercised upload/download/delete, forced attachment headers, anonymous rejection, cross-user read/delete isolation, mutation-origin rejection and the 1 MiB bound. CLI build/lint and all 545 unit tests passed with one conditional skip. Logs are retained locally under `/tmp/anhedral-staging-init-*` and `/tmp/anhedral-staging-default-flow*.log`; generated applications and private local state remain ignored. These checks exercise web and API transport, not native-device execution.

No cloud provisioning, real payment, configured-database migration, deployment, app-store/device acceptance, npm publication or installed-plugin update occurred. Existing installed runtimes remain separate from this source candidate. Historical provider reports below are dated evidence, not current live verification.

---

# Verification record

Dated records below describe the source and environment exercised at that time. Earlier results are historical evidence, not acceptance of a later release. Current architecture and operating instructions live in the stack standard and software factory.

## README stack catalog and static artwork — 2026-10-19

Replaced the README Mermaid diagram with dark/light static artwork. After reviewing the earlier connected reference, refined the illustration to Expo web/iOS/Android → Hono → Better Auth / Drizzle + D1 / private R2, with Cloudflare hosting, native distribution, shared UI/contracts and workspace tools. Large icons, short labels and thin curves follow the landing hero style. The caption explicitly preserves plain init's Expo-only selection; backend/auth/data are added when needed. The README retains the under-construction notice, early starting commands, all CLI selections and upstream documentation for 117 named ecosystem options.

Local validation: all 38 registry entries remain represented in the retained catalog; CLI build, four documentation-contract tests and the npm packlist policy passed. Inspected rendered artwork for icons, connections and label spacing. No CLI runtime behavior, provider configuration or deployment changed. GitHub/npm image URLs will show this artwork after the assets reach main.

## Full Cloudflare default and optional shared billing — 2026-10-18

New plain initialization and new Expo selections include Expo web/iOS/Android, Hono, Better Auth, Drizzle/D1 and private R2. Explicit Neon replaces D1. WXT-only initialization adds an extension to that default; explicit primary applications preserve their compatibility selection. Existing saved selections and unrelated additions do not receive new profile defaults. Legacy billing SDK/guidance projects require their pinned CLI or an explicit reviewed migration; strict provenance was preserved.

Stripe and RevenueCat are independently optional. Generated shared contracts, Expo web/native billing adapters, authenticated Hono Checkout/portal/identity/entitlement routes and a server enforcement example are connected. The authenticated subject is the RevenueCat App User ID. Server-only Drizzle tables store account/customer ownership, fenced reconciliation snapshots and an idempotent webhook inbox. Stripe signatures use raw request bodies; RevenueCat requires configured Authorization and supports HMAC with timestamp checks. Canonical provider reads reconcile grants instead of trusting event order or client purchase state. A bounded scheduled retry drains pending events. Access caches expire within sixty seconds and never outlive provider expiry; stale access fails closed during outages. Provider environments and native public keys remain isolated from private credentials.

Checkout guards nonterminal subscriptions independently of entitlement state, including refunded or past-due subscriptions. Verified open same-plan sessions are reused across distinct intents; another pending plan returns a conflict. Root client error handling gives safe conflict guidance. SDK operations fence native identity changes; RevenueCat logout failure cannot prevent Better Auth session revocation. R2 remains a private binding: each product must implement file ownership checks before exposing file routes.

Local evidence:

- CLI build, lint and static security checks passed. The full unit suite passed with 743 passing, zero failures and two existing skips (745 total); the focused release-scanner regression also passed. The scanner correction exempts only adjacent empty assignments in example files; populated secrets and JavaScript multiline credentials remain detected.
- Retained `examples/billing-reference` was generated with `--stripe --revenuecat`; its final full `pnpm check` passed, including client/server/Worker types, Fallow, dependency audit, static web export and both Worker dry builds. Reviewed reference migration source is `0001_billing.sql`; no configured database was migrated. Final iOS/Android Hermes exports passed with the real optional RevenueCat native package and account-transition adapters.
- `pnpm test:billing` passed against the compiled generated Hono Worker, real Better Auth/Drizzle SQL and Stripe SDK, with synthetic vendor HTTP responses and in-memory SQLite. It covered authenticated account isolation, strict plans/body/origins, deterministic retries, open-session reuse, duplicate-sale guards, server enforcement, independent optional providers, Stripe/RevenueCat grant union, refund/revocation, cancellation versus expiry, trial/past-due behavior, native transfers, invalid/stale signatures, environment/app scope, duplicate/out-of-order events, concurrent lease fencing, stale-cache outage denial and durable scheduled recovery. SQLite fixtures do not certify Cloudflare D1 semantics; vendor fixtures do not certify provider/store acceptance.
- A final fresh `node tests/test-generated-apps.mjs universal-billing` passed initialization/install, generated SQL/check/build, local workerd/D1/R2 auth and the compiled billing proof, including open-session reuse and duplicate-sale guards. The hosted CI matrix now includes this reproducible profile.
- Real local workerd, service bindings, D1 and private R2 loaded successfully. Chrome verified signup, protected account/reload, sign-out and mobile viewport behavior. An initial concurrent-edit run observed Worker reload/session unavailability; the unchanged assertions passed after source writers stopped. No timeout or security assertions were relaxed.
- Main repository `pnpm check` and `pnpm build` passed. The five local Anhedral skills passed frontmatter/UI-metadata YAML and local-reference checks. CLI build refreshes bundled references; an installed plugin is not silently updated.

Billing provider products/prices, webhook ingress and credentials, RevenueCat project/store policy, signed native builds and real sandbox purchases still require owner configuration and acceptance. Native exports are not device tests. Nothing was provisioned, deployed or published; no financial provider writes, charges or remote migrations were performed. Earlier dated records remain historical evidence of their own source/environment.

## Universal Expo default — 2026-10-18

New plain initialization selects Expo web/iOS/Android in `apps/mobile`, Hono in `apps/api`, shared contracts/styling and Wrangler delivery on Cloudflare. SDK 57 exports static web assets behind a thin API-binding gateway. Explicit Vinext/Next.js selections and existing projects remain supported. Better Auth selects a database and generates browser/native session adapters, exact application-scheme trust, SecureStore integration and account screens. Billing entitlements and the portal publisher remain separate implementation work.

Local evidence:

- CLI build, lint, static security policy and the full unit suite passed: 740 passing, zero failures and two existing conditional skips (742 total). Coverage includes gateway forwarding/caching/failure behavior, API-first target order, public build-variable isolation, native cookie rotation and server/browser/native auth boundaries.
- Retained `examples/universal-reference` was generated from the local CLI with `--better-auth --no-git`. Its complete `pnpm check` passed, including lint, client/server/gateway types, Fallow, dependency audit, static web export and both Worker dry builds. Its lockfile and source are retained; generated outputs remain ignored.
- `pnpm test:reference --browser` passed against real local workerd, an API service binding and disposable D1. It exercised health/exported routes, signup/login, protected contracts, incorrect-password rejection, sign-out/revocation, forged identity-header rejection, native scheme/cookie transport and untrusted-scheme rejection. Headless installed Chrome verified account creation, the protected account screen, reload, sign-out and a 390px viewport without horizontal overflow. The helper creates local synthetic credentials/state, applies migrations only with `--local`, refuses existing configured private files and cleans its processes/files.
- A second fresh `node tests/test-generated-apps.mjs universal-auth` passed initialization, installation, full generated `pnpm check` and the real workerd/D1 gateway acceptance flow, proving the retained example does not depend on manual source repairs.
- Final iOS and Android Hermes exports passed with the platform-specific auth and development-client modules. This proves bundler compatibility, not an installed native build or device session persistence.
- Main repository `pnpm check` and `pnpm build` passed. Five local Anhedral skills passed YAML/frontmatter/UI-metadata and local-reference validation.

The browser preview currently needs a new static export for changes; it does not provide web HMR. Arbitrary unknown dynamic URLs require explicit routing/rendering design. Physical-device/simulator native acceptance, native compilation/signing, deployed Cloudflare behavior, store purchase sandboxes and complete billing synchronization remain unverified. No cloud provisioning, remote migration, deployment, package publication or installed-plugin update occurred. Earlier records below retain their original source/environment scope.

## Default Hono backend — 2026-10-18

New initialization includes Hono and framework-independent Zod/HTTP contracts. Web remains Vinext/Cloudflare by default; explicit native Next.js/Vercel calls the API through a server-only configured URL. Cloudflare web/API service bindings, cookie-preserving same-origin transport, selected database bindings/factories and Better Auth routes/session UI are generated together. Database and identity remain opt-in. New routes still need product authorization. Existing registry metadata remains compatible; readiness and additions do not apply new backend defaults to old selections.

Local validation:

- CLI build and lint (types, formatting, source hygiene and release policy) passed. The unit suite passed with 738 passing and two skipped tests, including shared-client response validation and Vercel server-credential transport checks. The composition matrix now validates 200 supported combinations.
- A fresh `node tests/test-generated-apps.mjs web-auth` completed initialization/install, generated `pnpm check` (including Fallow and dependency audit), build, real Vite/workerd web→API service binding, rendered auth screen, signup/login, protected session, invalid-password rejection, signout and revocation. Compiled Worker/Drizzle auth also passed against isolated in-memory SQLite; both generated Workers passed production-runtime local previews. Test data and credentials were synthetic/local; migrations were never applied to a configured production database.
- An isolated generated native Next.js/Vercel + Hono/Neon profile passed its full `pnpm check` and build after regeneration with the current scaffold. No live Neon database or protected Vercel-to-Cloudflare deployment was exercised. Its API URL and optional Access service credentials remain explicit deployment configuration.
- A copy of the original HEAD generator produced real old web-only, Hono-only and combined Hono/web/auth receipts. Current readiness accepted each; adding Resend preserved its API source and did not silently generate/migrate contracts. Pre-contracts Hono web/auth additions require an explicit migration.
- The five local skills in the main repository passed frontmatter/UI-metadata parsing and local-reference checks. Main repository `pnpm check` and `pnpm build` passed for the checked working state. Historical verification records remain intact.

The Expo/RevenueCat/Stripe sequence is a documented implementation roadmap, not generated native authentication, store purchases or verified billing behavior. No cloud provisioning, remote migrations, deployment, package publication or installed-plugin update occurred. Provider access/protection, native/device acceptance, store sandboxes and real billing remain separate verification work.

## Maintenance practices — 2026-10-18

Added the software factory's evidence-driven maintenance workflow and connected it to the CLI's root `AGENTS.md`, contribution/PR guidance, shipped Anhedral skill and generated application instructions. It covers removal evidence for published/generated consumers, operational flag dependencies, focused changes, causal flaky-test diagnosis and controlled instruction comparisons. Existing uncommitted CI work was preserved. These instruction changes have not been evaluated through comparative agent task replays; no model cost or quality improvement is claimed.

Local CLI build, generator and plugin package contracts (`node --test tests/test-standard.test.mjs tests/test-plugin.test.mjs`, two tests passed), source hygiene, changed TypeScript formatting and `git diff --check` passed. Build refreshed bundled canonical references. Skill YAML parsing passed using the repository's YAML library, and package contracts checked bundled Markdown reference targets. The skill-creator Python validator could not start because PyYAML is unavailable. No full release gate, provider acceptance, publication or installed-plugin update was performed for this local workflow change.

### CLI integration verification — 2026-10-18

Reviewed the pending maintenance guidance and documentation-only CI changes together with the Windows pnpm PATH fix. Ordinary contribution and PR-template Markdown now takes the documentation path; registry matrix preparation is skipped for that path. Source, shipped plugin instructions, unknown comparison history and manual runs retain full checks. Regression coverage includes source-to-document renames, whitespace failures, generated instructions preserving existing framework guidance, and earlier pnpm shims taking precedence over later native executables.

Local CLI and optional inspector builds passed with a 384 MB Node heap cap. All 16 targeted tests passed across CI scope, release-candidate policy, command execution, generated guidance, documentation contracts, plugin packaging/workflow and standard generation. Root lint (types, formatting, hygiene and release policy), static security policy, package allowlist (227 files, 607781 packed bytes) and `git diff --check` passed. The first plugin workflow check correctly rejected a stale runtime; rebuilding the inspector resolved it. Frozen inspector dependency installation changed no lockfiles. Build refreshed bundled references. Hosted CI, the full cross-platform/generated-app matrix, browser acceptance, current external advisory refresh, publication and installed-plugin updates were not performed in this focused pass.

## Release candidate 0.12.0 — 2026-10-16

This candidate combines the CLI/service refactor with optional Cloudflare Stream live video and consolidated documentation. Stream supplies a server-only management factory; billing activation, input ownership, broadcast/player UI, signed playback and live media acceptance remain explicit integration work. The README links into three maintained documents: the stack standard, software factory and this dated evidence record. Provider, CLI, dashboard, Void and codebase-review material is retained in those documents; packaging and plugin references use the same sources.

Local validation on the assembled candidate passed CLI build, lint/type checking/formatting, source hygiene, release policy, static security policy and the full CLI suite (729 passed, two existing skips; 731 total). Package allowlisting passed with 227 files. The generated Stream management source compiles; request tests cover explicit playback privacy, bounded account/input identifiers and sanitized HTTP/JSON failures. Composition covers Vinext, Hono, native Next.js and OpenNext. A pre-existing README link to unpublished source was changed to its GitHub URL after package validation caught it.

The first hosted generated-profile pass caught a complexity finding in the Stream response parser across Vercel auth, Neon API and Worker-service profiles. Validation is now split into private field/endpoint/input readers without changing public behavior or weakening the gate. The generated source passes the same Fallow 3.33.1 complexity threshold locally, with a maximum cyclomatic complexity of four; expanded malformed endpoint regressions pass. Complete generated profiles still require the updated hosted run. The local patch-installation regression attempt timed out during its registry-dependent pnpm step; hosted release checks must establish those frozen-install regressions.

Inspector type checking and build passed; 61 of 62 tests passed locally, with the preview listener test blocked by this session's loopback `listen EPERM` restriction. Hosted CI must establish the full listener/browser, generated-profile, clean-install, advisory and supported OS/Node gates before publication. Local Git metadata writes and shell network access are restricted; the connected GitHub integration is used for source delivery. These local results do not claim publication, a newly installed plugin or live Stream acceptance.

## Refactoring coherence review — 2026-10-16

Completed the six reviewed refactoring areas: CLI dispatch and delivery routing, human result formatting, mobile build orchestration, source transaction locking, Cloudflare delivery evidence, and Vercel project/provider helpers. Public imports through `src/index.ts`, `src/delivery.ts` and `src/vercel.ts` retain their existing entry points. Command options come from the same schema as help and validation; initialization and source-preview selection retain their specialized parsers. The CLI design guide records the resulting module boundaries.

Follow-up reading traced the extracted helpers through lifecycle locking and recovery, provisioning, provider authentication/readiness, mixed-stack shipping, management output, service inspection, inspector bundling and release packaging. A normalized function-body comparison against HEAD confirmed that all 42 extracted transaction-lock, Cloudflare evidence and Vercel project helper functions are unchanged apart from their export modifiers. Mobile orchestration preserves the whole-flow lifecycle lock, source rechecks, provider identity checks, credential filtering and journal-before-submission ordering. Unknown EAS submissions still block further mutations; queued builds resume by recorded ID. Provider-specific blocked states and mixed-stack preflight remain intact.

The review also consolidated the unchanged Vercel CLI version into the shared dependency catalog. Authentication and delivery now consume one audited, Renovate-tracked pin. A regression checks both command paths against that catalog version. Other regressions cover schema-driven argument collection, 26 human-output contracts captured before extraction, initial EAS project linking and foreign-owner rejection, alongside the earlier D1 and CLI error fixes.

Fallow 3.33.1 found no dependency cycles after extraction. The measured orchestration functions are smaller: `main` has cyclomatic complexity 11 (previously 74), `runDelivery` 5 (121), `formatResult` 2 (117), and `executeMobileBuild` 10 (88). These are per-function measurements reflecting decomposition; they do not establish lower total branching or measured test coverage. Existing complex lifecycle and validation functions remain subject to their domain tests.

Final local validation passed: CLI build; lint, type checking, formatting, source hygiene and release policy; static security policy; 723 CLI tests with two existing skips (725 total); inspector type checking and 22 focused service, inspection, MCP and integrity tests against the rebuilt runtime; package allowlist (228 files); and `git diff --check`. Fresh packed installation, external advisory refresh, browser/listener checks and live provider acceptance remain unverified in this restricted environment. Changes are local and uncommitted.

## Codebase review and service fixes — 2026-10-16

D1 table discovery now uses SQLite GLOB patterns for the literal internal prefixes `sqlite_` and `_cf_`. The previous LIKE patterns treated underscores as single-character wildcards and hid valid application tables. A real in-memory SQLite regression exercises table discovery and browsing, preserves `acfxrecords`, `_cfXrecords` and `sqliteXapp`, and excludes Cloudflare and SQLite internal tables. This regression skips explicitly on Node versions without `node:sqlite`; the current local run executed it.

CLI inspection failures now report `INSPECTION_FAILED`, service-operation failures report `SERVICE_FAILED`, and service grammar errors use the existing `CliArgumentError` / `INVALID_ARGUMENT` contract. Subprocess regressions verify nonzero status, empty stdout, structured stderr and command-specific next actions. Unknown commands retain their existing classification. The CLI and inspector guides describe the behavior; the build refreshed the bundled inspector reference.

Continued review covered workspace composition and additions, source transaction recovery, provider provisioning and private runtime configuration, Cloudflare/Vercel/mobile delivery and recovery, inspector transport/data boundaries, canonical stack/factory documentation and release artifact verification. Fallow 3.33.1 analyzed 258 files under the repository configuration and found no dependency cycles. Command dispatch (`runDelivery`, `main`), result formatting and mobile delivery remain complexity hotspots. Source-only example imports and published/runtime-facing exports require contextual review; static findings were not used as deletion proof. The inspector is excluded from that Fallow configuration and was reviewed separately.

Validation: build, lint/typecheck/format, source hygiene, release policy and static security checks passed. The full CLI suite passed 693 tests with two existing skips (695 total). Inspector type checking and 22 focused inspection, service, MCP and archive-integrity tests passed against the rebuilt runtime. The package allowlist passed (218 files); `git diff --check` passed. Fresh packed installation, generated-runtime/browser checks, external advisory refresh and live provider acceptance are not established by these local checks. No provider resources, deployment, publication or source commit was changed.

## Final branch checks for 0.11.1 — 2026-10-16

Hosted CI on the first wrap-up commit exposed colored preview URLs, a Vinext RSC chunk-layout defect, a generated Neon factory complexity finding and the unused brace-expansion 3.x catalog advisory described below. Preview discovery now strips terminal controls while preserving diagnostics. An RSC-only final bundler output hook keeps server chunks beside Vinext's real emitted manifests, preserving client/SSR layouts and avoiding copied or synthesized modules. A two-entry Rolldown reproduction goes from one broken import to none; a cached real Void/Vinext build validates 55 server modules with no missing imports. The generated runtime harness now checks emitted relative module imports before workerd starts. The Neon factory separates URL parsing from SDK creation and passes the generated health gate; source-backed SDK sealing still passes. The approved example received only the matching build-config and override corrections, with refreshed source fingerprints.

After those corrections, the local suite passed 690 tests with two explicit skips (692 total); focused follow-up checks also passed. Hosted CI must pass again on the corrected commit before merge/release.

The next hosted run passed 34 of 35 jobs, including real workerd web/API previews, Better Auth/D1 session lifecycle, fresh published Neon SDK wrappers and the advisory scan. Its remaining Clerk preview lacked private runtime configuration. The isolated anonymous-rendering fixture now supplies disposable public/private test keys, refuses existing private files, removes its owned environment file and reports bounded, redacted server diagnostics on HTTP failure. Seven focused preview tests pass; live Clerk identity remains outside this fixture's scope. Final hosted CI remains the merge/release gate.

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

Corrected public/server environment guidance against cached pinned Vinext sources. Vinext already loads app .env for local builds and maps NEXT_PUBLIC__; Vite client values use VITE__. Production public values belong in the build environment. Full ship can read protected untracked server values and send them through stdin to void secret; the old blanket claim that local dotenv values are never uploaded was inaccurate. Generated guidance and canonical/bundled references now agree. The Void evidence document's current version contract requires explicit engines; earlier local evidence is clearly labeled historical.

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

## Void delivery verification

This records the implementation's evidence and remaining acceptance work. It is not a release certificate. Update the live results when an operation completes; retain sanitized target/version identifiers and actual acceptance results rather than diagnostic output.

### Version contract

- Anhedral development checkout: `anhedral@0.11.1`.
- Direct Cloudflare delivery: exact `void@0.27.0`.
- Void runtime requirement: Node `>=24.21.0` (checked before execution).
- Workspace package manager: `pnpm@10.34.5`.
- The published Void package distribution and its bundled documentation were inspected. Installed executable version and app dependency pin must agree.

Current Cloudflare configuration requires an explicit `deliveryEngine` in the `cloudflare` section of `anhedral.json`. Supported Void profiles select `void`; explicit OpenNext, Queues/DLQ and Basin profiles select `wrangler`. Missing or unsupported markers are rejected. No existing-project migration workflow is provided.

### Historical local evidence: initial Void integration

These results describe the earlier integration snapshot. They do not certify the current uncommitted candidate; subsequent local reviews are recorded in the consolidated verification record.

The initial Void/coherence local CLI suite passed **608 of 608 tests**, with zero failures. The inspector suite passed **60 of 60 tests**. Build, typecheck, formatting, source hygiene, static security policy, packed CLI smoke and package allowlist checks passed. The corrected OSV audit passed for **85 unique locked and direct-catalog package versions**; the inspector dependency audit also reported no known vulnerabilities. This does not audit every generated application’s transitive dependency graph.

The normal generated combined workspace installed **395 packages** without extra harness dependency pins. Actual fresh builds passed for **Vinext 1.1.0 with Void 0.27.0** and **Hono**. Workerd returned HTTP 200 for rendered HTML, its client asset, API health and OpenAPI. A separate services profile covered D1/R2/KV/AI plus cron build/preview gates; the compiled scheduled handler was preserved and invoked successfully. Readiness responses contained an actual Worker version UUID.

Wrangler applied the generated local D1 migration `0000_better_auth` (10 commands). The shared Better Auth/D1 runtime passed signup, login, cookie/session lookup, incorrect-password HTTP 401, logout and session revocation through `tests/test-void-local-auth.mjs`. These are actual local runtime checks rather than mocked provider tests. They do not prove Cloudflare provisioning, production secrets, visitor Access policy enforcement or remote rollback.

The earlier generated dependency audit passed with a local `braces` backport and `fflate@0.7.5`; its raw advisory report still contained one high finding. The bundled backport system has since been removed at the owner’s request. A subsequent owner-approved change adds one narrowly scoped standard pnpm patch for `braces@3.0.3`, while retaining the upstream pnpm audit report and all advisory findings. The owner subsequently approved a verification gate for the one exact patched advisory, described below. The earlier backport audit gate remains removed; its result does not establish a passing audit for newly generated applications.

Additional regression coverage includes non-object JSONL records, canonical configuration/lock merging, and resolved bindings with authored placeholders. The final integrated count above includes this regression coverage.

The automated checks cover the pinned JSONL receipt format, rejection of stale/foreign/incomplete/ambiguous receipts, independent provider version confirmation, source cleanliness, explicit current engine validation, private policy reconciliation, and the lock-review checkpoint. Mocked Cloudflare responses establish control flow; they do not establish provider/runtime compatibility.

### Deployment evidence contract

Void 0.27.0 writes a new `~/.void/logs/deploy-*.jsonl` per invocation. Anhedral requires exactly one new matching log with:

1. A `deploy_start` record identifying the exact target working directory and a timestamp after invocation began.
2. One `cloudflare_deploy_end` record with `ok: true`, the expected Worker name and a complete version ID.
3. A final `deploy_end` record with `ok: true`.

This contract was inspected in the published distribution, rather than inferred from console prose. The recorded version must independently own 100% of current Cloudflare traffic. Application source and configuration are checked before and after deployment. Void's direct Cloudflare log does not contain a Git commit annotation; Anhedral correlates the checked invocation and its receipt with the clean source commit. Missing or ambiguous logs stop acceptance even when provider changes may have occurred.

Application URLs require provider evidence: enabled Workers subdomain plus account subdomain, or a matching custom-domain assignment. Private Access policies are checked before and after activation. Selected resource identities and private R2 exposure are independently inspected after Void resolves resources.

Void lock changes are expected on initial provisioning. If only the allowed target `void.lock.json` files change, activated version receipts are retained with release state `configuration-required`. Review and commit those files, then ship the clean configuration. Such a checkpoint cannot pass `verify` or serve as a complete rollback release. Arbitrary source changes still fail delivery. Database migrations remain applied during code rollback.

### Reproduce local checks

From the CLI repository:

```sh
pnpm build
pnpm typecheck
node --test tests/test-void-state.test.mjs tests/test-void-execution.test.mjs tests/test-void-migrations.test.mjs tests/test-delivery.test.mjs tests/test-delivery-lock.test.mjs tests/test-ship.test.mjs
pnpm test:unit
```

Use the repository's installed Node/pnpm versions. Avoid concurrent builds because the build script replaces shared `dist/` output.

### Live acceptance

Customer Cloudflare authentication succeeded using workspace-scoped Wrangler state. No credential contents belong in this document. A reproducible authentication pattern is:

```sh
XDG_CONFIG_HOME="$PWD/.anhedral/cloudflare-auth" pnpm exec wrangler login
XDG_CONFIG_HOME="$PWD/.anhedral/cloudflare-auth" pnpm exec wrangler whoami --json
```

The actual Void authentication bridge also succeeded against the customer account with `accountConfirmed: true`. Credentials were supplied through the child-process environment, and no credential was persisted by the bridge. This is read-only authentication evidence, not deployment evidence.

The source-coherence review removed obsolete release helpers, diagram assets, stale plugin wrappers and duplicate dependencies; fixed bounded inspection of resolved Void locks; and brought CI runtimes and delivery documentation in line with the implementation. Browser UI acceptance was attempted but could not launch Chromium because the host denied its macOS Mach-port registration. The browser suite remains unverified in this environment. Hosted CI on commit `06bce77173cd8a122a35c3e04a7e210e4fd9d78c` subsequently passed the dashboard browser suite, both plugin checks, four CLI test lanes, eight macOS/Windows portability jobs and CodeQL. That evidence applies to that commit; subsequent changes require their own checks.

The executable read-only live preflight was also run using the workspace-scoped login. It exited with status 1 and structured `providerMutations: false`, `ready: false` before any cloud writes. Reproduce against the intended customer account and an existing generated fixture:

```sh
XDG_CONFIG_HOME="$PWD/.anhedral/cloudflare-auth" \
WRANGLER_LOG_PATH=/tmp/anhedral-void-live-preflight.log \
node tests/test-live-void.mjs --account <customer-account-id> --fixture /absolute/generated-workspace
```

The preflight can prepare an isolated local fixture with `--prepare-only /absolute/new-unused-path`; this scaffolds and builds locally and does not perform remote acceptance or publication.

Authentication alone does not prove provisioning, runtime builds, private access or deployment. Authenticated read-only preflight succeeded for the Workers account subdomain. The same login received HTTP 403 from Access organizations (provider code `10000`) and Access applications (provider code `9999`). No deployment or other provider mutation was performed. Private live acceptance is blocked until the authorized account has usable Access organization/application/policy permissions. Public deployment is not a substitute for the requested private acceptance. Separately, the Cloudflare dashboard explicitly shows that Zero Trust onboarding must be completed for this account. The dashboard observation and API permission errors are distinct evidence; the 403 responses alone do not establish their cause. In particular, do not infer that the complete Vinext plus Hono/shared database/auth combination works from local unit tests.

The acceptance workspace must exercise:

- Fresh-checkout installation and build using pinned versions.
- Vinext and Hono Workers with reusable shared packages.
- Existing D1/private R2 identity reuse, one migration owner, serialized resource creation and committed lock reuse across a new checkout.
- Environment validation, production secret stdin upload and public build variables.
- Private Access protection before activation, anonymous rejection, allowed user login and denied user behavior.
- Actual routing, assets, authentication and streaming responses.
- Initial lock review checkpoint followed by a clean provider-confirmed release and meaningful `test:live`.
- Failed build/deployment recovery and rollback without claiming migration reversal.

Watch the interaction between private Access's pre-created empty Worker and Void's existing-Worker checks, and between the first target's lock changes and later targets' secret upload guards. Validate both rather than weakening privacy or source checks.

For an authorized disposable application, use the built CLI's `connect`, `ship --dry-run`, `ship`, `status --refresh`, `verify`, and reviewed `rollback` commands. Preserve resource ownership and inspect partial operations before retrying. This document does not authorize additional provider resources or expenses.

### Handoff

Keep the customer-owned account, committed application manifest, `anhedral.cloudflare.json`, `void.config.ts`, `env.ts`, reviewed SQL and each app's `void.lock.json`. Keep secrets out of source. Local `.anhedral/` history and Void diagnostic logs are separate operational evidence; a fresh checkout cannot reconstruct historical source-to-version mappings from current provider versions. `recover` reports a current snapshot and does not fabricate historical verification.

### Generated dependency review (2026-10-15)

Hosted generated-profile checks on `d117f402faa6d899f972152f242b18026a45053b` failed. They are distinct from the passing CLI/plugin checks. Root-cause analysis found several independent paths to `braces`, including:

| Consumer                | Dependency path                                                                     | Required structural remediation                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Every inherited starter | Shared ESLint config → Next ESLint plugin → fast-glob → micromatch → braces         | Declare framework lint tooling only in the web application; retain generic shared lint coverage |
| Vinext                  | vite-plugin-commonjs → vite-plugin-dynamic-import → fast-glob → micromatch → braces | Upstream consumer migration with CommonJS, development and SSR/RSC behavior verified            |
| WXT styling             | Tailwind CSS 3 → chokidar → braces                                                  | Supported Tailwind/toolchain migration, including generated styles and builds                   |
| Expo                    | React Native Metro config → Metro tooling → glob matching dependencies → braces     | Compatible Metro/Expo dependency migration                                                      |

The current [CVE-2026-93687 advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) affects `braces <=3.0.3` and lists no patched version. npm’s latest is still `3.0.3`. [Proposed fix #72](https://github.com/micromatch/braces/pull/72) is closed without merging. The maintainer disputes the advisory’s security interpretation in [issue #70](https://github.com/micromatch/braces/issues/70); the advisory remains active. The separate [CVE-2024-4068](https://github.com/advisories/GHSA-grv7-fg5c-xmjg) was fixed by `3.0.3`, which does not resolve the newer advisory.

The failure is recursive AST processing of deeply nested glob patterns. Remote exploitability depends on whether an application passes attacker-controlled patterns to those operations; the presence of a development dependency alone does not establish an exploitable deployed endpoint. No complete reachability review has been performed for every generated profile.

An unqualified `fast-glob` → `tinyglobby` package alias is incompatible: consumers use different exports and directory expansion defaults. Removing the global starter dependency is an Anhedral composition fix, not proof that every supported framework is free of `braces`. Do not clear the audit gate or claim production acceptance until the resolved graphs and relevant runtime checks pass. The same generated CI also reports a separate `node-forge` advisory in Expo/WXT tooling, which is outside the `braces` remediation.

The shared-lint ownership change was checked against the actual upstream template manifest: a newly resolved pnpm graph contained 169 packages and none of `@next/eslint-plugin-next`, `fast-glob`, `micromatch` or `braces`; its standard pnpm audit reported no known vulnerabilities. This is evidence for the shared lint foundation only, not the entire generated application matrix. App-local web linting explicitly selects JavaScript/TypeScript/JSX/TSX files rather than relying on ESLint’s default JavaScript selection.

Validation of the scoped composition change passed 613 CLI unit tests with the real lint probe enabled, 60 inspector tests, builds, lint, static security policy, OSV checks for 86 root/catalog versions, and the package allowlist. The five lint tests include actual Next Image/Link and React Hooks diagnostics, full recommended/Core Web Vitals rule configuration, TypeScript/JSX parsing and adding web after an API-only scaffold. A helper now exercises installed rules in generated web CI profiles. A fresh local upstream shadcn initialization was attempted but its `ui.shadcn.com` request was refused by the network proxy; no fresh full generated-app matrix success is claimed.

### Temporary braces patch verification

The depth-only mitigation is based on official `braces@3.0.3`, tarball integrity `sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==`. Both the unmodified baseline and patched package passed all 764 tests from the published release source (`74b2db2938fad48a2ea54a9c8bf27a37a62c350d`). The bounded verifier passed 360 differential compile/expand/stringify comparisons, depth 100/101 and mixed/literal boundaries, deep direct ASTs, child cycles and expansion-parent cycles. Expansion width/range behavior and stringify parent handling remain unchanged.

This establishes the tested library mitigation, not a complete application exposure analysis or an upstream fixed release. The upstream registry report remains unmodified. The owner-approved gate accepts only the exact patched braces advisory after verifying installed bytes and regressions. Separate Expo/WXT findings and the remaining private Cloudflare acceptance gaps remain independent.

A real pnpm fixture resolved `braces@3.0.3` with micromatch, fast-glob and chokidar consumers, merged the exact patch, resolved the new lock and installed with `--frozen-lockfile --ignore-scripts`. The installed bytes passed the depth verifier and normal filesystem glob/watch checks. Changing the patch after resolution made a frozen install fail; restoring its bytes restored successful installation. The untouched pnpm audit JSON still reported `GHSA-vfj7-8cjw-p6xm` for `3.0.3` and was retained locally as test evidence. Both the patch and MIT notice are recorded in generated source fingerprints; customer artifacts and YAML patch entries are preserved or rejected on conflict.

Release-exception assessment: the evidence supports the tested depth mitigation for the exact patched version. It does not support a blanket advisory waiver, other versions, unrelated findings or a claim that every generated installation has been exercised. Any later exception must be constrained to the advisory/version and independently verified installed bytes, reviewed for the intended release, and retired with the patch. The owner subsequently approved and restored the exact verified exception below; other findings remain blocking.

The generated exact-path Git attributes preserve LF bytes with `core.autocrlf=true`; a real index/checkout round trip verifies the patch and license remain identical. The patch’s SHA-256 is `69bd65a37da4569ba0be8a044aa732ad7c2ebd5494d6076f966eb6df8a12756e`.

Final local validation of the mitigation passed 628 CLI tests without skips, 60 inspector tests, build/typecheck/lint, static secret/security scans, OSV checks for 87 root/catalog versions, package allowlist and packed CLI smoke. The packed installation test invokes the installed patch helper and compares generated patch/license bytes with the shipped assets. These results establish the tested mitigation, not completion of all generated-profile or live acceptance requirements.

### Restored verified advisory handling

The owner approved restoring the earlier verification-aware behavior for one package/advisory. `pnpm audit:deps` now invokes the bundled gate, preserving raw pnpm JSON in `.anhedral-audit-report.json` and printing the known upstream finding. Only `GHSA-vfj7-8cjw-p6xm` for `braces@3.0.3` can pass through this exception. Verification requires the pinned patch checksum, every discovered installed copy matching the reviewed full-package hash, and bounded depth/cycle regression checks. Unpatched/tampered copies, unknown versions, malformed or incomplete reports, command failures, and unrelated high/critical findings fail.

This restores the working patch-plus-verification behavior without the removed multi-package backport framework. It does not claim an upstream fixed release or waive the independent Expo/WXT findings or private Cloudflare acceptance work.

Validation of the restored gate passed 634 CLI tests without skips and 60 inspector tests, build/typecheck/lint, static security policy, package allowlist and packed CLI smoke. The real frozen pnpm fixture covered an npm dependency alias, accepted the exact verified mitigation, preserved the upstream audit JSON, rejected both patch-file and installed-package tampering, and passed again after restoration. The packed CLI writes the audit gate from its distributed asset.

### Hosted release follow-through (2026-10-16)

Hosted CI on `83e83e476fba8a052fb3c73aaa0e3b59659231bc` passed the Linux braces installation gate, all four CLI Node-version checks, portable macOS/Windows checks, inspector checks, plain Vercel, Next.js/Cloudflare (including Better Auth), desktop on Linux/macOS, Worker services and Vercel services. Other generated profiles exposed Void entrypoint discovery and duplicated database configuration, corrected in the subsequent source changes. These results are profile-specific, not a successful full matrix or live deployment.

The same hosted run independently confirmed that extension and combined-client profiles fail on `GHSA-86w9-cpqp-85rv` in `node-forge`. The [current advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) covers versions through 1.4.0 and has no patched release; [upstream PR 1152](https://github.com/digitalbazaar/forge/pull/1152) remains unmerged. Current Expo CLI and extension-runner dependency paths still require this package. A framework version upgrade alone does not establish remediation.

The prior Node-main patch was evaluated separately against the official 1.4.0 release source (`fa385f92440879601240020f158bed68e444e83a`): baseline and patched versions each passed 828 tests with four upstream pending cases; the malformed-signature regression failed before and passed after patching. The aggregate harness neutralized an upstream `describe.only` so the complete suite actually ran. At that checkpoint the source-only patch did not update the package's prebuilt browser bundles and was not accepted. The completed bundle remediation and verification below supersede that earlier candidate.

Fresh pnpm resolution confirmed that Void's `^1.63.1` Cloudflare Vite dependency could select 1.64.0, whose Wrangler peer requirement exceeds Anhedral's validated pin. The Void recipe now pins that transitive edge to 1.63.1, sharing the existing version source, preserving customer override entries and leaving unrelated recipes untouched. The exact 1.63.1/4.149.0 pair passed fresh resolution and an actual Vinext/Void Vite build. Generated Worker acceptance reads the emitted Vite Worker configuration and verifies its actual entry artifact, instead of expecting the legacy Wrangler output path.

### Completed node-forge remediation

The final exact-version mitigation covers `lib/rsa.js`, `dist/forge.min.js` and `dist/forge.all.min.js` from official `node-forge@1.4.0`, rather than accepting an unpatched distribution path. The patch is 1,177,827 bytes because unified diffs include complete minified lines; the actual guard changes are limited to nested DigestAlgorithm cardinality and strict DER NULL contents. The minified predicates implement the same source guard, and their trivial one-line source maps remain valid. The upstream BSD attribution is retained.

Patch SHA-256: `2cbbff9183d2896f13da8c8655b8f598b0f24c9b7477e8230f9a313f806c239f`. Reviewed full installed-tree SHA-256: `2e3a4c3aa2e8f3235d9dd9b3f21698c7aa88983ba9623f1502029386316380e4`. The official tarball integrity is `sha512-LarFH0+6VfriEhqMMcLX2F7SwSXeWwnEAJEsYm5QKWchiVYVvJyV9v7UDvUv+w5HO23ZpQTXDv/GxdDdMyOuoQ==`.

For each of the three published entrypoints, forced pure-JavaScript RSA verification preserved 11 valid cases and rejected all 30 malformed cases across six digest algorithms. The official unpatched package accepted 23 malformed cases, so the regression distinguishes the fix. The complete official Node suite passed 828 tests with four upstream pending cases against the final source patch. Exact Node 24.21/pnpm 10.34.5 frozen installation with direct and aliased dependencies passed and reproduced the reviewed bytes and all-entrypoint behavior.

The audit gate extends its fixed policy to the one additional exact advisory/version only after patch checksum, every installed package tree and bounded runtime probes pass. It retains the raw upstream advisory and rejects unrelated high/critical findings. It is a verified local mitigation, not an official upstream fixed release. The removed open-ended multi-package manifest/backport framework remains absent.

CI now prepares a reviewable Linux release candidate on Node 24.21 after its checks, verifying artifact integrity, scanning for secrets and executing the exact packed CLI. It uploads the candidate with one-day retention; this step cannot publish and does not change required reviews or main-commit release checks.

Consolidated local validation passed 649 CLI tests without skips, 60 inspector tests, build/typecheck/lint, static security policy, package allowlist and packed CLI smoke. Both real frozen-install fixtures passed, including original braces glob/watch behavior and node-forge source/browser-bundle tamper rejection. The packed CLI carries and stages both exact patches and upstream notices. The combined candidate still requires the full hosted matrix and the repository’s existing code-owner review before publication.

Installed-graph verification recognizes explicitly optional peer dependencies as well as ordinary optional dependencies. A missing peer is skippable only when the parent declares the peer and marks it optional, with no competing required dependency declaration; present dangling links, outside paths and missing required packages still fail. Missing required-package diagnostics include an escaped project-relative path. All 650 CLI tests passed after this change.

### Incremental dependency installation repair

The remaining existing-project acceptance case exposed a real pnpm 10.34.5 installation defect. In an API/Neon project, `tslib@2.8.1` was initially skipped through optional `@emnapi/runtime`. Adding WXT introduced required `async-mutex -> tslib`, and the newly resolved lock recorded it as required, but the incremental frozen installation retained the old skipped state and omitted the package. The original verifier correctly rejected this missing required dependency. Optional-peer support is independently valid and does not hide this defect.

Removing only generated root `node_modules` and running an ordinary frozen installation completed in 5.6 seconds on the original failing graph. The reviewed lock remained exactly `b412f3758702f52968e564a99fcac618ea6be89697a05e301e4bad4807a04906`; the dependency was installed, its skipped state cleared, and both the original collector and full verified audit gate passed. Workspace links and the separate content-addressed package store were retained.

Actual additions now rematerialize that generated cache before frozen installation and check that the lock bytes remain unchanged. Linked or non-directory cache paths are rejected before cleanup. Source, reviewed patches and lock ownership remain intact. The alternate `--fix-lockfile` command was rejected because it rewrote the reviewed lock despite `--frozen-lockfile`; `--force` is not used.

The final cache-regression run passed all 652 CLI tests without skips, 60 inspector tests, lint and static security policy. Focused cases cover stale generated cache removal with package-store preservation, linked-cache refusal and frozen-lock byte drift.

### Simplified dependency patch policy (2026-10-16)

This supersedes the installed-tree and runtime audit-gate design described in the historical checkpoints above. `src/dependency-patches.ts` installs both exact-version patches and notices while preserving customer policy and source files. Generated audits retain the raw pnpm report and accept only the two reviewed advisory/version pairs, with the effective pnpm patch mapping and bundled patch checksum. Frozen pnpm installation applies the patches and checks lockfile consistency. The audit no longer traverses installed dependencies, hashes package trees, or executes package code.

Runtime coverage lives in this repository: the braces fixture checks depth/cycle guards and normal glob/watch consumers; the forge fixture checks valid and malformed signatures through Node and both browser bundles. Both fixtures check frozen installation and changed-patch rejection. Audit-policy tests use deterministic reports to cover unknown advisories, other versions, critical findings, malformed reports, command errors, missing/wrong mappings, and changed patch bytes. Live advisory-service availability is independent of these regression tests; generated `pnpm audit:deps` still queries the actual service.

## CLI and generated application review

Reviewed 2026-10-16 against the uncommitted 0.11.1 checkout. This report describes the current source and local evidence, not a published release. Backward compatibility and upgrades of existing projects are explicitly outside the owner's requirements.

### Review process

Four independent review tracks examined CLI and registry contracts, generated applications, delivery/provider recovery, and repository/plugin/release cohesion. A second stage cross-reviewed the changes across tracks. A final stage checked command grammar, public exports, generated guidance, removed compatibility paths, runtime prerequisites and packaging policy together.

The review covered command parsing/help/JSON failures, registry selection and staged additions, workspace composition, web/API/native/extension recipes, shared database/auth packages, environment conventions, dependency patches, current Cloudflare engines, provider receipts and credential separation, partial operations, deployment/rollback/recovery evidence, project catalog, inspector/MCP, CI, release verification and package contents. Existing structural suites exercise generated combinations; they do not establish every runtime integration.

### Completed corrections

| Area                                             | Current behavior                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dependency patches                               | A generic installer owns the exact pnpm patches. Generated audit policy verifies only reviewed advisory/version pairs, effective patch configuration and patch hashes. Installed-package/runtime regressions belong to repository tests. Generated guidance now describes that boundary accurately.                                                                                                                |
| First Cloudflare app added to a native workspace | The selected runtime determines the actual Void or Wrangler output. Configuration, root Node engine, documentation and delivery manifest agree. A previously registered zero-target workspace keeps its identity, account and audience when selecting its first engine.                                                                                                                                            |
| One project configuration                        | Root metadata now lives in `anhedral.json`: identity, standard, setup, registry, provider settings and selected Cloudflare/Vercel sections. Old filenames are not read. Section updates preserve unrelated settings, share the source transaction lock, and retain edit/concurrency protection through separate configuration fingerprints. The local full-stack example uses this same format.                    |
| Current delivery manifest                        | `deliveryEngine` is explicit and validated. Registration validates the current setup plan before writing application state. Missing/unknown engine markers and incomplete setup plans fail without rewriting the manifest.                                                                                                                                                                                         |
| CLI grammar                                      | `init [directory]` is the initialization command. `add <items...>` operates in the current project; `--cwd <directory>` selects another project. The `new` compatibility alias and ambiguous positional add-directory parser are removed from help, implementation, examples and test harnesses.                                                                                                                   |
| Compatibility remnants                           | Removed the Wrangler-to-Void migration planner, `voidCandidate` outputs, old provider journal migration, catalog import shim and historical CLI-only release-verification fallback. Unsupported saved formats fail rather than being converted.                                                                                                                                                                    |
| Current Wrangler profiles                        | Explicit OpenNext, Queues/dead-letter recovery and Basin selections retain the required Wrangler implementation. Those are current supported selections. Additions do not mix engines or relocate existing runtime ownership.                                                                                                                                                                                      |
| Project catalog                                  | Private schema fields, files, locks and the default directory consistently use `projects`. Catalog registration, inspector startup, MCP fixtures and documentation agree; no old catalog migration is retained.                                                                                                                                                                                                    |
| Toolchain policy                                 | Generation, setup and diagnostics share Node eligibility and engine selection. Doctor requires the exact pnpm pin. Root and inspector Node type-definition update rules are scoped independently.                                                                                                                                                                                                                  |
| Root verification prerequisites                  | Unit tests verify/reuse the inspector runtime or prepare its frozen dependencies and rebuild it. Packaging cannot accept a stale source digest.                                                                                                                                                                                                                                                                    |
| Service operations                               | CLI and MCP share one dispatcher. Receipt-only selectors are discoverable, KV follows provider cursors, and D1/Neon browsing uses bounded projections, SQL masking and explicit ordering. Offset pages remain subject to concurrent writes.                                                                                                                                                                        |
| Neon migration handoff                           | Runtime provisioning does not put pooled credentials into the migration package. Guidance requires separate direct migration credentials and reviewed SQL.                                                                                                                                                                                                                                                         |
| Optional Neon Realtime                           | `--neon-realtime` selects Neon consistently with Better Auth and adds separate server/client factories for sealed live queries. Durable Object rooms retain `--realtime`. Branch activation is manual; the beta has no RLS. SDK source sealing checks and generated composition pass; live subscriptions and a fresh published SDK installation remain unverified. See the dated record in `docs/verification.md`. |
| Provider naming                                  | Vercel names are normalized and bounded independently of package/directory names.                                                                                                                                                                                                                                                                                                                                  |
| Disposable runtime state                         | Source receipts and addition transactions exclude Void/Vinext caches, generated Wrangler configuration and app migration mirrors. Authored database files and shared reviewed SQL remain source.                                                                                                                                                                                                                   |
| Process execution                                | Generator commands have bounded execution. Preview tests register lifecycle listeners immediately, bound output/startup/build/HTTP waits, and terminate descendant processes with forced cleanup when necessary.                                                                                                                                                                                                   |
| Generated development ports                      | Void backend Vite configurations use their declared per-app inspector ports and strict HTTP ports. Generated routing instructions identify the actual Worker entry adapter.                                                                                                                                                                                                                                        |
| Generated acceptance wiring                      | Generated-profile checks invoke a compiled-handler SQLite auth gate and fresh Void build/preview acceptance. The isolated D1/Better Auth API profile additionally applies local migrations and exercises signup, login, session retrieval, incorrect-password rejection and revocation with temporary credentials and a matching local origin.                                                                     |
| Plugin completeness                              | Packaging requires the current skill, references, MCP entrypoint, manifest assets and verified runtime. Missing MCP configuration cannot bypass runtime verification.                                                                                                                                                                                                                                              |
| Public and server environment                    | Vinext maps `NEXT_PUBLIC_*` during builds; Vite clients use `VITE_*`. Production public values belong in the build environment. Protected local server values can be sent to `void secret` via stdin; dotenv files remain private and untracked.                                                                                                                                                                   |
| Release identity                                 | Verification requires both CLI and matching plugin archives. Canonical documentation is regenerated into the bundled plugin references. The immutable marketplace `plugins/anhedral` release-tree path remains a consumer contract. Bundled guide filenames now match the canonical `stack-standard.md` and `software-factory.md`.                                                                                 |

The cross-reviews found no further confirmed defect in the reviewed changes. That is a source-review result, not proof that every supported combination is production-ready.

### Verification for this pass

| Check                                                     | Result                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI build                                                 | Passed                                                                                                                                                                                                                                                                                 |
| Full CLI unit suite                                       | 668 passed, two skipped, zero failures; 670 total                                                                                                                                                                                                                                      |
| Focused CLI grammar/readiness/addition tests              | 30 passed                                                                                                                                                                                                                                                                              |
| Delivery/provider focused suite                           | 174 passed before final consolidation; covered again by the full suite                                                                                                                                                                                                                 |
| Root lint                                                 | Passed: type checking, formatting, source hygiene and release policy                                                                                                                                                                                                                   |
| Static security policy                                    | Passed                                                                                                                                                                                                                                                                                 |
| Offline patch installation/runtime regressions            | Passed for braces and node-forge                                                                                                                                                                                                                                                       |
| Package allowlist                                         | Passed: 214 files                                                                                                                                                                                                                                                                      |
| Inspector                                                 | Type checking/build passed; 61 tests passed; one listener test blocked by `listen EPERM` on `127.0.0.1`                                                                                                                                                                                |
| Fresh packed CLI installation                             | Offline attempt blocked by `ENOTCACHED` for `@neondatabase/serverless` in the smoke test's isolated empty npm cache                                                                                                                                                                    |
| Fresh generated API build and compiled handlers           | Passed with current generator overlays and version-checked cached dependency links: Vite build, health/OpenAPI, and real Better Auth/Drizzle SQL/session flow against in-memory SQLite. This used the bootstrap fixture, not a new upstream download or fresh dependency installation. |
| Generated workerd/type generation                         | Workerd preview remains unexecuted; Wrangler runtime type generation attempted and blocked by `listen EPERM`.                                                                                                                                                                          |
| Complete local release candidate                          | CLI tarball/plugin ZIP created together, independently integrity-verified and secret-scanned; not published or installed.                                                                                                                                                              |
| Hosted generated matrix, browser flows and live providers | Not established for this uncommitted candidate                                                                                                                                                                                                                                         |
| Current external advisory databases                       | Not refreshed in this pass                                                                                                                                                                                                                                                             |

The listener and empty-cache failures are environment limitations, not proven application defects. Earlier dated local/provider results in the Void delivery section below apply to their recorded source and do not substitute for testing this candidate.

### Remaining acceptance work

1. Run the complete hosted OS/Node and generated-profile matrices against the intended commit, including the newly wired local auth path and inspector browser tests.
2. Establish a fresh packed dependency installation and refresh external advisory results for that candidate.
3. Exercise private first deployment, committed resource-lock reuse from a fresh checkout, partial deployment recovery, and provider-confirmed rollback with the intended customer accounts and Access permissions.
4. For an implemented product, verify protected business data, denied users, tenant isolation and any cross-app/native/extension identity flows. The scaffold's auth session smoke does not implement or certify those product behaviors.

No provider resources, publication, production deployment or source commit were performed during this review. Detailed local evidence and prior pass results are recorded in `docs/verification.md`.


## Progressive stack — local checkout, 2026-10-18

Plain initialization now selects Expo only. Capability dependencies resolve to a
fixed point; the compatible full-product preset includes Cloudflare AI, analytics,
media, realtime and jobs plus WXT, billing, email and monitoring. Existing edited
source and backend/delivery ownership remain protected. Legacy full-stack records
above describe earlier defaults and are retained as historical evidence.

Real generated `universal` (minimal) and `full-product` profiles passed dependency
installation and `pnpm check`, including lint, type checks, Fallow, dependency audit,
tests and builds. Full-product built Expo web, WXT, Hono and service Workers. These
were isolated temporary projects; no configured database was migrated or provider
resource deployed. The full-product check exposed unused helper dependencies and
duplicate transport code; shared server transport and lazy Hono adapters fixed the
actual findings without suppressing the generated checks.

Focused regressions exercise minimal selection, provider independence, preset
overrides, read-only previews, adding auth/billing without overwriting an edited
home screen, data added after service adapters, scoped media calls, private image
responses and redacted invalid provider JSON. The stack page's Mermaid diagram was
rendered locally. The six local plugin skills passed frontmatter/link validation.

Remaining acceptance: account/service activation and permissions, actual AI/event
receipt/image/video behavior, RealtimeKit calls, app room authorization, native
build/device/store flows and live payment reconciliation. No release, installation,
publication, production deployment or source commit was performed.

Final regression run: `pnpm test:unit` reported 750 tests, 748 passed, two skipped,
zero failures. `pnpm typecheck`, `pnpm format:check`, `pnpm check:hygiene`,
`pnpm check:security`, `pnpm check:release-policy`, CLI build and inspector/plugin
build passed. Additional growth coverage confirms direct billing additions retain
native RevenueCat key examples in the consuming app and preserve API-origin entries.

## 0.13.0 release preparation

The candidate changes plain init to a minimal Expo app, adds dependency-resolving
capabilities and a full-product preset, and packages six focused skills with shared
plugin-wide references. README and the concise stack page use the same progressive
diagram. Historical generated reference apps retain their original provenance.

Local `pnpm release:check` passed: lint/typecheck/format/hygiene/release policy,
static security policy, refreshed OSV audit, 748 passing tests (two skipped), exact
braces/node-forge patch regressions, packed CLI installation and package allowlist.
`pnpm plugin:check` passed, including 62 inspector tests. Release artifact creation,
hosted CI and publication are recorded separately after they actually complete.

### 2026-10-19 — release CI corrections and artifact reuse

- Hosted generated-profile checks exposed an unused web API-client stub in Clerk builds and Wrangler ready URLs without trailing slashes. Emit the web client/dependency only for its Better Auth consumer; normalize both Vite and Wrangler loopback URLs. Both Clerk profiles subsequently passed real local generation, check, build and Worker preview. Universal auth and billing reference previews passed with the corrected readiness parser.
- Provider-call assertions in billing fixtures now compare exact hostnames, addressing CodeQL substring findings without changing provider transport.
- Publication consumes the immutable candidate from successful trusted main CI for the exact reviewed SHA instead of reinstalling and rebuilding it. CLI/plugin integrity pins, secret scan, package smoke, cross-platform artifact checks, protected npm environment and OIDC publication remain required. Negative policy checks reject staging, PR-run or unpinned candidate selection.

## 2026-10-21 — focused staging releases and CI tiers

Adopted topic PRs into `staging` and focused staging-to-main release PRs. Routine
code CI uses one Linux Node 24 CLI lane and one plugin lane; release candidates
retain supported Node, macOS/Windows, both plugin toolchains and all generated
profiles. Removed the duplicate E2E packed-CLI job. Stable `CI gate` fails on scope
errors or applicable failed/skipped jobs. Candidate upload is restricted to trusted
main CI. Reviewed-integrity dispatch, npm OIDC/provenance, immutable tags and
existing maintainer/CodeQL review requirements are preserved. Renovate targets staging.

Local build, typecheck, lint, release-policy and release-tooling checks passed.
Scope/promotion, candidate and plugin packaging regression checks passed. Full unit
suite passed with pinned pnpm 10.34.5: 750 passed, two optional runtime checks
skipped, zero failures. actionlint 1.7.12 passed (optional shellcheck/pyflakes disabled).
Initial checks caught a broken bundled relative documentation link and an obsolete
candidate-condition expectation; both were corrected. The host's pnpm 11 first
rejected the inspector's pnpm-10 override configuration; rerunning with the declared
version avoided a lockfile change. This is source/fixture evidence, not live provider
acceptance or a new npm publication. Adoption source takes effect on main after its
release PR merges; main remains the default branch.

Hosted adoption PR #39 subsequently exposed generated-project blockers: desktop
rejected Vite advisory GHSA-587h-7wmj-h5pm, and clients rejected duplicate affected
versions in advisory data. The generated dependency/advisory sources are unchanged
by this conventions diff; these failures are retained as release blockers for a
separate focused maintenance PR. Added fail-fast matrices and made portability/
generated jobs wait for primary checks to avoid spending on an already-failing
candidate. Hosted checks must pass before promotion/publication.

GitHub settings could not be applied: the authenticated account reports push access
but admin=false, and the attempted ruleset update returned HTTP 404. Existing rules
are unchanged. PR #39 lists the exact administrator prerequisites, including both
main rulesets, CI gate, merge commits and disabling automatic staging deletion.


## 2026-10-21 correction — lightweight hosted checks on both branches

The owner clarified that large hosted checks are unacceptable on staging **and**
production. Earlier release-matrix proposals above are superseded. Automatic PR
CI now has one Linux CI gate on both branches; no full suite, generated project,
browser or platform matrix expands at promotion. Expensive validation is optional
and explicitly manual, or local. Main has no duplicate push check. CLI candidate
packaging is requested manually on main; publication keeps exact SHA/artifact,
secret/integrity, protected npm approval, provenance and tag checks while using a
single Linux artifact smoke lane instead of the six-job native matrix. Main repo
PRs fetch only the formatter, not the full application dependency graph. Its deploy
scripts no longer repeat full checks/tests, while retaining main/source guards,
affected-service detection and the selected app's necessary build/typecheck/upload.

The corrected lightweight CLI gate passed locally: compile, formatting, source
hygiene, static security/release policy, fast contract tests and release-tooling
negative paths. actionlint passed for automatic, manual-validation and publishing
workflows. The dependency/advisory repair remains a separate staging PR.

## 2026-10-21 — generated dependency/advisory repair

Reproduced three live OSV findings on desktop's pinned Vite 7.3.6:
GHSA-587h-7wmj-h5pm, GHSA-698v-4r3x-3vcv and GHSA-r825-w8mm-5pxw.
The upstream repaired 7.x release is 7.3.7; the desktop recipe now pins it without
a major upgrade. Sources: https://github.com/advisories/GHSA-587h-7wmj-h5pm
and https://github.com/vitejs/vite/releases/tag/v7.3.7.

A real pnpm 10.34.5 clients audit also emitted two Vite 7.3.6 findings for the
extension and desktop dependency paths. Its severity metadata counted both
instances. The audit verifier now permits repeated versions at distinct paths,
preserves both counts and the raw report, and rejects duplicate version/path
entries. New regressions cover count mismatches, unknown high advisories and
exact reviewed-patch requirements with repeated versions. No advisory was added
to an exception list and no severity threshold changed.

Validation used Node 24.21.0 and pnpm 10.34.5. `pnpm test:all` passed: build, lint,
static security policy, live OSV audit of 110 locked/catalog coordinates, 751 unit
passes with two optional skips, frozen patch probes, packed CLI installation and
packlist checks. The 12 focused audit/scaffold checks passed. Fresh real desktop
and clients profiles passed generation, frozen install, lint/type/audit/tests/build
and unsigned macOS Electron packaging; clients also exercised Expo and WXT outputs.
The clients gate still requires its existing reviewed braces/node-forge patches;
raw advisories remain visible. Initial parallel generator runs collided in shadcn's
shared temporary clone directory; rerunning sequentially resolved that setup failure
without changing tests or adding retries. These results do not establish Windows,
Linux, signed macOS distribution or store acceptance. Hosted PR checks provide
separate evidence. This focused repair has no version bump or npm publication.


## 2026-10-23 — Product family naming

Positioned Anhedral CLI as the starter foundation in the README and software factory, alongside Anhedral Platform, Anhedral Agents, and Anhedral Cloud. This documentation change does not publish a package or activate provider services. Validation: Git whitespace checks; canonical software-factory reference refreshed through the normal build.


## 2026-10-23 — Generated audit dependency security recovery

The managed-email recovery release check refreshed OSV and found two advisories
against the existing generated Fallow 3.33.1 pin: GHSA-h4fr-cmh5-qr62 and
GHSA-jfwm-3p3c-6hx5. Both upstream advisories identify 3.34.0 as the patched
version. Pin the generated audit tool to that version; keep audit admission and
all existing security gates enabled. No provider resources or databases changed.

CLI build, lint/typecheck/format/hygiene/release policy, focused dependency/Next
contracts (11 tests) and refreshed OSV audit (61 locked/catalog versions) passed.
Publication of the integrated candidate remains separate.


## 2026-10-23 — Nova authentication form recovery

The current Next/native default already contains the recovered native shadcn
foundation and Base Nova Button (#49). Recover the source-owned Base UI Nova
Input and Label from the retained CLI snapshot and use them on generated web
sign-in forms. Preserve the existing MIT notice and upstream provenance hashes;
adapt only the local utility import, client boundary and focus ownership. Input
delegates keyboard focus to the generated global rule rather than adding a
second focus-only border/ring layer. Other historical components remain preserved
in the recovery branch and are not installed as unused starter code.

CLI build/lint/typecheck/format/hygiene and five Next contract tests passed.
The integrated generated web fixture passed Next route/type generation and lint
with these recovered controls. Browser interaction and final integrated release
checks are recorded with the managed-email recovery.
