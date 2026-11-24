import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { scaffoldAnhedralStack, parseInitOptions } from '../dist/index.js';
import { runCapabilityCommand } from '../dist/composition/command.js';
test('Postgres migrations default to loopback, require explicit remote selection, and propagate failures', async () => {
  const base = mkdtempSync(path.join(tmpdir(), 'anhedral-migrations-'));
  const root = path.join(base, 'product');
  const cwd = process.cwd();
  try {
    await scaffoldAnhedralStack(
      parseInitOptions([root, '--skip-install', '--catalog-pins', '--no-git']),
      () => {
        throw Error('Network forbidden');
      },
      { quiet: true },
    );
    process.chdir(root);
    await runCapabilityCommand(
      'add',
      ['backend', '--skip-install', '--catalog-pins'],
      { quiet: true },
      () => {
        throw Error('Network forbidden');
      },
    );
    process.chdir(cwd);
    const file = path.join(root, 'packages/db/src/migrate.mjs');
    const runner = path.join(root, 'pnpm.mjs');
    writeFileSync(
      runner,
      `import {writeFileSync} from 'node:fs'; writeFileSync('invocation.json', JSON.stringify(process.argv.slice(2))); process.exit(Number(process.env.FIXTURE_EXIT || 0));`,
    );
    for (const args of [[], ['--local'], ['--remote']]) {
      const result = spawnSync(process.execPath, [file, ...args], {
        env: {
          ...process.env,
          DATABASE_URL_UNPOOLED: 'postgres://postgres@localhost/db',
          npm_execpath: runner,
        },
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
      const called = JSON.parse(
        readFileSync(path.join(root, 'packages/db/invocation.json'), 'utf8'),
      );
      assert.deepEqual(called, ['exec', 'drizzle-kit', 'migrate']);
    }
    for (const args of [[], ['--local'], ['--remote']]) {
      const result = spawnSync(process.execPath, [file, ...args], {
        env: {
          ...process.env,
          DATABASE_URL_UNPOOLED: 'postgres://example.invalid/db',
          npm_execpath: runner,
        },
      });
      assert.equal(result.status, args[0] === '--remote' ? 0 : 1);
    }
    assert.notEqual(
      spawnSync(process.execPath, [file, '--remote', '--local'], {
        env: {
          ...process.env,
          DATABASE_URL_UNPOOLED: 'postgres://postgres@localhost/db',
          npm_execpath: runner,
        },
      }).status,
      0,
    );
    assert.equal(
      spawnSync(process.execPath, [file], {
        env: {
          ...process.env,
          DATABASE_URL_UNPOOLED: 'postgres://postgres@localhost/db',
          npm_execpath: runner,
          FIXTURE_EXIT: '7',
        },
      }).status,
      7,
    );
    assert.doesNotMatch(
      readFileSync(path.join(root, 'packages/db/src/index.ts'), 'utf8'),
      /migrate|process.env/,
    );
  } finally {
    process.chdir(cwd);
    rmSync(base, { recursive: true, force: true });
  }
});
