import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import { assertStandaloneCheckout } from '../scripts/checks/standalone-checkout.mjs';
import { validateWorkflowPolicy } from '../scripts/release/check-release-policy.mjs';

function fixture(run) {
  const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-standalone-'));
  try {
    for (const file of ['package.json', 'pnpm-workspace.yaml', '.npmrc'])
      writeFileSync(
        path.join(directory, file),
        readFileSync(new URL('../' + file, import.meta.url)),
      );
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('CLI declares its own registry-only package and workspace configuration', () => {
  assertStandaloneCheckout();
});

test('missing or expanded nested workspaces and package linking fail closed', () => {
  fixture((directory) => {
    const target = path.join(directory, 'pnpm-workspace.yaml');
    const source = readFileSync(target, 'utf8');
    for (const value of [
      source.replace('packages: []', "packages: ['../*']"),
      source.replace('linkWorkspacePackages: false', 'linkWorkspacePackages: true'),
      source.replace('sharedWorkspaceLockfile: false', 'sharedWorkspaceLockfile: true'),
      source + '\nlinkWorkspacePackages: false\n',
    ]) {
      writeFileSync(target, value);
      assert.throws(() => assertStandaloneCheckout(directory), /standalone CLI/);
    }
    rmSync(target);
    assert.throws(() => assertStandaloneCheckout(directory), /own pnpm-workspace/);
  });
});

test('private package names and non-registry dependency sources are rejected', () => {
  fixture((directory) => {
    const target = path.join(directory, 'package.json');
    const manifest = JSON.parse(readFileSync(target, 'utf8'));
    for (const [name, version] of [
      ['@anhedral/db', '1.0.0'],
      ['example', 'workspace:*'],
      ['example', 'file:../../packages/private'],
      ['example', 'link:../private'],
      ['example', 'https://example.test/private.tgz'],
    ]) {
      writeFileSync(
        target,
        JSON.stringify({ ...manifest, optionalDependencies: { [name]: version } }),
      );
      assert.throws(() => assertStandaloneCheckout(directory), /pinned registry packages/);
    }
  });
});

test('CI requires the CLI checkout itself as its workspace root', () => {
  fixture((directory) => {
    assertStandaloneCheckout(directory, { ci: true, env: { GITHUB_WORKSPACE: directory } });
    assert.throws(
      () => assertStandaloneCheckout(directory, { ci: true, env: { GITHUB_WORKSPACE: tmpdir() } }),
      /only the CLI repository/,
    );
    assert.throws(
      () => assertStandaloneCheckout(directory, { ci: true, env: {} }),
      /workspace root/,
    );
  });
});

test('npm credentials and configuration values are never echoed by guard errors', () => {
  fixture((directory) => {
    const marker = 'DO_NOT_PRINT_TEST_CREDENTIAL';
    writeFileSync(path.join(directory, '.npmrc'), `_authToken=${marker}\n`);
    assert.throws(
      () => assertStandaloneCheckout(directory),
      (error) => {
        assert.match(error.message, /Review standalone CLI/);
        assert.ok(!error.message.includes(marker));
        return true;
      },
    );
  });
});

test('publication rejects removal of the upstream repository guard', () => {
  fixture((directory) => {
    mkdirSync(path.join(directory, '.github'));
    cpSync(
      new URL('../.github/workflows', import.meta.url),
      path.join(directory, '.github/workflows'),
      {
        recursive: true,
      },
    );
    assert.deepEqual(validateWorkflowPolicy(directory), []);
    for (const file of ['release.yml', 'release-on-main.yml']) {
      const target = path.join(directory, '.github/workflows', file);
      const source = readFileSync(target, 'utf8');
      writeFileSync(
        target,
        source.replace(/^    if: github\.repository == 'anhedral\/anhedral-cli'.*\n/m, ''),
      );
      assert.ok(
        validateWorkflowPolicy(directory).some((failure) => /repository contexts/.test(failure)),
      );
      writeFileSync(target, source);
    }
  });
});

test('historical release finalization keeps its checkout guard without requiring new source files', () => {
  fixture((directory) => {
    rmSync(path.join(directory, 'pnpm-workspace.yaml'));
    rmSync(path.join(directory, '.npmrc'));
    const workflow = parse(
      readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8'),
    );
    const step = workflow.jobs.tag.steps.find(
      (item) => item.name === 'Require standalone public CLI checkout',
    );
    const run = (workspace) =>
      spawnSync('bash', ['-c', step.run], {
        cwd: directory,
        env: { PATH: process.env.PATH, GITHUB_WORKSPACE: workspace },
        encoding: 'utf8',
      });
    assert.equal(run(directory).status, 0);
    assert.notEqual(run(tmpdir()).status, 0);
  });
});
