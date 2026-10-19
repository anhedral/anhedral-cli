import { usesVoidSelection } from '../runtime-policy.js';
import { markdownHeading } from '../render.js';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { StandardOptions, StandardProduct } from '../registry/types.js';
import { put } from './files.js';
export function workerBuildSuffix(options: StandardOptions): string {
  return options.products.includes('next') && options.hosting === 'cloudflare'
    ? ' && pnpm build:worker'
    : '';
}

export function writeSetupDocumentation(root: string, options: StandardOptions): void {
  const has = (product: StandardProduct) => options.products.includes(product);
  const agentsFile = path.join(root, 'AGENTS.md');

  const voidSelected = usesVoidSelection(options.products, options.hosting);
  const existingAgents =
    existsSync(agentsFile) && (has('next') || has('vinext'))
      ? readFileSync(agentsFile, 'utf8') + '\n'
      : '';
  put(
    root,
    'AGENTS.md',
    existingAgents +
      `# Anhedral delivery standard

Keep accounts, source, infrastructure, billing, and recovery client-owned. Use the available developer tools and the selected platforms’ native toolchains for implementation and verification. Use provider plugins, APIs/MCP and CLIs for operations; Void owns Cloudflare provisioning and deployment for supported selections; Anhedral owns composition, customer ownership and verification. New Expo workspaces, explicit OpenNext, queue/DLQ and Basin selections use Wrangler delivery.

Plain init creates a minimal Expo client with shadcn conventions, NativeWind and shared styling. Generate Hono, contracts, database, auth, storage and integrations only when selected or required by selected capabilities. Use --preset full-product for the complete compatible selection, not mutually exclusive alternatives. Inspect docs/stack.md and anhedral.json for this project's actual selection. New Expo static web uses Cloudflare; native uses EXPO_PUBLIC_API_URL only when an API is selected. Next.js on Vercel and Vinext on Cloudflare are explicit alternatives. Respect account, budget, audience and release scope. Initialization does not deploy or activate paid services.

Hono owns server identity, authorization, persistence and privileged integrations. Web routes only proxy/adapt API calls. Share framework-independent validation and HTTP clients in packages/contracts; applications never import another app’s source. Use pnpm workspaces and Turborepo with one root pnpm-lock.yaml. Add apps and shared packages only when needed. All services belong in apps/*, reusable code in packages/*. Shared styling is named styling. Keep secrets and privileged integrations out of client bundles. When accounts are selected, prefer Better Auth unless Clerk is explicitly selected; native Clerk integration remains owner implementation. Preserve selected supported identity providers in existing and explicit compatibility profiles. Protect product routes explicitly and implement resource authorization.

Use private R2 Worker bindings. KV is eventually consistent configuration/cache, never transactional authority. Neon uses Drizzle and direct serverless HTTP with a server-only DATABASE_URL. HTTP supports independent queries and batches; interactive transactions require a reviewed WebSocket or PostgreSQL adapter. Define job retries, concurrency, idempotency and failure handling. Keep database factories and schemas in packages/db/src, SQL and metadata in packages/db/drizzle, and migration configuration in packages/db/drizzle.config.ts. Only server packages import @workspace/db; clients use API contracts and endpoints. Review generated SQL before deployment. One server target owns deployment migrations; other server targets only consume the database. Manual migration tasks are uncached and never part of builds or startup. Review SQL migrations before applying them.

${has('neon-realtime') ? 'Neon Realtime uses separate @workspace/neon-realtime/server and /client exports; follow packages/neon-realtime/README.md. Enable the intended branch and exact allowed origins manually. Keep DATABASE_URL and NEON_REALTIME_SECRET server-only; pass the public NEON_REALTIME_URL to clients through framework-specific public configuration. Authenticate query sealing, derive user/tenant scope from verified identity and implement bounded read-only queries, renewal and cross-tenant checks. Neon Realtime is beta without RLS; no arbitrary SQL endpoint, automatic Realtime provisioning or verified product flow is generated.\n' : ''}

Developer tooling includes Cloudflare’s security-audit skill (https://github.com/cloudflare/security-audit-skill) for repository security reviews.

For new projects, guide GitHub sign-in and the user's Git identity. Review files and secret ignores, commit the initial source, then use anhedral repository --create for a private repository under the authenticated user. Preserve existing origins and visibility; use an explicitly selected organization when requested. Connect Vercel with --git and verify actual GitHub installation access. For Git delivery, commit and push reviewed changes, wait for production, then use anhedral adopt and anhedral verify. Adoption checks exact repository, production branch and commit without uploading again. Use anhedral ship only for an explicit CLI delivery. Recover a fresh clone with anhedral recover; rerun product verification because prior test evidence is not recovered. Use anhedral doctor --providers to inspect installed tools and recorded provider context.

Keep project identity, setup, registry, provider settings and selected hosting configuration in the single root anhedral.json. Consult docs/stack.md for the current generated options, targets and setup requirements. Maintain docs/architecture.md with selected components, rationale, alternatives, data/access boundaries, and a diagram of actual connections. Maintain docs/verification.md with product acceptance criteria, exercised flows, evidence, and blockers. Generated setup is a starter, not implemented product behavior.

For maintenance, treat static-analysis findings as candidates: trace dynamic entrypoints, shared consumers and authoritative live configuration before removing code or flags. Preserve kill switches, recovery paths and access controls. Keep one cleanup rationale per change and record evidence and remaining uncertainty in docs/verification.md. Diagnose flaky tests from CI history and causal evidence; fix the cause without weakening assertions or required checks. Change agent instructions in response to demonstrated failures, keeping shared context short. The Anhedral software factory's evidence-driven maintenance section supplies the detailed workflow.

Run pnpm check. Starters contain no application tests yet: add workspace tests and a meaningful root test:live script before claiming product verification. Use pnpm exec fallow during development and pnpm exec fallow audit for changes. Fix legitimate findings; use narrow documented exceptions. Verify real UI flows with Computer Use and Control Chrome, plus relevant integrations, native apps/simulators, and deployed previews. Carry an authorized build-and-ship request through deployment and live verification; ask only for authorization that is still missing.
`,
  );
  put(
    root,
    'README.md',
    `# ${markdownHeading(options.name)}

Initialized with the Anhedral Application Stack & Delivery Standard and pnpm/Turborepo. Expo uses universal frontend tooling; explicit Vinext/Next.js uses the pinned shadcn monorepo foundation.

Initial selection: ${options.products.join(', ')}. Project configuration is recorded in anhedral.json: identity, setup, standard, registry, providers, and the selected cloudflare/vercel hosting sections. Current selections and additions are summarized in [docs/stack.md](docs/stack.md). ${has('vinext') ? 'Vinext App Router on Cloudflare Workers.' : has('next') ? `Next.js hosting: ${options.hosting === 'cloudflare' ? 'Cloudflare Workers + OpenNext' : 'Vercel (native Next.js default)'}.` : ''}

Run pnpm install, commit pnpm-lock.yaml, then pnpm dev. Run pnpm check for lint, types, Fallow audit, tests and build. Without a Git comparison base, audit runs the full Fallow gate. Add meaningful product tests and integration checks as behavior is implemented. The tests task runs only workspaces that define tests; init does not claim product verification.

${has('next') && options.hosting === 'vercel' ? 'Native Next.js uses customer-owned Vercel. Connect with the intended scope and personal/commercial use before shipping. Default to private all-deployment protection unless public access was requested; verify protection before linking Git or uploading code. Run anhedral doctor --providers for prerequisites and recorded provider context. Configure server secrets in that project; use cache components, partial prefetching, Link navigation and Suspense deliberately. ' : ''}${voidSelected ? 'Void owns provisioning and publication in the customer account. Keep explicit resources in anhedral.cloudflare.json and configuration in void.config.ts; commit void.lock.json after provisioning and serialize initial deployment across apps. Generated .void/ and .void-wrangler.jsonc are ignored. Copy each app’s env.example to its .env for local tooling; production server secrets use void secret with values passed via stdin. Local dotenv files remain private and untracked; they are not bundled into source or client assets. Supply public VITE_* values for Vite clients through the build environment. Vinext loads the app .env for local builds and maps NEXT_PUBLIC_* values into client bundles; supply those values in the production build environment. Generate Worker types before development. ' : ''}${has('vinext') ? 'Build with pnpm build, then pnpm --dir apps/web preview to exercise the production Worker. Vinext provides a Next-compatible API surface; native Next.js is an explicit framework option. ' : ''}${has('next') && options.hosting === 'cloudflare' ? 'Use the web preview script to exercise the actual OpenNext Worker runtime. ' : ''}Initialization does not provision infrastructure or deploy.

${has('expo') ? 'apps/mobile is the universal Expo web/iOS/Android frontend. Root pnpm dev exports static web and starts its Wrangler gateway on port 3000 plus Hono on port 8787 when selected. Native Metro uses pnpm --dir apps/mobile start; native iOS/Android scripts remain available. Browser changes require pnpm --dir apps/mobile build:web to re-export initially; no HMR is implied. worker/index.ts is the asset gateway and dist holds web assets. New Expo workspaces use Wrangler for selected Cloudflare targets. Export static web for the Cloudflare asset gateway. If Hono is selected, /api/* routes through its API binding before asset fallback; native uses public EXPO_PUBLIC_API_URL. Without Hono there is no API binding or origin to configure. Server credentials remain outside client bundles. Validate browser/API routing and iOS/Android exports separately; exports are not device or store acceptance. SDK 57 stays pinned. Static dynamic routes need generateStaticParams at build time or a deliberately implemented SPA/server profile; unknown paths do not gain SSR automatically. Experimental Expo SSR is not enabled by default. ' : ''}${has('hono') ? 'Hono is the backend. packages/contracts supplies public validation and the HTTP client. API /health and /openapi.json are public diagnostics; product routes require explicit authorization. ' : ''}${has('hono') && (has('vinext') || has('next')) ? `Web /api/* proxies to Hono and forwards session cookies. Check /api/health through the web origin. ${options.hosting === 'cloudflare' ? 'The web API service binding targets the API Worker; start both with root pnpm dev.' : 'Configure server-only apps/web/.env.local API_URL for local development and the web deployment environment API_URL with the API HTTPS origin before delivery. For a Cloudflare Access-protected API, configure a scoped service-token policy and server-only API_ACCESS_CLIENT_ID/API_ACCESS_CLIENT_SECRET on Vercel.'} Web never receives database/auth-server secrets. ` : ''}${has('hono') && (has('d1') || has('neon')) ? "Hono routes use c.get('database')() for a lazy Drizzle connection. " : ''}${has('better-auth') && (has('vinext') || has('next')) ? 'Set the API BETTER_AUTH_URL to the public web origin, configure its BETTER_AUTH_SECRET, apply reviewed database migrations, then test /sign-in and protected /api/session through web. ' : ''}

Security gate: pnpm audit:deps preserves the standard pnpm audit JSON in .anhedral-audit-report.json and blocks high or critical findings except the two exact verified braces/node-forge mitigations. Resolve findings through compatible upstream dependency updates. If the lock contains braces@3.0.3, Anhedral supplies a temporary exact-version pnpm patch in patches/ and records it in pnpm-workspace.yaml. It bounds nesting to 100 and rejects cyclic AST traversal; commit the patch and updated lock. When node-forge@1.4.0 occurs, a second exact patch fixes RSA DigestAlgorithm/NULL validation in the Node source and both shipped browser bundles. Only GHSA-vfj7-8cjw-p6xm for patched braces@3.0.3 and GHSA-86w9-cpqp-85rv for patched node-forge@1.4.0 can pass after verifying the exact advisory and version, effective pnpm patch map, and patch SHA-256. Runtime regressions across the affected entrypoints run in the Anhedral CLI repository tests. Upstream findings stay visible; missing or altered patch configuration and unrelated high/critical findings block delivery.

${has('next') && options.hosting === 'cloudflare' ? 'OpenNext is configured without a provisioned incremental-cache bucket. Choose and configure a cache adapter before using ISR or cache features that require shared persistence.\n' : ''}
${has('neon') ? 'Configure DATABASE_URL_UNPOOLED separately in packages/db/.env for transactional migrations on the intended branch. Configure server-only DATABASE_URL for the intended Neon branch and role. Direct HTTP needs no Hyperdrive or connection cleanup. Review migrations and authorization; interactive transactions require a reviewed WebSocket or PostgreSQL adapter.\n' : ''}
${has('neon') || has('d1') ? 'packages/db/src owns the reusable database factory, schema and migration entry point. Generated SQL lives in packages/db/drizzle; the config resolves paths from its own directory. Run pnpm db:generate, review SQL, then pnpm db:migrate. These tasks are uncached and separate from application builds. D1 defaults to local; pass -- --remote explicitly for the selected Worker database. Browser and native interfaces use an API, never database credentials.\n' : ''}
${has('expo') && has('better-auth') ? 'Expo identity includes the server Expo plugin with the exact configured scheme, SecureStore native client/cookie adapter, separate browser client, sign-in/account screens and shared protected session contracts. Configure secrets/origins and apply reviewed migrations. Local transport checks do not replace development-build/device acceptance. ' : ''}${has('better-auth') ? 'Core Better Auth tables are included in the Drizzle schema. Review and apply migrations before using /api/auth. Configure BETTER_AUTH_SECRET, BETTER_AUTH_URL and trusted origins for the correct environment.\n' : ''}
${has('clerk') ? `${has('next') || has('vinext') ? 'The web starter includes ClerkProvider, middleware and sign-in/sign-up pages. Configure NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and server-only CLERK_SECRET_KEY. ' : ''}${has('hono') ? 'packages/auth exports a Clerk request authentication helper. Configure its server secret and publishable key, supply explicit authorized origins, and wire it into product routes; the API health route remains public. ' : ''}Authentication does not establish resource authorization.\n` : ''}
${has('r2') ? 'FILES is a private R2 binding. Implement authentication and file-level authorization before exposing file routes. Clients never receive R2 credentials.\n' : ''}
${has('neon-realtime') ? 'Neon Realtime is an optional beta live SQL foundation, separate from Durable Object rooms. Read [packages/neon-realtime/README.md](packages/neon-realtime/README.md) for the server/client factories and Drizzle adapter. Manually enable the intended branch, configure exact allowed origins and set server-only NEON_REALTIME_SECRET with DATABASE_URL; NEON_REALTIME_URL is public client transport configuration. Authenticate sealing requests and scope every query to verified user/tenant access. Implement subscriptions, authorized renewal and isolation tests; RLS, automatic Realtime provisioning and a public SQL endpoint are not provided. Live behavior remains unverified.\n' : ''}
${has('stream') ? 'Cloudflare Stream provides optional one-to-many WHIP/WHEP live video. Follow packages/stream/README.md and import the management factory only from @workspace/stream/server. Configure server-only STREAM_API_TOKEN and STREAM_ACCOUNT_ID manually. Authorize creators and input ownership; never return secret WHIP URLs to viewers. Implement playback token issuance for private media, browser signaling/UI and session cleanup. Stream activation, live inputs and runtime credentials are not automatically provisioned; live behavior remains unverified.\n' : ''}
${has('realtime') ? 'Durable Object rooms support hibernating WebSockets; the public entrypoint remains disabled until room authorization and short-lived tickets are implemented.\n' : ''}
${has('queues') ? 'Queue processing retries unimplemented jobs and uses a dead-letter queue. Add product processing and transactional idempotency before acknowledging messages.\n' : ''}
${has('basin') ? 'Basin uses a Pipelines stream binding. Configure its stream, sink, R2/catalog and SQL in client-owned infrastructure; it is distinct from operational logs.\n' : ''}
${has('neon') ? 'Neon provisioning configures the server runtime DATABASE_URL only. Set a separate direct DATABASE_URL_UNPOOLED in ignored packages/db/.env for the intended migration database and role. Run pnpm db:generate, review SQL, then pnpm db:migrate before testing authentication or application data.\n' : ''}
The root pnpm test command runs workspace test tasks; no application tests or test:live script are generated. Implement them for the product before verification.\n\nProvider packages are SDK factories or integration boundaries, not finished business features. Connect only needed packages to server entrypoints. Selected Stripe/RevenueCat billing generates authenticated Hono APIs, provider-verified webhook inbox, scheduled reconciliation and DB-backed entitlement enforcement; read packages/billing/README.md, configure plans/keys/IDs and review/apply SQL. Independent providers share the verified auth user ID; clients never grant access. Local data needs a platform-specific SQLite/filesystem adapter. Sentry needs a platform SDK and runtime initialization. Expo + Better Auth generates native/browser session clients, exact trusted scheme and sign-in/account screens; verify native behavior on a development build/device. Selected RevenueCat generates native purchase/restore/manage wiring; real development-build/store purchase acceptance remains required.

When the product needs a domain, purchase it in the client's GoDaddy account, then add its zone to the client's Cloudflare account and configure Cloudflare nameservers. The client retains registration, renewal, billing and recovery ownership. Verify DNS records and zone activation before connecting application domains and mail. Inbound mail uses Cloudflare Email Routing. Outbound business and application mail defaults to Cloudflare Email Sending; Resend is an alternative when selected. Configure the selected mail provider before use; init does not provision domains or mail services. GitHub Actions runs PR checks and never deploys automatically. Respect existing authorization; request only missing approval for paid activation, material spending, architecture changes or release.
`,
  );
  put(
    root,
    '.github/workflows/check.yml',
    `name: Check
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: pnpm/action-setup@0ebf47130e4866e96fce0953f49152a61190b271
      - uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38
        with:
          node-version: '${voidSelected ? '24.21.0' : '22'}'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm typecheck && pnpm audit:deps
      - name: Audit pull request
        if: github.event_name == 'pull_request'
        env:
          AUDIT_BASE: \${{ github.event.pull_request.base.sha }}
        run: pnpm exec fallow audit --base "$AUDIT_BASE"
      - name: Audit branch
        if: github.event_name != 'pull_request'
        run: pnpm audit:full
      - run: pnpm test && pnpm build${workerBuildSuffix(options)}
`,
  );
}
