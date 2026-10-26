import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { detectUiTargets, inspectUiTarget } from '../dist/ui-project.js';
import { resolveUiItems } from '../dist/ui-catalog.js';
import { runUiCommand } from '../dist/ui-command.js';

const temporary = () => mkdtempSync(path.join(tmpdir(), 'anhedral-ui-'));
function app(root, platform, configured = true) {
  mkdirSync(root, { recursive: true });
  const deps =
    platform === 'web'
      ? { next: '16.4.2' }
      : {
          expo: '57.0.8',
          nativewind: '^4.2.7',
          'class-variance-authority': '0.7.1',
          clsx: '2.1.1',
          'tailwind-merge': '3.3.1',
          'tailwindcss-animate': '1.0.7',
          '@rn-primitives/portal': '1.2.0',
        };
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ dependencies: deps }));
  if (configured)
    writeFileSync(
      path.join(root, 'components.json'),
      JSON.stringify({
        rsc: platform === 'web',
        aliases: { ui: '@/components/ui', utils: '@/lib/utils' },
        tailwind: { css: 'global.css' },
      }),
    );
  writeFileSync(path.join(root, 'global.css'), '/* consumer theme */');
  if (platform === 'native')
    writeFileSync(path.join(root, 'metro.config.js'), '/* consumer NativeWind configuration */');
}
async function inside(root, action) {
  const before = process.cwd();
  process.chdir(root);
  try {
    return await action();
  } finally {
    process.chdir(before);
  }
}

test('target detection requires an explicit selection when web and native coexist', () => {
  const root = temporary();
  try {
    app(path.join(root, 'apps/web'), 'web');
    app(path.join(root, 'apps/mobile'), 'native');
    assert.throws(() => detectUiTargets(root), /Multiple UI applications/);
    assert.equal(detectUiTargets(root, 'web')[0].platform, 'web');
    assert.equal(detectUiTargets(root, 'native')[0].platform, 'native');
    assert.equal(detectUiTargets(root, 'all').length, 2);
    assert.equal(inspectUiTarget(detectUiTargets(root, 'native')[0]).configurationReady, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('native prefers reviewed Anhedral extensions, otherwise RNR; web stays official', () => {
  const root = temporary();
  try {
    writeFileSync(
      path.join(root, 'registry.json'),
      JSON.stringify({ items: [{ name: 'button' }] }),
    );
    writeFileSync(path.join(root, 'button.json'), '{}');
    assert.equal(resolveUiItems(['button'], 'native', root)[0].source, 'anhedral');
    assert.equal(resolveUiItems(['button'], 'web', root)[0].item, 'button');
    assert.match(
      resolveUiItems(['card'], 'native', root)[0].item,
      /^https:\/\/reactnativereusables.com\/r\/nativewind\/card.json$/,
    );
    assert.throws(() => resolveUiItems(['../button'], 'web', root), /Invalid component/);
    assert.throws(
      () => resolveUiItems(['data-table'], 'native', root),
      /not yet available|Unknown/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('dry-run does not invoke upstream tooling or change consumer source', async () => {
  const root = temporary();
  try {
    app(root, 'web');
    const before = readdirSync(root).sort();
    await inside(root, () =>
      runUiCommand(['add', 'button', '--dry-run'], { quiet: true }, () => {
        throw Error('Unexpected installer');
      }),
    );
    assert.deepEqual(readdirSync(root).sort(), before);
    assert.equal(readFileSync(path.join(root, 'global.css'), 'utf8'), '/* consumer theme */');
    const result = spawnSync(
      process.execPath,
      [path.resolve('dist/bin.js'), '--cwd', root, 'ui', 'add', 'button', '--dry-run', '--json'],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).targets[0].items[0].source, 'shadcn');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--all preflights every target before either application is modified', async () => {
  const root = temporary();
  let calls = 0;
  try {
    app(path.join(root, 'apps/web'), 'web');
    const mobile = path.join(root, 'apps/mobile');
    app(mobile, 'native');
    writeFileSync(
      path.join(mobile, 'package.json'),
      JSON.stringify({ dependencies: { expo: '57.0.8' } }),
    );
    await assert.rejects(
      inside(root, () =>
        runUiCommand(['add', 'button', '--all'], { quiet: true }, () => {
          calls++;
          return '';
        }),
      ),
      /NativeWind/,
    );
    assert.equal(calls, 0);
    assert.equal(
      readFileSync(path.join(root, 'apps/web/global.css'), 'utf8'),
      '/* consumer theme */',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('native UI needs no backend and diff delegates without requesting overwrite', async () => {
  const root = temporary();
  const calls = [];
  try {
    app(root, 'native');
    await inside(root, () =>
      runUiCommand(['init'], { quiet: true }, () => {
        throw Error('Existing config must be preserved');
      }),
    );
    assert.equal(
      JSON.parse(readFileSync(path.join(root, '.anhedral-ui.json'), 'utf8')).platform,
      'native',
    );
    assert.ok(existsSync(path.join(root, 'ANHEDRAL_UI_LICENSES/LICENSE.react-native-reusables')));
    await inside(root, () =>
      runUiCommand(['diff', 'button'], { quiet: true }, (args) => {
        calls.push(args);
        return 'review';
      }),
    );
    assert.ok(calls[0].includes('--diff'));
    assert.ok(!calls[0].includes('--overwrite'));
    assert.equal(calls[0][1], 'https://reactnativereusables.com/r/nativewind/button.json');
    assert.equal(existsSync(path.join(root, 'apps/api')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
