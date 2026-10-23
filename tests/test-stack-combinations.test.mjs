import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import ts from 'typescript';
import {
  parseStandardOptions,
  scaffoldStandardProject,
  inspectWorkspaceGraph,
} from '../dist/index.js';
import { STACK_PROFILES } from './support/stack-profiles.mjs';
for (const [name, flags] of Object.entries(STACK_PROFILES))
  test(`generated ${name} has valid source and a closed workspace graph`, async () => {
    const root = path.join(mkdtempSync(path.join(tmpdir(), 'anhedral-graph-')), 'app');
    try {
      await scaffoldStandardProject(
        parseStandardOptions([root, ...flags, '--skip-install', '--no-git', '--json']),
        () => assert.fail('No network or subprocess needed'),
        { quiet: true },
      );
      const graph = inspectWorkspaceGraph(root);
      assert.ok(graph.some((n) => n.directory === 'apps/api'));
      assert.ok(graph.some((n) => n.directory === 'apps/mobile'));
      for (const file of readdirSync(root, { recursive: true })) {
        if (!/\.(?:ts|tsx|js|mjs|cjs)$/.test(file)) continue;
        const source = readFileSync(path.join(root, file), 'utf8');
        const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
        assert.deepEqual(parsed.parseDiagnostics, [], file);
        if (/^apps\/mobile\//.test(file))
          assert.doesNotMatch(
            source,
            /from ['"](?:drizzle-orm|@workspace\/db|@workspace\/auth)['"]/,
          );
      }
    } finally {
      rmSync(path.dirname(root), { recursive: true, force: true });
    }
  });
