import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import * as contract from '../dist/contracts/deployment.js';
import { composeSourceProvenance } from '../dist/composition.js';
import { GENERATOR_VERSION } from '../dist/version.js';
import { CAPABILITY_IDS, CAPABILITIES } from '../dist/capability-catalog.js';
import { parseStandardOptions, scaffoldStandardProject } from '../dist/standard.js';
import { runCapabilityCommand } from '../dist/capability-command.js';
import { deploymentAcceptance } from './fixtures/deployment-contract/acceptance.mjs';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/deployment-contract/fixtures.json', import.meta.url)),
);
deploymentAcceptance(contract, fixture);

test('contract import checks all snapshot bytes before writing and supports offline drift checks', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-contract-import-'));
  const artifact = path.join(root, 'artifact');
  const output = path.join(root, 'output');
  const rejected = path.join(root, 'rejected');
  const script = path.resolve('scripts/sync-deployment-contract.mjs');
  try {
    for (const directory of [artifact, output, rejected]) mkdirSync(directory);
    writeFileSync(
      path.join(artifact, 'manifest.json'),
      readFileSync('assets/contracts/deployment-provenance.json'),
    );
    for (const [name, file] of Object.entries({
      'deployment.ts': 'src/contracts/deployment.ts',
      'cli-transport.ts': 'src/contracts/cli-transport.ts',
      'source-profile.ts': 'src/contracts/source-profile.ts',
      'source-bundle.ts': 'src/contracts/source-bundle.ts',
      'fixtures.json': 'tests/fixtures/deployment-contract/fixtures.json',
      'acceptance.mjs': 'tests/fixtures/deployment-contract/acceptance.mjs',
    }))
      writeFileSync(path.join(artifact, name), readFileSync(file));
    const run = (cwd, ...args) =>
      spawnSync(process.execPath, [script, artifact, ...args], { cwd, encoding: 'utf8' });
    assert.equal(run(output).status, 0);
    assert.equal(run(output, '--check').status, 0);
    writeFileSync(path.join(output, 'src/contracts/deployment.ts'), 'drift');
    assert.notEqual(run(output, '--check').status, 0);
    writeFileSync(path.join(artifact, 'acceptance.mjs'), 'tampered');
    assert.notEqual(run(rejected).status, 0);
    assert.deepEqual(readdirSync(rejected), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('portable contract snapshot matches its exact provenance and the CLI capability catalog', () => {
  const provenance = JSON.parse(readFileSync('assets/contracts/deployment-provenance.json'));
  for (const [name, file] of Object.entries({
    'deployment.ts': 'src/contracts/deployment.ts',
    'cli-transport.ts': 'src/contracts/cli-transport.ts',
    'source-profile.ts': 'src/contracts/source-profile.ts',
    'source-bundle.ts': 'src/contracts/source-bundle.ts',
    'fixtures.json': 'tests/fixtures/deployment-contract/fixtures.json',
    'acceptance.mjs': 'tests/fixtures/deployment-contract/acceptance.mjs',
  }))
    assert.equal(
      createHash('sha256').update(readFileSync(file)).digest('hex'),
      provenance.files[name],
    );
  assert.deepEqual(contract.deploymentCapabilitySchema.options, CAPABILITY_IDS);
  // Every existing prerequisite must also be enforced at the transport boundary.
  for (const id of CAPABILITY_IDS) {
    for (const parent of CAPABILITIES[id].requires) {
      const capabilities = CAPABILITY_IDS.filter((candidate) => candidate !== parent);
      assert.equal(
        contract.deploymentManifestSchema.safeParse({ ...fixture.manifest, capabilities }).success,
        false,
        `${id} requires ${parent}`,
      );
    }
  }
});

test('source provenance preserves legacy unknowns and refuses implicit identity replacement', () => {
  const legacy = composeSourceProvenance(undefined, ['hono', 'database-auth', 'r2'], ['r2']);
  assert.equal(legacy.generatorVersion, null);
  assert.deepEqual(legacy.capabilities, {
    hono: null,
    'database-auth': null,
    r2: GENERATOR_VERSION,
  });
  assert.equal(legacy.identity, 'better-auth-d1-v1');
  assert.throws(
    () =>
      composeSourceProvenance(
        { ...legacy, identity: 'platform-application-services-v1' },
        ['hono', 'database-auth', 'r2', 'stripe'],
        ['stripe'],
      ),
    /Preserve existing application identity/,
  );
  assert.throws(() => composeSourceProvenance(legacy, ['hono'], []), /disagrees/);
});

test('generated source records composition transactionally without changing identity configuration', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-hosting-contract-'));
  const app = path.join(root, 'app');
  const offline = () => {
    throw Error('Network forbidden in composition fixture');
  };
  const beforeCwd = process.cwd();
  try {
    await scaffoldStandardProject(
      parseStandardOptions([app, '--skip-install', '--no-git']),
      offline,
      { quiet: true },
    );
    const file = path.join(app, 'anhedral.json');
    const initial = JSON.parse(readFileSync(file));
    assert.deepEqual(initial.composition, {
      contractVersion: 1,
      foundation: 'next-opennext',
      generatorVersion: GENERATOR_VERSION,
      identity: 'none',
      capabilities: {},
    });
    initial.customerSetting = { preserve: true };
    writeFileSync(file, JSON.stringify(initial, null, 2) + '\n');
    process.chdir(app);
    const invoke = (args) =>
      runCapabilityCommand('add', [...args, '--skip-install'], { quiet: true }, offline);
    const before = readFileSync(file, 'utf8');
    await invoke(['database-auth', '--with-dependencies', '--dry-run']);
    assert.equal(readFileSync(file, 'utf8'), before);
    await invoke(['database-auth', '--with-dependencies']);
    const composed = JSON.parse(readFileSync(file));
    assert.deepEqual(composed.customerSetting, { preserve: true });
    assert.deepEqual(composed.composition.capabilities, {
      hono: GENERATOR_VERSION,
      'database-auth': GENERATOR_VERSION,
    });
    assert.equal(composed.composition.identity, 'better-auth-d1-v1');
    const auth = readFileSync('apps/api/src/auth.ts', 'utf8');
    assert.match(auth, /PUBLIC_APP_URL/);
    assert.match(readFileSync('apps/api/src/auth-features.ts', 'utf8'), /emailPassword: false/);
    await invoke(['r2']);
    assert.equal(readFileSync('apps/api/src/auth.ts', 'utf8'), auth);
    const repeated = readFileSync(file, 'utf8');
    await invoke(['r2']);
    assert.equal(readFileSync(file, 'utf8'), repeated);
    const invalid = JSON.parse(repeated);
    invalid.composition.identity = 'platform-application-services-v1';
    writeFileSync(file, JSON.stringify(invalid));
    await assert.rejects(invoke(['stripe']), /Preserve existing application identity/);
    assert.equal(readFileSync(file, 'utf8'), JSON.stringify(invalid));
  } finally {
    process.chdir(beforeCwd);
    rmSync(root, { recursive: true, force: true });
  }
});
