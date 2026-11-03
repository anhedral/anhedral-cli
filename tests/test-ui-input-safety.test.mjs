import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const bin = fileURLToPath(new URL('../dist/bin.js', import.meta.url));
function fixture() {
  const workspace = mkdtempSync(path.join(tmpdir(), 'anhedral-ui-input-'));
  const root = path.join(workspace, 'apps/web');
  mkdirSync(root, { recursive: true });
  writeFileSync(
    path.join(workspace, 'anhedral.json'),
    JSON.stringify({
      schemaVersion: 1,
      setup: { stack: 'anhedral-stack' },
      composition: { contractVersion: 2, foundation: 'tanstack-start' },
    }),
  );
  writeFileSync(
    root + '/package.json',
    JSON.stringify({ dependencies: { '@tanstack/react-start': '1.169.4' } }),
  );
  writeFileSync(
    root + '/components.json',
    JSON.stringify({
      aliases: { ui: '@/components/ui', utils: '@/lib/utils' },
      tailwind: { css: 'app/globals.css' },
    }),
  );
  writeFileSync(root + '/.anhedral-ui.json', JSON.stringify({ platform: 'web' }));
  return root;
}
const doctor = (root) =>
  spawnSync(process.execPath, [bin, 'ui', 'doctor', '--cwd', root, '--json'], {
    encoding: 'utf8',
    timeout: 3000,
  });
for (const file of ['package.json', 'components.json', '.anhedral-ui.json'])
  for (const type of ['oversized', 'directory', 'fifo'])
    test(
      `UI doctor rejects ${type} ${file} without hanging`,
      { skip: type === 'fifo' && process.platform === 'win32' },
      () => {
        const root = fixture();
        try {
          rmSync(path.join(root, file));
          if (type === 'oversized')
            writeFileSync(path.join(root, file), ' '.repeat(2 * 1024 * 1024 + 1));
          else if (type === 'directory') mkdirSync(path.join(root, file));
          else assert.equal(spawnSync('mkfifo', [path.join(root, file)]).status, 0);
          const result = doctor(root);
          assert.equal(result.error, undefined);
          assert.equal(result.status, 1, result.stderr);
          assert.match(result.stderr, type === 'oversized' ? /size limit/ : /regular file/);
        } finally {
          rmSync(path.resolve(root, '../..'), { recursive: true, force: true });
        }
      },
    );
test(
  'UI doctor retains consumer manifest and config symlink support to bounded regular targets',
  { skip: process.platform === 'win32' },
  () => {
    const root = fixture();
    try {
      for (const file of ['package.json', 'components.json']) {
        const source = path.join(root, file);
        const target = path.join(root, file + '.target'); // owned fixture targets only
        const result = spawnSync(process.execPath, [
          '--input-type=module',
          '-e',
          `import{renameSync}from'node:fs';renameSync(${JSON.stringify(source)},${JSON.stringify(target)});`,
        ]);
        assert.equal(result.status, 0);
        symlinkSync(target, source);
      }
      const result = doctor(root);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).configurationReady, true);
    } finally {
      rmSync(path.resolve(root, '../..'), { recursive: true, force: true });
    }
  },
);
