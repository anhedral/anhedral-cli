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
  const existingAgents =
    existsSync(agentsFile) && (has('next') || has('vinext'))
      ? readFileSync(agentsFile, 'utf8') + '\n'
      : '';
  put(
    root,
    'AGENTS.md',
    existingAgents +
      `# Anhedral delivery standard

Keep accounts, source, infrastructure, billing, and recovery client-owned. Use macOS, OpenAI/Codex, Computer Use and Control Chrome during implementation and verification. Use provider plugins, APIs/MCP and CLIs for operations; Cloudflare plugin + cf where available, Wrangler for project commands.

Vinext on Cloudflare Workers by default; native Next.js on Vercel is an explicit option. Free-to-start where suitable, within provider eligibility and limits. Respect the existing account, budget, audience and release authorization. Request only missing approval for paid activation, material spending, architecture changes or release. Do not deploy or activate providers as part of initialization.

Add apps and shared packages only when needed. All services belong in apps/*, reusable code in packages/*. Shared styling is named styling. Keep secrets and privileged integrations out of client bundles. Use Clerk, Better Auth, or no auth according to project needs. Protect product routes explicitly and implement resource authorization.

Use private R2 Worker bindings. KV is eventually consistent configuration/cache, never transactional authority. Neon uses Drizzle and direct serverless HTTP with a server-only DATABASE_URL. HTTP supports independent queries and batches; interactive transactions require a reviewed WebSocket or PostgreSQL adapter. Define job retries, concurrency, idempotency and failure handling. Review SQL migrations before applying them.

Developer tooling includes Cloudflare’s security-audit skill (https://github.com/cloudflare/security-audit-skill) for repository security reviews.

For new projects, guide GitHub sign-in and the user's Git identity. Review files and secret ignores, commit the initial source, then use anhedral repository --create for a private repository under the authenticated user. Preserve existing origins and visibility; use an explicitly selected organization when requested. Connect Vercel with --git and verify actual GitHub installation access. For Git delivery, commit and push reviewed changes, wait for production, then use anhedral adopt and anhedral verify. Adoption checks exact repository, production branch and commit without uploading again. Use anhedral ship only for an explicit CLI delivery. Recover a fresh clone with anhedral recover; rerun product verification because prior test evidence is not recovered. Use anhedral doctor --providers to inspect installed tools and recorded provider context.

Maintain docs/architecture.md with selected components, rationale, alternatives, data/access boundaries, and a diagram of actual connections. Maintain docs/verification.md with product acceptance criteria, exercised flows, evidence, and blockers. Generated setup is a starter, not implemented product behavior.

Run pnpm check. Use pnpm exec fallow during development and pnpm exec fallow audit for changes. Fix legitimate findings; use narrow documented exceptions. Verify real UI flows with Computer Use and Control Chrome, plus relevant integrations, native apps/simulators, and deployed previews. Carry an authorized build-and-ship request through deployment and live verification; ask only for authorization that is still missing.
`,
  );
  put(
    root,
    'README.md',
    `# ${options.name}

Initialized from the official shadcn pnpm/Turborepo monorepo, with the Anhedral Application Stack & Delivery Standard.

Initial selection: ${options.products.join(', ')}. Current selections and additions are recorded in anhedral.setup.json and anhedral.registry.json. ${has('vinext') ? 'Vinext App Router on Cloudflare Workers.' : has('next') ? `Next.js hosting: ${options.hosting === 'cloudflare' ? 'Cloudflare Workers + OpenNext' : 'Vercel (native Next.js default)'}.` : ''}

Run pnpm install, commit pnpm-lock.yaml, then pnpm dev. Run pnpm check for lint, types, Fallow audit, tests and build. Without a Git comparison base, audit runs the full Fallow gate. Add meaningful product tests and integration checks as behavior is implemented. The tests task runs only workspaces that define tests; init does not claim product verification.

${has('next') && options.hosting === 'vercel' ? 'Native Next.js uses customer-owned Vercel. Connect with the intended scope and personal/commercial use before shipping. Default to private all-deployment protection unless public access was requested; verify protection before linking Git or uploading code. Run anhedral doctor --providers for prerequisites and recorded provider context. Configure server secrets in that project; use cache components, partial prefetching, Link navigation and Suspense deliberately. ' : ''}${options.hosting === 'cloudflare' || has('hono') ? 'Cloudflare bindings contain REPLACE_WITH_* IDs. Reconcile resources in the client account and generate Worker types before development. Workers expose local dev and explicit deploy scripts. ' : ''}${has('vinext') ? 'Build with pnpm build, then pnpm --dir apps/web preview to exercise the production Worker. Vinext provides a Next-compatible API surface; native Next.js is an explicit framework option. ' : ''}${has('next') && options.hosting === 'cloudflare' ? 'Use the web preview script to exercise the actual OpenNext Worker runtime. ' : ''}Initialization does not provision infrastructure or deploy.

${has('vinext') ? 'Security gate: Vinext 1.1.0 currently inherits an unpatched high-severity braces advisory (GHSA-vfj7-8cjw-p6xm) through its CommonJS build tooling. Production dependency audit and pnpm check must remain blocking until a reviewed upstream fix is available; successful local builds are not release acceptance.\n' : ''}
${has('next') && options.hosting === 'cloudflare' ? 'OpenNext is configured without a provisioned incremental-cache bucket. Choose and configure a cache adapter before using ISR or cache features that require shared persistence.\n' : ''}
${has('neon') ? 'Configure server-only DATABASE_URL for the intended Neon branch and role. Direct HTTP needs no Hyperdrive or connection cleanup. Review migrations and authorization; interactive transactions require a reviewed WebSocket or PostgreSQL adapter.\n' : ''}
${has('better-auth') ? 'Core Better Auth tables are included in the Drizzle schema. Review and apply migrations before using /api/auth. Configure BETTER_AUTH_SECRET, BETTER_AUTH_URL and trusted origins for the correct environment.\n' : ''}
${has('clerk') ? 'Clerk middleware exposes server identity; protect selected routes explicitly. The web starter includes ClerkProvider and sign-in/sign-up pages. Configure the selected native SDKs when implementing account flows.\n' : ''}
${has('r2') ? 'FILES is a private R2 binding. Implement authentication and file-level authorization before exposing file routes. Clients never receive R2 credentials.\n' : ''}
${has('realtime') ? 'Durable Object rooms support hibernating WebSockets; the public entrypoint remains disabled until room authorization and short-lived tickets are implemented.\n' : ''}
${has('queues') ? 'Queue processing retries unimplemented jobs and uses a dead-letter queue. Add product processing and transactional idempotency before acknowledging messages.\n' : ''}
${has('basin') ? 'Basin uses a Pipelines stream binding. Configure its stream, sink, R2/catalog and SQL in client-owned infrastructure; it is distinct from operational logs.\n' : ''}
Provider packages are SDK factories or integration boundaries, not finished business features. Connect only needed packages to server entrypoints. Billing needs verified webhooks and idempotent consumption; RevenueCat adds cross-store entitlement configuration. Local data needs a platform-specific SQLite/filesystem adapter. Sentry needs a platform SDK and runtime initialization. Native auth and subscriptions need platform-specific setup.

Purchase the domain in the client's GoDaddy account, then add its zone to the client's Cloudflare account and configure Cloudflare nameservers. The client retains registration, renewal, billing and recovery ownership. Verify DNS records and zone activation before connecting application domains and mail. Inbound mail uses Cloudflare Email Routing. Outbound business and application mail defaults to Cloudflare Email Sending; Resend is an alternative when selected. Configure the selected mail provider before use; init does not provision domains or mail services. GitHub Actions runs PR checks and never deploys automatically. Respect existing authorization; request only missing approval for paid activation, material spending, architecture changes or release.
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
          node-version: '22'
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
