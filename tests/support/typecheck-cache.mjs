import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from '../../dist/util.js';

/** A real cache hit must restore generated types, rather than silently rerunning typegen. */
export function verifyTypecheckCache(root) {
  const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-typecheck-cache-'));
  const applications = ['api', 'web']
    .filter((app) => existsSync(path.join(root, 'apps', app, 'package.json')))
    .map((app) => ({
      directory: path.join(root, 'apps', app),
      name: JSON.parse(readFileSync(path.join(root, 'apps', app, 'package.json'), 'utf8')).name,
    }));
  const web = applications.find((app) => app.directory.endsWith(path.join('apps', 'web')));
  assert.ok(web, 'Next application must exist');
  const api = applications.find((app) => app.directory.endsWith(path.join('apps', 'api')));
  const files = () => [
    ...(api ? [path.join(api.directory, 'worker-configuration.d.ts')] : []),
    path.join(web.directory, 'next-env.d.ts'),
    ...readdirSync(path.join(web.directory, '.next/types'), { recursive: true })
      .filter((file) => /\.[cm]?ts$/.test(file))
      .map((file) => path.join(web.directory, '.next/types', file)),
  ];
  const args = [
    'exec',
    'turbo',
    'run',
    'typecheck',
    ...applications.flatMap(({ name }) => ['--filter', name]),
    '--cache=local:rw',
    '--cache-dir',
    temporary,
    '--summarize',
  ];
  try {
    execFile('pnpm', args, root);
    const expected = new Map(files().map((file) => [file, readFileSync(file)]));
    assert.ok(expected.size > 2, 'Next typegen must emit route types');
    for (const file of expected.keys()) rmSync(file);
    const summaries = path.join(root, '.turbo/runs');
    const before = new Set(readdirSync(summaries));
    execFile('pnpm', args, root);
    const added = readdirSync(summaries).filter(
      (file) => file.endsWith('.json') && !before.has(file),
    );
    assert.equal(added.length, 1, 'Read the actual warm-run summary');
    const summary = JSON.parse(readFileSync(path.join(summaries, added[0]), 'utf8'));
    for (const { name } of applications)
      assert.equal(
        summary.tasks.find((task) => task.taskId === `${name}#typecheck`)?.cache.status,
        'HIT',
        `${name} typecheck must hit cache instead of rerunning type generation`,
      );
    for (const [file, bytes] of expected) {
      assert.ok(existsSync(file), 'Cache must restore ' + path.relative(root, file));
      assert.deepEqual(readFileSync(file), bytes, 'Restored types must match: ' + file);
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
