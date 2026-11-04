import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as sdk from '../dist/index.js';

function generated(t) {
  const base = mkdtempSync(path.join(tmpdir(), 'anhedral-oj-source-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = path.join(base, 'app');
  const result = spawnSync(
    process.execPath,
    ['dist/bin.js', 'init', root, '--skip-install', '--no-git', '--json'],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  return root;
}
test('the SDK exposes one foundation and removes the legacy scaffold API', () => {
  assert.equal(typeof sdk.scaffoldAnhedralStack, 'function');
  for (const name of [
    'scaffoldStandardProject',
    'parseStandardOptions',
    'STANDARD_PRODUCTS',
    'STANDARD_USAGE',
  ])
    assert.equal(name in sdk, false, name);
});
test('generated development/build invoke only pinned OJ and leave backend absent', (t) => {
  const root = generated(t);
  const web = JSON.parse(readFileSync(path.join(root, 'apps/web/package.json'), 'utf8'));
  assert.match(web.scripts.dev, /scripts\/oj\.mjs dev/);
  assert.match(web.scripts.build, /scripts\/oj\.mjs build/);
  assert.doesNotMatch(web.scripts.dev + web.scripts.build, /(?:^|\s)(?:vite|next)\s/);
  const pin = JSON.parse(readFileSync(path.join(root, 'scripts/oj-runtime.json'), 'utf8'));
  assert.equal(pin.version, '0.4.0');
  assert.ok(
    Object.values(pin.targets).every(
      (x) => /^[a-f0-9]{64}$/.test(x.archiveSha256) && /^[a-f0-9]{64}$/.test(x.binarySha256),
    ),
  );
  assert.match(readFileSync(path.join(root, '.gitignore'), 'utf8'), /\.oj-cache\//);
  assert.match(readFileSync(path.join(root, 'scripts/OJ.LICENSE'), 'utf8'), /MIT License/);
});
test('a modified cached OJ executable fails before any download or fallback launch', (t) => {
  const root = generated(t);
  const pin = JSON.parse(readFileSync(path.join(root, 'scripts/oj-runtime.json'), 'utf8'));
  const target = `${process.platform}-${process.arch}`;
  if (!pin.targets[target]) return;
  const cache = path.join(root, 'node_modules/.cache/anhedral-oj', pin.version, target);
  mkdirSync(cache, { recursive: true });
  writeFileSync(path.join(cache, 'oj'), 'altered');
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/oj.mjs'), '--version'], {
    encoding: 'utf8',
    timeout: 3000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /cached OJ runtime failed integrity/);
  assert.equal(readFileSync(path.join(cache, 'oj'), 'utf8'), 'altered');
});
