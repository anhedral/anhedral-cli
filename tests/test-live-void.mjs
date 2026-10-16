// Private Void live-acceptance preparation and read-only capability preflight.
// This deliberately stops before creating any Worker, Access app, or data resource.
// Prepare a real installed fixture:
//   node tests/test-live-void.mjs --prepare-only /tmp/anhedral-void-private-qa
// Check the exact account using its installed Wrangler:
//   node tests/test-live-void.mjs --account ACCOUNT --fixture /tmp/anhedral-void-private-qa
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseStandardOptions, scaffoldStandardProject } from '../dist/standard.js';
import { cloudflareRequest } from '../dist/cloudflare.js';
import { defaultRunner } from '../dist/delivery.js';

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};
const prepare = option('--prepare-only');
if (prepare) {
  const root = path.resolve(prepare);
  assert.equal(existsSync(root), false, 'Prepare a new isolated fixture directory');
  await scaffoldStandardProject(
    parseStandardOptions([root, '--vinext', '--hono', '--d1', '--better-auth', '--r2', '--no-git']),
  );
  execFileSync(
    process.execPath,
    [path.join(import.meta.dirname, 'test-void-runtime-generated.mjs'), root],
    { stdio: 'inherit' },
  );
  console.log(
    JSON.stringify({ phase: 'prepared-local-only', fixture: root, providerMutations: false }),
  );
  process.exit(0);
}
const root = path.resolve(option('--fixture') ?? '');
const accountId = option('--account');
assert.match(accountId ?? '', /^[a-f0-9]{32}$/i, 'Provide the intended --account');
assert.ok(option('--fixture'), 'Provide an installed generated --fixture');
const pkg = JSON.parse(readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
assert.equal(pkg.devDependencies?.void ?? pkg.dependencies?.void, '0.27.0');
const request = await cloudflareRequest({ accountId }, path.join(root, 'apps/api'), defaultRunner, {
  ...process.env,
  CI: 'true',
  WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH ?? '/tmp/anhedral-void-live-preflight.log',
});
const results = [];
for (const endpoint of ['/workers/subdomain', '/access/organizations', '/access/apps']) {
  try {
    const response = await request('GET', endpoint);
    results.push({
      endpoint,
      readable: true,
      ...(endpoint === '/access/organizations' ? { configured: Boolean(response.result) } : {}),
    });
  } catch (error) {
    results.push({
      endpoint,
      readable: false,
      status: error.status ?? null,
      reason: error.message,
    });
  }
}
const ready = results.every((result) => result.readable && result.configured !== false);
console.log(
  JSON.stringify(
    { phase: 'private-provider-preflight', accountId, providerMutations: false, ready, results },
    null,
    2,
  ),
);
if (!ready) {
  console.error(
    'Private live acceptance blocked before mutation: configure the account Zero Trust organization and authorize Access app/policy operations. Public publication is not used as a fallback.',
  );
  process.exitCode = 1;
} else {
  console.log(
    'Read preflight passed. This does not prove write permissions or private deployment acceptance.',
  );
  console.log(
    'Remaining live checks: protection before publication; target-specific Access readiness credentials; first private Worker publication; shared resource identity reuse; authenticated product checks; failed-build recovery; rollback; fresh-checkout reuse; exact-ID cleanup.',
  );
}
