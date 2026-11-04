import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const compiled =
  process.env.ANHEDRAL_UI_TEST_DIST ?? fileURLToPath(new URL('../dist/', import.meta.url));
const { runAnhedralUiCommand, runUiCommand } = await import(
  pathToFileURL(path.join(compiled, 'ui-command.js')).href
);
const executable = path.join(compiled, 'bin.js');
function workspace(
  t,
  {
    foundation = 'tanstack-start',
    stack = 'anhedral-stack',
    contractVersion = 2,
    dependency = '@tanstack/react-start',
    directory = 'apps/web',
  } = {},
) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-ui-stack-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = path.join(root, directory);
  mkdirSync(app, { recursive: true });
  writeFileSync(
    path.join(root, 'anhedral.json'),
    JSON.stringify({
      schemaVersion: 1,
      setup: { stack },
      composition: { contractVersion, foundation },
    }),
  );
  writeFileSync(
    path.join(app, 'package.json'),
    JSON.stringify({ dependencies: { [dependency]: '1.0.0' } }),
  );
  writeFileSync(
    path.join(app, 'components.json'),
    JSON.stringify({
      rsc: false,
      aliases: { ui: '@/components/ui', utils: '@/lib/utils' },
      tailwind: { css: 'src/styles.css' },
    }),
  );
  mkdirSync(path.join(app, 'src'), { recursive: true });
  writeFileSync(path.join(app, 'src/styles.css'), '/* retained consumer stylesheet */');
  return { root, app };
}
async function inside(root, action) {
  const previous = process.cwd();
  process.chdir(root);
  try {
    return await action();
  } finally {
    process.chdir(previous);
  }
}
async function capture(action) {
  const lines = [];
  const previous = console.log;
  console.log = (...values) => lines.push(values.join(' '));
  try {
    await action();
    return lines.join('\n');
  } finally {
    console.log = previous;
  }
}
function tree(root) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const file = path.join(entry.parentPath ?? entry.path, entry.name);
      return [path.relative(root, file), readFileSync(file, 'utf8')];
    })
    .sort(([a], [b]) => a.localeCompare(b));
}

test('public UI catalog is web-only and works outside any project', async (t) => {
  const { root } = workspace(t);
  rmSync(path.join(root, 'anhedral.json'));
  const output = await inside(root, () =>
    capture(() => runAnhedralUiCommand(['list'], { json: true })),
  );
  const result = JSON.parse(output);
  assert.equal(result.platform, 'web');
  assert.ok(result.components.length > 0);
  assert.equal('nativeStyling' in result, false);
  assert.ok(result.components.every((item) => item.web && !('native' in item)));
  const human = await capture(() => runAnhedralUiCommand(['list'], {}));
  assert.doesNotMatch(human, /\tnative:|RNR|React Native/);
});

for (const action of ['init', 'add', 'list', 'diff', 'doctor']) {
  for (const flag of ['--native', '--all']) {
    test(`public UI ${action} rejects ${flag} before writes or upstream execution`, async (t) => {
      const { root } = workspace(t);
      const before = tree(root);
      let calls = 0;
      await assert.rejects(
        inside(root, () =>
          runAnhedralUiCommand(
            [action, ...(['add', 'diff'].includes(action) ? ['button'] : []), flag],
            { quiet: true },
            () => {
              calls++;
              return '';
            },
          ),
        ),
        /Anhedral Stack web application only/,
      );
      assert.equal(calls, 0);
      assert.deepEqual(tree(root), before);
    });
  }
}

for (const dependency of ['next', 'expo']) {
  test(`public UI rejects ${dependency} applications without modifying source`, async (t) => {
    const { root } = workspace(t, { dependency });
    const before = tree(root);
    let calls = 0;
    await assert.rejects(
      inside(root, () =>
        runAnhedralUiCommand(['add', 'button'], { quiet: true }, () => {
          calls++;
          return '';
        }),
      ),
      /Anhedral Stack.*(?:foundation|application)/,
    );
    assert.equal(calls, 0);
    assert.deepEqual(tree(root), before);
  });
}

test('public UI requires the Anhedral Stack marker and canonical web path', async (t) => {
  for (const options of [{ foundation: 'next-opennext' }, { directory: 'apps/custom' }]) {
    const { root } = workspace(t, options);
    const before = tree(root);
    await assert.rejects(
      inside(root, () => runAnhedralUiCommand(['doctor'], { quiet: true })),
      /Select apps\/web in an Anhedral Stack project/,
    );
    assert.deepEqual(tree(root), before);
  }
});

test('public UI plans and installs official shadcn only inside the generated web target', async (t) => {
  const { root, app } = workspace(t);
  const before = tree(root);
  const calls = [];
  const run = (args, cwd) => {
    calls.push({ args, cwd });
    return 'fixture installer';
  };
  await inside(root, () =>
    runAnhedralUiCommand(['add', 'button', '--web', '--dry-run'], { quiet: true }, run),
  );
  assert.deepEqual(calls, []);
  assert.deepEqual(tree(root), before);
  await inside(app, () => runAnhedralUiCommand(['add', 'button'], { quiet: true }, run));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cwd, realpathSync(app));
  assert.deepEqual(calls[0].args, ['add', 'button', '--yes']);
  assert.equal(
    JSON.parse(readFileSync(path.join(app, '.anhedral-ui.json'), 'utf8')).platform,
    'web',
  );
  assert.equal(
    readFileSync(path.join(app, 'src/styles.css'), 'utf8'),
    '/* retained consumer stylesheet */',
  );
});

test('direct library calls reject native selectors and retired Next source', async (t) => {
  const { root } = workspace(t, { dependency: 'next' });
  await assert.rejects(
    inside(root, () => runUiCommand(['add', 'button', '--dry-run'], { quiet: true })),
    /Anhedral Stack.*application/,
  );
  await assert.rejects(runUiCommand(['list', '--native'], { json: true }), /web application only/);
});

test('CLI dispatch applies the public guard and does not fall back to legacy UI', (t) => {
  const { root } = workspace(t, { dependency: 'next' });
  const before = tree(root);
  const result = spawnSync(
    process.execPath,
    [executable, 'ui', 'add', 'button', '--dry-run', '--json', '--cwd', root],
    { encoding: 'utf8', timeout: 5000 },
  );
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /Anhedral Stack.*(?:foundation|application)/);
  assert.deepEqual(tree(root), before);
});

test('retired web-launch marker is rejected without metadata rewrites', async (t) => {
  const { root } = workspace(t, { stack: 'anhedral-web-launch' });
  const before = tree(root);
  await assert.rejects(
    inside(root, () => runAnhedralUiCommand(['doctor'], { json: true })),
    /Select apps\/web/,
  );
  assert.deepEqual(tree(root), before);
});

test('legacy UI marker does not bypass foundation or composition-version checks', async (t) => {
  for (const options of [
    { stack: 'anhedral-web-launch', contractVersion: 1 },
    { stack: 'anhedral-web-launch', foundation: 'next-opennext' },
  ]) {
    const { root } = workspace(t, options);
    const before = tree(root);
    await assert.rejects(
      inside(root, () => runAnhedralUiCommand(['doctor'], { quiet: true })),
      /Select apps\/web in an Anhedral Stack project/,
    );
    assert.deepEqual(tree(root), before);
  }
});
