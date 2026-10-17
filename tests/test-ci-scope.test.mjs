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
  assert.equal(needsFullCI(['README.md', 'CONTRIBUTING.md', 'docs/stack-standard.md']), false);
  for (const file of [
    'src/bin.ts',
    'docs/stack-registry.json',
    'plugins/codex/distribution/skills/anhedral/SKILL.md',
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
      assert.equal(readFileSync(output, 'utf8'), 'full=true\n');
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
    assert.equal(run(), 'full=false\n');
    mkdirSync(path.join(directory, 'docs'));
    git('mv', 'source.ts', 'docs/source.md');
    git('commit', '--quiet', '-m', 'Move source');
    assert.equal(run(), 'full=true\n');
    base = 'a'.repeat(40);
    assert.throws(run);
    assert.throws(() => readFileSync(output));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CI retains check names, gates expensive jobs and fails checks if scope detection fails', () => {
  const workflow = parse(
    readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'),
  );
  assert.ok(workflow.on.pull_request !== undefined);
  assert.equal(workflow.on.push['paths-ignore'], undefined);
  assert.equal(workflow.jobs.scope.steps[0].with['fetch-depth'], 0);
  for (const name of ['e2e-stable', 'plugin-ui', 'generated']) {
    const job = workflow.jobs[name];
    assert.ok([job.needs].flat().includes('scope'), name);
    assert.match(job.if, /needs\.scope\.outputs\.full == 'true'/, name);
  }
  assert.match(workflow.jobs.checks.if, /!cancelled\(\)/);
  assert.match(workflow.jobs.checks.steps[1].if, /needs\.scope\.result != 'success'/);
  for (const name of ['checks', 'portable']) {
    const job = workflow.jobs[name];
    assert.ok([job.needs].flat().includes('scope'));
    assert.equal(job.if, '${{ !cancelled() }}');
    assert.equal(job.steps[1].run, 'exit 1');
    for (const step of job.steps.slice(2)) {
      assert.match(step.if, /needs\.scope\.outputs\.full == 'true'/);
    }
  }
});
