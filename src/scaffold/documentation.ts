import type { StandardOptions } from '../registry/types.js';
import { put } from './files.js';

export function workerBuildSuffix(_options: StandardOptions): string {
  return '';
}
export function writeSetupDocumentation(root: string, options: StandardOptions): void {
  put(
    root,
    'AGENTS.md',
    `# Anhedral application

This project uses Expo for web/iOS/Android, a Hono Cloudflare Worker, Drizzle/D1, and private R2. Better Auth supplies the identity needed for private storage and payments. Shared NativeWind styling is in packages/styling. Optional integrations are Stripe and RevenueCat only.

Hono owns authentication, authorization, persistence, and provider credentials. Clients use API contracts in packages/contracts and never import database/auth server code. Apps must not import each other's source. Keep one root pnpm lockfile. No secrets belong in client bundles.

Review SQL produced by pnpm db:generate. Apply local migrations explicitly using pnpm db:migrate. Remote migrations require an explicit --remote and reviewed target. Builds and startup never migrate databases. R2 stays private; the API derives object namespaces from the verified user, never client-supplied ownership.

Run pnpm lint, pnpm typecheck, and pnpm build. Verify signup/signin/signout, anonymous rejection and cross-user file isolation. Payment additions require provider sandbox purchase/restore/webhook verification. Keep architecture and dated acceptance evidence in docs/architecture.md and docs/verification.md. Init does not provision, deploy or activate payment services.
`,
  );
  put(
    root,
    'README.md',
    `# ${options.name}

Expo + Hono + Drizzle/D1 + private R2. Better Auth provides email/password accounts for private files. ${options.products.includes('stripe') ? 'Stripe is selected. ' : ''}${options.products.includes('revenuecat') ? 'RevenueCat is selected.' : ''}

## Local setup

Use the Node and pnpm versions in package.json. Install dependencies if initialization used --skip-install.

1. Copy apps/api/.dev.vars.example to apps/api/.dev.vars. Set BETTER_AUTH_SECRET to at least 32 random characters and keep BETTER_AUTH_URL=http://localhost:3000 for local web.
2. Run pnpm db:generate, review the generated SQL, then pnpm db:migrate (local D1 only by default).
3. Run pnpm dev. Open http://localhost:3000. Create an account using the Sign in / account link.
4. Native development uses pnpm --dir apps/mobile start. Configure EXPO_PUBLIC_API_URL in apps/mobile/.env for an API address reachable by the device and set BETTER_AUTH_URL to that origin when testing native. Use HTTPS outside local development.

## Private files

Authenticated POST /api/files accepts raw bytes up to 1 MiB and returns an opaque id. GET /api/files/:id downloads it; DELETE /api/files/:id deletes it. Every operation is scoped to the signed-in user. Files are forced to download as application/octet-stream; bucket credentials and public bucket URLs are never sent to clients. Applications add their own file picker, quotas, retention and product UI.

## Cloud resources and delivery

Initialization is local source generation. Configure the intended Cloudflare account, provision a D1 database and private R2 bucket using the CLI provider workflow, and review apps/api/wrangler.jsonc. Keep public R2 access disabled. Set production secrets through Wrangler. Review/apply remote migrations explicitly before deployment. Ship the API before the Expo gateway, then verify real authentication and file isolation. See docs/stack.md and anhedral.json for setup requirements.

Stripe and RevenueCat remain inactive until client-owned provider products, credentials, origins and webhooks are configured. Verify sandbox flows before live activation.
`,
  );
  put(
    root,
    'docs/architecture.md',
    '# Architecture\n\nExpo clients → Hono Worker → Drizzle/D1 and private R2. Better Auth identifies users. Record application flows, access boundaries and selected payment providers here.\n',
  );
  put(
    root,
    'docs/verification.md',
    '# Verification\n\nRecord dates, environments, commands, denied-access checks and unresolved acceptance gaps. Generated source is not production acceptance.\n',
  );
}
