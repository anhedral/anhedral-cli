import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { GENERATOR_VERSION } from '../dist/version.js';

const executable = path.resolve('dist/bin.js');
const digest = (source) => createHash('sha256').update(source).digest('hex');
const json = (root, file) => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
function run(root, args) {
  return spawnSync(process.execPath, [executable, ...args, '--skip-install', '--json'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, CI: '1' },
  });
}
function fixture(t, backend = false) {
  const base = mkdtempSync(path.join(tmpdir(), 'anhedral-oj-compose-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = path.join(base, 'product');
  const init = run(base, ['init', root, '--no-git']);
  assert.equal(init.status, 0, init.stderr);
  if (backend) {
    const added = run(root, ['add', 'backend']);
    assert.equal(added.status, 0, added.stderr);
  }
  return root;
}
function previousRoot(root) {
  const file = path.join(root, 'apps/web/src/routes/__root.tsx');
  const old = readFileSync(file, 'utf8')
    .replace("import '../styles.css';", "import styles from '../styles.css?url';")
    .replace('    ],\n  }),', "    ],\n    links: [{ rel: 'stylesheet', href: styles }],\n  }),");
  assert.equal(digest(old), '21af7892e39130c9ec3d7ffb583b3f5d24bee771440ca253d8d7b8ce41be9801');
  writeFileSync(file, old);
}
function previousFoundation(root) {
  previousRoot(root);
  const pkg = json(root, 'apps/web/package.json');
  Object.assign(pkg.scripts, {
    dev: 'vite dev --host 0.0.0.0 --port 3000',
    build: 'vite build',
    preview: 'vite preview --host 0.0.0.0 --port 3000',
  });
  delete pkg.scripts.deploy;
  writeFileSync(path.join(root, 'apps/web/package.json'), JSON.stringify(pkg, null, 2) + '\n');
  const configPath = path.join(root, 'apps/web/vite.config.ts');
  const old = readFileSync(configPath, 'utf8')
    .replace('defineConfig(({ command }) => ({', 'defineConfig({')
    .replace(
      "auxiliaryWorkers: command === 'serve' ? [{ configPath: '../api/wrangler.jsonc' }] : []",
      "auxiliaryWorkers: [{ configPath: '../api/wrangler.jsonc' }]",
    )
    .replace('\n}));', '\n});');
  writeFileSync(configPath, old);
  const metadata = json(root, 'anhedral.json');
  metadata.setup.cliVersion = '0.18.0';
  metadata.composition.generatorVersion = '0.18.0';
  for (const capability of metadata.capabilities.installed)
    metadata.composition.capabilities[capability] = '0.18.0';
  metadata.capabilities.managedFiles['apps/web/vite.config.ts'] = digest(old);
  for (const file of ['scripts/oj.mjs', 'scripts/oj-runtime.json', 'scripts/OJ.LICENSE']) {
    rmSync(path.join(root, file));
    delete metadata.capabilities.managedFiles[file];
  }
  writeFileSync(path.join(root, 'anhedral.json'), JSON.stringify(metadata, null, 2) + '\n');
  const ignore = path.join(root, '.gitignore');
  writeFileSync(ignore, readFileSync(ignore, 'utf8').replace('.oj-cache/\n', ''));
}
function snapshot(root) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((x) => x.isFile())
    .map((x) => {
      const file = path.join(x.parentPath, x.name);
      return [path.relative(root, file), readFileSync(file, 'utf8')];
    })
    .sort(([a], [b]) => a.localeCompare(b));
}
function assertOj(root) {
  const document = readFileSync(path.join(root, 'apps/web/src/routes/__root.tsx'), 'utf8');
  assert.match(document, /import '\.\.\/styles\.css';/);
  assert.doesNotMatch(document, /styles\.css\?url|href: styles/);
  const pkg = json(root, 'apps/web/package.json');
  assert.match(pkg.scripts.dev, /scripts\/oj\.mjs dev/);
  assert.match(pkg.scripts.build, /scripts\/oj\.mjs build/);
  assert.equal(pkg.scripts.preview, 'wrangler dev --config dist/ssr/wrangler.json --port 3000');
  assert.equal(pkg.scripts.deploy, 'wrangler deploy --config dist/ssr/wrangler.json');
  for (const file of ['scripts/oj.mjs', 'scripts/oj-runtime.json', 'scripts/OJ.LICENSE']) {
    const source = readFileSync(path.join(root, file), 'utf8');
    assert.equal(json(root, 'anhedral.json').capabilities.managedFiles[file], digest(source));
  }
  const metadata = json(root, 'anhedral.json');
  assert.equal(metadata.setup.cliVersion, GENERATOR_VERSION);
  assert.equal(metadata.composition.generatorVersion, GENERATOR_VERSION);
  assert.match(readFileSync(path.join(root, '.gitignore'), 'utf8'), /\.oj-cache\//);
}
for (const addition of ['backend', 'r2', 'stripe'])
  test(`adding ${addition} upgrades a canonical 0.18 foundation to OJ in the same transaction`, (t) => {
    const root = fixture(t, addition !== 'backend');
    previousFoundation(root);
    const identity = json(root, 'anhedral.json').identity;
    const page = path.join(root, 'apps/web/src/routes/index.tsx');
    writeFileSync(page, readFileSync(page, 'utf8') + '\n// Customer content\n');
    const pageBefore = readFileSync(page, 'utf8');
    let authBefore;
    if (addition !== 'backend') {
      const auth = path.join(root, 'apps/api/src/auth-features.ts');
      writeFileSync(
        auth,
        readFileSync(auth, 'utf8') + '\n// Customer authentication configuration\n',
      );
      authBefore = readFileSync(auth, 'utf8');
    }
    const result = run(root, ['add', addition]);
    assert.equal(result.status, 0, result.stderr);
    assertOj(root);
    assert.deepEqual(json(root, 'anhedral.json').identity, identity);
    assert.equal(readFileSync(page, 'utf8'), pageBefore);
    if (authBefore)
      assert.equal(
        readFileSync(path.join(root, 'apps/api/src/auth-features.ts'), 'utf8'),
        authBefore,
      );
    assert.equal(json(root, 'anhedral.json').composition.identity, 'better-auth-d1-v1');
    if (addition !== 'backend')
      assert.match(
        readFileSync(path.join(root, 'apps/web/vite.config.ts'), 'utf8'),
        /auxiliaryWorkers: command === 'serve'/,
      );
  });
test('an already-installed addition also upgrades OJ without rewriting authentication or routes', (t) => {
  const root = fixture(t, true);
  previousFoundation(root);
  const server = path.join(root, 'apps/web/src/server.ts');
  writeFileSync(server, readFileSync(server, 'utf8') + '\n// Customer server adapter\n');
  const before = readFileSync(server, 'utf8');
  const result = run(root, ['add', 'backend']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).added, []);
  assertOj(root);
  assert.equal(readFileSync(server, 'utf8'), before);
  const upgraded = snapshot(root);
  const again = run(root, ['add', 'backend']);
  assert.equal(again.status, 0, again.stderr);
  assert.deepEqual(snapshot(root), upgraded);
});
test('migration dry-run lists OJ runtime writes and preserves all source', (t) => {
  const root = fixture(t);
  previousFoundation(root);
  const before = snapshot(root);
  const result = run(root, ['add', 'backend', '--dry-run']);
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.ok(plan.files.includes('scripts/oj.mjs'));
  assert.ok(plan.files.includes('scripts/oj-runtime.json'));
  assert.deepEqual(snapshot(root), before);
});
for (const conflict of ['launcher', 'runtime-helper', 'generated-configuration'])
  test(`a customized ${conflict} rejects the whole source upgrade without partial writes`, (t) => {
    const root = fixture(t);
    previousFoundation(root);
    if (conflict === 'launcher') {
      const pkg = json(root, 'apps/web/package.json');
      pkg.scripts.dev = 'node customer-dev.mjs';
      writeFileSync(path.join(root, 'apps/web/package.json'), JSON.stringify(pkg));
    }
    if (conflict === 'runtime-helper')
      writeFileSync(path.join(root, 'scripts/oj.mjs'), '// Customer runtime helper\n');
    if (conflict === 'generated-configuration') {
      const file = path.join(root, 'apps/web/vite.config.ts');
      writeFileSync(file, readFileSync(file, 'utf8') + '\n// Customer configuration\n');
    }
    const before = snapshot(root);
    const result = run(root, ['add', 'backend']);
    assert.equal(result.status, 1, result.stdout);
    assert.match(
      result.stderr,
      /Preserve customized web launcher|Preserve edited generated source/,
    );
    assert.deepEqual(snapshot(root), before);
    assert.equal(existsSync(path.join(root, '.anhedral-journal.json')), false);
    assert.equal(existsSync(path.join(root, 'apps/api')), false);
  });

test('an OJ application with the untouched previous root is repaired on a repeated addition', (t) => {
  const root = fixture(t, true);
  previousRoot(root);
  const before = json(root, 'anhedral.json').composition;
  const result = run(root, ['add', 'backend']);
  assert.equal(result.status, 0, result.stderr);
  assertOj(root);
  assert.deepEqual(json(root, 'anhedral.json').composition, before);
  assert.equal(
    json(root, 'anhedral.json').capabilities.managedFiles['apps/web/src/routes/__root.tsx'],
    undefined,
  );
});
test('safe customized root content remains source-owned through additions', (t) => {
  const root = fixture(t);
  const file = path.join(root, 'apps/web/src/routes/__root.tsx');
  writeFileSync(file, readFileSync(file, 'utf8') + '\n// Customer document and navigation\n');
  const before = readFileSync(file, 'utf8');
  const result = run(root, ['add', 'backend']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(file, 'utf8'), before);
});
test('a customized affected root rejects every source write rather than replacing customer content', (t) => {
  const root = fixture(t);
  previousRoot(root);
  const file = path.join(root, 'apps/web/src/routes/__root.tsx');
  writeFileSync(file, readFileSync(file, 'utf8') + '\n// Customer document and navigation\n');
  const before = snapshot(root);
  const result = run(root, ['add', 'backend']);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /Preserve customized root route CSS/);
  assert.deepEqual(snapshot(root), before);
  assert.equal(existsSync(path.join(root, '.anhedral-journal.json')), false);
  assert.equal(existsSync(path.join(root, 'apps/api')), false);
});
