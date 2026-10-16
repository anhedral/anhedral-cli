# Software factory

Use this workflow to turn a product brief into an application that works, runs in the owner's accounts and can be maintained. The [stack standard](stack-standard.md) defines the architecture. This guide defines the work and the evidence needed to move it forward.

A developer or coding agent owns product implementation. The CLI supplies repeatable scaffolding, selected provider setup, delivery operations and recorded evidence. The owner supplies product decisions, account access and any required spending or release authorization. Source, repositories, infrastructure, data and billing stay owner-controlled.

## 1. Define a small, testable product

Write the intended users, core flows, data, access boundaries and observable acceptance criteria in the application's `docs/architecture.md`. Include the selected components, actual connections, environment assumptions, cost limits and tradeoffs. Preserve suitable existing code and use the same project for later changes.

For a booking app, “a member can create a booking, see it after reload, and cannot read another member's booking” is an acceptance criterion. “Use auth and a database” is a stack choice. Plan both, then implement a vertical slice that exercises the real UI, server and persistence together.

Choose only the necessary catalog components. Decide whether the app is public or private, whether several clients share an API, and who owns production operations. Resolve decisions that materially affect architecture, access or cost before creating resources.

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

Configure the selected integrations in the `providers` section of `anhedral.json`. Supply management keys through the process environment; runtime secrets stay private. Use existing scoped resources where appropriate. The [provider configuration reference](provider-configuration.md) lists supported automation, exact fields, credentials and owner prerequisites.

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

Anhedral independently checks active provider versions, traffic, account and audience against retained receipts. A process exit code or deployment log alone is insufficient. See [Void verification](void-verification.md) for the pinned receipt contract and outstanding live acceptance gates.

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

Use `anhedral help <command>` for exact options. See [provider configuration](provider-configuration.md) for integration setup/retries and [CLI behavior](https://github.com/anhedral/anhedral-cli/blob/main/docs/cli-design.md) for machine output and previews. The optional [Codex inspector](plugin-ui.md) uses the same project logic; it does not replace runtime or product acceptance.
