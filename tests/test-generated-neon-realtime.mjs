// Run with the generated database package's tsx loader and installed dependencies.
// pnpm --dir /absolute/workspace/packages/db exec tsx /absolute/repo/tests/test-generated-neon-realtime.mjs /absolute/workspace
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

assert.ok(process.argv[2], 'Specify an installed generated Neon Realtime workspace');
const root = path.resolve(process.argv[2]);
const load = (file) => import(pathToFileURL(path.join(root, file)));
const require = createRequire(path.join(root, 'packages/db/package.json'));
const { pgTable, text } = await import(pathToFileURL(require.resolve('drizzle-orm/pg-core')));
const { eq } = await import(pathToFileURL(require.resolve('drizzle-orm')));
const { createDatabase } = await load('packages/db/src/index.ts');
const { createNeonRealtime } = await load('packages/neon-realtime/src/server.ts');
const { createNeonRealtimeClient } = await load('packages/neon-realtime/src/client.ts');

// No real credential, database, table or transport is used. The SDK compiles
// these selects and seals them locally; any network activity fails the check.
const originalFetch = globalThis.fetch;
const originalWebSocket = globalThis.WebSocket;
globalThis.fetch = () => assert.fail('Sealing must not contact the database');
globalThis.WebSocket = class {
  constructor() {
    assert.fail('Client construction must not open a WebSocket');
  }
};
try {
  const databaseUrl = new URL('postgresql://ep-fixture.neon.tech/neondb');
  databaseUrl.username = 'fixture';
  const db = createDatabase(databaseUrl.href);
  const records = pgTable('realtime_fixture', {
    id: text('id').primaryKey(),
    owner_id: text('owner_id').notNull(),
  });
  // Test-only opaque credential format for the pinned SDK; production uses
  // the provider-issued secret and never constructs or parses it itself.
  const realtime = createNeonRealtime({
    secret: 'nrt_live_1' + randomBytes(32).toString('base64url'),
    databaseUrl: databaseUrl.href,
  });
  const query = (owner) => db.select().from(records).where(eq(records.owner_id, owner)).limit(20);
  const started = Date.now();
  const first = await realtime.seal({ query: query('user-a') });
  const renewed = await realtime.seal({ query: query('user-a') });
  const other = await realtime.seal({ query: query('user-b') });
  for (const sealed of [first, renewed, other]) {
    assert.equal(typeof sealed.capability, 'string');
    assert.ok(sealed.capability.length > 0);
    assert.equal(typeof sealed.queryFingerprint, 'string');
    assert.ok(sealed.expiresAt > started && sealed.expiresAt <= Date.now() + 60_000);
    assert.doesNotMatch(sealed.capability, /realtime_fixture|user-a|user-b/);
  }
  assert.equal(first.queryFingerprint, renewed.queryFingerprint);
  assert.notEqual(first.queryFingerprint, other.queryFingerprint);
  const client = createNeonRealtimeClient('wss://realtime.fixture.neon.tech');
  client.close();
  console.log(
    'Generated Neon Realtime factories passed local SDK sealing and lazy-client checks; live subscriptions remain unverified.',
  );
} finally {
  globalThis.fetch = originalFetch;
  globalThis.WebSocket = originalWebSocket;
}
