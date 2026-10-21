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

test('manual runs and missing history conservatively require code checks', () => {
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

test('staging and main share one fast merge gate; deep validation is manual only', () => {
  const workflow = parse(
    readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'),
  );
  assert.deepEqual(workflow.on.pull_request.branches, ['staging', 'main']);
  assert.equal(workflow.on.push, undefined, 'do not duplicate a PR run after merge');
  assert.deepEqual(Object.keys(workflow.jobs), ['gate']);
  const gate = workflow.jobs.gate;
  assert.equal(gate.name, 'CI gate');
  assert.equal(gate['runs-on'], 'ubuntu-latest');
  assert.ok(gate['timeout-minutes'] <= 5);
  assert.equal(gate.strategy, undefined);
  const commands = gate.steps.map((step) => step.run || '').join('\n');
  assert.doesNotMatch(
    commands,
    /test:unit|test:patch|audit:osv|test-generated-apps|playwright|test:browser|plugin:check/,
  );
  assert.match(commands, /test-cli-validation/);
  assert.match(commands, /check:security/);
  for (const step of gate.steps.filter((step) =>
    /plugin:build|create-release-artifact|upload-artifact/.test(
      (step.run || '') + (step.uses || ''),
    ),
  )) {
    assert.match(step.if, /github.event_name == 'workflow_dispatch'/);
    assert.match(step.if, /github.ref == 'refs\/heads\/main'/);
  }
  const deep = parse(
    readFileSync(new URL('../.github/workflows/validation.yml', import.meta.url), 'utf8'),
  );
  assert.deepEqual(Object.keys(deep.on), ['workflow_dispatch']);
  assert.ok(deep.jobs.generated);
  assert.notEqual(deep.jobs.gate.name, 'CI gate');
  const release = parse(
    readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8'),
  );
  assert.equal(
    release.jobs.portability.strategy,
    undefined,
    'publishing has no compatibility matrix',
  );
  assert.equal(release.jobs.portability['runs-on'], 'ubuntu-latest');
});

test('main rejects topic PRs and identifies promotions without expanding hosted checks', () => {
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
