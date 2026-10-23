import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseStandardOptions, scaffoldStandardProject } from '../dist/standard.js';
import { readProjectSection } from '../dist/project-config.js';
const core = ['better-auth', 'd1', 'expo', 'hono', 'next', 'r2', 'styling'];
const read = (root, file) => readFileSync(path.join(root, file), 'utf8');
const noCommands = (command, args) => {
  throw Error(`Source-only generation must be offline: ${command} ${args.join(' ')}`);
};

for (const additions of [[], ['stripe'], ['revenuecat'], ['stripe', 'revenuecat']]) {
  test(`offline init generates the complete core with ${additions.join('+') || 'no payment provider'}`, async () => {
    const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-core-'));
    const root = path.join(temporary, 'app');
    try {
      const options = parseStandardOptions([
        root,
        ...additions.map((id) => '--' + id),
        '--skip-install',
        '--no-git',
        '--json',
      ]);
      assert.deepEqual(options.products, [...core, ...additions].sort());
      await scaffoldStandardProject(options, noCommands, { quiet: true });
      assert.deepEqual(readProjectSection(root, 'setup').products, options.products);
      assert.deepEqual(readdirSync(path.join(root, 'apps')).sort(), ['api', 'mobile', 'web']);
      for (const file of [
        'apps/api/src/index.ts',
        'apps/api/src/private-files.ts',
        'apps/mobile/app/sign-in.tsx',
        'packages/db/src/schema.ts',
        'packages/auth/src/index.ts',
        'packages/contracts/src/index.ts',
      ])
        assert.ok(existsSync(path.join(root, file)), file);
      const worker = JSON.parse(read(root, 'apps/api/wrangler.jsonc'));
      assert.equal(worker.d1_databases[0].binding, 'DB');
      assert.equal(worker.r2_buckets[0].binding, 'FILES');
      assert.equal(worker.r2_buckets[0].public, undefined);
      assert.match(read(root, 'apps/api/src/index.ts'), /privateFileRoutes/);
      assert.match(read(root, 'packages/db/src/index.ts'), /drizzle-orm\/d1/);
      assert.equal(
        existsSync(path.join(root, 'pnpm-lock.yaml')),
        false,
        'offline source-only output does not resolve dependencies',
      );
      const ignores = read(root, '.gitignore');
      for (const value of ['node_modules/', '.dev.vars', '.env', '.anhedral/'])
        assert.ok(ignores.includes(value), value);
      assert.equal(existsSync(path.join(root, 'packages/billing')), additions.length > 0);
      if (additions.length)
        assert.ok(existsSync(path.join(root, 'packages/db/src/billing-schema.ts')));
      assert.equal(readProjectSection(root, 'registry').resourcesProvisioned, false);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  });
}

test('init rejects retired selectors and never writes during a dry-run', async () => {
  for (const flag of [
    '--next',
    '--vinext',
    '--neon',
    '--workers-ai',
    '--resend',
    '--clerk',
    '--expo',
    '--hono',
    '--preset',
    '--hosting',
    '--all',
  ])
    assert.throws(() => parseStandardOptions(['/tmp/no-write', flag]), /Unknown init option/);
  const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-plan-'));
  try {
    const root = path.join(temporary, 'absent');
    await scaffoldStandardProject(parseStandardOptions([root, '--dry-run', '--json']), noCommands, {
      quiet: true,
    });
    assert.equal(existsSync(root), false);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('init refuses a nonempty destination and preserves authored bytes', async () => {
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
