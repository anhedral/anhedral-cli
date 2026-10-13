import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAPABILITY_CONTRACT, formatCapabilityContract } from '../dist/capability-contract.js';
import { PROVIDER_DEFINITIONS } from '../dist/providers/definitions.js';
import { STANDARD_PRODUCTS, STACK_REGISTRY } from '../dist/stack-registry.js';
import { runRegistry } from '../dist/registry/commands.js';
import { commandHelp } from '../dist/registry/usage.js';

test('capability products remain exactly aligned with bundled registry definitions', () => {
  assert.deepEqual(
    CAPABILITY_CONTRACT.products.map((product) => product.id),
    STANDARD_PRODUCTS,
  );
  const registry = new Map(STACK_REGISTRY.items.map((item) => [item.name, item]));
  for (const product of CAPABILITY_CONTRACT.products) {
    const item = registry.get(product.id);
    assert.equal(product.description, item.description);
    assert.deepEqual(product.targets, item.targets);
    assert.deepEqual(product.registryDependencies, item.registryDependencies);
    assert.deepEqual(product.selection, item.selection);
    assert.equal(product.scaffold.support, 'implemented');
    assert.equal(product.scaffold.evidence, 'local-contract');
    for (const dependency of product.registryDependencies) assert.ok(registry.has(dependency));
  }
});
test('provider capability scope is sourced from the shared provider definitions', () => {
  assert.deepEqual(
    CAPABILITY_CONTRACT.providers.map((provider) => provider.id),
    Object.keys(PROVIDER_DEFINITIONS),
  );
  for (const provider of CAPABILITY_CONTRACT.providers) {
    assert.deepEqual(provider.resources, PROVIDER_DEFINITIONS[provider.id].resources);
    assert.deepEqual(provider.ownerSteps, PROVIDER_DEFINITIONS[provider.id].ownerSteps);
    assert.equal(provider.managementCredential, PROVIDER_DEFINITIONS[provider.id].credential);
    assert.equal(provider.provisioning.evidence, 'local-contract');
    assert.equal(provider.liveAcceptance, 'unverified');
  }
});
test('distribution and plugin limitations cannot be mistaken for verified delivery', () => {
  for (const id of ['electron', 'wxt']) {
    const product = CAPABILITY_CONTRACT.products.find((product) => product.id === id);
    assert.equal(product.delivery.support, 'scaffold-only');
    assert.match(product.delivery.scope, /distribution is unavailable/);
  }
  const expo = CAPABILITY_CONTRACT.products.find((product) => product.id === 'expo');
  assert.match(expo.delivery.scope, /artifact link/);
  assert.ok(expo.limits.some((limit) => limit.includes('No store submission')));
  for (const id of [
    'live-analytics',
    'live-database-reader',
    'schedule-execution',
    'live-provider-health',
  ]) {
    const capability = CAPABILITY_CONTRACT.plugin.find((item) => item.id === id).capability;
    assert.equal(capability.support, 'unsupported');
    assert.equal(capability.evidence, 'unverified');
  }
  assert.equal(CAPABILITY_CONTRACT.liveAcceptance, 'unverified');
  assert.ok(CAPABILITY_CONTRACT.hosts.every((host) => host.liveAcceptance === 'unverified'));
});
test('Cloudflare provisioning scope distinguishes resources from deployment bindings', () => {
  for (const id of [
    'd1',
    'r2',
    'kv',
    'queues',
    'basin',
    'realtime',
    'cron',
    'workflows',
    'workers-ai',
  ]) {
    const capability = CAPABILITY_CONTRACT.products.find((product) => product.id === id);
    assert.equal(capability.provisioning.support, 'implemented');
    assert.equal(capability.provisioning.evidence, 'local-contract');
  }
  assert.ok(
    CAPABILITY_CONTRACT.products
      .find((product) => product.id === 'basin')
      .limits.some((limit) => limit.includes('sinks are outside')),
  );
});
test('capability command is offline metadata with consistent human, JSON, quiet, and help output', async () => {
  const logs = [];
  const original = console.log;
  try {
    console.log = (value) => logs.push(value);
    await runRegistry(['capabilities'], false);
    assert.equal(logs.pop(), formatCapabilityContract());
    await runRegistry(['capabilities'], true);
    const result = JSON.parse(logs.pop());
    assert.deepEqual(result, CAPABILITY_CONTRACT);
    assert.equal(result.mutation, false);
    await runRegistry(['capabilities'], false, { quiet: true });
    assert.deepEqual(logs, []);
    await runRegistry(['capabilities'], true, { quiet: true, json: true });
    assert.equal(JSON.parse(logs.pop()).liveAcceptance, 'unverified');
    await assert.rejects(runRegistry(['capabilities', 'foreign'], false), /registry capabilities/);
    assert.match(commandHelp('registry'), /registry capabilities/);
  } finally {
    console.log = original;
  }
});
test('capability inspection never includes environment credential values', () => {
  const token = 'fixture-private-management-value';
  const previous = process.env.OPENAI_ADMIN_KEY;
  try {
    process.env.OPENAI_ADMIN_KEY = token;
    assert.equal(JSON.stringify(CAPABILITY_CONTRACT).includes(token), false);
    assert.equal(formatCapabilityContract().includes(token), false);
  } finally {
    if (previous === undefined) delete process.env.OPENAI_ADMIN_KEY;
    else process.env.OPENAI_ADMIN_KEY = previous;
  }
});
