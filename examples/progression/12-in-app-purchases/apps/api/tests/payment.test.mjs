import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { cp, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startPostgres } from './postgres.mjs';
import test from 'node:test';
import app from '../src/index.ts';

test('reviewable local migrations support idempotent signed webhook delivery', async (t) => {
  const root = new URL('../../../packages/db/', import.meta.url);
  const work = await mkdtemp(join(tmpdir(), 'billing-migrations-'));
  t.after(() => rm(work, { recursive: true, force: true }));
  const migrations = join(work, 'drizzle');
  await cp(new URL('drizzle/', root), migrations, { recursive: true });
  const require = createRequire(new URL('package.json', root));
  const cli = join(dirname(require.resolve('drizzle-kit/api')), 'bin.cjs');
  execFileSync(
    process.execPath,
    [
      cli,
      'generate',
      '--dialect=postgresql',
      '--schema=' + fileURLToPath(new URL('src/schema.ts', root)),
      '--out=./drizzle',
    ],
    { cwd: work, stdio: 'pipe' },
  );
  const fixture = await startPostgres();
  t.after(() => fixture.close());
  const db = fixture.db;
  for (const file of (await readdir(migrations)).filter((name) => name.endsWith('.sql')).sort())
    await db.exec(await readFile(join(migrations, file), 'utf8'));
  const env = {
    DATABASE_URL: fixture.url,
    STRIPE_SECRET_KEY: 'sk_test_' + randomUUID(),
    STRIPE_WEBHOOK_SECRET: randomUUID(),
  };
  const body = JSON.stringify({ id: 'evt_local', object: 'event', livemode: false });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', env.STRIPE_WEBHOOK_SECRET)
    .update(timestamp + '.' + body)
    .digest('hex');
  for (let delivery = 0; delivery < 2; delivery++) {
    const result = await app.request(
      '/api/webhooks/stripe',
      {
        method: 'POST',
        headers: { 'stripe-signature': 't=' + timestamp + ',v1=' + signature },
        body,
      },
      env,
    );
    assert.equal(result.status, 200);
  }
  assert.equal(
    Number((await db.query('SELECT COUNT(*) AS count FROM billing_receipt')).rows[0].count),
    1,
  );
});
