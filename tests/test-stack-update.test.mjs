import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  existsSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parse, stringify } from 'yaml';
import * as catalog from '../dist/dependencies.js';
import { GENERATOR_VERSION } from '../dist/version.js';
import { planStackUpdate, runStackUpdate, updateDiff } from '../dist/composition/update.js';
import { ArtifactUnavailableError, resolvePublishedCliArtifact } from '../dist/release-artifact.js';
import { runStagedTransaction } from '../dist/transactions/transaction.js';

const executable = path.resolve('dist/bin.js');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const read = (root, file) => readFileSync(path.join(root, file), 'utf8');
const json = (root, file) => JSON.parse(read(root, file));
const writeJson = (root, file, value) =>
  writeFileSync(path.join(root, file), JSON.stringify(value, null, 2) + '\n');
function run(root, args) {
  return spawnSync(
    process.execPath,
    [executable, 'stack', 'update', '--offline', '--json', ...args],
    { cwd: root, encoding: 'utf8', timeout: 30000 },
  );
}
function snapshot(root) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const file = path.join(entry.parentPath, entry.name);
      return [path.relative(root, file), digest(readFileSync(file))];
    })
    .sort(([a], [b]) => a.localeCompare(b));
}
function fixture(t) {
  const base = mkdtempSync(path.join(tmpdir(), 'anhedral-stack-update-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = path.join(base, 'project');
  const initialized = spawnSync(
    process.execPath,
    [executable, 'init', root, '--skip-install', '--catalog-pins', '--no-git', '--json'],
    { encoding: 'utf8', timeout: 30000 },
  );
  assert.equal(initialized.status, 0, initialized.stderr);
  const web = spawnSync(
    process.execPath,
    [executable, 'add', 'web', '--skip-install', '--catalog-pins'],
    {
      cwd: root,
      encoding: 'utf8',
    },
  );
  assert.equal(web.status, 0, web.stderr);
  const configuration = json(root, 'anhedral.json');
  configuration.composition.foundation = 'tanstack-start';
  configuration.composition.contractVersion = 2;
  configuration.capabilities.installed = [];
  configuration.composition.capabilities = {};
  configuration.setup.cliVersion = '0.18.0';
  configuration.composition.generatorVersion = '0.18.0';
  for (const file of ['scripts/oj.mjs', 'scripts/oj-runtime.json', 'scripts/OJ.LICENSE']) {
    rmSync(path.join(root, file));
    delete configuration.capabilities.managedFiles[file];
  }
  writeJson(root, 'anhedral.json', configuration);
  const pkg = json(root, 'apps/web/package.json');
  Object.assign(pkg.scripts, {
    dev: 'vite dev --host 0.0.0.0 --port 3000',
    build: 'vite build',
    preview: 'vite preview --host 0.0.0.0 --port 3000',
  });
  delete pkg.scripts.deploy;
  writeJson(root, 'apps/web/package.json', pkg);
  writeFileSync(
    path.join(root, 'pnpm-workspace.yaml'),
    '# custom workspace comment\npackages: ["apps/*","packages/*"]\nsharedWorkspaceLockfile: true\nonlyBuiltDependencies: ["esbuild","workerd"]\ncustomSetting: preserved\n',
  );
  const authored = 'export const authored = "keep this application exactly";\n';
  writeFileSync(path.join(root, 'apps/web/src/routes/customer.tsx'), authored);
  writeFileSync(path.join(root, '.env'), 'PRIVATE_TEST_SECRET=must-never-be-previewed\n');
  const rootPackage = json(root, 'package.json');
  rootPackage.scripts.preinstall = `node -e "require('fs').writeFileSync('lifecycle-ran','bad')"`;
  writeJson(root, 'package.json', rootPackage);
  return root;
}
async function publishedArtifact() {
  const revision = 'a'.repeat(40);
  const integrity = `sha512-${Buffer.alloc(64, 1).toString('base64')}`;
  return resolvePublishedCliArtifact({
    fetch: async (input) => {
      const url = String(input);
      if (url.startsWith('https://github.com/anhedral/anhedral-cli/releases/download/'))
        return Response.json({
          schemaVersion: 1,
          name: 'anhedral',
          version: GENERATOR_VERSION,
          filename: `anhedral-${GENERATOR_VERSION}.tgz`,
          sourceRevision: revision,
          integrity,
        });
      if (url === `https://registry.npmjs.org/anhedral/${GENERATOR_VERSION}`)
        return Response.json({
          name: 'anhedral',
          version: GENERATOR_VERSION,
          dist: {
            integrity,
            tarball: `https://registry.npmjs.org/anhedral/-/anhedral-${GENERATOR_VERSION}.tgz`,
          },
        });
      assert.equal(
        url,
        `https://api.github.com/repos/anhedral/anhedral-cli/git/ref/tags/v${GENERATOR_VERSION}`,
      );
      return Response.json({
        ref: `refs/tags/v${GENERATOR_VERSION}`,
        object: { type: 'commit', sha: revision },
      });
    },
  });
}
function registry(name) {
  const versions = [
    catalog.WEB_DEPENDENCIES.dependencies,
    catalog.WEB_DEPENDENCIES.devDependencies,
    catalog.STACK_DEPENDENCIES,
    catalog.CLIENT_DEPENDENCIES,
    catalog.ANHEDRAL_STACK_DEPENDENCIES,
    { pnpm: catalog.PACKAGE_MANAGER.slice(5), '@types/node': catalog.ELECTRON_NODE_TYPES },
  ].flatMap((group) => (group[name] ? [group[name]] : []));
  assert.ok(versions.length, 'Unexpected lookup: ' + name);
  return versions.map((version) => ({ version }));
}
function lockWorkspace(command, args, stage) {
  assert.equal(command, 'pnpm');
  for (const option of ['--lockfile-only', '--ignore-scripts', '--ignore-pnpmfile'])
    assert.ok(args.includes(option));
  const importers = {};
  for (const file of readdirSync(stage, { recursive: true }).sort()) {
    if (path.basename(file) !== 'package.json') continue;
    const { dependencies = {}, devDependencies = {} } = json(stage, file);
    importers[path.dirname(file)] = { dependencies, devDependencies };
  }
  writeFileSync(
    path.join(stage, 'pnpm-lock.yaml'),
    stringify({ lockfileVersion: '9.0', importers }),
  );
}
async function online(root, args, artifact, overrides = {}) {
  let output = '';
  const previous = process.cwd();
  process.chdir(root);
  try {
    await runStackUpdate(
      ['update', ...args],
      {
        json: true,
        io: {
          out: {
            write: (value) => {
              output += value;
            },
          },
          err: { write() {} },
          stdinTTY: false,
          stdoutTTY: false,
          stderrTTY: false,
        },
      },
      { resolveArtifact: async () => artifact, registry, run: lockWorkspace, ...overrides },
    );
    return JSON.parse(output);
  } finally {
    process.chdir(previous);
  }
}

test('offline preview is deterministic and applies the exact fenced source plan without lifecycle execution', (t) => {
  const root = fixture(t);
  const before = snapshot(root);
  const identity = json(root, 'anhedral.json').identity;
  const preview = run(root, ['--dry-run']);
  assert.equal(preview.status, 0, preview.stderr);
  const plan = JSON.parse(preview.stdout);
  assert.equal(plan.dryRun, true);
  assert.equal(plan.applied, false);
  assert.equal(plan.deployment.artifactRequired, true);
  assert.ok(plan.changes.some((change) => change.path === 'scripts/oj.mjs'));
  assert.ok(plan.changes.some((change) => change.path === 'pnpm-workspace.yaml'));
  assert.ok(
    plan.changes.every(
      (change) => change.diff.startsWith('--- ') && /^[a-f0-9]{64}$/.test(change.afterDigest),
    ),
  );
  assert.equal(preview.stdout.includes('must-never-be-previewed'), false);
  assert.deepEqual(snapshot(root), before);
  assert.equal(JSON.parse(run(root, ['--dry-run']).stdout).planId, plan.planId);
  const applied = run(root, ['--expect-plan', plan.planId]);
  assert.equal(applied.status, 0, applied.stderr);
  assert.equal(JSON.parse(applied.stdout).applied, true);
  for (const change of plan.changes)
    assert.equal(digest(read(root, change.path)), change.afterDigest);
  assert.equal(
    read(root, 'apps/web/src/routes/customer.tsx'),
    'export const authored = "keep this application exactly";\n',
  );
  assert.equal(existsSync(path.join(root, 'lifecycle-ran')), false);
  assert.equal(existsSync(path.join(root, 'node_modules')), false);
  assert.equal(existsSync(path.join(root, 'pnpm-lock.yaml')), false);
  assert.deepEqual(json(root, 'anhedral.json').identity, identity);
  assert.equal(json(root, 'anhedral.json').composition.generatorVersion, GENERATOR_VERSION);
  assert.deepEqual(json(root, 'anhedral.json').capabilities.installed, []);
  assert.deepEqual(parse(read(root, 'pnpm-workspace.yaml')).allowBuilds, {
    esbuild: true,
    workerd: true,
  });
  assert.match(
    read(root, 'pnpm-workspace.yaml'),
    /^# custom workspace comment\npackages: \["apps\/\*","packages\/\*"\]/,
  );
  assert.equal(parse(read(root, 'pnpm-workspace.yaml')).customSetting, 'preserved');
  const updated = snapshot(root);
  const repeated = run(root, []);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.deepEqual(JSON.parse(repeated.stdout).changes, []);
  assert.deepEqual(snapshot(root), updated);
});

test('online update derives a protected web-only manifest from a verified published artifact and is idempotent', async (t) => {
  const root = fixture(t);
  const artifact = await publishedArtifact();
  const before = snapshot(root);
  const plan = await online(root, ['--dry-run'], artifact);
  assert.equal(plan.deployment.artifactRequired, false);
  assert.equal(plan.deployment.provenanceReady, true);
  assert.deepEqual(snapshot(root), before);
  const applied = await online(root, ['--expect-plan', plan.planId], artifact);
  assert.equal(applied.applied, true);
  const manifest = json(root, 'deployment.json');
  assert.deepEqual(manifest.cliArtifact, { ...artifact });
  assert.equal(manifest.identity, 'none');
  assert.deepEqual(manifest.capabilities, []);
  assert.equal(manifest.intent.visibility, 'protected');
  assert.equal(manifest.intent.environment, 'preview');
  assert.deepEqual((await online(root, [], artifact)).changes, []);
  await assert.rejects(planStackUpdate(root, { ...artifact }), /verified published artifact/);
});

test('stale plan, customized launcher and customized pnpm policy preserve every source byte', (t) => {
  const root = fixture(t);
  const plan = JSON.parse(run(root, ['--dry-run']).stdout);
  const pkg = json(root, 'apps/web/package.json');
  pkg.scripts.dev = 'node customer-dev.mjs';
  writeJson(root, 'apps/web/package.json', pkg);
  writeFileSync(
    path.join(root, 'pnpm-workspace.yaml'),
    'packages: ["apps/*"]\nallowBuilds: { unreviewed: true }\n',
  );
  const before = snapshot(root);
  const stale = run(root, ['--expect-plan', plan.planId]);
  assert.notEqual(stale.status, 0);
  assert.match(stale.stderr, /plan changed/);
  const result = run(root, []);
  assert.notEqual(result.status, 0);
  assert.equal(JSON.parse(result.stdout).conflicts.length, 2);
  assert.equal(JSON.parse(result.stdout).applied, false);
  assert.deepEqual(snapshot(root), before);
});

test('symlinked owned configuration is rejected without touching external files', (t) => {
  const root = fixture(t);
  const external = path.join(path.dirname(root), 'external.yaml');
  writeFileSync(external, 'onlyBuiltDependencies: ["esbuild","workerd"]\n');
  rmSync(path.join(root, 'pnpm-workspace.yaml'));
  symlinkSync(external, path.join(root, 'pnpm-workspace.yaml'));
  const before = readFileSync(external, 'utf8');
  const result = run(root, []);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /symlink/);
  assert.equal(readFileSync(external, 'utf8'), before);
  assert.equal(json(root, 'anhedral.json').composition.generatorVersion, '0.18.0');
});

test('editor detects post-plan changes and update transactions reject recovery under the lock', async (t) => {
  const root = fixture(t);
  const { editor } = await planStackUpdate(root);
  const pkg = json(root, 'apps/web/package.json');
  pkg.scripts.dev = 'node changed-after-plan.mjs';
  writeJson(root, 'apps/web/package.json', pkg);
  assert.throws(() => editor.verify(), /Source changed/);
  const journal = path.join(root, '.anhedral-journal.json');
  writeFileSync(journal, 'private interrupted evidence');
  const before = snapshot(root);
  const preview = run(root, ['--dry-run']);
  assert.notEqual(preview.status, 0);
  assert.match(preview.stdout, /RECOVERY_REQUIRED/);
  await assert.rejects(
    runStagedTransaction(root, {
      recover: false,
      commitPaths: ['new.txt'],
      build: async () => {
        assert.fail('must not build or recover');
      },
    }),
    /requires recovery/,
  );
  assert.deepEqual(snapshot(root), before);
});

test('newer source is never downgraded and private changed configuration is never printed', (t) => {
  const root = fixture(t);
  const configuration = json(root, 'anhedral.json');
  configuration.composition.generatorVersion = '999.0.0';
  writeJson(root, 'anhedral.json', configuration);
  assert.match(run(root, ['--dry-run']).stdout, /NEWER_SOURCE/);
  configuration.composition.generatorVersion = '0.18.0';
  writeJson(root, 'anhedral.json', configuration);
  const pkg = json(root, 'apps/web/package.json');
  pkg[['PRIVATE', 'API', 'KEY'].join('_')] = 'private-config-value-never-print';
  writeFileSync(path.join(root, 'apps/web/package.json'), JSON.stringify(pkg));
  const result = run(root, ['--dry-run']);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout.includes('private-config-value-never-print'), false);
  assert.match(result.stdout, /SENSITIVE_PREVIEW/);
  assert.deepEqual(JSON.parse(result.stdout).changes, []);
  delete pkg[['PRIVATE', 'API', 'KEY'].join('_')];
  pkg.DATABASE_URL =
    'postgresql://fixture:' + 'private-config-value-never-print' + '@example.invalid/local';
  writeFileSync(path.join(root, 'apps/web/package.json'), JSON.stringify(pkg));
  const database = run(root, ['--dry-run']);
  assert.match(database.stdout, /SENSITIVE_PREVIEW/);
  assert.equal(database.stdout.includes('private-config-value-never-print'), false);
});

test('preview replacement hunks reproduce exact bytes including insertion and trailing newlines', (t) => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-update-diff-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [before, after] of [
    ['first\n', 'first\nsecond\n'],
    ['first', 'first\n'],
    ['first\n', 'first'],
    ['one\ntwo\nthree\n', 'new\ntwo\nthree\n'],
  ]) {
    writeFileSync(path.join(root, 'owned.txt'), before);
    const patch = path.join(root, 'change.patch');
    writeFileSync(patch, updateDiff('owned.txt', before, after));
    const applied = spawnSync('git', ['apply', '--unidiff-zero', patch], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(applied.status, 0, applied.stderr);
    assert.equal(read(root, 'owned.txt'), after);
  }
});

test('canonical CSS URL adapter upgrades inside an authored root without rewriting application markup', (t) => {
  const root = fixture(t);
  const file = path.join(root, 'apps/web/src/routes/__root.tsx');
  const authored = readFileSync(file, 'utf8')
    .replace("import '../styles.css';", "import styles from '../styles.css?url';")
    .replace('    ],\n  }),', "    ],\n    links: [{ rel: 'stylesheet', href: styles }],\n  }),")
    .replace('Anhedral web application', 'Authored customer description')
    .replace('<html lang="en">', '<html lang="en" className="authored-dark">');
  writeFileSync(file, authored);
  const expected = authored
    .replace("import styles from '../styles.css?url';", "import '../styles.css';")
    .replace("    links: [{ rel: 'stylesheet', href: styles }],\n", '');
  const result = run(root, []);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(file, 'utf8'), expected);
  assert.equal(
    json(root, 'anhedral.json').capabilities.managedFiles['apps/web/src/routes/__root.tsx'],
    undefined,
  );
});

test('additional stylesheet URL uses fail closed and preserve the authored root', (t) => {
  const root = fixture(t);
  const file = path.join(root, 'apps/web/src/routes/__root.tsx');
  const authored =
    readFileSync(file, 'utf8')
      .replace("import '../styles.css';", "import styles from '../styles.css?url';")
      .replace(
        '    ],\n  }),',
        "    ],\n    links: [{ rel: 'stylesheet', href: styles }],\n  }),",
      ) + '\nexport const customerStyles = styles;\n';
  writeFileSync(file, authored);
  const before = snapshot(root);
  const result = run(root, []);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /additional uses/);
  assert.deepEqual(snapshot(root), before);
});

test('existing deployment intent is preserved while only verified artifact provenance changes', async (t) => {
  const root = fixture(t);
  const artifact = await publishedArtifact();
  const manifest = {
    contractVersion: 1,
    foundation: 'tanstack-start',
    capabilities: [],
    identity: 'none',
    cliArtifact: { ...artifact, version: '0.18.0', sourceRevision: 'b'.repeat(40) },
    intent: {
      contractVersion: 1,
      runtimeProfile: 'anhedral-stack',
      environment: 'production',
      visibility: 'public',
    },
  };
  writeJson(root, 'deployment.json', manifest);
  const result = await online(root, [], artifact);
  assert.equal(result.applied, true);
  assert.deepEqual(json(root, 'deployment.json').intent, manifest.intent);
  assert.deepEqual(json(root, 'deployment.json').cliArtifact, { ...artifact });
  const conflicting = {
    ...manifest,
    capabilities: ['hono', 'database-auth'],
    identity: 'better-auth-d1-v1',
  };
  writeJson(root, 'deployment.json', conflicting);
  const before = snapshot(root);
  const rejected = run(root, []);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stdout, /identity or capabilities disagree/);
  assert.deepEqual(snapshot(root), before);
});

test('human preview strips OSC and control bytes while JSON binds exact authored source', (t) => {
  const root = fixture(t);
  const file = path.join(root, 'apps/web/src/routes/__root.tsx');
  const control = '\u001b]52;c;untrusted-clipboard\u0007\u0001\rspoofed-terminal';
  const authored = readFileSync(file, 'utf8')
    .replace("import '../styles.css';", "import styles from '../styles.css?url';")
    .replace('    ],\n  }),', "    ],\n    links: [{ rel: 'stylesheet', href: styles }],\n  }),")
    .replace('Anhedral web application', `Authored ${control}`);
  writeFileSync(file, authored);
  const preview = run(root, ['--dry-run']);
  assert.equal(preview.status, 0, preview.stderr);
  assert.ok(JSON.parse(preview.stdout).changes.some((change) => change.diff.includes(control)));
  const human = spawnSync(
    process.execPath,
    [executable, 'stack', '--offline', '--dry-run', 'update', '--human'],
    { cwd: root, encoding: 'utf8', timeout: 30000 },
  );
  assert.equal(human.status, 0, human.stderr);
  assert.doesNotMatch(human.stdout, /[\u001b\u0007\u0001\r]/);
  assert.equal(readFileSync(file, 'utf8'), authored);
});

test('YAML anchor references cannot be broken by removing a build-policy definition', (t) => {
  const root = fixture(t);
  writeFileSync(
    path.join(root, 'pnpm-workspace.yaml'),
    'packages: ["apps/*"]\nonlyBuiltDependencies: &reviewed ["esbuild", "workerd"]\ncustomerList: *reviewed\n',
  );
  const before = snapshot(root);
  const result = run(root, []);
  assert.notEqual(result.status, 0);
  assert.deepEqual(snapshot(root), before);
});

test('offline mode performs no artifact lookup and failed official resolution cannot mutate source', async (t) => {
  const root = fixture(t);
  const before = snapshot(root);
  const original = process.cwd();
  process.chdir(root);
  const output = {
    json: true,
    io: {
      out: { write() {} },
      err: { write() {} },
      stdinTTY: false,
      stdoutTTY: false,
      stderrTTY: false,
    },
  };
  try {
    await runStackUpdate(['update', '--offline', '--dry-run'], output, {
      resolveArtifact: async () => {
        assert.fail('offline must not resolve an artifact');
      },
    });
    await assert.rejects(
      runStackUpdate(['update', '--dry-run'], output, {
        resolveArtifact: async () => {
          throw new ArtifactUnavailableError();
        },
      }),
      (error) =>
        error.code === 'ARTIFACT_UNAVAILABLE' &&
        error.category === 'network' &&
        error.retryable === true,
    );
  } finally {
    process.chdir(original);
  }
  assert.deepEqual(snapshot(root), before);
});

test('oversized update previews fail closed without dumping or truncating project content', (t) => {
  const root = fixture(t);
  const pkg = json(root, 'apps/web/package.json');
  pkg.customerContent = 'x'.repeat(256 * 1024);
  writeJson(root, 'apps/web/package.json', pkg);
  const before = snapshot(root);
  const result = run(root, ['--dry-run']);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /PREVIEW_LIMIT/);
  assert.deepEqual(JSON.parse(result.stdout).changes, []);
  assert.ok(result.stdout.length < 10000);
  assert.deepEqual(snapshot(root), before);
});

for (const escaped of [false, true])
  test(`duplicate ${escaped ? 'escaped' : 'literal'} nested launcher keys cannot produce a successful partial update`, (t) => {
    const root = fixture(t);
    const file = path.join(root, 'apps/web/package.json');
    const old = 'node ../../scripts/oj.mjs dev . --host 0.0.0.0 --port 3000';
    const pkg = json(root, 'apps/web/package.json');
    pkg.scripts.dev = old;
    const key = escaped ? String.raw`\u0064ev` : 'dev';
    const replacement = [
      `"dev": ${JSON.stringify(old)},`,
      `    "${key}": ${JSON.stringify(old)}`,
    ].join('\n');
    const source = JSON.stringify(pkg, null, 2).replace(
      `"dev": ${JSON.stringify(old)}`,
      replacement,
    );
    writeFileSync(file, source);
    const before = snapshot(root);
    for (const args of [['--dry-run'], []]) {
      const result = run(root, args);
      assert.notEqual(result.status, 0);
      assert.match(result.stdout + result.stderr, /Duplicate JSON object keys/);
      assert.equal(JSON.parse(readFileSync(file, 'utf8')).scripts.dev, old);
      assert.deepEqual(snapshot(root), before);
    }
  });

test('update refreshes tracked adapters and preserves authored routes and edited adapter conflicts', (t) => {
  const root = fixture(t);
  const adapter = 'apps/web/src/lib/application.server.ts';
  const earlier = read(root, adapter) + '\n// Earlier generated adapter\n';
  writeFileSync(path.join(root, adapter), earlier);
  const configuration = json(root, 'anhedral.json');
  configuration.capabilities.managedFiles[adapter] = digest(earlier);
  writeJson(root, 'anhedral.json', configuration);
  const route = read(root, 'apps/web/src/routes/customer.tsx');
  const plan = JSON.parse(run(root, ['--dry-run']).stdout);
  assert.ok(plan.changes.some((entry) => entry.path === adapter));
  assert.ok(plan.nextAction.includes('--offline --expect-plan ' + plan.planId));
  writeFileSync(path.join(root, adapter), earlier + '// Local changes\n');
  const before = snapshot(root);
  assert.notEqual(run(root, ['--expect-plan', plan.planId]).status, 0);
  assert.deepEqual(snapshot(root), before);
  writeFileSync(path.join(root, adapter), earlier);
  assert.equal(run(root, ['--expect-plan', plan.planId]).status, 0);
  assert.equal(read(root, 'apps/web/src/routes/customer.tsx'), route);
  assert.deepEqual(JSON.parse(run(root, ['--dry-run']).stdout).changes, []);
});

test('add refuses a newer project before any source changes', (t) => {
  const root = fixture(t);
  const configuration = json(root, 'anhedral.json');
  configuration.composition.generatorVersion = '999.1.0';
  writeJson(root, 'anhedral.json', configuration);
  const before = snapshot(root);
  const result = spawnSync(
    process.execPath,
    [executable, 'add', 'backend', '--skip-install', '--catalog-pins'],
    {
      cwd: root,
      encoding: 'utf8',
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, /newer CLI/);
  assert.deepEqual(snapshot(root), before);
});

test('an unrelated release preserves local edits to an unchanged managed adapter', (t) => {
  const root = fixture(t);
  const adapter = 'apps/web/src/lib/application.server.ts';
  const edited = read(root, adapter) + '\n// App-specific diagnostics\n';
  writeFileSync(path.join(root, adapter), edited);
  const plan = JSON.parse(run(root, ['--dry-run']).stdout);
  assert.deepEqual(plan.conflicts, []);
  assert.ok(plan.changes.length);
  assert.ok(!plan.changes.some((change) => change.path === adapter));
  assert.equal(run(root, ['--expect-plan', plan.planId]).status, 0);
  assert.equal(read(root, adapter), edited);
  assert.notEqual(json(root, 'anhedral.json').capabilities.managedFiles[adapter], digest(edited));
});

function progressive(t, addition) {
  const base = mkdtempSync(path.join(tmpdir(), 'anhedral-update-pins-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = path.join(base, 'project');
  for (const args of [
    ['init', root, '--no-git'],
    ['--cwd', root, 'add', addition],
  ]) {
    const result = spawnSync(
      process.execPath,
      [executable, ...args, '--catalog-pins', '--skip-install', '--json'],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
  }
  return root;
}

test('progressive update reviews managed pins and the shared lock, preserves custom packages and fences apply', async (t) => {
  const root = progressive(t, 'cli');
  let newer = '15.3.0';
  const resolver = {
    registry: async (name) =>
      name === 'commander'
        ? [
            { version: newer },
            { version: '15.99.0-rc.1' },
            { version: '15.98.0', deprecated: 'retired' },
            { version: '15.97.0', engines: { node: '>=300' } },
            { version: '16.0.0' },
            ...registry(name),
          ]
        : registry(name),
  };
  const file = 'apps/cli/package.json';
  const custom = 'packages/custom/package.json';
  mkdirSync(path.dirname(path.join(root, custom)), { recursive: true });
  writeJson(root, custom, { name: '@company/custom', version: '1.0.0', private: true });
  const original = json(root, file);
  original.dependencies['@company/custom'] = 'workspace:*';
  original.devDependencies.typescript = '^5.9.3';
  original.scripts.test = 'node --test';
  writeJson(root, file, original);
  writeFileSync(path.join(root, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\nimporters: {}\n");
  const before = snapshot(root);
  const update = (...args) => online(root, args, undefined, resolver);
  const plan = await update('--dry-run');
  assert.deepEqual(snapshot(root), before);
  assert.equal(plan.dependencyResolution, 'registry');
  assert.deepEqual(
    plan.pins.find((row) => row.name === 'commander'),
    {
      file,
      section: 'dependencies',
      name: 'commander',
      current: original.dependencies.commander,
      proposed: newer,
    },
  );
  assert.ok(plan.pins.some((row) => row.name === 'pnpm' && row.current === row.proposed));
  assert.ok(!plan.pins.some((row) => row.name === 'typescript' || row.name === '@company/custom'));
  assert.equal(plan.lockfiles[0].status, 'updated');
  newer = '15.4.0';
  await assert.rejects(
    update('--expect-plan', plan.planId),
    (error) => error.code === 'UPDATE_PLAN_CHANGED',
  );
  assert.deepEqual(snapshot(root), before);
  newer = '15.3.0';
  const originalCustom = read(root, custom);
  writeFileSync(path.join(root, custom), originalCustom + '\n');
  await assert.rejects(
    update('--expect-plan', plan.planId),
    (error) => error.code === 'UPDATE_PLAN_CHANGED',
  );
  writeFileSync(path.join(root, custom), originalCustom);
  const applied = await update('--expect-plan', plan.planId);
  assert.equal(applied.applied, true);
  assert.equal(digest(read(root, 'pnpm-lock.yaml')), plan.lockfiles[0].afterDigest);
  assert.deepEqual(json(root, file), {
    ...original,
    dependencies: { ...original.dependencies, commander: newer },
  });
  const lock = parse(read(root, 'pnpm-lock.yaml'));
  assert.ok(lock.importers['packages/custom']);
  assert.equal(lock.importers['apps/cli'].dependencies.commander, newer);
  assert.deepEqual((await update('--dry-run')).changes, []);
  assert.ok(!existsSync(path.join(root, 'node_modules')));
});

test('failed lockfile generation leaves pending source upgrades and dependency pins untouched', async (t) => {
  const root = fixture(t);
  const artifact = await publishedArtifact();
  const before = snapshot(root);
  await assert.rejects(
    online(root, [], artifact, {
      run() {
        throw Error('Package manager resolution failed');
      },
    }),
    /Package manager resolution failed/,
  );
  assert.deepEqual(snapshot(root), before);
});

test('Electron desktop update changes the npm runtime pin and preserves the authored renderer', async (t) => {
  const root = progressive(t, 'desktop');
  const file = 'apps/desktop/ui/main.tsx';
  const renderer = 'export const title = "My desktop app";\n';
  writeFileSync(path.join(root, file), renderer);
  const options = {
    registry: async (name) =>
      name === 'electron'
        ? [
            { version: '45.91.0-rc.1' },
            { version: '45.90.0', dependencies: { '@types/node': '^24.9.0' } },
            ...registry(name),
          ]
        : registry(name),
    crates: async () => assert.fail('Electron projects do not resolve crates'),
  };
  const plan = await online(root, ['--dry-run'], undefined, options);
  const pin = plan.pins.find((row) => row.name === 'electron');
  assert.equal(pin.current, catalog.CLIENT_DEPENDENCIES.electron);
  assert.equal(pin.proposed, '45.90.0');
  assert.deepEqual(
    plan.lockfiles.map((lock) => lock.path),
    ['pnpm-lock.yaml'],
  );
  await online(root, ['--expect-plan', plan.planId], undefined, options);
  assert.equal(json(root, 'apps/desktop/package.json').devDependencies.electron, '45.90.0');
  assert.equal(read(root, file), renderer);
});

test('existing Tauri desktop update keeps authored crate features and applies the Rust lock atomically with pnpm', async (t) => {
  const root = progressive(t, 'desktop');
  const file = 'apps/desktop/src-tauri/Cargo.toml';
  const rustLock = 'apps/desktop/src-tauri/Cargo.lock';
  // Model the previous release, including its native source and own manifest.
  rmSync(path.join(root, 'apps/desktop'), { recursive: true });
  mkdirSync(path.join(root, 'apps/desktop/src-tauri/src'), { recursive: true });
  mkdirSync(path.join(root, 'apps/desktop/ui'));
  writeJson(root, 'apps/desktop/package.json', {
    name: '@workspace/desktop',
    private: true,
    devDependencies: { '@tauri-apps/cli': '2.12.6', vite: '8.3.5' },
  });
  writeJson(root, 'apps/desktop/src-tauri/tauri.conf.json', { productName: 'project' });
  writeFileSync(path.join(root, 'apps/desktop/src-tauri/src/main.rs'), 'fn main() {}');
  writeFileSync(path.join(root, 'apps/desktop/ui/index.html'), '<main>Custom desktop</main>');
  const doctor = spawnSync(
    process.execPath,
    [executable, '--cwd', root, 'stack', 'doctor', '--json'],
    { encoding: 'utf8' },
  );
  assert.equal(doctor.status, 1); // Cargo.toml is still missing.
  assert.deepEqual(
    JSON.parse(doctor.stdout).additions.find((item) => item.id === 'desktop').missingFiles,
    [file],
  );
  const source =
    '[build-dependencies]\ntauri-build = "=2.7.6"\n[dependencies]\ntauri = { version = "=2.12.7", features = ["tray-icon"] }\n';
  writeFileSync(path.join(root, file), source);
  const before = snapshot(root);
  const wanted = source.replace('=2.12.7', '=2.12.8').replace('=2.7.6', '=2.7.7');
  let failCargo = false;
  const dependencies = {
    crates: async (name) => [{ version: name === 'tauri' ? '2.12.8' : '2.7.7' }],
    run(command, args, stage) {
      if (command === 'pnpm') return lockWorkspace(command, args, stage);
      assert.equal(command, 'cargo');
      assert.deepEqual(args, ['update', '--workspace', '--manifest-path', file]);
      assert.equal(read(stage, file), wanted);
      if (failCargo) throw Error('Cargo could not resolve this workspace');
      writeFileSync(path.join(stage, rustLock), 'version = 4\n');
    },
  };
  const update = (...args) => online(root, args, undefined, dependencies);
  const plan = await update('--dry-run');
  assert.ok(plan.pins.some((pin) => pin.name === '@tauri-apps/cli'));
  assert.ok(!plan.pins.some((pin) => pin.name === 'electron'));
  assert.equal(
    plan.pins.filter((row) => row.file === file && row.current !== row.proposed).length,
    2,
  );
  assert.deepEqual(
    plan.lockfiles.map((lock) => [lock.path, lock.status]),
    [
      [rustLock, 'created'],
      ['pnpm-lock.yaml', 'created'],
    ],
  );
  assert.deepEqual(snapshot(root), before);
  failCargo = true;
  await assert.rejects(update('--expect-plan', plan.planId), /Cargo could not resolve/);
  assert.deepEqual(snapshot(root), before);
  failCargo = false;
  await update('--expect-plan', plan.planId);
  assert.equal(read(root, file), wanted);
  assert.equal(read(root, rustLock), 'version = 4\n');
  assert.deepEqual((await update('--dry-run')).changes, []);
});

test('a custom pnpm hook cannot be executed or silently omitted from a reviewed lockfile', async (t) => {
  const root = progressive(t, 'cli');
  writeFileSync(path.join(root, '.pnpmfile.cjs'), "throw Error('ran project hook');\n");
  const before = snapshot(root);
  await assert.rejects(
    online(root, ['--dry-run']),
    /pnpm hook that can change the dependency graph/,
  );
  assert.deepEqual(snapshot(root), before);
  writeFileSync(path.join(root, '.npmrc'), 'ignore-pnpmfile=true\n');
  const preview = await online(root, ['--dry-run']);
  assert.equal(preview.lockfiles[0].status, 'created');
});
