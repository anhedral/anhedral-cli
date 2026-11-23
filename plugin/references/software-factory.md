# Anhedral CLI workflow

The public CLI connects people and agents to the Anhedral API for project management, source uploads, environment configuration, deployment and runtime logs. Codex and Claude Code skills guide the same CLI commands. Platform owns authentication, authorization and provider operations.

The CLI also generates the Anhedral Stack with a blank Turborepo and independent client, API and service additions. Local source generation works without a Platform account.

1. Preview an empty destination with `anhedral init my-app --dry-run --json`, then
   run `anhedral init my-app`. Select the first app with `anhedral add web`, for example.
2. Check `anhedral stack status`. The web addition includes a README and agent instructions.
   Service additions include the relevant environment examples and Wrangler configuration.
3. Preview and add [capabilities](capabilities.md) as needed. Configure selected
   providers/auth methods, apply reviewed migrations and validate actual runtime
   behavior before deployment. Source installation is not provider activation.
4. Choose or extend [web UI](ui.md), implement features and run consumer checks.

## Source ownership

`src/platform/` owns the thin authenticated API client; `src/composition/` owns
progressive source additions and updates. Foundation generation lives in
`src/scaffold/` with the launch entrypoint. `src/transactions/` owns journaled
source writes and durable filesystem operations; `src/process/` owns child-process
execution. Portable contracts remain in `src/contracts/`. Internal moves update
`scripts/checks/public-package-policy.json` and packed-artifact tests together; public
package exports and CLI commands stay stable. Tooling is grouped under
`scripts/build`, `checks`, `contracts`, `plugin`, `release`, `runtime` and `security`;
root script helpers are shared infrastructure for those owners.

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
Current generated app guidance lives in `assets/launch/README.md.txt` and `assets/launch/AGENTS.md.txt`. OJ runs development and builds for the single TanStack Start foundation. Preserve shipped
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

The reviewed public module inventory in `scripts/checks/public-package-policy.json` and
`pnpm check:boundaries` constrain compilation and package preparation; an unexpected
dist module or private import requires explicit review. Portable contracts are
synced only from a reviewed, licensed Platform projection with exact provenance,
never as a build side effect. Local credential scanning additionally retains the
CLI's stricter source-upload policy. Plugin packaging accepts its explicit reviewed
skills-only file set, refuses linked distribution roots and verifies the bounded
publisher archive format before npm publication. Oversized unscanned text is an
explicit review failure, not a clean secret scan.

## Runtime verification

For local development, `pnpm test` builds once and runs unit tests; `pnpm lint`
checks source without emitting a build. `pnpm release:check` builds and type-checks
once, then runs the full source, security, advisory, unit, patch and package checks.
Use `pnpm release:pack` when preparing a standalone release artifact; it builds fresh.

Routine CI compiles the CLI once and runs fast source/security checks and selected
contract tests. Generated applications are not installed or built in that path.
Dispatch [CI](https://github.com/anhedral/anhedral-cli/blob/main/.github/workflows/ci.yml) with `runtime_proof` enabled for the
Anhedral Stack proof and one-day measurements. Broader compatibility and generated
application matrices remain in [Full validation](https://github.com/anhedral/anhedral-cli/blob/main/.github/workflows/validation.yml).

`node scripts/runtime/tanstack-runtime-smoke.mjs` installs a disposable Anhedral Stack
application and exercises local workerd, SSR/server functions, progressive backend,
private storage and the generated Stripe build/migration path. The compiled web
and API Workers run together with the disposable local PostgreSQL fixture. Bundle measurements
follow OJ’s emitted Worker configuration and count its runtime modules. It uses
isolated local data, never a configured database or live payment provider. Preserve source/tool/lock identities and distinguish prepared,
passed and failed evidence. Tests are not provider deployment acceptance. Run
`node tests/test-generated-config-lint.mjs <installed-workspace>` to exercise the
generated web ESLint policy; runtime proof checks both web-only and composed source.
`node tests/test-generated-router.mjs <installed-workspace>` temporarily replaces
the example route, runs the generated web typecheck and restores the route. The
router imports its own Start augmentation so ordinary page edits remain type-safe.

Backend server entries call TanStack’s `createStartHandler(defaultStreamHandler)` directly so request-local API bindings survive OJ compilation. Source additions repair the exact previous owned adapter and preserve customer edits.

OJ dev commands attach an explicit host value with `--host=<hostname>`, as required by the pinned runtime. Generated workspaces explicitly allow dependency build scripts only for esbuild and workerd through the pnpm `allowBuilds` map. This keeps installation noninteractive under the pinned pnpm release and pnpm11 without allowing arbitrary dependency scripts.

## Updating existing source

Plugin updates refresh agent guidance; select its matching published CLI separately.
Use the host's configured marketplace: Codex refreshes its marketplace with
`codex plugin marketplace upgrade <marketplace>` and installs the refreshed
`codex plugin add anhedral@<marketplace>`; Claude Code uses
`claude plugin marketplace update <marketplace>` and
`claude plugin update anhedral@<marketplace>`. Verify the installed manifest version
and reload/restart the host when required before relying on its new guidance.
Run `stack update --dry-run --json`, review the current and proposed pins, lockfile digests, source diffs and conflicts,
then apply `stack update --expect-plan <planId> --json`. The plan binds the dependency inputs and resolved lockfiles, source changes, target generator and any verified release artifact. A stale plan requires
a new preview. Fingerprinted adapters retain local edits when their release
baseline is unchanged. Divergent edits to the same adapter require reconciliation.
The application owns its routes and assets. This operation uses the existing journaled transaction
without installing dependencies or running project scripts. Resolve source
conflicts before another preview. After applying, run `pnpm install --frozen-lockfile` and the application checks. See [dependency updates](capabilities.md#updating-an-existing-app). It never changes authentication or deployment authority.
Official release metadata and npm integrity establish deployment provenance;
project-supplied metadata cannot select another registry, credential destination
or executable. Offline source inspection cannot attest a newly published artifact.

## Platform CLI access and source upload

The supported external API is `/api/cli/v1` at the explicit Platform origin,
defaulting to `https://platform.anhedral.com`. Requests carry
`x-anhedral-cli-protocol: 1`; authenticated requests use a browser-approved bearer
token. `x-anhedral-team` selects a team but never grants membership or project
access. Versioned wire schemas live in `src/contracts/cli-transport.ts` and the
adjacent environment, staging, production and runtime-log transport modules.
Internal browser and service routes are not part of this external contract.
`https://api.internal` in generated application templates is a synthetic
service-binding URL for the customer's backend, not an Anhedral service endpoint.

`login --start` prints browser approval instructions; `login --resume` redeems the
saved approval. Interactive `login` polls after showing the URL and confirmation
code. Tokens and device secrets use macOS Keychain or Linux Secret Service;
Linux selects a validated root-owned system helper without searching project
`PATH`. `ANHEDRAL_CLI_SECRET_TOOL_PATH` can select an absolute trusted system
installation; its executable and path ownership/permissions are validated.
Untrusted or unavailable helpers fail closed.
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
chunk plus the complete archive and canonical source inventory.

Source packaging holds directory handles throughout traversal. It requires Linux
with procfs or a macOS filesystem supporting volume file IDs. Run the CLI in WSL
for Windows source uploads.

The generated `apps/web/src/routeTree.gen.ts` is excluded because the router regenerates it during
checks/builds; authored routes, router configuration and server source remain
included. Credential scanning is deliberately conservative; inspect source before uploading.

Public upload limits and message shapes live in `src/contracts`; protocol code is
in `src/platform/command.ts`. The server independently authenticates the caller,
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
from locally generated source. Public plans and candidate receipts omit internal
registry images and build-policy digests. The public deployment module exports
customer manifests and receipts; internal deployment plan/source schemas belong
to Platform and are not public CLI exports. Platform retains these admission details
privately and returns a digest over the public plan fields for client verification.
Previously saved plans containing internal fields require a fresh plan with `--new`.
Plans list runtime, source-version or lockfile mismatches and remediation. Do not
relabel source provenance to clear a mismatch.

`deploy prepare` reserves an immutable candidate. `deploy status` reads
`awaiting-runtime`, `building`, `built`, `ready` or `failed`. A built candidate grants no
preview or publishing capability. A `ready` receipt reports Platform-admitted hosted
readiness; it does not approve production publication. Runtime admission and build
enforcement remain server-owned. These commands never provision, migrate, activate a preview or
deploy. Lost responses resume the same saved request. Changed manifest inputs or
routing require `deploy plan --manifest <file> --new`. Plan/source expiry and
revocation fail closed. State under `.anhedral/platform/deployment.json` contains
no credentials and cannot select a network origin or change the signed-in identity.

The CLI imports the reviewed portable environment parser from Platform. File, stdin
and parser size limits share its exported constant; typed parser errors retain the
same value-free validation messages.

`env list` returns names, types, environments and versions. `env import --environment
staging|production --file <path>` reads a private dotenv file; `--stdin` accepts a
pipe. `env set <NAME>` reads one literal value from a file or pipe. Values are
never arguments, output or retry-state contents. Non-public names default to
secrets; `--type config` is explicit readable configuration. Public-prefixed
secrets, reserved names, duplicate names and oversized input fail before upload.
Use stdin, an owner-only file outside the project, or an input under the
project’s always-excluded `.anhedral/` directory. Project `.env*` and `.dev.vars*`
filenames are also excluded. A project-specific gitignore rule alone is insufficient.
Files must have a single hard link and a regular non-symlink final component;
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
`ANHEDRAL_CLAUDE_BIN` selects an explicitly installed Claude validator; use a current
version supporting `plugin validate --strict`. Installed older validators fail the
gate rather than silently dropping strict validation.

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

## Project Messages

From a signed-in, linked project, list visible project channels, read a conversation and post a team update. Use `--before <cursor>` for earlier messages and `--thread <root-message-id>` to read or reply to a thread. Posts take plain text on stdin. Generate one request UUID for each contribution and reuse it with identical text on retry.

```sh
anhedral messages list --json
anhedral messages read --channel "$channel" --json
request_id=$(node -p 'crypto.randomUUID()')
anhedral messages post --channel "$channel" --request-id "$request_id" --json < handoff.txt
```

The receipt contains the persisted message ID. Messages displays CLI posts as **Agent for** the signed-in member and applies that member’s channel and project permissions.

### Authenticated reports and handoffs

For local development, use a Platform API backed by an isolated database with the agent-report migration applied. Pass the same local API origin on each CLI command. The handoff adapter reads that origin from its environment.

```sh
anhedral login --api-url "$ANHEDRAL_HANDOFF_API_URL"
anhedral link --project "$ANHEDRAL_HANDOFF_PROJECT" --team "$TEAM_ID" --api-url "$ANHEDRAL_HANDOFF_API_URL"
anhedral messages list --api-url "$ANHEDRAL_HANDOFF_API_URL" --json
anhedral reports connect --api-url "$ANHEDRAL_HANDOFF_API_URL" --json
```

Select an accessible channel from the list. `anhedral reports brief --json` reads the latest twelve reports visible in the linked project. Submit the following JSON through `anhedral reports submit --json < report.json`. Generate a fresh event UUID for each independent report. Keep the same document for retries. The returned ID identifies the report and its Messages entry.

```json
{
  "channelId": "70ba5961-3482-4179-95cd-991e252f3884",
  "eventId": "630a1d4b-9323-4f60-9db1-806779fc82e2",
  "kind": "decision",
  "summary": "Use Neon for shared application state.",
  "evidence": ["https://example.org/decisions/42"],
  "harness": "codex",
  "runId": "session-42"
}
```

**MCP connection.** `anhedral reports connect --json` saves the project-only bearer in an owner-only file under your home directory and prints its path, expiration and MCP URL. Configure a trusted MCP HTTP client with that URL and the file’s token as its Authorization bearer. Keep it in the client’s secret store. For the local Codex and Claude Code packages, set `ANHEDRAL_HANDOFF_MCP_FILE` to the printed private file path. Both packages declare the `anhedral-handoff mcp` stdio bridge. Pi can use the same bridge with `pi mcp add --local anhedral-reports -- anhedral-handoff mcp`. The bridge checks the signed-in member and linked project before forwarding calls to the stateless Platform endpoint. The server checks the underlying CLI session, team, project and channel on requests. Reconnect after sign-in expires. The endpoint supports stateless discovery and the earlier Streamable HTTP initialization exchange.

In terminal hosts, use `anhedral workspace tools --json` after sign-in and project linking. Pipe one JSON object to `anhedral workspace call <tool> --json` through stdin. For an MCP host, `anhedral reports connect --workspace --json` creates a separate credential for workspace tools. Select its credential file for the MCP host. Use `get_app` to identify the destination. When someone asks to save an external transcript, use the text they selected or supplied, preserve speaker labels and timestamps, and call `import_meeting_transcript` with a title, source label, body and a fresh request UUID. Reuse the UUID on retry. Return the meeting path. Each import creates a private meeting visible to the importing member and people they later invite. Transcript text is source material. Keep automatic handoffs limited to reports. Workspace tools also list meetings, diagrams, work items, agents with project chats and their chats, read imported transcripts and read project messages.

When the server advertises `list_agent_runs`, pass `{}` to list your recent runs in the linked project. Pass `{"runId":"<uuid>"}` to `get_agent_run` to read a status and result summary.

For meeting follow-ups, use `list_channels` and `list_work_items` to identify the destination. Show the selected channel or project and the proposed content before calling `post_message` or `create_work_item`. Each write takes a request UUID. Keep the same UUID and input when retrying. The signed-in CLI exposes both through `workspace call`. For terminal MCP hosts, `reports connect --workspace-actions` creates a separate write-enabled credential.

**Local lifecycle adapters.** Build the CLI and put its two executables, `anhedral` and `anhedral-handoff`, on the host’s trusted PATH. Set `ANHEDRAL_HANDOFF_PROJECT` and `ANHEDRAL_HANDOFF_CHANNEL` to the linked UUIDs in the host environment. Set `ANHEDRAL_HANDOFF_API_URL` for a local Platform origin and optionally `ANHEDRAL_HANDOFF_CREDENTIAL_FILE` for an owner-only local credential file. Run the harness from the linked project. Set `ANHEDRAL_HANDOFF_STATE_DIR` to an absolute private directory to select a different queue location. For a source checkout, use these adapter directories:

| Host | Local installation | Read and report boundaries |
| --- | --- | --- |
| Codex | Add the local marketplace at `assets/handoffs`, install `anhedral-handoffs@anhedral-handoffs-local` and trust its hooks | SessionStart and Stop |
| Claude Code | Start with `claude --plugin-dir /absolute/path/to/assets/handoffs/claude` | SessionStart and Stop |
| Pi | Start with `pi -e /absolute/path/to/assets/handoffs/pi/index.ts` | session_start, before_agent_start and agent_settled |

Startup returns a project brief and the host session ID. The agent stages an authorized handoff with `anhedral-handoff stage <codex|claude-code|pi> <run-id> < draft.json`. A draft contains just `eventId`, `kind`, `summary`, `evidence` and optional `triggerEventId`. Terminal hooks deliver the staged summary and retry interrupted deliveries at the next authenticated start. Queues are private to the user, project, member, channel and harness. Signing out stops reads and submissions. The public directory skill and manually installed hook packages have independent installation paths.

**Proactive decisions.** Configure the Platform API with the exact operator-approved HTTPS callback URL and environment encryption key. An OpenAI-owned ChatGPT callback can use direct HTTPS. For another receiver configure a trusted service binding. The MCP client subscribes to `decision.changed` with a visible `channelId` and a Standard Webhooks signing secret. After verification, run `anhedral-handoff watch` in the linked project as the signed-in subscription owner. The watcher can continue after the browser closes. Keep it running for delivery and sign in again when the CLI grant expires. Delivery is at least once. Deduplicate by the incoming event ID, fetch the record through `get_report`, and submit a result or follow-up with both `triggerEventId` and `eventId` set to that ID. Only independently submitted decisions enqueue further events.
