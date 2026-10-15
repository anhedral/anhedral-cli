// Opt-in, real installed-package acceptance. No provider API calls or deployment.
// node tests/test-void-runtime.mjs /absolute/path/to/runtime/node_modules
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
  rmSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modules = path.resolve(process.argv[2] ?? 'node_modules');
const metadata = JSON.parse(readFileSync(path.join(modules, 'void/package.json'), 'utf8'));
assert.equal(
  metadata.version,
  '0.27.0',
  'Runtime acceptance requires the exact supported Void pin',
);
const root = mkdtempSync(path.join(tmpdir(), 'anhedral-void-runtime-'));
const put = (file, value) => {
  const destination = path.join(root, file);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, value);
};
try {
  symlinkSync(modules, path.join(root, 'node_modules'), 'dir');
  put('package.json', JSON.stringify({ private: true, type: 'module' }));
  const version = execFileSync(
    process.execPath,
    [path.join(modules, 'void/dist/cli/cli.mjs'), '--version'],
    {
      cwd: root,
      encoding: 'utf8',
    },
  );
  assert.equal(version.trim(), metadata.version);
  put(
    'vite.config.ts',
    `import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';
export default defineConfig({ plugins: [cloudflare({ configPath: '.void-wrangler.jsonc' })] });
`,
  );
  put(
    '.void-wrangler.jsonc',
    JSON.stringify({
      name: 'anhedral-void-runtime-probe',
      main: 'apps/api/src/index.ts',
      compatibility_date: '2026-10-15',
      compatibility_flags: ['nodejs_compat'],
      d1_databases: [
        {
          binding: 'DB',
          database_name: 'preserved-db',
          database_id: '12345678-1234-1234-1234-123456789012',
        },
      ],
      r2_buckets: [{ binding: 'UPLOADS', bucket_name: 'preserved-private-uploads' }],
      kv_namespaces: [{ binding: 'CONFIG', id: 'a'.repeat(32) }],
    }),
  );
  put('packages/domain/src/index.ts', `export const marker = 'workspace-domain-preserved';\n`);
  put(
    'apps/api/src/index.ts',
    `import { Hono } from 'hono';
import { marker } from '../../../packages/domain/src/index';
const app = new Hono();
app.get('/health', c => c.json({ ok: true, marker }));
export default app;
`,
  );
  execFileSync(process.execPath, [path.join(modules, 'vite/bin/vite.js'), 'build'], {
    cwd: root,
    env: { ...process.env, WRANGLER_LOG_PATH: path.join(root, 'wrangler.log') },
    encoding: 'utf8',
    stdio: 'pipe',
  });
  const pointerFile = path.join(root, '.wrangler/deploy/config.json');
  const pointer = JSON.parse(readFileSync(pointerFile, 'utf8'));
  const configFile = path.resolve(path.dirname(pointerFile), pointer.configPath);
  const config = JSON.parse(readFileSync(configFile, 'utf8'));
  assert.equal(config.name, 'anhedral-void-runtime-probe');
  assert.equal(config.d1_databases[0].database_id, '12345678-1234-1234-1234-123456789012');
  assert.equal(config.r2_buckets[0].bucket_name, 'preserved-private-uploads');
  assert.equal(config.kv_namespaces[0].id, 'a'.repeat(32));
  const main = path.resolve(path.dirname(configFile), config.main);
  const worker = (await import(pathToFileURL(main).href)).default;
  const response = await worker.fetch(new Request('https://example.invalid/health'), {}, {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, marker: 'workspace-domain-preserved' });
  // Exercise the installed, version-matched upstream migration gate itself.
  const deployChunk = readdirSync(path.join(modules, 'void/dist')).find((name) =>
    /^deploy-[^.]+\.mjs$/.test(name),
  );
  assert.ok(deployChunk);
  const { v: checkApplySet } = await import(
    pathToFileURL(path.join(modules, 'void/dist', deployChunk)).href
  );
  assert.equal(typeof checkApplySet, 'function');
  const sql = 'CREATE TABLE acceptance (id TEXT PRIMARY KEY);\n';
  put('packages/db/drizzle/0000_acceptance.sql', sql);
  const configPath = path.join(root, 'apps/api/.void-wrangler.jsonc');
  const migrationConfig = {
    d1_databases: [{ binding: 'DB', migrations_dir: '../../packages/db/drizzle' }],
  };
  assert.deepEqual(
    await checkApplySet(configPath, migrationConfig, 'DB', '../../packages/db/drizzle', [
      { name: '0000_acceptance.sql', sql },
    ]),
    { ok: true },
  );
  assert.equal(
    (
      await checkApplySet(configPath, migrationConfig, 'DB', '../../packages/db/drizzle', [
        { name: '0000_acceptance.sql', sql: sql + '-- diverged\n' },
      ])
    ).ok,
    false,
  );
  put('packages/db/drizzle/seed.sql', 'SELECT 1;\n');
  assert.equal(
    (
      await checkApplySet(configPath, migrationConfig, 'DB', '../../packages/db/drizzle', [
        { name: '0000_acceptance.sql', sql },
      ])
    ).ok,
    false,
  );
  console.log(
    'PASS: actual Void CLI pin, Cloudflare Vite build, shared package import, binding identity, built Hono handler, and upstream shared migration gate.',
  );
  console.log(
    'Not covered: Vinext, workerd, provider provisioning, secrets, migration execution, readiness, or rollback.',
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
