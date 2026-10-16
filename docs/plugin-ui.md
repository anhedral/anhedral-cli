# Anhedral project dashboard

Anhedral is headless-first: describe the application to Codex, review the selected stack, develop its features, authenticate to your providers and ship through the CLI. The optional dashboard starts with the same local evidence available from `anhedral inspect --json`. Opening it or refreshing the project performs no provider calls. Explicit service controls request live status, analytics or data through the shared CLI adapters.

Building or packaging the plugin does not install or publish it. Actual Codex host rendering and composer behavior require separate verification; protocol tests do not establish those behaviors.

## Project lifecycle

The overview begins with **Init → Auth → Ship**, derived by the same inspector used by the CLI. Init reports supported Anhedral configuration and local structural readiness. Auth lists selected providers and recorded account references; these are not proof of a valid session, permission or billing eligibility. Ship summarizes per-target success receipts and flags incomplete operations, conflicts and deletion history. A recorded success does not establish current source or live health.

Review source, provider access and shipping plan prepare unsent Codex drafts. They do not run commands directly. The workflow is equally usable through the headless CLI. Services remain a secondary, project-scoped view. Registering an arbitrary directory does not adopt its stack or activate lifecycle actions; supported Anhedral configuration must exist. There is no separate Anhedral account or hosted control plane.

## Screens and evidence

| Screen | Information | Evidence boundary |
| --- | --- | --- |
| Overview | Project identity, stack selection, per-target latest attempt and last success | Recorded results; not live health or feature acceptance |
| Services | Application targets, configured bindings, provisioning receipts and selected integrations | Local inventory plus explicitly requested live readings; receipt matching uses resource kind and identifiers |
| Stack | Workspace package dependencies, declared bindings, environment names and cron expressions | Package dependencies do not prove network calls; declarations do not prove resource existence |
| Setup | Local prerequisites, selected providers, capability limits and setup guidance | Authentication, selected-account permission and billing remain not checked |
| Delivery | Separate Cloudflare, Vercel and mobile records; integration pending outcomes and latest operation | One provider's success does not establish another's; old running records do not prove a process is active |

Service controls expose only implemented readers; there is no schedule-execution reader. Environment names come from example files and reveal no values or proof of secret validity. Mobile download URLs may contain access tokens and are excluded; validated Expo build-page links may be displayed. Missing record timestamps and project identity are unavailable rather than invented.

Every section is bounded and validated independently. A corrupt provider journal must not hide another target's valid evidence. Read time is explicitly distinct from receipt time. Configured, recorded and unknown states must remain distinguishable. General secret files, provider credential vaults, runtime state, raw diagnostics and absolute source paths are excluded from the UI projection.

## Interactions

New project opens a new composer with this prompt, without sending: “Create a new project using [@Anhedral](plugin://anhedral@anhedral). Start by explaining the stack and asking me what it should be about.” Setup and delivery actions prepare unsent drafts for the current conversation. The user reviews and sends the request before Codex acts. Unsupported hosts offer copyable text. Project selection updates authorized model context; it does not execute commands.

Refresh reloads local files only. Rename and forget affect only local catalog metadata, never project source or provider resources. There is no project-creation or registration dialog. Successful `anhedral init` automatically registers its generated source in the local catalog. Existing sources can be registered through the local operator command. MCP tool inputs accept project IDs rather than arbitrary filesystem paths.

## Installation

Install with `codex plugin marketplace add anhedral/anhedral-cli`, then `codex plugin add anhedral@anhedral`. The marketplace references `plugin-v<version>` in the same repository. The release workflow creates this immutable tag from the verified ZIP, including its generated runtime; the development source directory alone is not an installable release. Plugin source tags retain the reviewed release commit as their parent. Existing tags cannot be replaced by the release workflow.

## Local development

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

## Recovery and release review

Interrupted catalog writers can be inspected and recovered with the same private catalog directory:

```sh
ANHEDRAL_PLUGIN_DATA="$PWD/.artifacts/plugin-preview" node plugins/codex/inspector/dist/server.mjs recover-catalog-lock
```

Only a proven dead same-host owner permits recovery. Live, foreign, malformed and uncertain owners remain blocked. Recovery changes catalog access only, not provider work or delivery state.

Build/package checks bind the runtime and self-contained browser HTML to source and CLI version. Exact ZIP protocol tests exercise resources, schemas and headless tools. Before publication, verify native host entrypoints, unsent drafts, theme/reload behavior, all supported sections, keyboard navigation and narrow screens against the exact rebuilt ZIP. Publication remains a separate reviewed action.

The design follows the official [optional UI guidance](https://developers.openai.com/plugins/concepts/plugins#optional-ui) and [MCP Apps foundation](https://developers.openai.com/plugins/build/chatgpt-ui#start-with-mcp-apps).

## Live service capabilities

Live readings require the selected provider account and resource permissions. Missing access, unavailable providers and absent resources are distinct from a successful reading. Analytics show their source, UTC window and sampling status; recorded deployment success does not imply current health.

| Service | Status | Analytics | Data | Confirmed deletion |
| --- | --- | --- | --- | --- |
| Cloudflare Worker | Settings existence | Requests, errors and CPU quantiles | — | — |
| D1 | Resource identity and current storage | Daily query/row counts and latency | Bounded table pages | Project-created, unshared resources |
| KV | Resource identity | — | Paginated key metadata; no values | Project-created, unshared resources |
| R2 | Bucket identity | — | Paginated object metadata; no contents | — |
| Queues | Resource identity | — | — | — |
| Vercel | Project/deployment status | Daily Web Analytics | — | — |
| Neon | Project identity | — | Bounded public-table pages | — |
| PostHog | Project identity | Hourly events and distinct IDs per bucket | — | — |
| Clerk, Resend, Stripe, RevenueCat, Sentry, OpenAI | Selected integration identity | — | — | — |

Neon browsing requires `ANHEDRAL_NEON_READONLY_URL`, optionally suffixed with the uppercase project ID (hyphens replaced by underscores). The endpoint must belong to that project. Each read transaction verifies a restricted role and read-only mode. Sensitive columns are masked before fetching; arbitrary SQL is not accepted.

R2 metadata browsing requires bucket-scoped read-only S3 credentials in `ANHEDRAL_R2_ACCESS_KEY_ID` and `ANHEDRAL_R2_SECRET_ACCESS_KEY`, optionally suffixed with the uppercase account ID. The reader signs only the selected account/bucket request and never downloads object contents.

Data rows, table names and deletion confirmation tokens are returned through private app metadata rather than model-visible MCP results. CLI data output is explicit user-requested output. Data views mask sensitive fields and do not provide an unmask control. D1 and Neon project bounded columns and mask sensitive columns in SQL before fetching rows; empty tables retain their schema. Database pages use explicit ordering, but concurrent writes can still change offset-based pages. KV and R2 metadata pages use provider cursors.

Deletion is intentionally limited to D1 and KV. Review shows the exact account, resource, affected applications and impact. The user must type the resource name. The server requires a short-lived, single-use token, revalidates source and provider identity, and rejects adopted resources or detected external Worker consumers. Provider reads cannot provide an atomic lock against another operator changing remote dependencies.

A deletion request is never automatically retried. Confirmed absence is required to report success. Pending or uncertain outcomes remain recorded across reloads and block automatic reprovisioning. Source bindings remain for explicit review before shipping; removing a service does not silently rewrite application code. This implementation does not delete whole applications or provider accounts.

The CLI shares these adapters: `anhedral services list --json` lists exact selectors; `anhedral help services` describes status, metrics, tables, data and the two-step deletion flow. No service operation provisions resources, changes billing or deploys code.

The catalog defaults to `~/.local/share/anhedral/projects`; `ANHEDRAL_PLUGIN_DATA` selects an alternate directory and `ANHEDRAL_DISABLE_CATALOG=1` disables initialization registration. A catalog failure leaves successfully generated source intact and reports a registration recovery action.

The inspector source lives in `plugins/codex/inspector`; the installable plugin source lives in `plugins/codex/distribution`. Packaging reads that directory and emits a self-contained ZIP. Immutable `plugin-v*` release tags retain the public `plugins/anhedral` installation path used by the marketplace; the publication script builds that tree from the verified ZIP. That release path is independent of the development checkout layout.
