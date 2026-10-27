import { capabilityReferences } from '../capability-references.js';
import type { StandardOptions } from '../registry/types.js';
import { put } from './files.js';
export function writeSetupDocumentation(root: string, options: StandardOptions): void {
  if (!options.products.includes('hono') && !options.products.includes('expo')) {
    for (const [file, source] of Object.entries(capabilityReferences())) put(root, file, source);
    put(
      root,
      'README.md',
      `# ${options.name}

Next.js on Cloudflare Workers through OpenNext, with Anhedral UI from the start.
Init creates only apps/web. Use anhedral stack status to inspect later source additions.
No providers are provisioned by source generation.

## Develop

Use the Node/pnpm versions in package.json. Run pnpm install if generation skipped
installation, then pnpm dev. Open the URL printed by Next.js.

## Anhedral UI

The initial page uses editable Button, Input and Label source from the reviewed
shadcn baseline. Application-local source belongs to you. Shared tokens live in
packages/styling; preserve attribution in ANHEDRAL_UI_LICENSES and UPSTREAM.json.
Anhedral UI is a CLI/catalog/theme convention, not a runtime component package.

Use anhedral ui list, anhedral ui add card --web, anhedral ui diff button --web,
and anhedral ui doctor --web. Use --cwd apps/web to select this application or
--all explicitly for multiple clients. --dry-run previews init/add without network
or writes. Updates are opt-in; never overwrite customized components silently.

Native UI uses the React Native Reusables NativeWind registry in compatible Expo
projects, preferring reviewed Anhedral extensions when present. It requires Expo,
not a backend. Use anhedral add expo, then add native-ui, for the reviewed client/setup recipes.
Standalone UI commands do not create native clients or backend services; existing
Expo applications need the upstream NativeWind/RNR setup before native ui init.

## Add strategically

Add Hono when a dedicated API is justified, then Drizzle/D1/Better Auth when the
product needs data and authentication. Use anhedral add <capability> --dry-run --json
to review changes, then apply them. Missing parents require explicit selection or
--with-dependencies. See docs/anhedral/capabilities.md for the complete catalog and
source-protection contract. No provision or deployment command is implemented here.
Consumers own integrations, deployment and application distribution. Run pnpm check
and review your changes before deployment. Builds/startup never migrate databases.
`,
    );
    put(
      root,
      'AGENTS.md',
      `# Minimal application foundation

Start with Next.js/OpenNext/Workers and source-owned Anhedral UI. Do not add an API,
database, authentication, R2 or native client without a concrete feature need.
Use anhedral add and stack list/status/doctor to compose selected capabilities.
Preview additions first, preserve edited source, and configure selected auth methods
explicitly. Source installation is not provider activation. Use anhedral ui
add/list/diff/doctor to manage platform-specific source; web uses
official shadcn and native uses RNR/NativeWind with reviewed Anhedral extensions.
UI requires its application platform, not Hono or a database. Share tokens, not
DOM/native primitives. Preserve consumer edits, attribution and upstream metadata.
Never automatically overwrite installed components. Read version-matched framework
guides and run pnpm check. Never migrate a configured database during checks/builds.
`,
    );
    put(
      root,
      'docs/architecture.md',
      '# Architecture\n\nNext.js → OpenNext → Cloudflare Workers, with Anhedral UI. Record feature-driven additions here.\n',
    );
    put(
      root,
      'docs/verification.md',
      '# Verification\n\nRecord commands, outcomes and environment. Source generation is not deployment acceptance.\n',
    );
    return;
  }

  put(
    root,
    'README.md',
    `# ${options.name}

Next.js App Router/OpenNext + Expo native + shadcn UI + Hono/workerd + Drizzle/D1 + private R2.

## Develop locally

Use the Node and pnpm versions in package.json. Run pnpm install if generation used --skip-install. Run pnpm dev and open the web URL printed by Next (normally http://localhost:3000). Hono runs on http://127.0.0.1:8787; web /api/health proxies to it. No accounts or secrets are needed for the starter health flow.

Start native separately with pnpm --dir apps/mobile start. Copy apps/mobile/.env.example to apps/mobile/.env and set EXPO_PUBLIC_API_URL to the API origin reachable from the device. Local HTTP is development-only; use HTTPS outside development.

## UI and device capabilities

Web uses DOM shadcn; native uses editable source in packages/native-ui. Share tokens through packages/styling. The shadcn fork is an upstream review source, not an application runtime dependency. Review copied provenance and licenses; adopt later UI changes explicitly without overwriting your edits.

Use Expo SDK packages directly for application capabilities. UI components may compose them for presentation, such as a Copy button using Expo Clipboard; application permissions, background work, uploads and push registration belong to your application. Keep the tested Expo/React Native/React runtime consistent with native-ui peers. Add packages as needed from apps/mobile with pnpm expo install <package>, checking platform support and native configuration. Rebuild the development client after native dependency/configuration changes. Validate web separately from Android/iOS; use physical devices for device-only capabilities.

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

Keep DOM shadcn and native UI implementations separate, sharing tokens and contracts. Import editable application-local UI source; preserve its provenance, licenses and consumer edits during explicit updates. Use Expo SDK APIs directly for feature capabilities, adding UI adapters only for meaningful presentation or interaction. Keep permission policy and background/provider behavior in application services. The mobile app owns the tested Expo/React Native/React runtime; native-ui peers must match it. Add only needed SDK packages using Expo's compatible installer from apps/mobile and inspect platform support/autolinking/config plugins. Rebuild development clients for native changes and verify Android/iOS behavior separately from browser rendering. Consider @expo/ui controls selectively; do not replace the native port wholesale.

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
