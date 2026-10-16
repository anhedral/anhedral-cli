# Provider configuration

Anhedral scaffolds source, guides authentication, and provisions and configures the selected stack before deployment. The application and accounts belong to the developer or client. Feature development, design, custom integrations, and ongoing maintenance are Anhedral's services.

## Setup

1. Run `anhedral init <directory> <stack-flags>`. Review the generated source and install dependencies.
2. Fill in the `providers` section of `anhedral.json`. It contains only selected integrations, nonsecret resource names, account identifiers, regions, and desired webhook settings. Empty account/domain fields require an explicit choice. Commit this file with the application source. To use an existing resource, set its ID instead of requesting a new project by name.
3. Supply management credentials through the process environment and run `anhedral auth <directory>`. `--status` performs checks without opening login. Cloudflare, Vercel, and Expo support interactive CLI login; API integrations show their required credentials. A successful read does not prove every write permission.
4. Connect the intended hosting account, project, plan, and audience using `anhedral connect`. Review and commit the connection manifest. Expo uses the explicit `owner` and `slug` in `apps/mobile/app.json`.
5. Inspect `anhedral registry capabilities --json` for implemented scope and evidence limits, then inspect `anhedral ship <directory> --dry-run`. It reports missing provider settings without login, network requests, writes, provisioning, or deployment. Run `ship` after reviewing the plan and authorizing the provider operations.

The manifest uses a typed, provider-specific configuration contract. It rejects unsupported providers, foreign fields, unknown enum choices, and duplicate webhook events before network operations. Empty fields are accepted for scaffolding but must be completed when required for provisioning. The exported `PROVIDER_CONFIGURATION_SCHEMA` matches these fields and enums; no generated `$schema` URL is currently installed in projects.

Authentication results label verified access as `session`, `management`, or `runtime`; unsuccessful checks use `none`. Clerk and OpenAI management credentials take precedence over runtime credentials. A runtime probe is never reported as management access. Vercel and Expo session probes require bounded, single-identity output from the pinned CLI; diagnostic paragraphs do not count as a session. These probes do not verify the selected project, all write permissions, account enrollment, or remaining owner prerequisites.

Management keys do not belong in this manifest or application source. Runtime credentials returned by providers are configured in ignored application environment files and private `.anhedral/` state. API errors and CLI results omit credential values. Never attach this private state to an issue or commit it.

## Adapters

| Provider | Management credential | Automated configuration | Owner prerequisites and remaining application work |
| --- | --- | --- | --- |
| Neon | `NEON_API_KEY` | Create or select an explicitly scoped organization/project; check outstanding operations; obtain the selected database/role's pooled connection URI; configure the server runtime environment; migration credentials are configured separately | An eligible account/region; reviewed schema and migrations; application data access |
| Clerk | `CLERK_PLATFORM_API_KEY` | Verify the selected workspace; create or select an application and environment; retrieve its matching publishable and secret keys | Platform API access; production domain/DNS/OAuth setup; application authorization. `CLERK_SECRET_KEY` alone verifies runtime access and cannot create an application |
| Resend | `RESEND_API_KEY` with management access | Create or select the explicit sending domain; request verification; report required DNS records; issue a domain-scoped sending key only after verification | Domain ownership and DNS publication/propagation; sending eligibility; templates and delivery behavior |
| Stripe | `STRIPE_SECRET_KEY` | Verify the explicit account and test/live key mode; configure a webhook with explicitly listed events when requested; securely retain its signing secret | Account activation for live payments; product/price decisions and webhook handlers. Provisioning does not invent a billing model or create financial commitments |
| RevenueCat | `RC_API_KEY` with v2 configuration access | Create or select a project; create/select iOS, Android, or connected Stripe apps; retrieve platform public SDK keys | Store credentials or Stripe account connection; products, offerings, entitlements, SDK installation, and purchase verification |
| Sentry | `SENTRY_AUTH_TOKEN` | Select organization/team/project; create a project if absent; verify the team/platform; select a single active client key or create one if absent; configure DSN | Appropriate organization/team permissions; platform SDK initialization, source maps, privacy filtering, and alerts |
| PostHog | `POSTHOG_PERSONAL_API_KEY` | Select US/EU region and organization; create/select a project; retrieve its ingestion key and matching ingestion host | Project permissions; product events, privacy/consent rules, and SDK initialization. Personal management keys never become ingestion keys |
| OpenAI | `OPENAI_ADMIN_KEY` | Create or select an active project; create a named service account; retain its one-time runtime key privately | Organization administration access, provider billing eligibility, limits, and application AI behavior. `OPENAI_API_KEY` alone cannot create projects |

The adapters implement a bounded scaffolding setup, not every administration endpoint a provider exposes. Account enrollment, required billing acceptance, DNS ownership, OAuth consent, store enrollment, and product-specific design remain explicit owner steps. Provisioning success does not certify those steps or finished product functionality.

### Example manifest

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

## Delivery and retries

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

## Mobile delivery

Use `anhedral ship <directory> --platform ios|android --profile <profile>`. Set the intended Expo `owner` and `slug` in static `apps/mobile/app.json`. The pinned EAS CLI creates/links the project when needed, then stops for review and a source commit. Subsequent builds independently check the linked project identity. Inherited profiles require explicit resolution before automatic delivery.

Only public mobile keys are uploaded to the selected EAS environment; server credentials are excluded. Queued builds return a build-page link and `building` state. Repeat the same command to inspect the saved build ID without creating another build. Completed builds must match the selected project and source commit before returning the download link. Failed/cancelled builds require provider inspection before removing the pending record and requesting another build.

Android preview builds produce APKs; production builds produce AABs. iOS simulator artifacts need no device signing; signed iOS builds need the developer's Apple credentials and enrollment. Anhedral never runs `eas submit`. Store uploads and approvals belong to the owner.

## Verification scope

Local contract tests cover selected-stack planning, API request/response shapes, resource reuse, one-time credentials, account mismatch, pending operations, DNS gates, unknown outcomes, private file safety, runtime partitioning, and deployment handoff. These tests do not establish live account eligibility, quota, permissions, billing, DNS, signing, or production product behavior. Verify those in explicitly authorized accounts before release.

Provider contracts: [Neon API](https://api-docs.neon.tech/reference/createproject), [Clerk Platform schema](https://github.com/clerk/openapi-specs/blob/main/platform/beta.yml), [Resend API](https://resend.com/docs/api-reference/introduction), [Stripe API](https://docs.stripe.com/api), [RevenueCat API v2](https://www.revenuecat.com/docs/api-v2), [Sentry API](https://docs.sentry.io/api/), [PostHog API](https://posthog.com/docs/api), [OpenAI administration](https://developers.openai.com/api/reference/resources/admin/), [Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Vercel OpenAPI](https://openapi.vercel.sh), and [pinned EAS source](https://github.com/expo/eas-cli/tree/v21.0.1/packages/eas-cli/src/commands).

## Authorized staging acceptance

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
