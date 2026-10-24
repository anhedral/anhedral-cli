import type { StandardOptions } from '../registry/types.js';
import { put } from './files.js';
export function writeSetupDocumentation(root: string, options: StandardOptions): void {
  put(
    root,
    'README.md',
    `# ${options.name}

Next.js App Router/OpenNext + Expo native + shadcn UI + Hono/workerd + Drizzle/D1 + private R2.

## Develop locally

Use the Node and pnpm versions in package.json. Run pnpm install if generation used --skip-install. Run pnpm dev and open the web URL printed by Next (normally http://localhost:3000). Hono runs on http://127.0.0.1:8787; web /api/health proxies to it. No accounts or secrets are needed for the starter health flow.

Start native separately with pnpm --dir apps/mobile start. Copy apps/mobile/.env.example to apps/mobile/.env and set EXPO_PUBLIC_API_URL to the API origin reachable from the device. Local HTTP is development-only; use HTTPS outside development.

## Data and private storage

Add tables in packages/db/src/schema.ts. Run pnpm db:generate, review SQL, then explicitly run pnpm db:migrate (local by default). Builds and startup do not migrate databases. Configure real D1 and private R2 identities in apps/api/wrangler.jsonc for your own deployment. Never enable public bucket access or put service credentials in clients.

apps/api/src/private-storage.ts is a server-side helper; it exposes no file routes. Implement your application's identity, authorization, ownership and limits before exposing database or object APIs.

## Your application

You own development, authentication, email, payments and hosting. Add Stripe or RevenueCat yourself if needed. This scaffold has no Platform account, managed provider connection or production activation. Generated configuration and scripts are yours to change. See docs/stack.md and run pnpm check before reviewing changes.
`,
  );
  put(
    root,
    'AGENTS.md',
    `# Application foundation

Use Next.js App Router/OpenNext for web, Expo for native, DOM shadcn and the Anhedral native shadcn port, Hono on Workers/workerd, Drizzle/D1 and private R2. Shared contracts belong in packages/contracts, native components in packages/native-ui, tokens in packages/styling, and server schema/migrations in packages/db.

Hono owns privileged operations. Clients and Next server actions call the API; apps never import one another's source. Keep database/storage credentials server-side. The starter has no authentication, payment integration or public file APIs. Implement identity and authorization before exposing private data. A private bucket is not user authorization.

Use pnpm dev for web/API and pnpm --dir apps/mobile start for native. Read version-matched framework documentation. Run pnpm check and exercise changed flows. Review generated SQL and apply migrations explicitly; never migrate a configured remote database during tests, build or startup. Consumers own integration and hosting decisions. Preserve existing source; never reinitialize over an application.
`,
  );
  put(
    root,
    'docs/architecture.md',
    '# Architecture\n\nNext.js / Expo → Hono → Drizzle/D1 and private R2. Record application-owned identity, access rules and integrations here.\n',
  );
  put(
    root,
    'docs/verification.md',
    '# Verification\n\nRecord commands, outcomes and environment. Generated source is not production acceptance.\n',
  );
}
