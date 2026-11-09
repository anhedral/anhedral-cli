import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parse } from 'yaml';
import { needsFullCI } from '../scripts/checks/ci-scope.mjs';

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
    'plugin/skills/anhedral-init/SKILL.md',
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
      execFileSync(process.execPath, ['scripts/checks/ci-scope.mjs'], {
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
      [fileURLToPath(new URL('../scripts/checks/ci-scope.mjs', import.meta.url))],
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
    base = git('rev-parse', 'HEAD').trim();
    mkdirSync(path.join(directory, 'assets/launch'), { recursive: true });
    writeFileSync(path.join(directory, 'assets/launch/server.ts.txt'), 'export {};\n');
    git('add', '.');
    git('commit', '--quiet', '-m', 'Change canonical runtime template');
    assert.equal(run(), 'full=true\nrelease=false\n');
    base = 'a'.repeat(40);
    assert.throws(run);
    assert.throws(() => readFileSync(output));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('staging and main share one fast gate; generated runtime and broad validation stay manual', () => {
  const workflow = parse(
    readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'),
  );
  assert.deepEqual(workflow.on.pull_request.branches, ['staging', 'main']);
  assert.deepEqual(
    workflow.on.push.branches,
    ['staging'],
    'maintainer staging pushes require CI; topic/main pushes do not duplicate PR checks',
  );
  const scopeStep = workflow.jobs.gate.steps.find((step) => step.id === 'scope');
  assert.match(
    scopeStep.env.CI_BASE_SHA,
    /github.event.before/,
    'pushes compare against their actual prior staging revision',
  );
  assert.deepEqual(Object.keys(workflow.jobs), ['gate']);
  const gate = workflow.jobs.gate;
  assert.equal(gate.name, 'CI gate');
  assert.equal(gate['runs-on'], 'ubuntu-latest');
  assert.ok(gate['timeout-minutes'] <= 20);
  assert.equal(gate.strategy, undefined);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  const routine = gate.steps.filter((step) => !/workflow_dispatch/.test(step.if ?? ''));
  assert.equal(routine.filter((step) => step.run === 'pnpm build').length, 1);
  const install = routine.find((step) => /pnpm install/.test(step.run ?? ''));
  assert.match(install.run, /--frozen-lockfile --ignore-scripts/);
  assert.ok(routine.every((step) => !/runtime-smoke|test-generated-apps/.test(step.run ?? '')));
  const commands = gate.steps.map((step) => step.run || '').join('\n');
  assert.doesNotMatch(
    commands,
    /test:unit|test:patch|audit:osv|test-generated-apps|playwright|test:browser|plugin:check/,
  );
  assert.match(commands, /test-cli-validation/);
  for (const file of [
    'test-standalone-checkout.test.mjs',
    'test-runtime-proof-receipt.test.mjs',
    'test-launch-init.test.mjs',
    'test-public-stack.test.mjs',
    'test-standard.test.mjs',
    'test-deployment-contract.test.mjs',
    'test-tanstack-platform.test.mjs',
  ])
    assert.ok(commands.includes(`tests/${file}`), file);
  assert.doesNotMatch(commands, /next-runtime-smoke/);
  const runtime = gate.steps.find((step) => /tanstack-runtime-smoke/.test(step.run || ''));
  assert.equal(workflow.on.workflow_dispatch.inputs.runtime_proof.type, 'boolean');
  assert.equal(workflow.on.workflow_dispatch.inputs.runtime_proof.default, false);
  assert.equal(runtime.if, "github.event_name == 'workflow_dispatch' && inputs.runtime_proof");
  assert.match(commands, /check:security/);
  const measurements = gate.steps.find(
    (step) => step.name === 'Retain Anhedral Stack runtime measurements',
  );
  assert.equal(
    measurements.if,
    "always() && github.event_name == 'workflow_dispatch' && inputs.runtime_proof",
  );
  assert.equal(measurements.with['retention-days'], 1);
  assert.deepEqual(measurements.with.path.trim().split('\n'), [
    '.artifacts/anhedral-stack-runtime/summary.json',
    '.artifacts/anhedral-stack-runtime/measurements.json',
  ]);
  for (const step of gate.steps.filter((step) =>
    /plugin:build|create-release-artifact|upload-artifact/.test(
      (step.run || '') + (step.uses || ''),
    ),
  )) {
    if (step.name === 'Retain Anhedral Stack runtime measurements') continue;
    assert.match(step.if, /github.event_name == 'workflow_dispatch'/);
    assert.match(step.if, /github.ref == 'refs\/heads\/main'/);
  }
  const deep = parse(
    readFileSync(new URL('../.github/workflows/validation.yml', import.meta.url), 'utf8'),
  );
  assert.deepEqual(Object.keys(deep.on), ['workflow_dispatch']);
  assert.ok(deep.jobs.generated);
  assert.notEqual(deep.jobs.gate.name, 'CI gate');
  for (const job of Object.values(deep.jobs))
    for (const step of job.steps ?? [])
      if (/pnpm install/.test(step.run ?? '')) assert.match(step.run, /--ignore-scripts/);
  const release = parse(
    readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8'),
  );
  assert.equal(release.jobs.verify.strategy, undefined, 'publishing has no compatibility matrix');
  assert.equal(release.jobs.verify['runs-on'], 'ubuntu-latest');
});

test('main rejects topic PRs and identifies promotions without expanding hosted checks', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-promotion-'));
  try {
    const output = path.join(directory, 'output');
    const run = (head) =>
      execFileSync(process.execPath, ['scripts/checks/ci-scope.mjs'], {
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
