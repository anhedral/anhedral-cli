import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { readJson } from '../dist/scaffold/files.js';
import { MAX_PROJECT_JSON_BYTES } from '../dist/bounded-file.js';

test('project JSON reads reject malformed content without echoing its values', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-json-'));
  try {
    writeFileSync(
      path.join(root, 'anhedral.setup.json'),
      '{"private":"example-sensitive-value" broken',
    );
    assert.throws(
      () => readJson(root, 'anhedral.setup.json'),
      (error) => {
        assert.equal(error.message, 'Invalid JSON in anhedral.setup.json.');
        assert.ok(!error.message.includes('example-sensitive-value'));
        return true;
      },
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('project JSON and workspace manifests reject pipes, directories and oversized files without hanging', () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-json-input-'));
  const files = pathToFileURL(path.resolve('dist/scaffold/files.js')).href;
  const graph = pathToFileURL(path.resolve('dist/workspace-graph.js')).href;
  const readiness = pathToFileURL(path.resolve('dist/readiness.js')).href;
  try {
    for (const kind of [
      'directory',
      'oversized',
      ...(process.platform === 'win32' ? [] : ['pipe']),
    ]) {
      const root = path.join(temporary, kind);
      mkdirSync(path.join(root, 'apps/api'), { recursive: true });
      for (const file of ['anhedral.setup.json', 'apps/api/package.json']) {
        const target = path.join(root, file);
        if (kind === 'directory') mkdirSync(target);
        if (kind === 'oversized') writeFileSync(target, ' '.repeat(MAX_PROJECT_JSON_BYTES + 1));
        if (kind === 'pipe') assert.equal(spawnSync('mkfifo', [target]).status, 0);
      }
      const child = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          `
        import assert from 'node:assert/strict';
        import { readJson } from ${JSON.stringify(files)};
        import { inspectWorkspaceGraph } from ${JSON.stringify(graph)};
        import { inspectProject } from ${JSON.stringify(readiness)};
        const root = ${JSON.stringify(root)};
        assert.throws(() => readJson(root, 'anhedral.setup.json'), /regular file|size limit/);
        assert.throws(() => inspectWorkspaceGraph(root), /regular file|size limit/);
        assert.equal(inspectProject(root).localReady, false);
      `,
        ],
        { encoding: 'utf8', timeout: 5000 },
      );
      assert.equal(child.error, undefined);
      assert.equal(child.status, 0, child.stderr);
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
