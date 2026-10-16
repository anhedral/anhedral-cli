# Void delivery verification

This records the implementation's evidence and remaining acceptance work. It is not a release certificate. Update the live results when an operation completes; retain sanitized target/version identifiers and actual acceptance results rather than diagnostic output.

## Version contract

- Anhedral development checkout: `anhedral@0.11.1`.
- Direct Cloudflare delivery: exact `void@0.27.0`.
- Void runtime requirement: Node `>=24.21.0` (checked before execution).
- Workspace package manager: `pnpm@10.34.5`.
- The published Void package distribution and its bundled documentation were inspected. Installed executable version and app dependency pin must agree.

New supported Cloudflare applications select Void explicitly in `anhedral.project.json`. Existing manifests without an engine marker retain Wrangler. OpenNext, queue/DLQ and Basin selections currently retain the legacy engine; this transition does not establish native Void framework compatibility for those recipes.

## Local evidence

The initial Void/coherence local CLI suite passed **608 of 608 tests**, with zero failures. The inspector suite passed **60 of 60 tests**. Build, typecheck, formatting, source hygiene, static security policy, packed CLI smoke and package allowlist checks passed. The corrected OSV audit passed for **85 unique locked and direct-catalog package versions**; the inspector dependency audit also reported no known vulnerabilities. This does not audit every generated application’s transitive dependency graph.

The normal generated combined workspace installed **395 packages** without extra harness dependency pins. Actual fresh builds passed for **Vinext 1.1.0 with Void 0.27.0** and **Hono**. Workerd returned HTTP 200 for rendered HTML, its client asset, API health and OpenAPI. A separate services profile covered D1/R2/KV/AI plus cron build/preview gates; the compiled scheduled handler was preserved and invoked successfully. Readiness responses contained an actual Worker version UUID.

Wrangler applied the generated local D1 migration `0000_better_auth` (10 commands). The shared Better Auth/D1 runtime passed signup, login, cookie/session lookup, incorrect-password HTTP 401, logout and session revocation through `tests/test-void-local-auth.mjs`. These are actual local runtime checks rather than mocked provider tests. They do not prove Cloudflare provisioning, production secrets, visitor Access policy enforcement or remote rollback.

The earlier generated dependency audit passed with a local `braces` backport and `fflate@0.7.5`; its raw advisory report still contained one high finding. The bundled backport system has since been removed at the owner’s request. A subsequent owner-approved change adds one narrowly scoped standard pnpm patch for `braces@3.0.3`, while retaining the upstream pnpm audit report and all advisory findings. The owner subsequently approved a verification gate for the one exact patched advisory, described below. The earlier backport audit gate remains removed; its result does not establish a passing audit for newly generated applications.

Additional regression coverage includes non-object JSONL records, canonical configuration/lock merging, and resolved bindings with authored placeholders. The final integrated count above includes this regression coverage.

The automated checks cover the pinned JSONL receipt format, rejection of stale/foreign/incomplete/ambiguous receipts, independent provider version confirmation, source cleanliness, compatibility with legacy manifests, private policy reconciliation, and the lock-review checkpoint. Mocked Cloudflare responses establish control flow; they do not establish provider/runtime compatibility.

## Deployment evidence contract

Void 0.27.0 writes a new `~/.void/logs/deploy-*.jsonl` per invocation. Anhedral requires exactly one new matching log with:

1. A `deploy_start` record identifying the exact target working directory and a timestamp after invocation began.
2. One `cloudflare_deploy_end` record with `ok: true`, the expected Worker name and a complete version ID.
3. A final `deploy_end` record with `ok: true`.

This contract was inspected in the published distribution, rather than inferred from console prose. The recorded version must independently own 100% of current Cloudflare traffic. Application source and configuration are checked before and after deployment. Void's direct Cloudflare log does not contain a Git commit annotation; Anhedral correlates the checked invocation and its receipt with the clean source commit. Missing or ambiguous logs stop acceptance even when provider changes may have occurred.

Application URLs require provider evidence: enabled Workers subdomain plus account subdomain, or a matching custom-domain assignment. Private Access policies are checked before and after activation. Selected resource identities and private R2 exposure are independently inspected after Void resolves resources.

Void lock changes are expected on initial provisioning. If only the allowed target `void.lock.json` files change, activated version receipts are retained with release state `configuration-required`. Review and commit those files, then ship the clean configuration. Such a checkpoint cannot pass `verify` or serve as a complete rollback release. Arbitrary source changes still fail delivery. Database migrations remain applied during code rollback.

## Reproduce local checks

From the CLI repository:

```sh
pnpm build
pnpm typecheck
node --test tests/test-void-state.test.mjs tests/test-void-execution.test.mjs tests/test-void-migrations.test.mjs tests/test-delivery.test.mjs tests/test-delivery-lock.test.mjs tests/test-ship.test.mjs
pnpm test:unit
```

Use the repository's installed Node/pnpm versions. Avoid concurrent builds because the build script replaces shared `dist/` output.

## Live acceptance

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

## Handoff

Keep the customer-owned account, committed application manifest, `anhedral.cloudflare.json`, `void.config.ts`, `env.ts`, reviewed SQL and each app's `void.lock.json`. Keep secrets out of source. Local `.anhedral/` history and Void diagnostic logs are separate operational evidence; a fresh checkout cannot reconstruct historical source-to-version mappings from current provider versions. `recover` reports a current snapshot and does not fabricate historical verification.

## Generated dependency review (2026-10-15)

Hosted generated-profile checks on `d117f402faa6d899f972152f242b18026a45053b` failed. They are distinct from the passing CLI/plugin checks. Root-cause analysis found several independent paths to `braces`, including:

| Consumer | Dependency path | Required structural remediation |
| --- | --- | --- |
| Every inherited starter | Shared ESLint config → Next ESLint plugin → fast-glob → micromatch → braces | Declare framework lint tooling only in the web application; retain generic shared lint coverage |
| Vinext | vite-plugin-commonjs → vite-plugin-dynamic-import → fast-glob → micromatch → braces | Upstream consumer migration with CommonJS, development and SSR/RSC behavior verified |
| WXT styling | Tailwind CSS 3 → chokidar → braces | Supported Tailwind/toolchain migration, including generated styles and builds |
| Expo | React Native Metro config → Metro tooling → glob matching dependencies → braces | Compatible Metro/Expo dependency migration |

The current [CVE-2026-93687 advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) affects `braces <=3.0.3` and lists no patched version. npm’s latest is still `3.0.3`. [Proposed fix #72](https://github.com/micromatch/braces/pull/72) is closed without merging. The maintainer disputes the advisory’s security interpretation in [issue #70](https://github.com/micromatch/braces/issues/70); the advisory remains active. The separate [CVE-2024-4068](https://github.com/advisories/GHSA-grv7-fg5c-xmjg) was fixed by `3.0.3`, which does not resolve the newer advisory.

The failure is recursive AST processing of deeply nested glob patterns. Remote exploitability depends on whether an application passes attacker-controlled patterns to those operations; the presence of a development dependency alone does not establish an exploitable deployed endpoint. No complete reachability review has been performed for every generated profile.

An unqualified `fast-glob` → `tinyglobby` package alias is incompatible: consumers use different exports and directory expansion defaults. Removing the global starter dependency is an Anhedral composition fix, not proof that every supported framework is free of `braces`. Do not clear the audit gate or claim production acceptance until the resolved graphs and relevant runtime checks pass. The same generated CI also reports a separate `node-forge` advisory in Expo/WXT tooling, which is outside the `braces` remediation.

The shared-lint ownership change was checked against the actual upstream template manifest: a newly resolved pnpm graph contained 169 packages and none of `@next/eslint-plugin-next`, `fast-glob`, `micromatch` or `braces`; its standard pnpm audit reported no known vulnerabilities. This is evidence for the shared lint foundation only, not the entire generated application matrix. App-local web linting explicitly selects JavaScript/TypeScript/JSX/TSX files rather than relying on ESLint’s default JavaScript selection.

Validation of the scoped composition change passed 613 CLI unit tests with the real lint probe enabled, 60 inspector tests, builds, lint, static security policy, OSV checks for 86 root/catalog versions, and the package allowlist. The five lint tests include actual Next Image/Link and React Hooks diagnostics, full recommended/Core Web Vitals rule configuration, TypeScript/JSX parsing and adding web after an API-only scaffold. A helper now exercises installed rules in generated web CI profiles. A fresh local upstream shadcn initialization was attempted but its `ui.shadcn.com` request was refused by the network proxy; no fresh full generated-app matrix success is claimed.

## Temporary braces patch verification

The depth-only mitigation is based on official `braces@3.0.3`, tarball integrity `sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==`. Both the unmodified baseline and patched package passed all 764 tests from the published release source (`74b2db2938fad48a2ea54a9c8bf27a37a62c350d`). The bounded verifier passed 360 differential compile/expand/stringify comparisons, depth 100/101 and mixed/literal boundaries, deep direct ASTs, child cycles and expansion-parent cycles. Expansion width/range behavior and stringify parent handling remain unchanged.

This establishes the tested library mitigation, not a complete application exposure analysis or an upstream fixed release. The upstream registry report remains unmodified. The owner-approved gate accepts only the exact patched braces advisory after verifying installed bytes and regressions. Separate Expo/WXT findings and the remaining private Cloudflare acceptance gaps remain independent.

A real pnpm fixture resolved `braces@3.0.3` with micromatch, fast-glob and chokidar consumers, merged the exact patch, resolved the new lock and installed with `--frozen-lockfile --ignore-scripts`. The installed bytes passed the depth verifier and normal filesystem glob/watch checks. Changing the patch after resolution made a frozen install fail; restoring its bytes restored successful installation. The untouched pnpm audit JSON still reported `GHSA-vfj7-8cjw-p6xm` for `3.0.3` and was retained locally as test evidence. Both the patch and MIT notice are recorded in generated source fingerprints; customer artifacts and YAML patch entries are preserved or rejected on conflict.

Release-exception assessment: the evidence supports the tested depth mitigation for the exact patched version. It does not support a blanket advisory waiver, other versions, unrelated findings or a claim that every generated installation has been exercised. Any later exception must be constrained to the advisory/version and independently verified installed bytes, reviewed for the intended release, and retired with the patch. The owner subsequently approved and restored the exact verified exception below; other findings remain blocking.

The generated exact-path Git attributes preserve LF bytes with `core.autocrlf=true`; a real index/checkout round trip verifies the patch and license remain identical. The patch’s SHA-256 is `69bd65a37da4569ba0be8a044aa732ad7c2ebd5494d6076f966eb6df8a12756e`.

Final local validation of the mitigation passed 628 CLI tests without skips, 60 inspector tests, build/typecheck/lint, static secret/security scans, OSV checks for 87 root/catalog versions, package allowlist and packed CLI smoke. The packed installation test invokes the installed patch helper and compares generated patch/license bytes with the shipped assets. These results establish the tested mitigation, not completion of all generated-profile or live acceptance requirements.

## Restored verified advisory handling

The owner approved restoring the earlier verification-aware behavior for one package/advisory. `pnpm audit:deps` now invokes the bundled gate, preserving raw pnpm JSON in `.anhedral-audit-report.json` and printing the known upstream finding. Only `GHSA-vfj7-8cjw-p6xm` for `braces@3.0.3` can pass through this exception. Verification requires the pinned patch checksum, every discovered installed copy matching the reviewed full-package hash, and bounded depth/cycle regression checks. Unpatched/tampered copies, unknown versions, malformed or incomplete reports, command failures, and unrelated high/critical findings fail.

This restores the working patch-plus-verification behavior without the removed multi-package backport framework. It does not claim an upstream fixed release or waive the independent Expo/WXT findings or private Cloudflare acceptance work.

Validation of the restored gate passed 634 CLI tests without skips and 60 inspector tests, build/typecheck/lint, static security policy, package allowlist and packed CLI smoke. The real frozen pnpm fixture covered an npm dependency alias, accepted the exact verified mitigation, preserved the upstream audit JSON, rejected both patch-file and installed-package tampering, and passed again after restoration. The packed CLI writes the audit gate from its distributed asset.

## Hosted release follow-through (2026-10-16)

Hosted CI on `83e83e476fba8a052fb3c73aaa0e3b59659231bc` passed the Linux braces installation gate, all four CLI Node-version checks, portable macOS/Windows checks, inspector checks, plain Vercel, Next.js/Cloudflare (including Better Auth), desktop on Linux/macOS, Worker services and Vercel services. Other generated profiles exposed Void entrypoint discovery and duplicated database configuration, corrected in the subsequent source changes. These results are profile-specific, not a successful full matrix or live deployment.

The same hosted run independently confirmed that extension and combined-client profiles fail on `GHSA-86w9-cpqp-85rv` in `node-forge`. The [current advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) covers versions through 1.4.0 and has no patched release; [upstream PR 1152](https://github.com/digitalbazaar/forge/pull/1152) remains unmerged. Current Expo CLI and extension-runner dependency paths still require this package. A framework version upgrade alone does not establish remediation.

The prior Node-main patch was evaluated separately against the official 1.4.0 release source (`fa385f92440879601240020f158bed68e444e83a`): baseline and patched versions each passed 828 tests with four upstream pending cases; the malformed-signature regression failed before and passed after patching. The aggregate harness neutralized an upstream `describe.only` so the complete suite actually ran. At that checkpoint the source-only patch did not update the package's prebuilt browser bundles and was not accepted. The completed bundle remediation and verification below supersede that earlier candidate.

Fresh pnpm resolution confirmed that Void's `^1.63.1` Cloudflare Vite dependency could select 1.64.0, whose Wrangler peer requirement exceeds Anhedral's validated pin. The Void recipe now pins that transitive edge to 1.63.1, sharing the existing version source, preserving customer override entries and leaving unrelated recipes untouched. The exact 1.63.1/4.149.0 pair passed fresh resolution and an actual Vinext/Void Vite build. Generated Worker acceptance reads the emitted Vite Worker configuration and verifies its actual entry artifact, instead of expecting the legacy Wrangler output path.

## Completed node-forge remediation

The final exact-version mitigation covers `lib/rsa.js`, `dist/forge.min.js` and `dist/forge.all.min.js` from official `node-forge@1.4.0`, rather than accepting an unpatched distribution path. The patch is 1,177,827 bytes because unified diffs include complete minified lines; the actual guard changes are limited to nested DigestAlgorithm cardinality and strict DER NULL contents. The minified predicates implement the same source guard, and their trivial one-line source maps remain valid. The upstream BSD attribution is retained.

Patch SHA-256: `2cbbff9183d2896f13da8c8655b8f598b0f24c9b7477e8230f9a313f806c239f`. Reviewed full installed-tree SHA-256: `2e3a4c3aa2e8f3235d9dd9b3f21698c7aa88983ba9623f1502029386316380e4`. The official tarball integrity is `sha512-LarFH0+6VfriEhqMMcLX2F7SwSXeWwnEAJEsYm5QKWchiVYVvJyV9v7UDvUv+w5HO23ZpQTXDv/GxdDdMyOuoQ==`.

For each of the three published entrypoints, forced pure-JavaScript RSA verification preserved 11 valid cases and rejected all 30 malformed cases across six digest algorithms. The official unpatched package accepted 23 malformed cases, so the regression distinguishes the fix. The complete official Node suite passed 828 tests with four upstream pending cases against the final source patch. Exact Node 24.21/pnpm 10.34.5 frozen installation with direct and aliased dependencies passed and reproduced the reviewed bytes and all-entrypoint behavior.

The audit gate extends its fixed policy to the one additional exact advisory/version only after patch checksum, every installed package tree and bounded runtime probes pass. It retains the raw upstream advisory and rejects unrelated high/critical findings. It is a verified local mitigation, not an official upstream fixed release. The removed open-ended multi-package manifest/backport framework remains absent.

CI now prepares a reviewable Linux release candidate on Node 24.21 after its checks, verifying artifact integrity, scanning for secrets and executing the exact packed CLI. It uploads the candidate with one-day retention; this step cannot publish and does not change required reviews or main-commit release checks.

Consolidated local validation passed 649 CLI tests without skips, 60 inspector tests, build/typecheck/lint, static security policy, package allowlist and packed CLI smoke. Both real frozen-install fixtures passed, including original braces glob/watch behavior and node-forge source/browser-bundle tamper rejection. The packed CLI carries and stages both exact patches and upstream notices. The combined candidate still requires the full hosted matrix and the repository’s existing code-owner review before publication.

Installed-graph verification recognizes explicitly optional peer dependencies as well as ordinary optional dependencies. A missing peer is skippable only when the parent declares the peer and marks it optional, with no competing required dependency declaration; present dangling links, outside paths and missing required packages still fail. Missing required-package diagnostics include an escaped project-relative path. All 650 CLI tests passed after this change.
