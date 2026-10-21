import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parse } from 'yaml';
import { needsFullCI } from '../scripts/ci-scope.mjs';

test('only ordinary documentation takes the lightweight path', () => {
  assert.equal(
    needsFullCI([
      'README.md',
      'CONTRIBUTING.md',
      '.github/CONTRIBUTING.md',
      '.github/PULL_REQUEST_TEMPLATE.md',
      'docs/stack-standard.md',
    ]),
    false,
  );
  for (const file of [
    'src/bin.ts',
    'AGENTS.md',
    '.github/actions/example/README.md',
    'docs/stack-registry.json',
    'plugins/codex/distribution/skills/anhedral-init/SKILL.md',
    'examples/full-stack/README.md',
    '.github/workflows/ci.yml',
    'package.json',
    'docs/source.ts\nignored.md',
  ]) {
    assert.equal(needsFullCI(['README.md', file]), true, file);
  }
  assert.equal(needsFullCI([]), true);
});

test('manual runs and missing comparison history always require full CI', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-ci-scope-'));
  try {
    for (const env of [
      { GITHUB_EVENT_NAME: 'workflow_dispatch', CI_BASE_SHA: 'a'.repeat(40) },
      { GITHUB_EVENT_NAME: 'push', CI_BASE_SHA: '0'.repeat(40) },
      { GITHUB_EVENT_NAME: 'pull_request', CI_BASE_SHA: '' },
    ]) {
      const output = path.join(directory, `${env.GITHUB_EVENT_NAME}.txt`);
      execFileSync(process.execPath, ['scripts/ci-scope.mjs'], {
        env: { ...process.env, ...env, GITHUB_OUTPUT: output },
      });
      assert.equal(
        readFileSync(output, 'utf8'),
        'full=true\nrelease=' + (env.GITHUB_EVENT_NAME === 'workflow_dispatch') + '\n',
      );
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Git comparison accepts docs but detects source renamed into docs and rejects missing history', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-ci-diff-'));
  const git = (...args) =>
    execFileSync('git', ['-c', 'user.name=CI Test', '-c', 'user.email=ci@example.com', ...args], {
      cwd: directory,
      encoding: 'utf8',
    });
  const output = path.join(directory, 'output');
  const run = () => {
    rmSync(output, { force: true });
    execFileSync(
      process.execPath,
      [fileURLToPath(new URL('../scripts/ci-scope.mjs', import.meta.url))],
      {
        cwd: directory,
        env: {
          ...process.env,
          GITHUB_EVENT_NAME: 'pull_request',
          CI_BASE_SHA: base,
          GITHUB_OUTPUT: output,
        },
        stdio: 'pipe',
      },
    );
    return readFileSync(output, 'utf8');
  };
  let base;
  try {
    git('init', '--quiet');
    writeFileSync(path.join(directory, 'README.md'), 'Original\n');
    writeFileSync(path.join(directory, 'source.ts'), 'export {};\n');
    git('add', '.');
    git('commit', '--quiet', '-m', 'Initial');
    base = git('rev-parse', 'HEAD').trim();
    writeFileSync(path.join(directory, 'README.md'), '🚧 Under construction\n');
    git('commit', '--quiet', '-am', 'Docs');
    assert.equal(run(), 'full=false\nrelease=false\n');
    writeFileSync(path.join(directory, 'README.md'), 'Trailing space \n');
    git('commit', '--quiet', '-am', 'Whitespace defect');
    assert.throws(run, 'documentation whitespace defects must fail');
    assert.throws(() => readFileSync(output));
    writeFileSync(path.join(directory, 'README.md'), 'Clean documentation\n');
    git('commit', '--quiet', '-am', 'Fix whitespace');
    assert.equal(run(), 'full=false\nrelease=false\n');
    mkdirSync(path.join(directory, 'docs'));
    git('mv', 'source.ts', 'docs/source.md');
    git('commit', '--quiet', '-m', 'Move source');
    assert.equal(run(), 'full=true\nrelease=false\n');
    base = 'a'.repeat(40);
    assert.throws(run);
    assert.throws(() => readFileSync(output));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('routine PRs use one runtime; releases retain compatibility and generated coverage', () => {
  const workflow = parse(
    readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'),
  );
  assert.deepEqual(workflow.on.pull_request.branches, ['staging', 'main']);
  assert.deepEqual(workflow.on.push.branches, ['main']);
  assert.equal(workflow.on.pull_request.paths, undefined);
  assert.equal(workflow.jobs.scope.steps[0].with['fetch-depth'], 0);
  assert.match(workflow.jobs.checks.strategy.matrix.node, /outputs.release/);
  assert.match(workflow.jobs['plugin-ui'].strategy.matrix.node, /outputs.release/);
  for (const name of ['portable', 'registry-matrix', 'generated']) {
    assert.match(workflow.jobs[name].if, /outputs.release == 'true'/);
    assert.match(workflow.jobs[name].if, /outputs.full == 'true'/);
  }
  assert.equal(workflow.jobs['e2e-stable'], undefined);
  const gate = workflow.jobs.gate;
  assert.equal(gate.name, 'CI gate');
  assert.equal(gate.if, '${{ always() }}');
  const code = gate.steps[0].run.split("node --input-type=module -e '")[1].split("'")[0];
  const results = (full, release, failure) =>
    Object.fromEntries(
      gate.needs.map((name) => [
        name,
        {
          result:
            name === failure
              ? 'failure'
              : (['portable', 'registry-matrix', 'generated'].includes(name) && !release) ||
                  (name === 'plugin-ui' && !full)
                ? 'skipped'
                : 'success',
          outputs: { full: String(full), release: String(release) },
        },
      ]),
    );
  for (const [full, release] of [
    [false, false],
    [true, false],
    [true, true],
  ]) {
    const run = (failure) =>
      execFileSync(process.execPath, ['--input-type=module', '-e', code], {
        env: { ...process.env, RESULTS: JSON.stringify(results(full, release, failure)) },
      });
    run();
    assert.throws(() => run('scope'));
    assert.throws(() => run('checks'));
    if (full) assert.throws(() => run('plugin-ui'));
    if (full && release) assert.throws(() => run('generated'));
  }
});

test('main rejects topic PRs and promotion runs the release checks', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-promotion-'));
  try {
    const output = path.join(directory, 'output');
    const run = (head) =>
      execFileSync(process.execPath, ['scripts/ci-scope.mjs'], {
        env: {
          ...process.env,
          GITHUB_EVENT_NAME: 'pull_request',
          CI_TARGET_BRANCH: 'main',
          CI_HEAD_BRANCH: head,
          CI_BASE_SHA: '',
          GITHUB_OUTPUT: output,
        },
        stdio: 'pipe',
      });
    assert.throws(() => run('codex/topic'));
    run('staging');
    assert.equal(readFileSync(output, 'utf8'), 'full=true\nrelease=true\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
