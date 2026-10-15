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

The latest complete local CLI suite passed **608 of 608 tests**, with zero failures. The inspector suite passed **60 of 60 tests**. Build, typecheck, formatting, source hygiene, static security policy, packed CLI smoke and package allowlist checks passed. The corrected OSV audit passed for **85 unique locked and direct-catalog package versions**; the inspector dependency audit also reported no known vulnerabilities. This does not audit every generated application’s transitive dependency graph.

The normal generated combined workspace installed **395 packages** without extra harness dependency pins. Actual fresh builds passed for **Vinext 1.1.0 with Void 0.27.0** and **Hono**. Workerd returned HTTP 200 for rendered HTML, its client asset, API health and OpenAPI. A separate services profile covered D1/R2/KV/AI plus cron build/preview gates; the compiled scheduled handler was preserved and invoked successfully. Readiness responses contained an actual Worker version UUID.

Wrangler applied the generated local D1 migration `0000_better_auth` (10 commands). The shared Better Auth/D1 runtime passed signup, login, cookie/session lookup, incorrect-password HTTP 401, logout and session revocation through `tests/test-void-local-auth.mjs`. These are actual local runtime checks rather than mocked provider tests. They do not prove Cloudflare provisioning, production secrets, visitor Access policy enforcement or remote rollback.

The earlier generated dependency audit passed with a local `braces` backport and `fflate@0.7.5`; its raw advisory report still contained one high finding. The bundled backport system has since been removed at the owner’s request. New applications use standard `pnpm audit --audit-level=high` without local patches or advisory exceptions, so that earlier patched audit result does not establish a passing audit for newly generated applications.

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

The source-coherence review removed obsolete release helpers, diagram assets, stale plugin wrappers and duplicate dependencies; fixed bounded inspection of resolved Void locks; and brought CI runtimes and delivery documentation in line with the implementation. Browser UI acceptance was attempted but could not launch Chromium because the host denied its macOS Mach-port registration. The browser suite therefore remains unverified in this environment; unit, protocol and packaging checks are separate evidence.

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
