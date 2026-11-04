import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { readContractSnapshot } from '../scripts/deployment-contract-snapshot.mjs';
import * as contract from '../dist/contracts/deployment.js';
import * as transport from '../dist/contracts/cli-transport.js';
import { composeSourceProvenance } from '../dist/composition.js';
import { GENERATOR_VERSION } from '../dist/version.js';
import { CAPABILITY_IDS, CAPABILITIES } from '../dist/capability-catalog.js';
import {
  parseInitOptions as parseStandardOptions,
  scaffoldAnhedralStack as scaffoldStandardProject,
} from '../dist/index.js';
import { runCapabilityCommand } from '../dist/capability-command.js';
import {
  deploymentAcceptance,
  cliProjectsAcceptance,
} from './fixtures/deployment-contract/acceptance.mjs';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/deployment-contract/fixtures.json', import.meta.url)),
);
deploymentAcceptance(contract, fixture);
cliProjectsAcceptance(transport, fixture);

test('reviewed public snapshot verifies provenance without importing raw private source', () => {
  const snapshot = readContractSnapshot(process.cwd(), true);
  assert.equal(snapshot.manifest.owner, 'anhedral/platform-contracts/deployment');
  assert.equal(snapshot.manifest.license, 'Apache-2.0');
  assert.equal(snapshot.files.length, 7);
  assert.equal(contract.hostingPolicySchema, undefined);
  assert.equal(contract.hostingCompatibility, undefined);
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

test('source provenance requires canonical source and refuses implicit identity replacement', () => {
  assert.throws(() =>
    composeSourceProvenance(undefined, ['hono', 'database-auth'], ['hono', 'database-auth']),
  );
  const initial = {
    contractVersion: 2,
    foundation: 'tanstack-start',
    generatorVersion: GENERATOR_VERSION,
    identity: 'none',
    capabilities: {},
  };
  const composed = composeSourceProvenance(
    initial,
    ['hono', 'database-auth'],
    ['hono', 'database-auth'],
  );
  assert.equal(composed.identity, 'better-auth-d1-v1');
  assert.equal(composed.generatorVersion, GENERATOR_VERSION);
  assert.deepEqual(composed.capabilities, {
    hono: GENERATOR_VERSION,
    'database-auth': GENERATOR_VERSION,
  });
  assert.throws(() =>
    composeSourceProvenance(
      { ...composed, foundation: 'next-opennext' },
      ['hono', 'database-auth'],
      [],
    ),
  );
  assert.throws(() => composeSourceProvenance(composed, ['hono'], []), /disagrees/);
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
      contractVersion: 2,
      foundation: 'tanstack-start',
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
    await invoke(['backend', '--with-dependencies', '--dry-run']);
    assert.equal(readFileSync(file, 'utf8'), before);
    await invoke(['backend', '--with-dependencies']);
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

test('reviewed public candidate receipt accepts ready web admission without exporting private policies', () => {
  const receipt = {
    protocol: 1,
    planId: crypto.randomUUID(),
    planDigest: 'a'.repeat(64),
    candidateId: crypto.randomUUID(),
    sourceRevision: 'b'.repeat(64),
    state: 'ready',
    hostedAdmission: true,
    identityAction: 'preserve',
  };
  assert.deepEqual(transport.cliPreparationSchema.parse(receipt), receipt);
  assert.ok(
    transport.cliPreparationSchema.safeParse({ ...receipt, state: 'built', hostedAdmission: false })
      .success,
  );
  assert.equal(
    transport.cliPreparationSchema.safeParse({ ...receipt, state: 'published' }).success,
    false,
  );
  assert.equal(transport.cliBuildPolicySchema, undefined);
  assert.equal(transport.cliBuildEvidenceSchema, undefined);
  assert.equal(contract.hostingPolicySchema, undefined);
  assert.equal(contract.hostingCompatibility, undefined);
});
