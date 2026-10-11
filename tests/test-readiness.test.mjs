import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createSetupPlan } from '../dist/capabilities.js';
import { parseStandardOptions } from '../dist/standard.js';
import { inspectProject, validateSetupPlan } from '../dist/readiness.js';
const root = mkdtempSync(path.join(tmpdir(), 'anhedral-readiness-'));
const write = (file, value) =>
  writeFileSync(path.join(root, file), typeof value === 'string' ? value : JSON.stringify(value));
const options = parseStandardOptions('new', [root]);
const plan = createSetupPlan(options);
try {
  assert.equal(inspectProject(root).localReady, false);
  assert.deepEqual(readdirSync(root), []);
  validateSetupPlan(plan);
  const { setup, ...incomplete } = plan;
  assert.throws(() => validateSetupPlan(incomplete), /Missing setup requirements/);
  assert.throws(
    () => validateSetupPlan({ ...plan, setup: { ...setup, capabilities: [] } }),
    /Invalid capability requirements/,
  );
  assert.throws(
    () => validateSetupPlan({ ...plan, products: ['unknown'] }),
    /Unknown setup capabilities/,
  );
  write('anhedral.setup.json', plan);
  write('anhedral.standard.json', {
    schemaVersion: 1,
    products: options.products,
    hosting: options.hosting,
  });
  write('pnpm-lock.yaml', 'lockfileVersion: "9.0"\n');
  write('pnpm-workspace.yaml', 'packages: []\n');
  for (const item of plan.registry.items)
    for (const target of item.targets) {
      if (target.startsWith('apps/') || target.startsWith('packages/')) {
        mkdirSync(path.join(root, target), { recursive: true });
        writeFileSync(
          path.join(root, target, 'package.json'),
          JSON.stringify({ name: `@workspace/${target.split('/').at(-1)}` }),
        );
      } else if (!['pnpm-workspace.yaml'].includes(target)) write(target, {});
    }
  write('anhedral.registry.json', {
    ...plan.registry,
    status: 'scaffolded',
    resourcesProvisioned: false,
    workspaces: [],
  });
  const before = readdirSync(root)
    .filter((file) => !['apps', 'packages'].includes(file))
    .map((file) => [file, readFileSync(path.join(root, file), 'utf8')]);
  const result = inspectProject(root);
  assert.equal(result.localReady, true);
  assert.equal(result.providerVerification, 'unverified');
  assert.equal(result.productionReady, false);
  assert.deepEqual(
    readdirSync(root)
      .filter((file) => !['apps', 'packages'].includes(file))
      .map((file) => [file, readFileSync(path.join(root, file), 'utf8')]),
    before,
  );
  const receipt = JSON.parse(readFileSync(path.join(root, 'anhedral.registry.json'), 'utf8'));
  write('anhedral.registry.json', { ...receipt, cliVersion: '0.0.1' });
  assert.equal(
    inspectProject(root).checks.find((check) => check.id === 'stack-registry').ok,
    false,
  );
  write('anhedral.registry.json', receipt);
  rmSync(path.join(root, 'packages/ui'), { recursive: true });
  assert.equal(
    inspectProject(root).checks.find((check) => check.id === 'stack-registry').ok,
    false,
  );
  mkdirSync(path.join(root, 'packages/ui'));
  write('packages/ui/package.json', {
    name: '@workspace/ui',
    dependencies: { '@workspace/missing': 'workspace:*' },
  });
  assert.equal(
    inspectProject(root).checks.find((check) => check.id === 'workspace-graph').ok,
    false,
  );
  write('packages/ui/package.json', { name: '@workspace/ui' });
  assert.equal(inspectProject(root).localReady, true);
  write('anhedral.setup.json', { ...plan, cliVersion: '0.0.1' });
  assert.equal(inspectProject(root).localReady, false);
  write('anhedral.setup.json', plan);
  write('anhedral.standard.json', {
    schemaVersion: 1,
    products: options.products,
    hosting: 'vercel',
  });
  assert.equal(inspectProject(root).localReady, false);
} finally {
  rmSync(root, { recursive: true, force: true });
}
