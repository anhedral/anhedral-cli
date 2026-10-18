# Software factory

Use this workflow to turn a product brief into an application that works, runs in the owner's accounts and can be maintained. The [stack standard](stack-standard.md) defines the architecture. This guide defines the work and the evidence needed to move it forward.

A developer or coding agent owns product implementation. The CLI supplies repeatable scaffolding, selected provider setup, delivery operations and recorded evidence. The owner supplies product decisions, account access and any required spending or release authorization. Source, repositories, infrastructure, data and billing stay owner-controlled.

Use the numbered workflow for application delivery, then the reference sections for exact integration and contributor details:

- [Product definition and generation](#1-define-a-small-testable-product)
- [Application implementation and validation](#3-implement-the-product-and-integrations)
- [Source, access and delivery](#5-establish-source-access-and-delivery-authority)
- [Maintenance and recovery](#8-maintain-and-recover)
- [Evidence-driven maintenance](#evidence-driven-maintenance)
- [Provider configuration](#provider-configuration)
- [CLI behavior](#cli-behavior)
- [Project dashboard](#project-dashboard)
- [Maintain and release the CLI](#maintain-and-release-the-cli)

## 1. Define a small, testable product

Write the intended users, core flows, data, access boundaries and observable acceptance criteria in the application's `docs/architecture.md`. Include the selected components, actual connections, environment assumptions, cost limits and tradeoffs. Preserve suitable existing code and use the same project for later changes.

For a booking app, “a member can create a booking, see it after reload, and cannot read another member's booking” is an acceptance criterion. “Use auth and a database” is a stack choice. Plan both, then implement a vertical slice that exercises the real UI, server and persistence together.

Choose only the necessary catalog components. Decide whether the app is public or private, whether several clients share an API, and who owns production operations. Resolve decisions that materially affect architecture, access or cost before creating resources.

Use the complete [stack catalog](stack-standard.md#defaults-and-foundations) to choose applications, data/identity, services and SDK integrations. Plain initialization supplies the Vinext web foundation without a database or identity provider. Include the web flag when combining it with another interface; for example, `--vinext --hono --expo --neon` selects web, API, mobile and PostgreSQL. Better Auth defaults to D1, Neon Realtime adds Neon, and RevenueCat requires an explicit Stripe selection. Review the [composition rules](stack-standard.md#composition-and-compatibility) before choosing a delivery engine: OpenNext, Queues and Basin use Wrangler, and later additions do not switch an existing Void workspace to Wrangler.

Record what each recipe supplies and what the product still needs. Sentry, device-local data and RevenueCat require platform integration work; SDK factories need consumers; room messaging, live video, job processing and workflows need product behavior. Select `--stream` for one-to-many WHIP/WHEP broadcasts; Stream activation, live input ownership, creator/player UI and private playback verification remain explicit integration work. The catalog's generated-scope and setup columns describe these boundaries.

**Ready to generate:** the core flow, stack selection, owner and acceptance criteria are clear.

## 2. Generate and inspect the foundation

Use Node.js `24.21.0+` and pnpm `10.34.5` for the default stack. Match the installed CLI version to the plugin's bundled registry `cliVersion` when using Codex. Pin that version for repeatable automation. For unpublished checkout work, run `pnpm build` and use `node dist/bin.js`; building does not update installed releases.

```sh
anhedral init my-app --vinext --hono --d1 --better-auth --r2 --dry-run --json
anhedral init my-app --vinext --hono --d1 --better-auth --r2
cd my-app
pnpm dev
```

Use an unused directory. `init --dry-run` performs no writes or network requests. Actual initialization downloads the upstream bootstrap, generates source and normally installs dependencies and initializes Git; it does not create cloud resources or deploy. `--skip-install` skips the final install, but the upstream bootstrap still needs network access.

Review the generated README, `AGENTS.md`, `docs/stack.md`, root `anhedral.json` and lockfile. The setup section records remaining requirements. Keep secrets in the selected runtime's private files, following its templates.

For later capabilities, preview before applying:

```sh
anhedral add resend --dry-run --json
anhedral add resend --diff
anhedral add resend
anhedral doctor --json
```

Additions use the bundled catalog and preserve edited source. Resolve conflicts deliberately. A selection plan marked `filesChecked: false` has not previewed files that require a new upstream web bootstrap. Add does not perform runtime relocation or switch the Cloudflare engine.

**Ready to implement:** the workspace starts, the selected packages have clear consumers, and remaining setup is understood.

## 3. Implement the product and integrations

Build the acceptance flows with real persistence, validation and server-side authorization. Include loading, empty and failure states. Exercise denied access and cross-user/tenant isolation, not just the successful path. Keep shared contracts in packages and privileged code on servers.

Generate SQL with `pnpm db:generate`, review it, then apply it to the intended development database with `pnpm db:migrate`. Migration tasks are separate from build/startup. Production migrations need a reviewed apply plan and data compatibility assessment. The stack standard explains D1 ownership and separate Neon migration credentials.

Configure the selected integrations in the `providers` section of `anhedral.json`. Supply management keys through the process environment; runtime secrets stay private. Use existing scoped resources where appropriate. The [provider configuration reference](software-factory.md#provider-configuration) lists supported automation, exact fields, credentials and owner prerequisites.

Domain verification, OAuth consent, billing enrollment, store signing and product-specific webhook/purchase behavior may require separate work. Neon Realtime additionally needs manual branch activation/origins and authenticated scoped sealing/subscription flows. Installed SDKs and obtained credentials do not establish that these features work.

**Ready to validate:** each core flow uses its intended implementation and remaining external dependencies are explicit.

## 4. Check the actual application

From the generated project root:

```sh
pnpm check
anhedral doctor --json
anhedral inspect --json
```

`pnpm check` runs lint, types, Fallow analysis, dependency audit, tests and builds; the explicit OpenNext profile also builds its Worker output. Add meaningful product tests as you implement features. `doctor` checks local readiness and provenance. `inspect` reads local selection, setup and recorded delivery evidence offline; neither certifies live product behavior.

Exercise the actual runtime as well as compilation: Vinext/Vite workerd preview, OpenNext Worker preview, or native Next.js as selected. For mobile, desktop and extensions, check relevant device/packaged behavior and permissions. Verify retry, webhook duplication, private files, AI limits and recovery for the services you selected.

Record commands, results and gaps in the application's `docs/verification.md`. Distinguish local, preview and live results. A smoke check or HTTP 200 establishes availability of that route, not completion of the product.

**Ready to deliver:** checks pass and core flows have credible runtime evidence.

## 5. Establish source, access and delivery authority

Verify the owner's Git identity and repository destination. Review source and secret ignores, then commit the application and configuration in its own repository. Generation does not create a source commit for you. Never commit private runtime files or `.anhedral/`.

```sh
anhedral auth --status --json
anhedral auth
anhedral doctor --providers --json
anhedral repository --create --json
```

`auth` can guide Cloudflare, Vercel and Expo login; API integrations use supplied environment credentials. `--status`, JSON and noninteractive modes never open login prompts. Authentication is separate from selecting a resource/account and proving every write permission.

`repository --create` creates a private GitHub repository under the selected account when necessary, pushes the intended source and verifies the exact remote identity/commit. Use explicit owner/name/visibility flags for a different authorized destination. Reuse matching origins; preserve existing remotes and visibility. Connecting Git to a host can trigger deployments, so check release authorization and policy first.

Connect the intended hosting account and audience, then review and commit the resulting configuration:

| Target                         | Example                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| Private Cloudflare app         | `anhedral connect --audience private --allow-email owner@example.com`                 |
| Intended public Cloudflare app | `anhedral connect --audience public`                                                  |
| Private Vercel app             | `anhedral connect --scope customer-team --audience private --use commercial --create` |

Replace all example account/member values. Select `--account` for Cloudflare when needed, and `--provider cloudflare` or `--provider vercel` to disambiguate mixed projects. Private Cloudflare hosting requires Zero Trust and scoped Access permissions. Whole-Worker Access does not protect WebSockets; private realtime needs a separately reviewed identity/hostname design. Vercel private hosting requires verified all-deployment protection. Hosting access is separate from product identity and authorization.

Vercel Hobby is personal/non-commercial; use `--use personal` only for eligible personal use. Commercial apps need an eligible existing plan. Do not activate paid plans, broaden audience or weaken protection to clear a blocker.

**Ready to ship:** source is committed, account/audience are selected, and permissions and release authority cover the intended operations.

## 6. Deliver one reviewed change

Choose one path for each change: CLI delivery, or connected Vercel Git delivery. Configure branch protection and required CI explicitly; a connected host does not automatically wait for GitHub Actions.

### CLI delivery

```sh
anhedral ship --dry-run --json
anhedral ship --json
anhedral status --refresh --json
```

The dry run previews setup and delivery without provider operations. Actual `ship` coordinates supported integration setup, private runtime configuration, checks and hosting delivery. In mixed projects it handles Cloudflare services before the Vercel web app; provider flags select one target explicitly.

For supported Cloudflare selections, Void owns provisioning and deployment. `provision` reports the plan and defers writes to Void. Explicit OpenNext, Queues/DLQ and Basin use Wrangler; standalone `provision` reconciles Cloudflare resources only. The integration adapters and their limits are documented in the provider reference.

**Treat `configuration-required` as a checkpoint.** Wrangler can stop before deployment when resolved resource IDs change tracked bindings. Void can activate a target before recording new resource identities in `void.lock.json`; Anhedral retains activation receipts and then requires review and a commit. Inspect those results, commit the expected changes, and ship the clean configuration again. Do not assume a nonzero result means nothing happened. Anhedral never commits source automatically. Multiple Workers are not an atomic release.

Void apps use `env.example` and one private app-root `.env`. Production secrets travel through noninteractive stdin; public build variables must be present when building client bundles. Follow generated templates and the provider reference rather than adding unsupported environment files. Generate/review shared SQL first; exactly one server owns deployment migrations.

Anhedral independently checks active provider versions, traffic, account and audience against retained receipts. A process exit code or deployment log alone is insufficient. See [Void verification](verification.md#void-delivery-verification) for the pinned receipt contract and outstanding live acceptance gates.

### Connected Vercel Git delivery

After committing source and establishing the verified repository, add `--git` to the Vercel `connect` command. Then:

```sh
pnpm check
anhedral repository --json
# Wait for the connected production deployment of this exact commit.
anhedral adopt --json
anhedral status --refresh --json
```

`repository` pushes source; the host's Git integration deploys it. `adopt` verifies the active production source/repository and records the release without another push or deployment. Do not also run `ship` for that same change.

### Native delivery

For Expo, set explicit owner/slug in static `apps/mobile/app.json`, configure the selected EAS profile and run:

```sh
anhedral ship --platform android --profile preview --json
```

Use `--platform ios` for iOS. Project creation/linking requires review and a commit before a build continues. A queued result returns the EAS build-page link; repeat the command to inspect that build rather than submitting another. A completed artifact must match the selected project/source. Store submission is separate. Simulator builds are not TestFlight artifacts; signed iOS builds require owner credentials. Electron/extension packaging and store distribution use their actual platform workflows.

**Ready for live acceptance:** the actual URL or artifact, exact source and provider identity are confirmed.

## 7. Verify and hand over

Open the actual deployed URL or install the confirmed artifact. Exercise the original acceptance criteria with real intended users and integrations. For private hosting, check anonymous rejection at primary and deployment URLs, allowed-user sign-in and denied users. Verify product authorization and cross-tenant access separately. Provider-authenticated automation does not prove visitor login.

Implement a meaningful root `test:live` script and run:

```sh
anhedral verify --json
```

`verify` supplies the actual `ANHEDRAL_APP_URL` and checks source/provider provenance. Use the test to exercise the product's meaningful live assertions; a placeholder success script proves nothing. If access or an integration is blocked, retain the completed work and identify the exact unverified flow.

Keep the application's verification record current:

| Record             | Include                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| Source             | Repository, branch, exact commit, CLI/plugin versions                            |
| Hosting            | Owner account/project, audience, active release, actual URL/artifact             |
| Product evidence   | Commands and observed results for each core flow; local/preview/live distinction |
| Integration status | Configured and exercised services, pending owner setup and acceptance gaps       |
| Operations         | Alert owner, usage limits, recovery procedure and next actions                   |

Do not include credentials. Successful delivery includes maintainable source, reproducible verification and a clear operating handoff. A later production change can make earlier acceptance evidence stale.

## 8. Maintain and recover

| Need                              | Command and boundary                                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Refresh deployments               | `status --refresh --json` checks current provider evidence                                                     |
| Open a management overview        | `manage --json`; `--local` explicitly uses historical local evidence                                           |
| Inspect services on demand        | `services list --json`, then supported status/metrics/data commands; reads can expose private data             |
| Recover after cloning             | `recover --json` reconstructs independently verified current hosting state, not missing history or credentials |
| Inspect interrupted integrations  | `integrations status --json`; recover only the verified pending operation/resource                             |
| Release an interrupted local lock | `recover --lock` only removes a proven dead same-host delivery lock; inspect receipts first                    |
| Restore recorded code             | `rollback --release <id> --data-compatible` after schema/resource compatibility review                         |

Rollback does not restore data, reverse SQL or cross incompatible Durable Object migration boundaries. Void rollback only restores covered code/triggers; review retained evidence. Restore matching clean source before verifying the result. Back up data and test restoration independently.

Keep alerts, dependency updates, quotas, retry/concurrency limits and shutdown controls owned and exercised. Ignored local receipts are not a durable historical backup. Live/foreign/uncertain locks are preserved; a leftover `.anhedral/ship.guard` needs manual ownership inspection. Lock recovery cannot be combined with provider/refresh flags and never replays provider writes.

Use `anhedral help <command>` for exact options. See [provider configuration](software-factory.md#provider-configuration) for integration setup/retries and [CLI behavior](https://github.com/anhedral/anhedral-cli/blob/main/docs/software-factory.md#cli-behavior) for machine output and previews. The optional [Codex inspector](software-factory.md#project-dashboard) uses the same project logic; it does not replace runtime or product acceptance.

## Evidence-driven maintenance

Use this workflow for maintenance in the CLI, plugin and generated applications. It adapts lessons from OpenAI's [Maintaining software with the GPT-6 family](https://developers.openai.com/blog/maintaining-software-with-the-gpt-6-family) to Anhedral's source generators, published contracts and provider boundaries. It does not authorize a new audit, external mutation or release outside the requested work.

### Establish the case before editing

Inspect the current branch, working tree, owning instructions and relevant history. Define the behavior to preserve and the evidence that would justify changing it. For a broad audit, rank candidates by confidence, maintenance burden and measured runtime or CI cost. Keep uncertain candidates visible with the missing evidence; do not turn an incomplete inventory into a claim that everything else is safe.

Use Fallow and source searches to find candidates, then trace their consumers. In this repository, include `src/index.ts` exports, command dispatch, registry-selected recipes, emitted source strings, generated package scripts, plugin/MCP entrypoints and source-only examples. An internal import search alone cannot establish that a published API or generated recipe is unused. Check aliases, wrappers, computed names and external consumers where relevant. Keep compatible entrypoints unless a breaking change is explicitly in scope.

For each proposed removal, capture the symbol or configuration, callsites, history, evidence links or commands, expected behavior and unresolved dependencies. Use authorized read-only provider configuration, CI history and telemetry when they can resolve uncertainty. Note environment, source revision and observation window. Zero observed traffic is supporting evidence, not proof that a recovery path is obsolete. If live access is unavailable, finish source analysis and mark that candidate unverified.

### Preserve operational controls

Before retiring an experiment or constant flag, check its current authoritative value, targeting rules, dependent flags and all consuming services. Follow indirect references through schemas, aliases and dynamically constructed keys. Local overrides and SDK defaults do not establish production values. Preserve kill switches, emergency fallbacks, access boundaries, retry limits and recovery controls unless their retirement is explicitly justified and authorized. A permanent designation or conflicting evidence needs owner resolution before removal. A code cleanup does not imply permission to delete provider configuration or resources.

### Prepare a bounded change and verify it

Group work by a single rationale and ownership boundary; separate unrelated candidates into small changes. Explain why behavior is preserved, including the dependency chain for flag removals. Add a meaningful regression for a code defect and exercise affected consumers. Recipe changes need generated-output checks; package/export changes need packed-consumer checks; provider behavior needs its relevant local contracts and separately scoped live evidence. Use the existing release gates when releasing. Report measured savings with the measurement method, and label estimates explicitly.

For flaky tests, inspect recent failed and successful CI runs at the same revision where possible. Distinguish product failures from timing, shared state, platform and infrastructure problems. Reproduce the failure or capture a concrete causal trace, fix that cause and rerun the affected case under the relevant conditions. Do not replace assertions with sleeps, increase retries to conceal failures, or disable required checks as a fix. When evidence is insufficient, report the suspected cause and next diagnostic step.

### Improve agent context with evidence

Keep enduring instructions in the owning `AGENTS.md` or skill and detailed procedures in linked references. When an instruction appears to cause unnecessary work, use the original task and an isolated repository snapshot to compare the current instruction with one narrow correction. Hold model, effort, tools and inputs constant; compare correctness, tool calls, tokens, elapsed time and cost where available. Replays must avoid duplicate provider writes, messages or releases. If a replay cannot be run, call the edit a proposed improvement rather than a measured gain.

Use the configured model and effort for routine work. Consider a stronger reasoning setting for unresolved dependency chains or broad audits when cost and authorization permit; the article's benchmark is not an Anhedral quality or cost guarantee. Revisit corrective prompts when models change rather than accumulating permanent workarounds. Put accepted findings and verification gaps in `docs/verification.md`, and carry only durable, demonstrated lessons into shared instructions.

## Provider configuration

Anhedral scaffolds source, guides authentication, and provisions and configures the selected stack before deployment. The application and accounts belong to the developer or client. Feature development, design, custom integrations, and ongoing maintenance are Anhedral's services.

### Setup

1. Run `anhedral init <directory> <stack-flags>`. Review the generated source and install dependencies.
2. Fill in the `providers` section of `anhedral.json`. It contains only selected integrations, nonsecret resource names, account identifiers, regions, and desired webhook settings. Empty account/domain fields require an explicit choice. Commit this file with the application source. To use an existing resource, set its ID instead of requesting a new project by name.
3. Supply management credentials through the process environment and run `anhedral auth <directory>`. `--status` performs checks without opening login. Cloudflare, Vercel, and Expo support interactive CLI login; API integrations show their required credentials. A successful read does not prove every write permission.
4. Connect the intended hosting account, project, plan, and audience using `anhedral connect`. Review and commit the connection manifest. Expo uses the explicit `owner` and `slug` in `apps/mobile/app.json`.
5. Inspect `anhedral registry capabilities --json` for implemented scope and evidence limits, then inspect `anhedral ship <directory> --dry-run`. It reports missing provider settings without login, network requests, writes, provisioning, or deployment. Run `ship` after reviewing the plan and authorizing the provider operations.

The manifest uses a typed, provider-specific configuration contract. It rejects unsupported providers, foreign fields, unknown enum choices, and duplicate webhook events before network operations. Empty fields are accepted for scaffolding but must be completed when required for provisioning. The exported `PROVIDER_CONFIGURATION_SCHEMA` matches these fields and enums; no generated `$schema` URL is currently installed in projects.

Authentication results label verified access as `session`, `management`, or `runtime`; unsuccessful checks use `none`. Clerk and OpenAI management credentials take precedence over runtime credentials. A runtime probe is never reported as management access. Vercel and Expo session probes require bounded, single-identity output from the pinned CLI; diagnostic paragraphs do not count as a session. These probes do not verify the selected project, all write permissions, account enrollment, or remaining owner prerequisites.

Management keys do not belong in this manifest or application source. Runtime credentials returned by providers are configured in ignored application environment files and private `.anhedral/` state. API errors and CLI results omit credential values. Never attach this private state to an issue or commit it.

### Adapters

| Provider   | Management credential                     | Automated configuration                                                                                                                                                                                                                        | Owner prerequisites and remaining application work                                                                                                                   |
| ---------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Neon       | `NEON_API_KEY`                            | Create or select an explicitly scoped organization/project; check outstanding operations; obtain the selected database/role's pooled connection URI; configure the server runtime environment; migration credentials are configured separately | An eligible account/region; reviewed schema and migrations; application data access                                                                                  |
| Clerk      | `CLERK_PLATFORM_API_KEY`                  | Verify the selected workspace; create or select an application and environment; retrieve its matching publishable and secret keys                                                                                                              | Platform API access; production domain/DNS/OAuth setup; application authorization. `CLERK_SECRET_KEY` alone verifies runtime access and cannot create an application |
| Resend     | `RESEND_API_KEY` with management access   | Create or select the explicit sending domain; request verification; report required DNS records; issue a domain-scoped sending key only after verification                                                                                     | Domain ownership and DNS publication/propagation; sending eligibility; templates and delivery behavior                                                               |
| Stripe     | `STRIPE_SECRET_KEY`                       | Verify the explicit account and test/live key mode; configure a webhook with explicitly listed events when requested; securely retain its signing secret                                                                                       | Account activation for live payments; product/price decisions and webhook handlers. Provisioning does not invent a billing model or create financial commitments     |
| RevenueCat | `RC_API_KEY` with v2 configuration access | Create or select a project; create/select iOS, Android, or connected Stripe apps; retrieve platform public SDK keys                                                                                                                            | Store credentials or Stripe account connection; products, offerings, entitlements, SDK installation, and purchase verification                                       |
| Sentry     | `SENTRY_AUTH_TOKEN`                       | Select organization/team/project; create a project if absent; verify the team/platform; select a single active client key or create one if absent; configure DSN                                                                               | Appropriate organization/team permissions; platform SDK initialization, source maps, privacy filtering, and alerts                                                   |
| PostHog    | `POSTHOG_PERSONAL_API_KEY`                | Select US/EU region and organization; create/select a project; retrieve its ingestion key and matching ingestion host                                                                                                                          | Project permissions; product events, privacy/consent rules, and SDK initialization. Personal management keys never become ingestion keys                             |
| OpenAI     | `OPENAI_ADMIN_KEY`                        | Create or select an active project; create a named service account; retain its one-time runtime key privately                                                                                                                                  | Organization administration access, provider billing eligibility, limits, and application AI behavior. `OPENAI_API_KEY` alone cannot create projects                 |

The adapters implement a bounded scaffolding setup, not every administration endpoint a provider exposes. Account enrollment, required billing acceptance, DNS ownership, OAuth consent, store enrollment, and product-specific design remain explicit owner steps. Provisioning success does not certify those steps or finished product functionality.

#### Example manifest

For a selected Hono + Neon + PostHog stack, the `providers` section contains the following value. Keep the other `anhedral.json` sections intact:

```json
{
  "schemaVersion": 1,
  "providers": {
    "neon": {
      "name": "customer-app",
      "organizationId": "org-example",
      "region": "aws-us-east-1",
      "database": "app",
      "role": "app_owner"
    },
    "posthog": {
      "name": "customer-app",
      "organizationId": "00000000-0000-0000-0000-000000000000",
      "region": "eu"
    }
  }
}
```

Replace example organization IDs with the intended account's actual identifiers. Existing resources use `projectId`; Clerk uses `applicationId` and `workspaceId`; Resend uses `domainId`; RevenueCat can select `iosAppId`, `androidAppId`, or `webAppId`. New RevenueCat native apps use `bundleId` / `packageName`; a new Stripe app requires a previously connected `stripeAccountId`. Sentry selects `organization`, `team`, `project`, and `platform`. Stripe requires `accountId` and `mode`; optional `webhookUrl` must use HTTPS and `webhookEvents` must explicitly name the handled events. A webhook endpoint and handler must already be designed before registering it.

### Delivery and retries

For new supported Cloudflare workspaces, Void owns resource provisioning and deployment; Anhedral does not run its resource creator in parallel. Explicit resource declarations remain in `anhedral.cloudflare.json`, and Void records resolved identities in `void.lock.json`. Explicit OpenNext, queue/DLQ and Basin selections use Wrangler. Wrangler provisioning reconciles D1, private R2 buckets, KV, Queues, and private JSON Basin streams. Basin HTTP ingestion stays disabled; the Worker binding is enabled. Sinks and transformations require application-specific design. Durable Objects, schedules, Workflows, and Workers AI bindings are configured through Worker deployment. Hyperdrive configurations added by a developer still require an explicit provider workflow.

If Wrangler resource provisioning changes tracked binding IDs, `ship` returns `configuration-required` before deployment. Void may already activate targets before writing new resource identities to their locks. When only the expected `void.lock.json` files change, it retains the activation receipts and returns `configuration-required`; live product verification remains blocked. Review and commit the changed bindings or locks, then ship the clean configuration. It never commits code automatically. Pending Neon operations or unverified Resend DNS return `provider-configuration-required` and stop deployment. The configured integrations' remaining product setup appears in their results.

Review the generated database schema and apply the selected database migrations before testing application features or authentication. Generated tables and SDK factories are starting points; provisioning resources does not migrate the application database or implement its authorization rules.

For selected Better Auth applications, shipping first reads `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` from the primary server's ignored, untracked runtime file (`.env` for Void, `.dev.vars` for Wrangler Workers, `.env.local` for native Vercel). Configure a generated nonplaceholder secret of at least 32 characters and the intended HTTPS public origin. On POSIX systems this file must have mode `0600`; keep equivalent private file access on other systems. Tracked or symlinked files, broad file permissions, missing values, placeholder secrets, and unsafe origins stop shipping before provider mutations. Wrangler cannot deploy a same-named plain variable and secret; authentication credentials belong only in the private runtime file. The preflight does not generate a secret, choose a domain, modify files, configure OAuth, or verify application-user authorization.

Void selects direct Cloudflare delivery explicitly and uploads server runtime credentials using noninteractive `void secret put` with stdin before publication. Values never appear in command arguments; public `VITE_*`, `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` build variables are excluded from these uploads. The pinned Vinext plugin loads the app `.env` for local builds and maps `NEXT_PUBLIC_*` into client bundles. Supply public values in the selected production build environment; uploading server secrets does not configure client bundles. Its separate Cloudflare process receives the verified API token or Wrangler OAuth credential only through the child-process environment. A secret update is a provider mutation even if the subsequent build or deployment fails. Wrangler Cloudflare delivery uploads runtime credentials with the code using Wrangler's `--secrets-file`; its private temporary credential files are removed after the operation. Vercel configures only the selected web runtime's production environment, checks every returned result for success, and then performs the checked deployment. In mixed Vercel/Cloudflare projects, default `ship` coordinates Cloudflare services first, then the Vercel web application under one operation lock. `ship --provider cloudflare` or `ship --provider vercel` explicitly selects only that hosting target. A setup gate stops before the dependent web deployment. If Cloudflare completes and Vercel fails, the result is partial; no atomic provider or data rollback is attempted. Repeating `ship` rechecks both targets and reuses provider receipts where available; it does not skip completed phases merely because the diagnostic operation journal says they completed.

Shipping records nonsecret phases and outcome in ignored `.anhedral/operation.json`. This is a diagnostic journal, not a resumable transaction or proof of live product behavior. `status --json` and the dashboard can show the recorded operation; resource replay protection remains in the provider journals and deployment/build receipts. A new run records a new operation and revalidates current prerequisites.

Creation receipts are saved immediately in ignored `.anhedral/providers.json`. Schema 2 keeps minimal creation identities and status there; supported one-time credentials are stored separately in ignored `.anhedral/provider-credentials.json` with private file permissions. Subsequent runs verify existing resources and reuse saved credentials. Ignored `.anhedral/runtime.json` contains deployment runtime values and must also remain private. A confirmed 4xx rejection can be retried after access is corrected. A timeout, malformed success response, rate limit, or server error can leave an unknown creation outcome: the CLI stops rather than replaying the mutation. Inspect the provider and preserve a secure backup of the receipt before reconciling the pending operation. Desired configuration changes also stop and require reconciliation. Never remove state blindly to bypass this check.

Read-only API requests retry bounded transient failures (429, 502, 503, 504, transport interruptions and timeouts) within a 30-second overall deadline, with at most three attempts. Short provider retry delays are respected; longer delays return an actionable failure instead of retrying early. Invalid or oversized JSON is not retried. Mutating POST/PATCH requests are never replayed automatically, including requests carrying an idempotency key.

Keep secure backups of `.anhedral/` and runtime environment files when moving machines. A fresh clone does not carry one-time credentials or provisioning receipts. Configure explicitly selected existing resource IDs and recover runtime credentials through authorized provider tooling rather than treating it as the original provisioning session. The CLI does not automatically delete, rotate, or replace resources. `integrations status` reads the journal without writes. `integrations recover --provider <provider> --operation <exact hash> --resource <id>` verifies a supported existing resource against the unchanged recorded configuration, then writes only its local completion receipt. It never recreates or deletes a provider resource. Recovery is unavailable for pending entries without operation metadata, changed desired configuration, and one-time credential creation when the original credential is missing; inspect the provider and retain secure backups. RevenueCat application recovery requires the parent project ID recorded explicitly in the original configuration.

```sh
anhedral integrations status my-app --json
anhedral integrations recover my-app --provider neon --operation <exact-64-character-hash> --resource <verified-project-id> --json
```

Copy the operation hash from status and supply the intended resource ID yourself. Supported recovery checks cover known Neon projects, Clerk applications/workspace/environment, Resend domains, PostHog projects/organizations, active OpenAI projects, Sentry projects/teams/platform, and RevenueCat projects or explicitly scoped apps. They perform provider GET requests and then update only the local completion receipt. Status does not write journals or create directories. It shows missing descriptors and one-time-credential operations as blocked. Resend sending keys, Stripe webhook signing secrets, and OpenAI service-account keys cannot be recovered from a resource ID alone; securely retained credentials and explicit provider inspection are required. Never paste credentials into the command or conversation.

### Mobile delivery

Use `anhedral ship <directory> --platform ios|android --profile <profile>`. Set the intended Expo `owner` and `slug` in static `apps/mobile/app.json`. The pinned EAS CLI creates/links the project when needed, then stops for review and a source commit. Subsequent builds independently check the linked project identity. Inherited profiles require explicit resolution before automatic delivery.

Only public mobile keys are uploaded to the selected EAS environment; server credentials are excluded. Queued builds return a build-page link and `building` state. Repeat the same command to inspect the saved build ID without creating another build. Completed builds must match the selected project and source commit before returning the download link. Failed/cancelled builds require provider inspection before removing the pending record and requesting another build.

Android preview builds produce APKs; production builds produce AABs. iOS simulator artifacts need no device signing; signed iOS builds need the developer's Apple credentials and enrollment. Anhedral never runs `eas submit`. Store uploads and approvals belong to the owner.

### Verification scope

Local contract tests cover selected-stack planning, API request/response shapes, resource reuse, one-time credentials, account mismatch, pending operations, DNS gates, unknown outcomes, private file safety, runtime partitioning, and deployment handoff. These tests do not establish live account eligibility, quota, permissions, billing, DNS, signing, or production product behavior. Verify those in explicitly authorized accounts before release.

Provider contracts: [Neon API](https://api-docs.neon.tech/reference/createproject), [Clerk Platform schema](https://github.com/clerk/openapi-specs/blob/main/platform/beta.yml), [Resend API](https://resend.com/docs/api-reference/introduction), [Stripe API](https://docs.stripe.com/api), [RevenueCat API v2](https://www.revenuecat.com/docs/api-v2), [Sentry API](https://docs.sentry.io/api/), [PostHog API](https://posthog.com/docs/api), [OpenAI administration](https://developers.openai.com/api/reference/resources/admin/), [Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Vercel OpenAPI](https://openapi.vercel.sh), and [pinned EAS source](https://github.com/expo/eas-cli/tree/v21.0.1/packages/eas-cli/src/commands).

### Authorized staging acceptance

Use a dedicated, explicitly selected account/project for live verification. Before the first mutation, record its owner, region, resource names, permitted operations, spending limit, cleanup responsibility, and retention period in the application's verification notes. Never use production credentials for routine tests or treat access to an account as permission to incur unspecified costs.

For each selected provider, verify the following against the exact candidate CLI:

1. Missing, expired, and insufficient credentials produce an actionable state without leaking keys or starting creation.
2. The selected account, organization, environment and region match the manifest before provisioning.
3. First creation and repeated configuration use the intended resources, with no duplicate creation.
4. Pending DNS, provider operations or enrollment produce an explicit blocked state before deployment.
5. An interrupted or unknown creation outcome preserves evidence and stops automatic replay; recovery requires inspected provider state.
6. Runtime credentials reach only their intended server or public client target. Check runtime access through a bounded application flow, without publishing the credential value.
7. The actual deployed service or build matches the selected project and checked source commit. Test its promised user flow independently of build success.
8. Record provider/resource IDs, source revision, nonsecret verification results, unresolved owner steps, and cleanup results. Keep credential files and complete provider responses out of public logs and issues.

A completed local contract test, an accessible API endpoint, a created resource, a successful deployment, and a verified product flow are separate evidence levels. Release notes must name the level actually established; do not promote one to another.

## CLI behavior

Anhedral uses three primary commands: `init` scaffolds source, `auth` checks or guides provider authentication, and `ship` provisions/configures the supported stack and coordinates delivery. `add`, `registry`, and `doctor` support development. Hosting selection and advanced release operations remain available through focused command help.

The comparison below uses current upstream documentation and source inspected on October 12, 2026. These projects solve different problems; the useful comparison is how they make commands discoverable, changes reviewable, and failures understandable.

| Reference                                                                                                                                     | Useful practice                                                                                          | Anhedral behavior                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [shadcn CLI](https://ui.shadcn.com/docs/cli) and its [command source](https://github.com/shadcn-ui/ui/tree/main/packages/shadcn/src/commands) | Source ownership, command-specific help, working-directory selection, and previews before changing files | Bundled recipes scaffold owned source; focused help, `--cwd`, and `add --dry-run`, `--diff`, and `--view` support review                           |
| [shadcn monorepos](https://ui.shadcn.com/docs/monorepo)                                                                                       | Resolve application and shared-package destinations coherently                                           | The registry resolves dependencies and workspace references into `apps/*` and `packages/*`; additions preserve edited source and record provenance |
| [GitHub CLI help](https://cli.github.com/manual/gh_help)                                                                                      | Discover commands through focused help topics                                                            | `anhedral help <command>` and `<command> --help` show the same options, examples, and relevant prerequisites                                       |
| [uv command reference](https://docs.astral.sh/uv/reference/cli/)                                                                              | Consistent output controls and discoverable options                                                      | `--quiet` suppresses human output; `--json` retains one machine-readable result; errors remain on stderr                                           |
| [CLI Guidelines](https://clig.dev/)                                                                                                           | Explain outcomes, suggest corrections, and show the next action                                          | Human summaries describe selected parts, pending setup, release evidence, and next steps; command/flag typos receive bounded suggestions           |

Shadcn's entry point uses Commander and registers separate commands; its initialization separates preflight checks, configuration, templates, registry work, and source updates. Anhedral separates its command metadata, argument handling, human output, registry resolution, staged transactions, and provider operations. The existing provider verification and mutation boundaries remain in the operation modules. See [shadcn's entry point](https://github.com/shadcn-ui/ui/blob/main/packages/shadcn/src/index.ts) and [initialization implementation](https://github.com/shadcn-ui/ui/blob/main/packages/shadcn/src/commands/init.ts).

### Command definitions

`src/command-schema.ts` declares command descriptions, option flags and aliases, required or optional values, and repeatable options. Command help and argument validation consume this same metadata; help text is never parsed to infer flag behavior. Singleton command options reject duplicates, required values reject missing input, and boolean options reject inline values without echoing those values. `--allow-email` remains repeatable; `add --diff` and `--view` accept an optional path. Command dispatch and domain-specific value validation remain in the operation handlers.

`src/bin.ts` handles global output flags, help/version, working-directory selection and error reporting. `src/cli-commands.ts` dispatches individual commands; `src/cli-delivery.ts` selects mobile, mixed-stack or provider-specific delivery. Their option collector in `src/cli-arguments.ts` uses the command schema's arity, aliases and repeatability rather than maintaining another flag parser. Initialization and source-preview additions retain their selection-specific parsers. Human output uses command-specific formatters in `src/cli-output.ts`, with explicit field allowlists and captured output contracts.

Provider lifecycle operations stay in `src/delivery.ts` and `src/vercel.ts`. Cloudflare planning, receipt parsing and evidence helpers live in `src/delivery-evidence.ts`; Vercel project state, provider queries and provenance checks live in `src/vercel-project.ts`. The original module exports remain available. Source transaction locking is isolated in `src/transaction-lock.ts`, while `src/transaction.ts` owns staging, journals, commit and recovery. Mobile delivery separates configuration, project linking, private environment transport, queue submission/resume, build validation and receipt recording; the orchestration retains the original whole-flow lock and mutation order.

### Daily use

```sh
anhedral init client-app --hono --neon --dry-run
anhedral init client-app --hono --neon
anhedral auth --cwd client-app
anhedral ship --cwd client-app --dry-run

anhedral add resend --cwd client-app --dry-run
anhedral add resend --cwd client-app --diff
anhedral add resend --cwd client-app --view packages/email/src/index.ts
anhedral add resend --cwd client-app

anhedral help ship
anhedral registry view neon
anhedral doctor --cwd client-app --json
```

Complete the selected provider settings and connect the intended hosting account before delivery, as described in [provider configuration](software-factory.md#provider-configuration). The commands above are examples, not authorization to deploy an application.

`--cwd` / `-c` selects the working directory and resolves relative directory arguments from it. `init [directory]` scaffolds a workspace; `add <items...>` adds bundled parts to the current project. Use `anhedral --cwd <directory> add <items...>` to select a project explicitly.

### Output contract

- Human output summarizes the operation and relevant next steps. Interactive scaffolding reports its current stage on stderr. Redirected output has no animated terminal effects or progress messages.
- `--json` emits a complete result on stdout. Failures emit a JSON error, code, and next action on stderr with a nonzero exit status. Login prompts and scaffolding tool output are suppressed in machine mode.
- Invalid `inspect` or `services` arguments use `INVALID_ARGUMENT`; inspection and service-operation failures use `INSPECTION_FAILED` and `SERVICE_FAILED`, respectively. `UNKNOWN_COMMAND` identifies an unrecognized command.
- `--quiet` / `-q` suppresses human results and progress, retaining errors. Combining it with `--json` retains the JSON result.
- `--verbose` exposes local scaffolding tool output in human mode. Machine and quiet modes keep tool output suppressed.
- Help and version checks do not require an existing project or a usable working directory. Unknown commands and flags fail before setup or provider operations; suggestions do not execute corrections.

### Source previews

`add --diff [path]` shows an applicable unified patch. `add --view [path]` shows generated source. Both imply a dry run and use the existing staged transaction; neither installs the preview. Without a path, they show the changed generated files. Conflict reporting still applies; previewing a conflict does not permit overwriting edited source.

Previews exclude private environment files and `.anhedral/` state. Public `env.example` (Void), `.env.example`, and `.dev.vars.example` templates can be inspected. Binary, nonregular, or files over 256 KiB are marked unavailable. The combined preview has a 1 MiB limit; select a file for larger additions. Diffs use a linear single-contextual-hunk implementation, including explicit handling of final newlines and new empty files.

A selection that needs a new upstream web bootstrap cannot produce source previews offline. The CLI explains this and directs the user to the selection-only `--dry-run` plan, which marks `filesChecked: false`. It does not fabricate files or run a networked generator during that preview.

### Deliberate boundaries

The public CLI accepts only bundled registry options. It does not accept external URLs, local third-party registries, or arbitrary remote content. It does not force overwrites, infer paid activation, or claim that scaffolding and authentication establish complete product behavior. Provider enrollment, permissions, DNS, billing eligibility, signing, and feature development remain explicit where required.

Contract and local-flow tests establish command behavior, source preservation, machine output, and provider request/response handling. Live account provisioning and deployment require separate authorized verification. Release remains a separate review decision.

### Read-only project inspection

`anhedral inspect [directory] --json` returns the shared versioned project-inspector contract used by the optional plugin UI. It reads bounded allowlisted local source and receipt files only, with independent errors for unavailable evidence. It does not contact providers, inspect credential values, migrate state or change files. It preserves per-target latest attempt and last successful release as separate facts. Authentication, permission and live provider health remain explicitly unknown. Read time does not make an old receipt fresh.

## Project dashboard

Anhedral is headless-first: describe the application to Codex, review the selected stack, develop its features, authenticate to your providers and ship through the CLI. The optional dashboard starts with the same local evidence available from `anhedral inspect --json`. Opening it or refreshing the project performs no provider calls. Explicit service controls request live status, analytics or data through the shared CLI adapters.

Building or packaging the plugin does not install or publish it. Actual Codex host rendering and composer behavior require separate verification; protocol tests do not establish those behaviors.

### Project lifecycle

The overview begins with **Init → Auth → Ship**, derived by the same inspector used by the CLI. Init reports supported Anhedral configuration and local structural readiness. Auth lists selected providers and recorded account references; these are not proof of a valid session, permission or billing eligibility. Ship summarizes per-target success receipts and flags incomplete operations, conflicts and deletion history. A recorded success does not establish current source or live health.

Review source, provider access and shipping plan prepare unsent Codex drafts. They do not run commands directly. The workflow is equally usable through the headless CLI. Services remain a secondary, project-scoped view. Registering an arbitrary directory does not adopt its stack or activate lifecycle actions; supported Anhedral configuration must exist. There is no separate Anhedral account or hosted control plane.

### Screens and evidence

| Screen   | Information                                                                                       | Evidence boundary                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Overview | Project identity, stack selection, per-target latest attempt and last success                     | Recorded results; not live health or feature acceptance                                                      |
| Services | Application targets, configured bindings, provisioning receipts and selected integrations         | Local inventory plus explicitly requested live readings; receipt matching uses resource kind and identifiers |
| Stack    | Workspace package dependencies, declared bindings, environment names and cron expressions         | Package dependencies do not prove network calls; declarations do not prove resource existence                |
| Setup    | Local prerequisites, selected providers, capability limits and setup guidance                     | Authentication, selected-account permission and billing remain not checked                                   |
| Delivery | Separate Cloudflare, Vercel and mobile records; integration pending outcomes and latest operation | One provider's success does not establish another's; old running records do not prove a process is active    |

Service controls expose only implemented readers; there is no schedule-execution reader. Environment names come from example files and reveal no values or proof of secret validity. Mobile download URLs may contain access tokens and are excluded; validated Expo build-page links may be displayed. Missing record timestamps and project identity are unavailable rather than invented.

Every section is bounded and validated independently. A corrupt provider journal must not hide another target's valid evidence. Read time is explicitly distinct from receipt time. Configured, recorded and unknown states must remain distinguishable. General secret files, provider credential vaults, runtime state, raw diagnostics and absolute source paths are excluded from the UI projection.

### Interactions

New project opens a new composer with this prompt, without sending: “Create a new project using [@Anhedral](plugin://anhedral@anhedral). Start by explaining the stack and asking me what it should be about.” Setup and delivery actions prepare unsent drafts for the current conversation. The user reviews and sends the request before Codex acts. Unsupported hosts offer copyable text. Project selection updates authorized model context; it does not execute commands.

Refresh reloads local files only. Rename and forget affect only local catalog metadata, never project source or provider resources. There is no project-creation or registration dialog. Successful `anhedral init` automatically registers its generated source in the local catalog. Existing sources can be registered through the local operator command. MCP tool inputs accept project IDs rather than arbitrary filesystem paths.

### Installation

Install with `codex plugin marketplace add anhedral/anhedral-cli`, then `codex plugin add anhedral@anhedral`. The marketplace references `plugin-v<version>` in the same repository. The release workflow creates this immutable tag from the verified ZIP, including its generated runtime; the development source directory alone is not an installable release. Plugin source tags retain the reviewed release commit as their parent. Existing tags cannot be replaced by the release workflow.

### Local development

The UI toolchain requires Node 22.13+ within Node 22, or Node 24+. The CLI retains its separately documented engines.

```sh
pnpm install --frozen-lockfile
pnpm --dir plugins/codex/inspector install --frozen-lockfile
pnpm build
pnpm plugin:check
pnpm --dir plugins/codex/inspector exec playwright install chromium
pnpm --dir plugins/codex/inspector test:browser
ANHEDRAL_PLUGIN_DATA="$PWD/.artifacts/plugin-preview" node plugins/codex/inspector/dist/server.mjs register "$PWD" "Anhedral"
ANHEDRAL_PLUGIN_DATA="$PWD/.artifacts/plugin-preview" pnpm plugin:preview
```

Open `http://127.0.0.1:4317/`. The preview binds only to loopback, validates Host/Origin, bounds requests and uses a restrictive content security policy. `anhedral inspect [directory] --json` provides the shared read-only projection directly. `anhedral registry capabilities --json` explains the supported automation and owner steps.

`src/project-inspector.ts` owns projection; `src/catalog-snapshot.ts` adds catalog identity. The browser only renders its validated schema. The MCP server exposes `open_projects`, `list_projects`, `get_project`, `get_project_services`, local metadata tools and model-only source/catalog context tools. They remain useful without UI rendering. Standard MCP Apps resources and bridge messages provide the optional panel, host themes and inline/fullscreen modes. Native host-specific draft support is a separate acceptance gate.

The plugin and standalone CLI share one private catalog. List views read bounded summaries; only a selected project loads detailed inspection. The server does not scan for other projects. CLI initialization registers new apps using the persistent `identity.id` in `anhedral.json`; recreating a directory creates a separate app rather than silently retargeting an old catalog entry. A remote server cannot inspect these local directories without a separately reviewed architecture; never publish the local catalog through a tunnel.

### Recovery and release review

Interrupted catalog writers can be inspected and recovered with the same private catalog directory:

```sh
ANHEDRAL_PLUGIN_DATA="$PWD/.artifacts/plugin-preview" node plugins/codex/inspector/dist/server.mjs recover-catalog-lock
```

Only a proven dead same-host owner permits recovery. Live, foreign, malformed and uncertain owners remain blocked. Recovery changes catalog access only, not provider work or delivery state.

Build/package checks bind the runtime and self-contained browser HTML to source and CLI version. Exact ZIP protocol tests exercise resources, schemas and headless tools. Before publication, verify native host entrypoints, unsent drafts, theme/reload behavior, all supported sections, keyboard navigation and narrow screens against the exact rebuilt ZIP. Publication remains a separate reviewed action.

The design follows the official [optional UI guidance](https://developers.openai.com/plugins/concepts/plugins#optional-ui) and [MCP Apps foundation](https://developers.openai.com/plugins/build/chatgpt-ui#start-with-mcp-apps).

### Live service capabilities

Live readings require the selected provider account and resource permissions. Missing access, unavailable providers and absent resources are distinct from a successful reading. Analytics show their source, UTC window and sampling status; recorded deployment success does not imply current health.

| Service                                           | Status                                | Analytics                                 | Data                                   | Confirmed deletion                  |
| ------------------------------------------------- | ------------------------------------- | ----------------------------------------- | -------------------------------------- | ----------------------------------- |
| Cloudflare Worker                                 | Settings existence                    | Requests, errors and CPU quantiles        | —                                      | —                                   |
| D1                                                | Resource identity and current storage | Daily query/row counts and latency        | Bounded table pages                    | Project-created, unshared resources |
| KV                                                | Resource identity                     | —                                         | Paginated key metadata; no values      | Project-created, unshared resources |
| R2                                                | Bucket identity                       | —                                         | Paginated object metadata; no contents | —                                   |
| Queues                                            | Resource identity                     | —                                         | —                                      | —                                   |
| Vercel                                            | Project/deployment status             | Daily Web Analytics                       | —                                      | —                                   |
| Neon                                              | Project identity                      | —                                         | Bounded public-table pages             | —                                   |
| PostHog                                           | Project identity                      | Hourly events and distinct IDs per bucket | —                                      | —                                   |
| Clerk, Resend, Stripe, RevenueCat, Sentry, OpenAI | Selected integration identity         | —                                         | —                                      | —                                   |

Neon browsing requires `ANHEDRAL_NEON_READONLY_URL`, optionally suffixed with the uppercase project ID (hyphens replaced by underscores). The endpoint must belong to that project. Each read transaction verifies a restricted role and read-only mode. Sensitive columns are masked before fetching; arbitrary SQL is not accepted.

R2 metadata browsing requires bucket-scoped read-only S3 credentials in `ANHEDRAL_R2_ACCESS_KEY_ID` and `ANHEDRAL_R2_SECRET_ACCESS_KEY`, optionally suffixed with the uppercase account ID. The reader signs only the selected account/bucket request and never downloads object contents.

Data rows, table names and deletion confirmation tokens are returned through private app metadata rather than model-visible MCP results. CLI data output is explicit user-requested output. Data views mask sensitive fields and do not provide an unmask control. D1 and Neon project bounded columns and mask sensitive columns in SQL before fetching rows; empty tables retain their schema. Database pages use explicit ordering, but concurrent writes can still change offset-based pages. KV and R2 metadata pages use provider cursors.

D1 table browsing excludes the literal internal prefixes `sqlite_` and `_cf_`. Underscores elsewhere in application table names do not act as wildcard filters.

Deletion is intentionally limited to D1 and KV. Review shows the exact account, resource, affected applications and impact. The user must type the resource name. The server requires a short-lived, single-use token, revalidates source and provider identity, and rejects adopted resources or detected external Worker consumers. Provider reads cannot provide an atomic lock against another operator changing remote dependencies.

A deletion request is never automatically retried. Confirmed absence is required to report success. Pending or uncertain outcomes remain recorded across reloads and block automatic reprovisioning. Source bindings remain for explicit review before shipping; removing a service does not silently rewrite application code. This implementation does not delete whole applications or provider accounts.

The CLI shares these adapters: `anhedral services list --json` lists exact selectors; `anhedral help services` describes status, metrics, tables, data and the two-step deletion flow. No service operation provisions resources, changes billing or deploys code.

The catalog defaults to `~/.local/share/anhedral/projects`; `ANHEDRAL_PLUGIN_DATA` selects an alternate directory and `ANHEDRAL_DISABLE_CATALOG=1` disables initialization registration. A catalog failure leaves successfully generated source intact and reports a registration recovery action.

The inspector source lives in `plugins/codex/inspector`; the installable plugin source lives in `plugins/codex/distribution`. Packaging reads that directory and emits a self-contained ZIP. Immutable `plugin-v*` release tags retain the public `plugins/anhedral` installation path used by the marketplace; the publication script builds that tree from the verified ZIP. That release path is independent of the development checkout layout.

## Maintain and release the CLI

The CLI repository is a single Node package with an optional Codex plugin, rather than a generated application monorepo. Its source layout is:

| Path                                                                              | Responsibility                                                                      |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/bin.ts`, `src/command-schema.ts`, `src/cli-*.ts`                             | Entry point, command grammar, dispatch and output contracts                         |
| `src/stack-registry.ts`, `src/dependencies.ts`, `src/scaffold/`, `src/platforms/` | Stack selection, pinned dependencies and owned source recipes                       |
| `src/providers/`, `src/delivery*.ts`, `src/vercel*.ts`, `src/mobile-delivery.ts`  | Provider setup, checked delivery, recovery and receipts                             |
| `src/project-inspector.ts`, `src/services*.ts`, `src/service-*.ts`                | Shared local inspection and explicit service readers                                |
| `plugins/codex/inspector/`                                                        | Optional MCP server, dashboard source and its independent toolchain                 |
| `plugins/codex/distribution/`                                                     | Plugin manifest, skills, generated reference copies and built runtime               |
| `tests/`, `scripts/`, `.github/workflows/`                                        | Contract/runtime checks, immutable artifact tooling and CI/release                  |
| `examples/full-stack/`                                                            | Source-only example of a generated workspace; no provisioned services               |
| `docs/`                                                                           | Stack architecture, this development/delivery guide and dated verification evidence |

Keep application-facing guidance in the stack standard and this factory, with one README as the entry point. Put dated checks and remaining acceptance gaps in the verification record. Update existing sections instead of creating another report for each investigation. `pnpm build` regenerates plugin reference copies from these canonical documents and the registry; edit the canonical sources first.

Before release, review the entire diff, run `pnpm release:check` and `pnpm plugin:check`, and exercise affected generated profiles with `pnpm test:integration`. The full local release gate includes external advisory refresh, exact patch regressions, packed installation and package allowlisting. A restricted local environment can leave network, listener or browser checks blocked; record that boundary and require the corresponding hosted CI evidence. Do not disable required checks to make a release pass.

`README.md`, `CONTRIBUTING.md`, `.github/CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md` and `docs/**/*.md` changes use lightweight CI: check the diff for whitespace errors and skip builds, browser tests, registry/generated-project matrices and release artifacts. All other paths, including plugin instructions, run full CI. The workflow still starts for every PR and push to main. Required matrix checks report a quick documentation-only success without installing dependencies; other expensive jobs are skipped. This preserves the existing branch-protection check names. Scope-detection failures also fail the existing Checks jobs. Merging documentation updates GitHub immediately and needs no version bump or npm publication. Packaged documentation updates with the next release. To deliberately release a documentation-only commit, manually run CI on main first; manual runs always execute the full matrix and produce the reviewed candidate.

For a new version, update `package.json`, `src/version.ts` and the immutable marketplace `plugin-v<version>` reference in `.agents/plugins/marketplace.json`. Build regenerates plugin manifest and registry versions. Commit all source and generated references, open a focused PR and wait for its checks before merging. Keep the owner's local checkout on `main` and synchronize it with the merged source without discarding unrelated work.

Publication uses `.github/workflows/release-on-main.yml` (Release Reviewed Candidate). It is dispatched explicitly against the exact current main commit, after its main-branch CI succeeds. Main CI builds and uploads the `release-candidate` artifact. Download it and review `metadata.json`, including its CLI `integrity` and matching `plugin.integrity`; dispatch with those exact values as `release_sha`, `cli_integrity` and `plugin_integrity`. The release workflow rebuilds, compares both immutable artifacts, runs the OS/Node portability matrix, publishes through npm trusted publishing and then creates the GitHub release and immutable plugin source tag. Do not manually publish a different tarball or move an existing release tag.

Verify the workflow completed, npm exposes the intended version/integrity, the GitHub release has the CLI tarball and matching plugin ZIP/metadata, and `plugin-v<version>` resolves to the expected release source. Packaging or merging alone does not establish publication. An installed plugin remains at its installed version until updated through its host. Maintain the exact source, checks, artifact identities and unresolved acceptance gaps in the verification record.
