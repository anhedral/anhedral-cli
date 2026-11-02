import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  truncateSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scaffoldStandardProject, parseStandardOptions } from '../dist/standard.js';
import { runCapabilityCommand } from '../dist/capability-command.js';
import { CapabilityEditor } from '../dist/capability-editor.js';
import { initializeUiMetadata } from '../dist/ui-project.js';
import { needsNextRuntime } from '../scripts/ci-scope.mjs';
const offline = () => {
  throw Error('External commands forbidden');
};
const fixture = async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-generator-safety-')),
    app = path.join(root, 'app');
  await scaffoldStandardProject(
    parseStandardOptions([app, '--skip-install', '--no-git']),
    offline,
    { quiet: true },
  );
  return { root, app };
};
async function inside(root, run) {
  const previous = process.cwd();
  process.chdir(root);
  try {
    return await run();
  } finally {
    process.chdir(previous);
  }
}
const add = (app, names) =>
  inside(app, () =>
    runCapabilityCommand(
      'add',
      [...names, '--with-dependencies', '--skip-install'],
      { quiet: true },
      offline,
    ),
  );
test('progressive clients compose scoped cache outputs/env while preserving unrelated tasks', async () => {
  const { root, app } = await fixture();
  try {
    const file = path.join(app, 'turbo.json'),
      turbo = JSON.parse(readFileSync(file));
    turbo.tasks.custom = { cache: false };
    writeFileSync(file, JSON.stringify(turbo));
    await add(app, ['wxt', 'gpui']);
    const next = JSON.parse(readFileSync(file));
    assert.deepEqual(next.tasks.custom, { cache: false });
    assert.ok(next.tasks['@workspace/extension#build'].outputs.includes('.output/**'));
    assert.ok(next.tasks['@workspace/extension#build'].env.includes('WXT_API_ORIGIN'));
    assert.ok(next.tasks['@workspace/extension#dev'].env.includes('WXT_API_ORIGIN'));
    assert.equal(next.tasks['@workspace/desktop#build'].cache, false);
    assert.ok(!next.globalEnv.includes('WXT_API_ORIGIN'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('doctor detects missing required source without rejecting consumer edits', async () => {
  const { root, app } = await fixture();
  try {
    await add(app, ['database-auth']);
    const file = path.join(app, 'apps/api/src/auth-features.ts');
    writeFileSync(file, readFileSync(file, 'utf8') + '\n// Consumer edit\n');
    const doctor = () =>
      inside(app, async () => {
        let out = '';
        await runCapabilityCommand(
          'stack',
          ['doctor'],
          {
            json: true,
            io: {
              out: {
                write: (s) => {
                  out += s;
                },
              },
              err: { write: () => {} },
              stdinTTY: false,
              stdoutTTY: false,
              stderrTTY: false,
            },
          },
          offline,
        );
        return JSON.parse(out);
      });
    assert.equal((await doctor()).sourceReady, true);
    rmSync(file);
    const old = process.exitCode;
    try {
      const result = await doctor();
      assert.equal(result.sourceReady, false);
      assert.ok(
        result.capabilities
          .find((c) => c.id === 'database-auth')
          .missingFiles.includes('apps/api/src/auth-features.ts'),
      );
      assert.equal(process.exitCode, 1);
    } finally {
      process.exitCode = old;
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('UI metadata containment rejects directory and dangling file symlinks before any helper write', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-ui-containment-'));
  try {
    const app = path.join(root, 'app'),
      outside = path.join(root, 'outside');
    mkdirSync(app);
    mkdirSync(outside);
    symlinkSync(outside, path.join(app, 'ANHEDRAL_UI_LICENSES'));
    assert.throws(() => initializeUiMetadata(app, 'web'), /Unsafe UI metadata/);
    assert.deepEqual(readDirectory(outside), []);
    rmSync(path.join(app, 'ANHEDRAL_UI_LICENSES'));
    symlinkSync(path.join(outside, 'missing'), path.join(app, '.anhedral-ui.json'));
    assert.throws(() => initializeUiMetadata(app, 'web'), /Unsafe UI metadata/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
import { readdirSync as readDirectory } from 'node:fs';
test('capability read and verification reject oversized regular files through the bounded reader', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-bounded-overlay-'));
  try {
    const file = path.join(root, 'manifest.json');
    writeFileSync(file, '{}');
    const editor = new CapabilityEditor(root, {});
    editor.read('manifest.json');
    truncateSync(file, 3 * 1024 * 1024);
    assert.throws(() => editor.verify(), /size limit/);
    assert.throws(() => new CapabilityEditor(root, {}).read('manifest.json'), /size limit/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('init dry-run rejects occupied and symlinked destinations without creating metadata', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-init-preview-'));
  try {
    const occupied = path.join(root, 'occupied');
    mkdirSync(occupied);
    writeFileSync(path.join(occupied, 'customer.txt'), 'preserve');
    await assert.rejects(
      scaffoldStandardProject(parseStandardOptions([occupied, '--dry-run']), offline, {
        quiet: true,
      }),
      /empty/,
    );
    assert.deepEqual(readDirectory(occupied), ['customer.txt']);
    const alias = path.join(root, 'alias');
    symlinkSync(occupied, alias);
    await assert.rejects(
      scaffoldStandardProject(parseStandardOptions([alias, '--dry-run']), offline, { quiet: true }),
      /real directory/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('progressive recipe and generated API/auth changes select runtime acceptance', () => {
  for (const file of [
    'src/capability-recipes.ts',
    'assets/stack/api-index.ts.txt',
    'assets/stack/auth.ts.txt',
  ])
    assert.equal(needsNextRuntime([file]), true, file);
  assert.equal(needsNextRuntime(['docs/capabilities.md']), false);
  assert.equal(needsNextRuntime(['assets/stack/native-button.tsx.txt']), false);
});
