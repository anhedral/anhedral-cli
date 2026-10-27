import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseStandardOptions, scaffoldStandardProject } from '../dist/standard.js';
const read = (root, file) => readFileSync(path.join(root, file), 'utf8');
const noCommands = () => {
  throw Error('Offline generation must not execute tools.');
};
test('default offline init creates only the Next.js application with Anhedral UI', async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-minimal-'));
  const root = path.join(temporary, 'app');
  try {
    const options = parseStandardOptions([root, '--skip-install', '--no-git']);
    assert.deepEqual(options.products, ['next', 'styling']);
    await scaffoldStandardProject(options, noCommands, { quiet: true });
    assert.deepEqual(readdirSync(path.join(root, 'apps')), ['web']);
    for (const absent of [
      'apps/api',
      'apps/mobile',
      'packages/db',
      'packages/contracts',
      'packages/native-ui',
      'apps/web/app/api',
      'apps/web/lib/server-api.ts',
    ])
      assert.equal(existsSync(path.join(root, absent)), false, absent);
    assert.equal(JSON.parse(read(root, 'apps/web/.anhedral-ui.json')).platform, 'web');
    for (const component of ['button', 'input', 'label'])
      assert.ok(existsSync(path.join(root, `apps/web/components/ui/${component}.tsx`)));
    const worker = JSON.parse(read(root, 'apps/web/wrangler.jsonc'));
    assert.deepEqual(
      worker.services.map((service) => service.binding),
      ['WORKER_SELF_REFERENCE'],
    );
    assert.equal(worker.d1_databases, undefined);
    assert.equal(worker.r2_buckets, undefined);
    const pkg = JSON.parse(read(root, 'package.json'));
    assert.equal(pkg.scripts['db:migrate'], undefined);
    assert.doesNotMatch(
      read(root, 'apps/web/package.json'),
      /"(?:hono|drizzle-orm|expo|better-auth|stripe)"/,
    );
    assert.doesNotMatch(read(root, 'apps/web/next.config.ts'), /@workspace\/contracts/);
    assert.equal(JSON.parse(read(root, 'anhedral.json')).registry.resourcesProvisioned, false);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
test('explicit legacy source composition retains the full-stack recipes without managed features', async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-foundation-'));
  const root = path.join(temporary, 'app');
  try {
    const options = {
      ...parseStandardOptions([root, '--skip-install', '--no-git']),
      products: ['d1', 'expo', 'hono', 'next', 'r2', 'styling'],
    };
    assert.deepEqual(options.products, ['d1', 'expo', 'hono', 'next', 'r2', 'styling']);
    await scaffoldStandardProject(options, noCommands, { quiet: true });
    assert.deepEqual(readdirSync(path.join(root, 'apps')).sort(), ['api', 'mobile', 'web']);
    const config = JSON.parse(read(root, 'anhedral.json'));
    assert.deepEqual(Object.keys(config).sort(), [
      'identity',
      'registry',
      'schemaVersion',
      'setup',
      'standard',
    ]);
    assert.equal(config.registry.resourcesProvisioned, false);
    const worker = JSON.parse(read(root, 'apps/api/wrangler.jsonc'));
    assert.equal(worker.d1_databases[0].binding, 'DB');
    assert.equal(worker.r2_buckets[0].binding, 'FILES');
    assert.equal(worker.r2_buckets[0].public, undefined);
    assert.match(
      read(root, 'apps/api/src/index.ts'),
      /c\.set\('database', \(\) => createDatabase\(c\.env\.DB\)\)/,
    );
    assert.match(
      read(root, 'apps/api/src/index.ts'),
      /c\.set\('storage', \(\) => privateStorage\(c\.env\.FILES\)\)/,
    );
    assert.doesNotMatch(
      read(root, 'apps/api/src/index.ts'),
      /\/api\/(?:auth|session|files|payments|billing)/,
    );
    for (const absent of [
      'packages/auth',
      'packages/billing',
      'packages/managed-email',
      'apps/web/app/sign-in',
      'apps/mobile/app/sign-in.tsx',
      '.anhedral',
      'pnpm-lock.yaml',
    ])
      assert.equal(existsSync(path.join(root, absent)), false, absent);
    for (const app of ['web', 'mobile', 'api'])
      assert.doesNotMatch(
        read(root, `apps/${app}/package.json`),
        /better-auth|react-native-purchases|"stripe"|eas-cli/,
      );
    assert.match(read(root, 'packages/db/src/index.ts'), /drizzle-orm\/d1/);
    assert.match(read(root, 'apps/web/components/ui/button.tsx'), /@base-ui\/react\/button/);
    assert.match(read(root, 'packages/native-ui/src/native/button.tsx'), /Pressable/);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
test('payment selectors are rejected and dry-run creates no destination', async () => {
  for (const flag of ['--stripe', '--revenuecat', '--next', '--expo', '--hosting'])
    assert.throws(() => parseStandardOptions(['/tmp/no-write', flag]), /Unknown init option/);
  const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-plan-'));
  try {
    const root = path.join(temporary, 'absent');
    await scaffoldStandardProject(parseStandardOptions([root, '--dry-run']), noCommands, {
      quiet: true,
    });
    assert.equal(existsSync(root), false);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
test('init preserves an existing application and refuses a second generation', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-existing-'));
  try {
    writeFileSync(path.join(root, 'customer.txt'), 'keep me');
    await assert.rejects(
      scaffoldStandardProject(
        parseStandardOptions([root, '--skip-install', '--no-git']),
        noCommands,
      ),
      /Destination must be empty/,
    );
    assert.equal(read(root, 'customer.txt'), 'keep me');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the public package exports only scaffolding APIs', async () => {
  const api = await import('../dist/index.js');
  assert.deepEqual(Object.keys(api).sort(), [
    'GENERATOR_VERSION',
    'STANDARD_PRODUCTS',
    'STANDARD_USAGE',
    'parseStandardOptions',
    'scaffoldStandardProject',
  ]);
});
