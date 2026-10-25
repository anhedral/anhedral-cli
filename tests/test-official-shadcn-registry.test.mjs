import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  analyzeSource,
  loadOfficialRegistry,
  reviewedInputs,
  validateCoverage,
  registryChecklist,
  sha256,
  diffOfficialRegistry,
  nativeApiReport,
  validateApiPolicy,
  incompleteNativeItems,
} from '../scripts/shadcn-registry.mjs';
const inventory = loadOfficialRegistry();
const coverage = JSON.parse(readFileSync('assets/ui/official/coverage.json'));
test('full official registry snapshot retains every style, item, referenced file, and supporting resource', () => {
  assert.equal(inventory.schemaVersion, 1);
  assert.match(inventory.source.commit, /^[a-f0-9]{40}$/);
  const expected = ['base', 'radix', 'aria']
    .flatMap((base) =>
      ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'].map(
        (style) => base + '-' + style,
      ),
    )
    .concat(['default', 'new-york', 'new-york-v4'])
    .sort();
  assert.deepEqual(Object.keys(inventory.registries).sort(), expected);
  const keys = new Set();
  let count = 0;
  for (const [style, registry] of Object.entries(inventory.registries)) {
    assert.equal(registry.url, `https://ui.shadcn.com/r/styles/${style}/registry.json`);
    assert.match(registry.sha256, /^[a-f0-9]{64}$/);
    const names = new Set();
    for (const item of registry.items) {
      count++;
      assert.ok(!names.has(item.name));
      names.add(item.name);
      keys.add(item.type + '/' + item.name);
      for (const file of item.files ?? []) {
        assert.ok(
          inventory.sources[file.source],
          style + '/' + item.name + ' missing ' + file.path,
        );
        assert.match(inventory.sources[file.source].sha256, /^[a-f0-9]{64}$/);
      }
    }
  }
  assert.equal(count, 6437);
  assert.equal(keys.size, 616);
  assert.equal(Object.keys(inventory.sources).length, 2073);
  assert.equal(Object.keys(inventory.styleSheets).length, 8);
  for (const sheet of Object.values(inventory.styleSheets))
    assert.equal(sheet.sha256, sha256(sheet.content));
  for (const category of ['themes/', 'colors/', 'templates/', 'icons/'])
    assert.ok(
      Object.keys(inventory.auxiliary).some((name) => name.startsWith(category)),
      category,
    );
});
test('AST review discovers CVA options, examples and browser dependencies without executing upstream code', () => {
  const result = analyzeSource(
    `import {Button} from 'upstream'; const b=cva('',{variants:{size:{xs:'a',lg:'b'},variant:{outline:'c'}}}); export function Demo(){window.alert('x');return <form><Button size="xs" variant="outline" /></form>}`,
    'fixture.tsx',
  );
  assert.deepEqual(result.imports, ['upstream']);
  assert.deepEqual(result.functions, ['Demo']);
  assert.deepEqual(result.variants, { size: ['lg', 'xs'], variant: ['outline'] });
  assert.deepEqual(result.browser, ['<form>', 'window']);
});
test('coverage cannot inherit a complete status after source, dependencies, metadata or registry membership changes', () => {
  const key = 'registry:hook/use-mobile';
  const entry = {
    status: 'ported',
    reason: 'Native window subscription and cleanup tested.',
    nativeFiles: ['assets/ui/native/use-mobile.tsx'],
    tests: ['tests/native-ui/registry-support.test.tsx'],
    reviewedInputs: reviewedInputs(inventory, key),
  };
  const evidence = { schemaVersion: 1, items: { [key]: entry } };
  assert.doesNotThrow(() => validateCoverage(inventory, evidence));
  const changed = structuredClone(inventory),
    item = changed.registries['base-nova'].items.find((item) => item.name === 'use-mobile');
  changed.sources[item.files[0].source].sha256 = 'a'.repeat(64);
  assert.throws(() => validateCoverage(changed, evidence), /Upstream inputs changed/);
  const dependency = structuredClone(inventory);
  dependency.registries['base-nova'].items.find((item) => item.name === 'use-mobile').dependencies =
    ['changed-runtime'];
  assert.throws(() => validateCoverage(dependency, evidence), /Upstream inputs changed/);
  const missing = structuredClone(inventory);
  delete missing.registries['base-nova'];
  assert.throws(() => validateCoverage(missing, evidence), /Upstream inputs changed/);
  const unsafe = structuredClone(evidence);
  unsafe.items[key].nativeFiles = ['assets/../secret'];
  assert.throws(() => validateCoverage(inventory, unsafe), /unsafe/);
  assert.throws(
    () =>
      validateCoverage(inventory, { schemaVersion: 1, items: { 'registry:ui/invented': entry } }),
    /unknown/,
  );
});
test('whole-registry checklist reflects reviewed evidence and keeps unresolved items visible', () => {
  validateCoverage(inventory, coverage);
  const output = registryChecklist(inventory, coverage);
  assert.equal(readFileSync('docs/native-registry.md', 'utf8'), output);
  assert.match(output, /6437 style\/item entries/);
  assert.match(output, /\| dashboard-01 \| block \|/);
  assert.match(output, /\| font-inter \| font \|/);
  assert.match(output, /\| use-toast \| hook \|/);
  assert.equal(inventory.unresolvedDependencies.length, 7);
  assert.match(output, /Unresolved upstream registry references/);
  assert.match(output, /CSS styles, selectors, hover and focus-visible/);
});

test('sync diff propagates upstream file, style and dependency changes to native review', () => {
  const before = {
    source: { commit: 'before' },
    registries: {
      'base-nova': {
        items: [
          {
            name: 'button',
            type: 'registry:ui',
            files: [{ path: 'ui/button.tsx', source: 'button' }],
          },
          { name: 'recipe', type: 'registry:block', registryDependencies: ['button'], files: [] },
          { name: 'use-mobile', type: 'registry:hook', files: [] },
        ],
      },
    },
    sources: { button: { sha256: 'old' } },
    styleSheets: { 'style-nova.css': { sha256: 'old-style' } },
  };
  const file = structuredClone(before);
  file.source.commit = 'after';
  file.sources.button.sha256 = 'changed';
  assert.deepEqual(diffOfficialRegistry(before, file).changed, [
    'base-nova/button',
    'base-nova/recipe',
  ]);
  const style = structuredClone(before);
  style.styleSheets['style-nova.css'].sha256 = 'new-style';
  assert.deepEqual(diffOfficialRegistry(before, style).changed, [
    'base-nova/button',
    'base-nova/recipe',
  ]);
  const additions = structuredClone(before);
  additions.registries['base-nova'].items.push({
    name: 'new',
    type: 'registry:example',
    files: [],
  });
  assert.deepEqual(diffOfficialRegistry(before, additions).added, ['base-nova/new']);
  assert.deepEqual(diffOfficialRegistry(additions, before).removed, ['base-nova/new']);
});

test('the upstream fork, reviewed source pin and web CLI version have one provenance lock', () => {
  const lock = JSON.parse(readFileSync('assets/ui/UPSTREAM-LOCK.json'));
  assert.equal(lock.upstream.repository, inventory.source.repository);
  assert.equal(lock.reviewedCommit, inventory.source.commit);
  assert.equal(lock.mirror.repository, 'https://github.com/anhedral/shadcn-ui');
  assert.equal(lock.web.defaultStyle, 'base-nova');
  assert.match(
    readFileSync('src/dependencies.ts', 'utf8'),
    new RegExp("shadcn: '" + lock.web.cliVersion.replaceAll('.', '\\.') + "'"),
  );
});
test('API ledger records every source variant and invalidates even pending native items after upstream changes', () => {
  const native = JSON.parse(readFileSync('assets/ui/native/registry.json'));
  const report = nativeApiReport(inventory, native);
  assert.deepEqual(JSON.parse(readFileSync('assets/ui/official/native-api.json')), report);
  assert.equal(Object.keys(report).length, 65);
  assert.ok(report.button.upstreamVariants.size.includes('icon-xs'));
  const changed = structuredClone(inventory);
  const item = changed.registries['base-nova'].items.find((item) => item.name === 'button');
  changed.sources[item.files[0].source].exports.values.push('NewButtonPart');
  changed.sources[item.files[0].source].variants.size.push('upstream-size');
  const updated = nativeApiReport(changed, native);
  assert.ok(updated.button.missingValues.includes('NewButtonPart'));
  assert.ok(updated.button.upstreamVariants.size.includes('upstream-size'));
  assert.notDeepEqual(updated, report);
});
test('browser-only API classifications require a real upstream export and native alternative evidence', () => {
  const report = nativeApiReport(
    inventory,
    JSON.parse(readFileSync('assets/ui/native/registry.json')),
  );
  const policy = JSON.parse(readFileSync('assets/ui/official/api-policy.json'));
  assert.doesNotThrow(() => validateApiPolicy(report, policy));
  const invented = structuredClone(policy);
  invented.exports['button/invented'] = policy.exports['button/buttonVariants'];
  assert.throws(() => validateApiPolicy(report, invented), /Unknown or invalid/);
  const missing = structuredClone(policy);
  missing.exports['button/buttonVariants'].tests = [];
  assert.throws(() => validateApiPolicy(report, missing), /requires a native alternative/);
  const unsafe = structuredClone(policy);
  unsafe.exports['button/buttonVariants'].nativeFiles = ['../outside'];
  assert.throws(() => validateApiPolicy(report, unsafe), /Missing native alternative evidence/);
});
test('export presence and browser-only policy cannot promote incomplete items to complete native registry parity', () => {
  const pending = incompleteNativeItems(inventory, coverage);
  assert.equal(pending.length, 551);
  assert.ok(pending.includes('registry:block/dashboard-01'));
  assert.ok(pending.includes('registry:ui/button'));
  assert.ok(!pending.includes('registry:font/font-inter'));
  assert.ok(!pending.includes('registry:theme/theme-neutral'));
  assert.ok(!pending.includes('registry:hook/use-toast'));
  assert.ok(!pending.includes('registry:lib/utils'));
  assert.ok(!pending.includes('registry:hook/use-mobile'));
  assert.equal(incompleteNativeItems(inventory, { items: {} }).length, 616);
});

test('omitted registry companion imports are inventoried and invalidate native review transitively', () => {
  assert.deepEqual(inventory.unresolvedSourceImports, []);
  const origin = 'apps/v4/registry/new-york-v4/examples/form-next-demo.tsx';
  const companion = 'apps/v4/registry/new-york-v4/examples/form-next-demo-schema.ts';
  assert.ok(inventory.sources[origin].relativeSources.includes(companion));
  const before = reviewedInputs(inventory, 'registry:example/form-next-demo');
  const changed = structuredClone(inventory);
  changed.sources[companion].sha256 = '0'.repeat(64);
  assert.notDeepEqual(reviewedInputs(changed, 'registry:example/form-next-demo'), before);
  assert.deepEqual(
    reviewedInputs(changed, 'registry:example/form-rhf-input'),
    reviewedInputs(inventory, 'registry:example/form-rhf-input'),
  );
});
