import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { scaffoldDatabase } from '../dist/scaffold/database.js';
test('D1 migrations default to local, use API binding, and propagate failures', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-migrations-'));
  try {
    mkdirSync(path.join(root, 'apps/api/src'), { recursive: true });
    writeFileSync(path.join(root, 'apps/api/package.json'), '{"name":"@workspace/api"}');
    writeFileSync(path.join(root, 'apps/api/src/index.ts'), 'export {};');
    scaffoldDatabase({ root });
    const source = readFileSync(path.join(root, 'packages/db/src/migrate.ts'), 'utf8');
    const file = path.join(root, 'packages/db/src/migrate.mjs');
    writeFileSync(
      file,
      ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText,
    );
    const runner = path.join(root, 'pnpm.mjs');
    writeFileSync(
      runner,
      `import {writeFileSync} from 'node:fs'; writeFileSync('invocation.json', JSON.stringify(process.argv.slice(2))); process.exit(Number(process.env.FIXTURE_EXIT || 0));`,
    );
    for (const args of [[], ['--local'], ['--remote']]) {
      const result = spawnSync(process.execPath, [file, ...args], {
        env: { ...process.env, npm_execpath: runner },
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
      const called = JSON.parse(readFileSync(path.join(root, 'apps/api/invocation.json'), 'utf8'));
      assert.deepEqual(called.slice(0, 6), ['exec', 'wrangler', 'd1', 'migrations', 'apply', 'DB']);
      assert.equal(called[6], args[0] || '--local');
    }
    assert.notEqual(
      spawnSync(process.execPath, [file, '--remote', '--local'], {
        env: { ...process.env, npm_execpath: runner },
      }).status,
      0,
    );
    assert.equal(
      spawnSync(process.execPath, [file], {
        env: { ...process.env, npm_execpath: runner, FIXTURE_EXIT: '7' },
      }).status,
      7,
    );
    assert.doesNotMatch(
      readFileSync(path.join(root, 'packages/db/src/index.ts'), 'utf8'),
      /migrate|process.env/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
