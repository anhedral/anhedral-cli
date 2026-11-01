# Scaffold workflow

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
Generated app guidance lives in `src/scaffold/documentation.ts`. Preserve shipped
reference paths, source-generation safety, dependency patch gates, UI provenance,
licenses and exact-artifact packaging. A build does not publish npm or update an
installed plugin. See [Contributing](https://github.com/anhedral/anhedral-cli/blob/main/.github/CONTRIBUTING.md)
for staging, release identity and validation tiers.

## Next/OpenNext runtime gate

Relevant generator/build changes compile an isolated foundation and exercise it
in workerd. Run `pnpm test:next-runtime` for SSR/RSC, Server Actions/cookies,
prerendering and static cache checks. Hono proxy contracts have separate tests.
The harness owns the module-size budget and short-lived `.artifacts/next-runtime/`
receipts. Review measurement changes before adjusting limits. The smoke never
deploys or migrates a configured database; it is not production acceptance.

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

`link --project <uuid> --team <uuid>` checks current build authority and saves an
origin/principal-bound link under ignored `.anhedral/platform/`. `unlink` removes
that local link. `source upload --dry-run` inspects packaging; `source upload`
resumes the same immutable source request after interruption, including lost
responses. `source status` reads its server receipt. Changed source requires an
explicit `source upload --new`; an expired request also requires a new request.
The client honors nested `.gitignore`, excludes generated output and secret paths,
rejects symlinks and recognized credential material, and hashes every bounded
chunk plus the complete archive and canonical source inventory. Credential scanning
is deliberately conservative; inspect source before uploading.

Public upload limits and message shapes live in `src/contracts`; protocol code is
in `src/platform-command.ts`. The server independently authenticates the caller,
checks current tenant/project authority and revocation, validates source, and
enforces admission. Client checks and supplied IDs cannot grant access. Upload
does not deploy, activate providers, migrate a database or replace identities.
Run `tests/test-platform.test.mjs` after building for isolated client fixtures.

`deploy plan --manifest <file>` plans from the saved sealed upload, independently
of subsequent local edits. The manifest follows Platform's `deploymentManifestSchema`
in `src/contracts/deployment.ts`; it must match the archive's recorded composition,
capabilities, CLI version and existing standalone identity. Only the protected
preview Hono/D1 profile is currently planned. Plans bind source/lockfile/migrations,
routing state, principal epoch and project authority. Artifact provenance and
runtime configuration remain explicitly unverified; null receipts are not approval.

`deploy prepare` reserves an immutable candidate. `deploy status` reads
`awaiting-runtime`, `building`, `built` or `failed`. A built candidate grants no
preview or publishing capability. Runtime admission and build enforcement are
server-owned. These commands never provision, migrate, activate a preview or
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
deployment after reviewing the current state. CLI runtime admission remains a
separate server gate; a built source upload alone is not a ready candidate.
`logs` reads bounded, redacted runtime events, defaulting to staging. Select
production explicitly with `--environment production`; filter by deployment,
level, source or range, and pass `--cursor` for the next page. Coverage, dropped
events and seven-day retention are part of the response.

The plugin includes source skills plus one remote MCP connection at
`https://platform.anhedral.com/api/mcp`. OAuth consent grants scoped project
access; CLI credentials are separate. Secret imports initiated through ChatGPT
open a secure browser form rather than accepting values as tool arguments.
The plugin packages no executable server, credential or authorization header. Its root `mcp.json` uses the [official remote OAuth declaration](https://developers.openai.com/plugins/build/plugins#bundled-mcp-servers-and-lifecycle-hooks), DCR and read-only default scopes; write access requires additional consent.
Server features remain unavailable until their operator-controlled gates are enabled.

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
access. Categories and retryability are additive diagnostics, not authorization
to repeat a mutation. In particular, post-commit failures retain source, expose
committed paths and require repairing only the failed follow-up. Upload/deployment
retries keep the existing immutable request identity. None of these presentation
changes alters server admission or activates hosted execution.
