import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getStackItem, parseStandardOptions, scaffoldStandardProject } from '../dist/index.js';
import { runAdd } from '../dist/registry/commands.js';

// Registry viewers and source previews must describe the same files init actually creates.
test('public core catalog targets match the generated workspace', async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-catalog-'));
  const root = path.join(temporary, 'app');
  try {
    const options = parseStandardOptions([root, '--skip-install', '--no-git', '--json']);
    await scaffoldStandardProject(options, () => assert.fail('Generation must be offline'), {
      quiet: true,
    });
    for (const product of options.products) {
      const item = getStackItem(product);
      for (const target of item.targets)
        assert.ok(existsSync(path.join(root, target)), `${product}: missing ${target}`);
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('add suggests only supported payment additions', async () => {
  await assert.rejects(runAdd(['expp']), (error) => {
    assert.doesNotMatch(error.message, /Did you mean expo/);
    assert.match(error.nextAction, /optional additions are stripe and revenuecat/);
    return true;
  });
  await assert.rejects(runAdd(['strip']), /Did you mean stripe/);
});
