import { writeProjectSection, projectConfigPath } from '../dist/project-config.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  supportsWorkspaceRuntime,
  supportsVoidRuntime,
  usesVoidSelection,
} from '../dist/runtime-policy.js';
import { parseStandardOptions } from '../dist/standard.js';
import { createSetupPlan } from '../dist/capabilities.js';
import { inspectProviderReadiness } from '../dist/provider-readiness.js';
import { registerVercelApplication } from '../dist/vercel.js';
import { providerProjectName } from '../dist/render.js';
import { runtimeTargets } from '../dist/providers/runtime.js';
import { prepareTestRuntime } from '../scripts/prepare-test-runtime.mjs';
import { browseServiceData } from '../dist/service-readers.js';

function fixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-consistency-'));
  return Promise.resolve()
    .then(() => run(root))
    .finally(() => rmSync(root, { recursive: true, force: true }));
}

test('generation, setup and diagnostics share runtime selection boundaries', () => {
  for (const [version, workspace, voidRuntime] of [
    ['20.19.0', false, false],
    ['22.12.0', false, false],
    ['22.13.0', true, false],
    ['23.0.0', false, false],
    ['24.0.0', true, false],
    ['24.20.0', true, false],
    ['24.21.0', true, true],
    ['26.0.0', true, true],
    ['invalid', false, false],
  ]) {
    assert.equal(supportsWorkspaceRuntime(version), workspace, version);
    assert.equal(supportsVoidRuntime(version), voidRuntime, version);
  }
  for (const flags of [
    [],
    ['--hono'],
    ['--next'],
    ['--next', '--hosting=cloudflare'],
    ['--hono', '--queues'],
    ['--hono', '--basin'],
    ['--electron'],
  ]) {
    const options = parseStandardOptions(['app', ...flags]);
    const plan = createSetupPlan(options);
    assert.equal(
      plan.setup.tools.includes('Node.js 24.21.0+ for Void workspaces'),
      usesVoidSelection(options.products, options.hosting),
    );
  }
});

test('doctor rejects mismatched, malformed and diagnostic-decorated pnpm versions', () =>
  fixture(async (root) => {
    for (const version of ['9.0.0', '10.34.4', '10.34.5\nwarning', '10.34.5']) {
      const report = await inspectProviderReadiness(root, async (command, args) =>
        command === 'pnpm'
          ? version
          : command === 'gh'
            ? '{"login":"owner"}'
            : args[0] === '--version'
              ? 'git version 2'
              : 'configured',
      );
      assert.equal(
        report.prerequisiteChecks.find((check) => check.id === 'pnpm').ok,
        version === '10.34.5',
      );
    }
  }));

test('Vercel registration accepts planned package names with deterministic bounded provider identities', () =>
  fixture((root) => {
    mkdirSync(path.join(root, 'apps/web'), { recursive: true });
    const names = ['normal-app', 'my.app', 'my_app', 'a'.repeat(213) + 'b', 'a'.repeat(214)];
    const providerNames = [];
    for (const name of names) {
      writeProjectSection(root, 'setup', { hosting: 'vercel' });
      writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name }));
      const project = registerVercelApplication(root);
      assert.equal(project.name, providerProjectName(name));
      assert.match(project.name, /^[a-z0-9][a-z0-9-]{0,62}$/);
      assert.equal(JSON.parse(readFileSync(path.join(root, 'package.json'))).name, name);
      providerNames.push(project.name);
      rmSync(projectConfigPath(root));
    }
    assert.equal(new Set(providerNames).size, names.length);
    assert.equal(providerNames[0], 'normal-app');
  }));

test('Neon runtime provisioning leaves migration authority and its environment untouched', () =>
  fixture((root) => {
    const plan = createSetupPlan(parseStandardOptions([root, '--hono', '--neon']));
    writeProjectSection(root, 'setup', plan);
    mkdirSync(path.join(root, 'apps/api'), { recursive: true });
    mkdirSync(path.join(root, 'packages/db'), { recursive: true });
    const targets = runtimeTargets(root, { DATABASE_URL: 'runtime-only' });
    assert.equal(targets['apps/api/.dev.vars'].DATABASE_URL, 'runtime-only');
    assert.equal(
      Object.keys(targets).some((file) => file.startsWith('packages/db/')),
      false,
    );
  }));

test('test prerequisite reuses valid runtime and rebuilds missing or stale runtime before packaging', () => {
  const calls = [];
  prepareTestRuntime(
    '/fixture',
    () => {},
    () => {
      assert.fail('verified runtime must be reused');
    },
  );
  if (!supportsWorkspaceRuntime(process.versions.node)) {
    assert.throws(
      () =>
        prepareTestRuntime('/fixture', () => {
          throw Error('missing');
        }),
      /Preparing inspector tests requires Node/,
    );
    return;
  }
  let verified = 0;
  prepareTestRuntime(
    '/fixture',
    () => {
      if (verified++ === 0) throw Error('stale');
    },
    (command, args) => {
      calls.push([command, ...args]);
      return { status: 0 };
    },
  );
  assert.deepEqual(calls, [
    ['pnpm', '--dir', 'plugins/codex/inspector', 'install', '--frozen-lockfile'],
    ['pnpm', 'plugin:build'],
  ]);
  assert.equal(verified, 2);
  assert.throws(
    () =>
      prepareTestRuntime(
        '/fixture',
        () => {
          throw Error('missing');
        },
        () => ({ status: 1 }),
      ),
    /Could not prepare/,
  );
});

test('empty D1 tables retain schema and KV metadata follows only provider cursors', async () => {
  const service = { kind: 'd1', id: 'database', accountId: 'a'.repeat(32) };
  const query = async (_method, _endpoint, body) => ({
    result: [
      {
        success: true,
        results: body.sql.includes('sqlite_schema')
          ? [{ name: 'notes' }]
          : body.sql.startsWith('PRAGMA')
            ? [{ name: 'id' }, { name: 'email' }]
            : [],
      },
    ],
  });
  const empty = await browseServiceData(service, query, 'notes');
  assert.deepEqual(empty.columns, ['id', 'email']);
  assert.deepEqual(empty.rows, []);
  assert.equal(empty.masked, true);
  const routes = [];
  const request = async (_method, route) => {
    routes.push(route);
    return {
      result: [{ name: 'key' }],
      result_info: { cursor: routes.length === 1 ? 'next+page' : '' },
    };
  };
  const kv = { ...service, kind: 'kv' };
  const first = await browseServiceData(kv, request, 'keys');
  assert.equal(first.hasMore, true);
  const second = await browseServiceData(kv, request, 'keys', 0, 25, first.nextCursor);
  assert.equal(second.hasMore, false);
  assert.match(routes[1], /cursor=next%2Bpage/);
});
