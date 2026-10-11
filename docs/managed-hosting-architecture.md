# Anhedral Cloud: setup and deployment contract

The CLI has `cloud register|stage|save|deploy|status` and a locally tested API client. There is no operated hosting backend, platform login, issued app hostname or managed provisioning service. Everything marked **planned** below is a design requirement, not an available command. Customer-account delivery remains independent; never silently substitute it for requested managed hosting.

## Product boundaries

Anhedral is the B2B managed software services business. Anhedral Cloud is its hosting/operations service and client workspace. Anhedral Init (`anhedral` on npm) is the open-source application foundation and CLI; customer-account deployments must work without an Anhedral subscription. Managed delivery is an optional provider adapter, not a dependency hidden in generated application code.

Keep `anhedral-landing` as the public website and existing portal frontend initially; retain working Next.js/Vercel hosting while the Hono/Workers control plane is built. Both portal and CLI should consume that same API. One durable model should connect organizations, memberships/roles, engagements, applications, environments, resources, releases and usage. A services project can contain multiple applications; product users are distinct from portal members. The current portal's email-primary membership permits one team per person; expand membership deliberately before multi-organization operator/client access. Private file links need storage-side authorization, not just a private portal page.

Use the portal for client progress, approvals, application access, operating status, invoices and exports; expose technical controls according to role. Keep hosted customer code on a separate origin/domain from staff/client sessions. Sell engineering and managed operations with explicit responsibilities and bounded infrastructure usage. Source/data export, recovery and the customer-account deployment path should remain usable when managed hosting ends.

Sequence: align released CLI/docs; connect portal organizations to the control-plane registry; ship one independently recoverable private application; prove updates, isolation, backups and cost controls; then add operational/billing UI and selected distribution features. Begin as a managed service for invited clients; expand self-service only after those paths are repeatable.

## Accounts and paid activation

Managed users should need Anhedral sign-in only for ordinary hosted apps. Anhedral operates the infrastructure and bills its customers; customer-account hosting keeps providers and bills in the customer's account. Product login remains separate from platform/hosting access.

| Owner | Account/service | When and gate |
| --- | --- | --- |
| Anhedral | [Cloudflare Workers for Platforms](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/reference/pricing/), DNS zone and scoped deployment credentials | Required managed runtime. Published baseline is $25/month plus overages; purchase currently uses the dashboard. Verify account, subscription and permissions before provisioning. |
| Anhedral | [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver); optional [Hyperdrive](https://developers.cloudflare.com/hyperdrive/platform/pricing/) | Default direct HTTP Postgres; provision isolated app credentials/data boundaries. Add Hyperdrive only for measured needs, using the non-pooled Neon endpoint. D1 is the SQLite option. Free quotas are not production capacity guarantees. Hyperdrive is included in Workers plans; Neon has separate billing. |
| Anhedral | [R2](https://developers.cloudflare.com/r2/pricing/), selected Cloudflare services | Source/build archives and app files; compute/storage/operations/AI/media have separate meters. Enable only selected services. |
| Anhedral | Better Auth, verified sender and optional OAuth provider registrations | Platform identity, recovery and login mail. No customer Clerk account required; selected app identity providers can differ. |
| Anhedral | Stripe merchant account | Anhedral subscriptions and usage billing. Customer app payments require the app owner's merchant account or deliberate Stripe Connect onboarding; never mix ledgers. |
| App owner, when selected | RevenueCat, Apple/Google store products; external AI, mail or other providers | Own commercial identity and app integrations. Verification, terms, billing and OAuth consent may require a human; the CLI reports the exact remaining step. |
| App owner, when distributed | [Apple](https://developer.apple.com/help/account/basics/about-your-developer-account), [Play](https://support.google.com/googleplay/android-developer/answer/6112435), [Chrome](https://developer.chrome.com/docs/webstore/register) publisher accounts | Paid enrollment/registration and identity checks. Native signing/builds and review remain platform-specific; cloud backend deployment does not publish clients. |
| Optional | GitHub; custom domain/registrar | GitHub export/connection, not a prerequisite for managed source recovery. Platform subdomains use Anhedral DNS; [customer domains](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/) require ownership validation and hostname limits. |

Prices/eligibility must be rechecked at activation. Current numeric baseline is a dated October 8, 2026 check, not an app quote. Paid activation requires authorized spending; an agent can prepare setup and resume after enrollment without recreating resources.

## Platform architecture

Use separate control-plane and dispatch Workers. Better Auth identifies platform users; Neon holds owners, apps, permissions, resource identities, versions, deployments and billing ledgers. R2 stores immutable source/build archives. Queues/Workflows execute resumable build/provision/deploy jobs. The dispatch Worker maps an authorized hostname to an isolated user Worker; it must not trust a caller-selected worker name.

[Workers for Platforms bindings](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/configuration/bindings/) support app resources including D1/R2/KV, Durable Objects, Queues, Workflows and Hyperdrive. Attach only that app's resources; use separate credentials and migration/runtime roles for Postgres. Never give user code platform deployment, billing or shared-admin credentials. Build untrusted code in an isolated runner; export only reviewed executable artifacts. Resolve resources on the server from a declared capability manifest, not arbitrary account IDs from uploaded code.

Private previews and production enforce platform audience at dispatch, including assets, APIs and WebSocket upgrades. In-app authorization is still the application's responsibility. Test the chosen framework in the actual dispatch runtime: [platform limits](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/reference/limits/) include disabled `caches.default` and restricted `request.cf` in untrusted namespaces. Do not enable trusted mode for customer code to bypass compatibility failures. User Workers currently lack gradual deployments; use immutable versioned Worker names plus an authorized routing switch for previews/rollback, and verify WebSocket/stateful-version compatibility.

## Agent workflow

**Planned interface:** `cloud login` → `cloud plan --json` → implement/check/commit → `cloud ship --json --wait` → `cloud verify`. Login should use a browser/device authorization flow and OS-protected renewable credentials. CI uses revocable project-scoped credentials. JSON output should distinguish setup required, payment required, queued, failed, deployed and verified, with resumable operation IDs and non-secret next actions.

`plan` must identify owner/environment, declared resources, provider access, compatibility, estimated cost and authorized limits without mutations. `ship` should check source/build provenance, resolve resources, stage/save, apply reviewed compatible migrations, deploy, poll to completion and return the independently confirmed URL. Neither command exists yet. `new --hosting anhedral` is also not supported; generation currently selects Cloudflare or Vercel.

The current low-level sequence is executable only with an operated compatible backend and configured `ANHEDRAL_HOSTING_ORIGIN` / `ANHEDRAL_HOSTING_TOKEN`:

```sh
anhedral cloud register my-app --audience private --json
# Review source/secrets and commit the managed manifest in the app's own Git repo.
git -C my-app add <reviewed-paths>
git -C my-app commit -m "Prepare application version"
pnpm --dir my-app run check
# Build a complete self-contained Worker bundle/assets into an ignored app directory.
anhedral cloud stage my-app --artifact /absolute/path/my-app/build --json
anhedral cloud save my-app --version <returned-stage-id> --json
anhedral cloud deploy my-app --version <returned-stage-id> --json
anhedral cloud status my-app --json
```

Current `deploy` requests deployment and checks once; it may return queued/building. It does not wait for completion, run product acceptance or implement managed rollback/export. `save` writes connected identity into the tracked manifest; review/commit that change before staging a subsequent version. A staged artifact is not proven to originate from its source merely because both were archived: the planned build receipt must bind source commit, lockfile, toolchain and artifact digest.

## Source and API contract

Local Git remains the working source of truth. Save the exact clean commit plus complete build tree; retain immutable version IDs, SHA-256 hashes and byte lengths. Current staging permits regular files only, at most 64 MiB per archive and 10,000 build files; it rejects symlinks/submodules and credential files. Restore/clone/export must preserve history and allow exit; optional [Artifacts](https://developers.cloudflare.com/artifacts/platform/pricing/) can add Git-compatible managed history but is Paid-plan-only and has separately published metering.

Current API routes are under `/v1`. Authenticate every route, derive ownership from the session, preserve audience and validate project/version identity. Pin service origin and owner after connection; forbid redirects and credential-bearing origins.

| Route | Contract |
| --- | --- |
| `GET /session` | Authenticated owner identity. |
| `POST /projects`, `GET /projects/:id` | Idempotent registration/current owned project state. |
| `POST /projects/:id/versions` | Immutable commit, hashes/lengths and version identity. |
| `PUT /projects/:id/versions/:version/source` or `/artifact` | Independently verify uploaded hashes/lengths. |
| `GET /projects/:id/versions/:version` | Saved only when both verified archives exist. |
| `POST /projects/:id/deployments` | Idempotent deployment of exact saved version/audience. |
| `GET /projects/:id/deployments/:deployment` | Independently confirmed state/source/artifact; HTTPS URL only when deployed. |

Validate archives again server-side before extraction, including traversal, links, duplicate paths and decompression/size limits. Preserve incomplete upload/job evidence for safe retries. Saving source, deploying code and passing product tests remain separate states.

## Limits and completion gates

Enforce [dispatch CPU/subrequest limits](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/configuration/custom-limits/) plus application-owned request, storage, SQL, job, AI/media and outbound budgets. Provider alerts are not hard spend caps. Reserve costly work transactionally before execution; reconcile completion/failure idempotently. Rate-limit platform API jobs with bounded retry/backoff for provider throttling. Limit previews/builds, concurrent jobs and retention; define grace/suspension/export policies. Do not delete customer data merely because billing fails. Optional paid/beta/enterprise services need explicit eligibility checks and adapters; free analytics does not make the rest free.

Build in this order: platform identity and account/subscription preflight; durable registry/archive API; isolated build/resource provisioning; dispatch/private routes; resumable deployment polling; logs/secrets/recovery/export; billing/quotas; signed client distribution where requested. First acceptance fixture: two owners, independent private apps, persistence, file upload, one bounded job and repeated update. Prove cross-tenant rejection, anonymous denial, interrupted-save/deploy retry, source restoration, quota rejection and code rollback/data compatibility before onboarding.

Maintain this single contract as capabilities ship: replace planned claims with verified command/API behavior and update account/limit links. Keep dated test evidence in existing release/test artifacts, not new analysis documents. Deployment and publication remain unproven until the operated service and installed agent workflow pass acceptance.
