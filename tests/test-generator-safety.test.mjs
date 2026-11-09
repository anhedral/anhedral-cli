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
import {
  parseInitOptions as parseStandardOptions,
  scaffoldAnhedralStack as scaffoldStandardProject,
} from '../dist/index.js';
import { runCapabilityCommand } from '../dist/composition/command.js';
import { CapabilityEditor } from '../dist/composition/editor.js';
import { needsFullCI } from '../scripts/checks/ci-scope.mjs';
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
test('backend and payment additions preserve unrelated root tasks', async () => {
  const { root, app } = await fixture();
  try {
    const file = path.join(app, 'turbo.json');
    const turbo = JSON.parse(readFileSync(file));
    turbo.tasks.custom = { cache: false };
    writeFileSync(file, JSON.stringify(turbo));
    await add(app, ['stripe']);
    const after = JSON.parse(readFileSync(file));
    assert.deepEqual(after.tasks.custom, { cache: false });
    assert.deepEqual(after.tasks['db:migrate'], { cache: false });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('doctor detects missing required source without rejecting consumer edits', async () => {
  const { root, app } = await fixture();
  try {
    await add(app, ['backend']);
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
        result.additions
          .find((c) => c.id === 'backend')
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
test('shared recipe and generated API/auth changes always retain fast CI checks', () => {
  for (const file of [
    'src/composition/recipes.ts',
    'assets/stack/api-index.ts.txt',
    'assets/stack/auth.ts.txt',
  ])
    assert.equal(needsFullCI([file]), true, file);
  assert.equal(needsFullCI(['docs/capabilities.md']), false);
  assert.equal(needsFullCI(['assets/stack/native-button.tsx.txt']), true);
});
