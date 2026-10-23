import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  STANDARD_PRODUCTS,
  STACK_REGISTRY,
  STACK_ITEMS,
  getStackItem,
  parseStandardOptions,
  resolveStackRegistry,
} from '../dist/index.js';
test('the catalog contains only seven core components and two payment additions', () => {
  assert.deepEqual([...STANDARD_PRODUCTS].sort(), [
    'better-auth',
    'd1',
    'expo',
    'hono',
    'next',
    'r2',
    'revenuecat',
    'stripe',
    'styling',
  ]);
  for (const name of STANDARD_PRODUCTS) assert.ok(getStackItem(name).targets.length);
  for (const id of ['neon', 'clerk', 'resend', 'realtime', '__proto__'])
    assert.throws(() => getStackItem(id), /Unknown/);
  assert.equal(new Set(STACK_REGISTRY.items.map((i) => i.name)).size, STACK_REGISTRY.items.length);
});
test('all four supported selections resolve deterministically in dependency order', () => {
  for (const flags of [[], ['--stripe'], ['--revenuecat'], ['--stripe', '--revenuecat']]) {
    const registry = resolveStackRegistry(parseStandardOptions(['registry-test', ...flags]));
    assert.deepEqual(
      registry,
      resolveStackRegistry(parseStandardOptions(['registry-test', ...flags.toReversed()])),
    );
    const names = registry.items.map((i) => i.name);
    for (const item of registry.items)
      for (const dep of item.registryDependencies)
        assert.ok(names.indexOf(dep) < names.indexOf(item.name), item.name + ' -> ' + dep);
  }
});
test('inspection returns copies and cannot alter the frozen registry', () => {
  const item = getStackItem('d1');
  item.targets.push('accidental');
  assert.ok(!getStackItem('d1').targets.includes('accidental'));
  assert.throws(() => STACK_ITEMS.d1.targets.push('accidental'), TypeError);
});
