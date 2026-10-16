import { rmSync } from 'node:fs';
import path from 'node:path';
import { STACK_DEPENDENCIES } from '../dependencies.js';
import type { RecipeContext } from '../registry/types.js';
import { patchPackage, put, sharedPackage } from './files.js';
import { writeEnvironmentFile } from './environment.js';

export function scaffoldNeonRealtime({ root, options, runtimeApp }: RecipeContext): void {
  const directory = 'packages/neon-realtime';
  sharedPackage(root, 'neon-realtime', '', {
    '@neon/realtime': STACK_DEPENDENCIES['@neon/realtime'],
    '@neon/realtime-drizzle': STACK_DEPENDENCIES['@neon/realtime-drizzle'],
    'drizzle-orm': STACK_DEPENDENCIES['drizzle-orm'],
  });
  rmSync(path.join(root, directory, 'src/index.ts'));
  patchPackage(root, `${directory}/package.json`, {
    exports: { './server': './src/server.ts', './client': './src/client.ts' },
  });
  put(
    root,
    `${directory}/src/server.ts`,
    `import { createRealtime } from '@neon/realtime/server';
import { drizzleAdapter } from '@neon/realtime-drizzle';

// Import this entry point only from server code. Sealing is local Web Crypto work.
export function createNeonRealtime(options: { secret: string; databaseUrl: string }) {
  let database: string;
  try {
    const url = new URL(options.databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error();
    database = decodeURIComponent(url.pathname.slice(1));
    if (!database || database.includes('/')) throw new Error();
  } catch {
    throw new Error('Configure a PostgreSQL DATABASE_URL with the intended database name.');
  }
  if (!options.secret.trim()) throw new Error('Configure the branch NEON_REALTIME_SECRET on the server.');
  return createRealtime({ secret: options.secret, db: database, adapter: drizzleAdapter() });
}
`,
  );
  put(
    root,
    `${directory}/src/client.ts`,
    `import { createRealtimeClient } from '@neon/realtime/client';
import { drizzleParsers } from '@neon/realtime-drizzle/client';

export type { SealedLiveQuery, LiveQuerySnapshot, LiveQueryState } from '@neon/realtime/client';

// One client per database; close it on sign-out and unsubscribe on component cleanup.
export function createNeonRealtimeClient(url: string) {
  return createRealtimeClient({ url, parsers: { ...drizzleParsers } });
}
`,
  );
  const app = `apps/${runtimeApp}`;
  const native = runtimeApp === 'web' && options.hosting === 'vercel';
  writeEnvironmentFile(root, `${app}/${native ? '.env.example' : '.dev.vars.example'}`, {
    NEON_REALTIME_SECRET: '',
  });
  if (!native)
    put(
      root,
      `${app}/${runtimeApp === 'api' ? 'src/' : ''}neon-realtime-secrets.d.ts`,
      runtimeApp === 'api'
        ? 'interface Env { NEON_REALTIME_SECRET: string }\n'
        : 'declare namespace Cloudflare { interface Env { NEON_REALTIME_SECRET: string } }\n',
    );
  put(root, `${directory}/README.md`, neonRealtimeGuide);
}

const neonRealtimeGuide = `# Neon Realtime (beta)

This package streams PostgreSQL SELECT results through Neon's managed Realtime service. It shares packages/db and does not create a second database or Worker. The separate --realtime option creates Cloudflare Durable Object WebSocket rooms; both options can coexist.

## Branch setup

Enable Realtime on the intended Neon branch using the Neon Console or neon realtime enable. This is a manual operation; Anhedral's Neon database provisioning does not enable Realtime. Check beta availability first: aws-us-east-1, aws-us-east-2, aws-eu-central-1 and aws-ap-southeast-1 (reviewed 2026-10-16). Claimed projects only. Enabling Realtime requires logical replication; review this change before applying it. Configure the service's allowedOrigins for the exact development and production browser origins.

Copy that branch's NEON_REALTIME_SECRET into the selected server app's ignored runtime file using its generated environment example. Use .env.local for native Next.js on Vercel, .env for Void, or .dev.vars for Wrangler. For anhedral ship, use file permissions 0600. Keep the database URL and secret on the server, in the same branch/environment. The root .env.example is an inventory, not an automatically loaded runtime file. Store all Anhedral project settings in the existing anhedral.json; no additional provider config file is needed.

NEON_REALTIME_URL is a public transport URL from the branch's Realtime page. Pass it explicitly to the client factory or expose only that URL through the frontend's public build environment (NEXT_PUBLIC_NEON_REALTIME_URL for web; use the platform's public prefix elsewhere). Never prefix the secret or DATABASE_URL with NEXT_PUBLIC_, VITE_ or EXPO_PUBLIC_. No public sealing route is generated.

## Server integration

Add @workspace/neon-realtime and @workspace/db as workspace:* dependencies of the server app when implementing product routes. Import createNeonRealtime from @workspace/neon-realtime/server and createDatabase from @workspace/db. Pass { secret: env.NEON_REALTIME_SECRET, databaseUrl: env.DATABASE_URL } to createNeonRealtime; use the existing database factory to build Drizzle selects. The Realtime adapter compiles queries without executing them through the HTTP driver; normal writes and migrations still use packages/db.

Authenticate each sealing request with the selected identity system. Validate request parameters, derive the user identity from the verified session, and build a bounded SELECT scoped to that user's rows or membership joins. Then call await realtime.seal({ query }) and return its JSON with Cache-Control: private, no-store over HTTPS. Do not accept SQL or an owner ID from the browser, cache sealed queries across users, or expose secret-bearing configuration. Recheck authentication and authorization on every renewal. Never subscribe to auth/session/credential tables.

Tables need stable replica identity (normally a primary key). Queries must be read-only and deterministic: functions such as now() cannot be used in live selects. Selected Drizzle keys must match SQL result column names; alias camelCase/computed fields explicitly. Use drizzleParsers from this package's client factory so dates/timestamps agree with Drizzle's types. RLS is not supported in the beta: put access rules in the query itself, including live membership joins when immediate membership revocation is required.

## Client lifecycle

Add @workspace/neon-realtime as a workspace:* dependency of each client app. Import createNeonRealtimeClient and the SealedLiveQuery row type from @workspace/neon-realtime/client. This entry point contains no server factory, ORM or credentials. Create one client per database with the public URL. Fetch a sealed query from your authenticated endpoint, then call client.subscribe(sealedQuery) and subscription.onChange(render). Snapshots include connecting/live/stale/error/closed state; surface errors and stale data in the UI.

Capabilities currently expire after 60 seconds. Schedule an authenticated refresh before expiresAt and call subscription.renew(next); use the returned expiry for the next refresh. A changed query or parameters require a new subscription. Stop renewal timers and call subscription.unsubscribe() on unmount; close the shared client on sign-out to clear subscriptions and user data. Treat terminal errors separately from reconnects. Sealed queries are bearer credentials until expiry: keep them out of URLs, logs and persistent browser storage. The optional upstream React and TanStack bindings can manage renewal; they are not dependencies of this framework-neutral package.

## Acceptance

Test two users with disjoint rows, denied/expired sessions and renewal, membership removal during a subscription, query/parameter changes, stale/error states, reconnects and cleanup. Apply reviewed schema migrations separately. No service is enabled or deployed by init. The beta transport may change and has no performance guarantees. Realtime is free during beta, but database compute and egress can incur charges.

Official references:

- https://neon.com/docs/realtime/overview
- https://neon.com/docs/realtime/quickstart
- https://neon.com/docs/realtime/guides/queries
- https://neon.com/docs/realtime/guides/subscribing
- https://neon.com/docs/realtime/examples/drizzle
`;
