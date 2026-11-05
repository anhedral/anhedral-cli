# Anhedral Stack workflow

The Anhedral Stack has one current web foundation and progressive backend/storage/payment additions. There is no public stack selection or independent stack-registry repository.

1. Preview an empty destination with `anhedral init my-app --dry-run --json`, then
   run `anhedral init my-app` and `pnpm dev` inside it.
2. Read the generated README, AGENTS, `anhedral.json`, environment examples and
   Wrangler configuration. Use their recorded tool versions.
3. Preview and add [capabilities](capabilities.md) as needed. Configure selected
   providers/auth methods, apply reviewed migrations and validate actual runtime
   behavior before deployment. Source installation is not provider activation.
4. Extend [source-owned UI](ui.md), implement features and run consumer checks.

## Evidence-driven maintenance

Inspect current Git state and preserve unrelated work. Verify runtime entrypoints,
exports, generated consumers and operational safeguards before removing source;
static findings and passing tests alone do not prove a path is unused.

Update the existing owning guide with behavior changes. Keep exact versions and
defaults in manifests/source, not duplicated narratives. Store dated development,
audit and verification notes in
[docs/agent-notes](https://github.com/anhedral/anhedral-cli/tree/main/docs/agent-notes),
with revision, checks, failures and remaining gaps. Keep raw reports in ignored
`.artifacts/`. Historical notes are not current instructions.

Canonical docs live in `docs/`; `pnpm build` refreshes bundled plugin references.
Current generated app guidance lives in `src/launch.ts`. OJ runs development and builds for the single TanStack Start foundation. Preserve shipped
reference paths, source-generation safety, dependency patch gates, UI provenance,
licenses and exact-artifact packaging. A build does not publish npm or update an
installed plugin. See [Contributing](https://github.com/anhedral/anhedral-cli/blob/main/.github/CONTRIBUTING.md)
for staging, release identity and validation tiers.

This repository also works as a Git submodule. Its own `pnpm-workspace.yaml`,
lockfile and safe `.npmrc` keep installs independent of a parent workspace;
the parent must exclude the CLI from its package graph. Run install/build/tests
inside this checkout with its pinned package manager. Commit public changes here
separately, then update the parent's Git pointer only after that commit is reviewed
and available in this repository. Never copy parent configuration, credentials or
implementation into this checkout. Public CI checks out only this repository,
without recursive submodules; publishing rejects calls from another repository.
These checks do not make a submodule a security sandbox: review tracked files,
package contents, inherited environment and publication authority independently.

The reviewed public module inventory in `scripts/public-package-policy.json` and
`pnpm check:boundaries` constrain compilation and package preparation; an unexpected
dist module or private import requires explicit review. Portable contracts are
synced only from a reviewed, licensed Platform projection with exact provenance,
never as a build side effect. Local credential scanning additionally retains the
CLI's stricter source-upload policy. Plugin packaging accepts its explicit reviewed
skills-only file set, refuses linked distribution roots and verifies the bounded
publisher archive format before npm publication. Oversized unscanned text is an
explicit review failure, not a clean secret scan.

## Runtime verification

Routine CI compiles the CLI once and runs fast source/security checks and selected
contract tests. Generated applications are not installed or built in that path.
Dispatch [CI](https://github.com/anhedral/anhedral-cli/blob/main/.github/workflows/ci.yml) with `runtime_proof` enabled for the
Anhedral Stack proof and one-day measurements. Broader compatibility and generated
application matrices remain in [Full validation](https://github.com/anhedral/anhedral-cli/blob/main/.github/workflows/validation.yml).

`node scripts/tanstack-runtime-smoke.mjs` installs a disposable Anhedral Stack
application and exercises local workerd, SSR/server functions, progressive backend,
private storage and the generated Stripe build/migration path. It uses isolated
local data, never a configured database or live payment provider. Preserve source/tool/lock identities and distinguish prepared,
passed and failed evidence. Tests are not provider deployment acceptance. Run
`node tests/test-generated-config-lint.mjs <installed-workspace>` to exercise the
generated web ESLint policy; runtime proof checks both web-only and composed source.

Generated workspaces explicitly allow dependency build scripts only for esbuild and workerd through the pnpm `allowBuilds` map. This keeps installation noninteractive under the pinned pnpm release and pnpm11 without allowing arbitrary dependency scripts.

## Platform CLI access and source upload

`login --start` prints browser approval instructions; `login --resume` redeems the
saved approval. Interactive `login` polls after showing the URL and confirmation
code. Tokens and device secrets use macOS Keychain or Linux Secret Service;
`--credential-file <path>` explicitly selects an owner-only file. Credential
storage is currently unsupported on Windows. Credentials are
bound to the explicit `--api-url` origin (HTTPS, with literal loopback for fixtures).
Do not use repository configuration to select the credential destination. `logout`
revokes server access before removing the saved credential; `whoami` checks live
identity. Add `whoami --context --human` (or `--context --json`) to inspect the
selected origin, credential-store kind and saved local team/project link. Identity
is checked live; the saved project link is explicitly not proof of current project
access. A link for a different origin or principal fails closed. Normal `whoami`
JSON is unchanged and context inspection never creates a project or starts login.
Explicit `--api-url` and `--credential-file` select the origin/store; saved state
cannot override either. API access must be separately enabled by Platform operators.

After generating source, run `projects list --human` to discover the selected
team's projects and accessible team IDs. Use `--team <uuid>` to select another
team and `--cursor <uuid>` for the next page. `projects create --name <name>
--link --human` registers a new Platform project and links the current directory;
omit `--link` to register it without changing local context. `--summary <text>`
is optional. Creation registers existing source for upload; it does not generate
another application or start a deployment. `projects create --dry-run` validates
the proposed input locally without authentication or network access.

Creation saves its request identity under `.anhedral/platform/` before sending
it. Repeat the same command after interruption to recover the same project;
changed input, identity or team requires review and an explicit `--new` request.
`--link` refuses a different existing local link. Init's source identity remains
unchanged. Platform checks current team membership and project permissions.
Project creation, linking and unlinking share a workspace lock. After a process
crash, inspect `.anhedral/platform/project-operation.lock` and remove only that
lock after confirming no project operation is running; preserve the request journal.

`link --project <uuid> --team <uuid>` checks current build authority and saves an
origin/principal-bound link under ignored `.anhedral/platform/`. `unlink` removes
that local link. `source upload --dry-run` inspects packaging; `source upload`
resumes the same immutable source request after interruption, including lost
responses. `source status` reads its server receipt. Changed source requires an
explicit `source upload --new`; an expired request also requires a new request.
The client honors nested `.gitignore`, excludes generated output and secret paths,
rejects symlinks and recognized credential material, and hashes every bounded
chunk plus the complete archive and canonical source inventory. The generated
`apps/web/src/routeTree.gen.ts` is excluded because the router regenerates it during
checks/builds; authored routes, router configuration and server source remain
included. Credential scanning is deliberately conservative; inspect source before uploading.

Public upload limits and message shapes live in `src/contracts`; protocol code is
in `src/platform-command.ts`. The server independently authenticates the caller,
checks current tenant/project authority and revocation, validates source, and
enforces admission. Client checks and supplied IDs cannot grant access. Upload
does not deploy, activate providers, migrate a database or replace identities.
Run `tests/test-platform.test.mjs` after building for isolated client fixtures.

`deploy plan --manifest <file>` plans from the saved sealed upload, independently
of subsequent local edits. The manifest follows Platform's `deploymentManifestSchema`
in `src/contracts/deployment.ts`; it must match the archive's recorded composition,
capabilities, CLI version and existing standalone identity. Runtime-profile admission is server-owned. Staged server sources include Hono/D1
and web candidates; source support does not establish a deployed cohort or provider readiness. Plans bind source/lockfile/migrations,
routing state, principal epoch and project authority. Signed plans report current artifact, source-version and dependency-lock compatibility.
A null project configuration revision means deployment has not yet captured its environment snapshot; it is not a request to find an operator approver.
Anhedral Stack source composition version 2 records framework foundation
`tanstack-start`; the public runtime profile is `anhedral-stack`. Its five compositions are
web-only, backend (`hono` plus `database-auth`), backend/R2, backend/Stripe and
backend/R2/Stripe. Backend manifests preserve `better-auth-d1-v1`; web-only uses
`none`. Broader retained capability/protocol values are compatibility implementation,
not current public selections or hosted support.
Continue selecting an explicit manifest; the CLI never infers an admitted artifact
from locally generated source. Native candidate receipts name an immutable registry
image with `scope: candidate-workspace`; legacy isolated-build receipts remain valid.
Both describe automatic build compatibility, not a requirement for a human artifact approver. Plans list exact runtime, source-version or lockfile mismatches and remediation. Do not relabel source provenance to clear a mismatch.

`deploy prepare` reserves an immutable candidate. `deploy status` reads
`awaiting-runtime`, `building`, `built`, `ready` or `failed`. A built candidate grants no
preview or publishing capability. A `ready` receipt reports Platform-admitted hosted
readiness; it does not approve production publication. Runtime admission and build
enforcement remain server-owned. These commands never provision, migrate, activate a preview or
deploy. Lost responses resume the same saved request. Changed manifest inputs or
routing require `deploy plan --manifest <file> --new`. Plan/source expiry and
revocation fail closed. State under `.anhedral/platform/deployment.json` contains
no credentials and cannot select a network origin or change the signed-in identity.

`env list` returns names, types, environments and versions. `env import --environment
staging|production --file <path>` reads a private dotenv file; `--stdin` accepts a
pipe. `env set <NAME>` reads one literal value from a file or pipe. Values are
never arguments, output or retry-state contents. Non-public names default to
secrets; `--type config` is explicit readable configuration. Public-prefixed
secrets, reserved names, duplicate names and oversized input fail before upload.
Files require owner-only permissions and a regular non-symlink final file;
ancestor checks reject observed symlinks but are not an atomic directory lock.
Use `--dry-run` without authentication for names/types only. Actual imports bind
API origin, principal, team, project and environment, require `--replace` for
existing variables, and resume one request after a lost response. Use `--new` for
a different import. Receipts are checked against names, types and expected versions.
Production changes remain subject to Platform approval and deployment policy.

`staging status` reads persistent staging history. `staging deploy --candidate
<uuid>` selects a ready candidate, freezes the current staging configuration and
retains one generation-bound request across retries. `--new` starts another
deployment after reviewing the current state. Saved receipts must match their
project, candidate, request and generation before replay. CLI runtime admission remains a
separate server gate; a built source upload alone is not a ready candidate.
`production status` reads current production generation, deployment history and approval policy. `production deploy --candidate <uuid> --name <slug>` freezes production configuration and publishes through the signed-in user's existing production permissions. Self-service teams need no second approver; an explicit independent-review policy remains enforced. Lost responses reuse the saved request and generation; use `--new` only for another candidate, name or deliberate deployment.

`logs` reads bounded, redacted runtime events, defaulting to staging. Select
production explicitly with `--environment production`; filter by deployment,
level, source or range, and pass `--cursor` for the next page. Coverage, dropped
events and seven-day retention are part of the response.

The plugin contains CLI usage instructions only. It registers no MCP server, remote
app, OAuth connection or executable hook, and it does not bundle a CLI runtime.
Users run the reviewed CLI version in a host terminal; managed project operations
use the separately configured CLI client described above. Packaging admits only
reviewed skills, references, assets and host manifests, and rejects connection files
or executable declarations. `tests/test-plugin-codex.test.mjs` installs the exact
archive in an isolated Codex home and verifies both skills with no MCP, app or hook
registration when Codex is available (`ANHEDRAL_CODEX_BIN` overrides the binary).

One distribution directory, `plugin/`, serves Codex and Claude Code. Codex reads
`plugin.json` and `skills/*/agents/openai.yaml`; Claude Code reads
`.claude-plugin/plugin.json` and the same `skills/*/SKILL.md`. Packaging validates
both manifests against one release identity. Root `.claude-plugin/marketplace.json`
is the Claude marketplace; add it with `claude plugin marketplace add
anhedral/anhedral-cli`, then install `anhedral@anhedral`. The existing pinned tag
predates the Claude files and this cleanup; a coordinated versioned release is
required before those changes are installable from the public marketplace. Local
review uses `claude plugin validate --strict plugin`, `claude --plugin-dir plugin`
and a temporary Codex marketplace, without account connection.

The CLI and plugin share one release version. Build prepares the
marketplace pointer to that version's immutable `plugin-v<version>` tag; it does
not create the tag or publish either artifact. During review that pointer may be
unavailable. Install an already published version until the coordinated release
has completed and its tag and artifact integrities have been verified.

## CLI presentation compatibility

The command schema owns options, nested help and offline shell completion. Root
help is an index; leaf help includes examples. Keep executable and exported parser
contracts covered by `test-cli-discovery`, `test-cli-experience`, `test-cli-output`,
`test-completion` and `test-platform-ux`. The CI gate runs these alongside existing
contracts; the executable suite accepts `ANHEDRAL_CLI_BIN` to validate an installed
exact candidate without contacting Platform.

Results belong on stdout; errors and permitted diagnostics belong on stderr.
Platform retains implicit compact JSON for compatibility, with opt-in `--human`.
Other families retain human defaults and explicit `--json`. Quiet suppresses
ordinary results unless JSON was explicitly requested. Explicit JSON, quiet,
headless input/output, CI and `--non-interactive` cannot initiate interactive
approval polling; `login --resume` explicitly redeems an existing approval.

Numeric failure status remains 1. Existing error fields/code families remain;
usage errors classify invalid origins and selectors before credential/network
access, including environment, staging and log selectors. Credential-store helpers
have bounded execution. Logout revokes server access first; a failed local deletion
reports cleanup still pending instead of successful logout. Categories and retryability are additive diagnostics, not authorization
to repeat a mutation. In particular, post-commit failures retain source, expose
committed paths and require repairing only the failed follow-up. Upload/deployment
retries keep the existing immutable request identity. None of these presentation
changes alters server admission or activates hosted execution.
