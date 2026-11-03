import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parse } from 'yaml';
import { needsFullCI, needsStackRuntime } from '../scripts/ci-scope.mjs';

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
        'full=true\nrelease=' +
          (env.GITHUB_EVENT_NAME === 'workflow_dispatch') +
          '\nstackRuntime=true\n',
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
    assert.equal(run(), 'full=false\nrelease=false\nstackRuntime=false\n');
    writeFileSync(path.join(directory, 'README.md'), 'Trailing space \n');
    git('commit', '--quiet', '-am', 'Whitespace defect');
    assert.throws(run, 'documentation whitespace defects must fail');
    assert.throws(() => readFileSync(output));
    writeFileSync(path.join(directory, 'README.md'), 'Clean documentation\n');
    git('commit', '--quiet', '-am', 'Fix whitespace');
    assert.equal(run(), 'full=false\nrelease=false\nstackRuntime=false\n');
    mkdirSync(path.join(directory, 'docs'));
    git('mv', 'source.ts', 'docs/source.md');
    git('commit', '--quiet', '-m', 'Move source');
    assert.equal(run(), 'full=true\nrelease=false\nstackRuntime=false\n');
    base = git('rev-parse', 'HEAD').trim();
    mkdirSync(path.join(directory, 'assets/launch'), { recursive: true });
    writeFileSync(path.join(directory, 'assets/launch/server.ts.txt'), 'export {};\n');
    git('add', '.');
    git('commit', '--quiet', '-m', 'Change canonical runtime template');
    assert.equal(run(), 'full=true\nrelease=false\nstackRuntime=true\n');
    base = 'a'.repeat(40);
    assert.throws(run);
    assert.throws(() => readFileSync(output));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('staging and main share one gate with scoped runtime smoke; broad validation stays manual', () => {
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
  const commands = gate.steps.map((step) => step.run || '').join('\n');
  assert.doesNotMatch(
    commands,
    /test:unit|test:patch|audit:osv|test-generated-apps|playwright|test:browser|plugin:check/,
  );
  assert.match(commands, /test-cli-validation/);
  for (const file of [
    'test-runtime-proof-receipt.test.mjs',
    'test-launch-init.test.mjs',
    'test-public-stack.test.mjs',
    'test-standard.test.mjs',
    'test-ui-stack.test.mjs',
    'test-deployment-contract.test.mjs',
    'test-tanstack-platform.test.mjs',
  ])
    assert.ok(commands.includes(`tests/${file}`), file);
  assert.doesNotMatch(commands, /next-runtime-smoke/);
  const runtime = gate.steps.find((step) => /tanstack-runtime-smoke/.test(step.run || ''));
  assert.equal(runtime.if, "steps.scope.outputs.stackRuntime == 'true'");
  assert.match(commands, /check:security/);
  const measurements = gate.steps.find(
    (step) => step.name === 'Retain Anhedral Stack runtime measurements',
  );
  assert.equal(measurements.if, "always() && steps.scope.outputs.stackRuntime == 'true'");
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
    assert.equal(readFileSync(output, 'utf8'), 'full=true\nrelease=true\nstackRuntime=true\n');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Anhedral Stack runtime scope covers canonical and shared source paths', () => {
  for (const file of [
    'src/launch.ts',
    'src/platforms/tanstack.ts',
    'src/platforms/web.ts',
    'src/render.ts',
    'src/registry/options.ts',
    'src/scaffold/styling.ts',
    'src/capability-recipes.ts',
    'src/capability-editor.ts',
    'src/capability-command.ts',
    'src/transaction.ts',
    'src/transaction-lock.ts',
    'src/composition.ts',
    'src/contracts/source-profile.ts',
    'src/cli-commands.ts',
    'src/command-schema.ts',
    'src/dependencies.ts',
    'assets/launch/minimal-server.ts.txt',
    'assets/launch/auth-client.ts.txt',
    'assets/stack/auth.ts.txt',
    'assets/stack/stripe.ts.txt',
    'assets/contracts/deployment.ts',
    'assets/ui/web/button.tsx',
    'assets/ui/catalog.json',
    'assets/security/audit.mjs',
    'pnpm-lock.yaml',
    'scripts/tanstack-runtime-smoke.mjs',
    'scripts/measure-worker.mjs',
    'scripts/generated-auth-runtime-proof.mjs',
    'scripts/runtime-proof-receipt.mjs',
    'scripts/prepare-cli.mjs',
    'tests/test-public-stack.test.mjs',
    'tests/test-tanstack-platform.test.mjs',
    '.github/workflows/ci.yml',
  ])
    assert.equal(needsStackRuntime([file]), true, file);
  for (const file of [
    'scripts/next-runtime-smoke.mjs',
    'tests/test-next-web.test.mjs',
    'docs/native-ui.md',
    'assets/ui/native/button.tsx',
    'README.md',
    'scripts/generated-auth-runtime-proof.mjs.bak',
    'scripts/runtime-proof-receipt.mjs.example',
    'scripts/tanstack-runtime-smoke.mjs.bak',
    'src/launch.ts.example',
  ])
    assert.equal(needsStackRuntime([file]), false, file);
  assert.equal(needsStackRuntime(['README.md', 'assets/launch/server.ts.txt']), true);
  assert.equal(needsStackRuntime([]), true);
});
