import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findUncataloguedDependencyPins } from '../scripts/dependency-policy.mjs';

test('owned dependency policy catches quoted and unquoted pins, tags and recipe maps', () => {
  for (const source of [
    `const manifest = {devDependencies: {eslint: '10.0.3'}}`,
    `const manifest = {dependencies: {'@provider/sdk': '^1.0.0'}}`,
    `package.dependencies = {provider: 'latest'}`,
    `sharedPackage(root, 'service', source, {provider: '1.2.3'})`,
    `worker(root, 'api', config, source, {provider: '1.2.3'})`,
    `packageSource('service', source, {provider: '1.2.3'})`,
  ])
    assert.equal(findUncataloguedDependencyPins(source, 'fixture.ts').length, 1, source);
  assert.deepEqual(
    findUncataloguedDependencyPins(
      `const manifest = {
    version: '0.1.0',
    dependencies: {...DEPENDENCIES, provider: STACK_DEPENDENCIES.provider, '@workspace/shared': 'workspace:*'},
    devDependencies: {eslint: NATIVE_ESLINT_VERSION},
  }`,
      'fixture.ts',
    ),
    [],
  );
});
