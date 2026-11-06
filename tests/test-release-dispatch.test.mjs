import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';
import { recoveryJobs, validateRecoveryCandidate } from '../scripts/release-candidate-run.mjs';

const root = new URL('../', import.meta.url);
const read = (name) => parse(readFileSync(new URL(`.github/workflows/${name}.yml`, root), 'utf8'));
const caller = read('release-on-main');
const release = read('release');
const ci = read('ci');
const sri = 'sha512-' + Buffer.alloc(64).toString('base64');
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const step = (workflow, job, name) => workflow.jobs[job].steps.find((s) => s.name === name);

function shell(source, values) {
  const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-dispatch-'));
  try {
    return spawnSync('bash', ['-e', '-o', 'pipefail', '-c', source], {
      cwd: new URL('../', import.meta.url),
      encoding: 'utf8',
      env: { ...process.env, GITHUB_OUTPUT: path.join(directory, 'outputs'), ...values },
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const guard = step(caller, 'prepare', 'Require exact reviewed commit');
const valid = {
  REVIEWED_SHA: sha,
  DISPATCH_SHA: sha,
  REVIEWED_CLI: '',
  REVIEWED_PLUGIN: '',
  FINALIZE_ONLY: 'false',
};

test('normal release needs no copied hashes and uses the existing CI candidate', () => {
  assert.equal(caller.on.workflow_dispatch.inputs.release_sha.required, false);
  assert.equal(caller.on.workflow_dispatch.inputs.cli_integrity.required, false);
  assert.equal(caller.on.workflow_dispatch.inputs.plugin_integrity.required, false);
  assert.match(caller.jobs.prepare.if, /github.ref == 'refs\/heads\/main'/);
  assert.equal(guard.env.REVIEWED_SHA, '${{ inputs.release_sha || github.sha }}');
  assert.equal(shell(guard.run, valid).status, 0);
  assert.equal(caller.jobs.candidate.uses, './.github/workflows/ci.yml');
  assert.equal(
    ci.on.workflow_call.outputs.cli_integrity.value,
    '${{ jobs.gate.outputs.cli_integrity }}',
  );
  assert.match(caller.jobs.release.with.cli_integrity, /needs.candidate.outputs.cli_integrity/);
  assert.match(caller.jobs.release.if, /needs.candidate.result == 'success'/);
});

test('dispatch rejects stale source, partial/malformed expectations and unpinned recovery', () => {
  for (const override of [
    { DISPATCH_SHA: 'a'.repeat(40) },
    { REVIEWED_SHA: 'a'.repeat(40), DISPATCH_SHA: 'a'.repeat(40) },
    { REVIEWED_CLI: sri },
    { REVIEWED_PLUGIN: sri },
    { REVIEWED_CLI: 'bad', REVIEWED_PLUGIN: sri },
    { FINALIZE_ONLY: 'true' },
  ])
    assert.notEqual(
      shell(guard.run, { ...valid, ...override }).status,
      0,
      JSON.stringify(override),
    );
  assert.equal(shell(guard.run, { ...valid, REVIEWED_CLI: sri, REVIEWED_PLUGIN: sri }).status, 0);
  assert.equal(
    shell(guard.run, { ...valid, FINALIZE_ONLY: 'true', REVIEWED_CLI: sri, REVIEWED_PLUGIN: sri })
      .status,
    0,
  );
});

test('same-run candidate admission rejects external runs, other workflows and finalize-only', () => {
  const locate = step(release, 'verify', 'Locate successful main CI candidate').run;
  const env = {
    CANDIDATE_RUN_ID: '123',
    CURRENT_RUN_ID: '123',
    CALLER_WORKFLOW: 'anhedral/anhedral-cli/.github/workflows/release-on-main.yml@refs/heads/main',
    FINALIZE_ONLY: 'false',
  };
  assert.equal(shell(locate, env).status, 0);
  for (const override of [
    { CURRENT_RUN_ID: '456' },
    { CALLER_WORKFLOW: 'other' },
    { FINALIZE_ONLY: 'true' },
  ]) {
    assert.notEqual(shell(locate, { ...env, ...override }).status, 0);
  }
  assert.match(locate, /--workflow ci.yml --branch main --commit/);
  assert.match(locate, /--status success/);
  assert.match(locate, /select\(\.event == "push" or \.event == "workflow_dispatch"\)/);
});

test('publication keeps exact identity and environment approval without repeated package execution', () => {
  assert.equal(release.jobs.publish.environment, 'npm');
  assert.equal(release.jobs.publish.permissions['id-token'], 'write');
  assert.equal(release.jobs.portability, undefined);
  assert.equal(
    release.jobs.verify.steps.some((s) => /test-packed-cli/.test(s.run ?? '')),
    false,
  );
  const run = step(release, 'verify', 'Require the prepared main commit').run;
  const values = {
    RELEASE_SHA: sha,
    FINALIZE_ONLY: 'false',
    REVIEWED_CLI: sri,
    REVIEWED_PLUGIN: sri,
  };
  assert.equal(shell(run, values).status, 0);
  assert.notEqual(shell(run, { ...values, REVIEWED_CLI: '' }).status, 0);
  assert.equal(
    step(release, 'verify', 'Require existing exact publication before finalization').if,
    'inputs.finalize_only == true',
  );
});

test('published automatic candidates survive failed finalization and a main advance', () => {
  const previous = execFileSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8' }).trim();
  const run = {
    id: 123,
    repository: { full_name: 'anhedral/anhedral-cli' },
    head_repository: { full_name: 'anhedral/anhedral-cli' },
    head_branch: 'main',
    head_sha: previous,
    event: 'workflow_dispatch',
    path: '.github/workflows/release-on-main.yml',
    conclusion: 'failure',
  };
  const jobs = [
    {
      conclusion: 'success',
      steps: [
        'Build and verify Linux release candidate',
        'Share verified release candidate for review',
        'Summarize verified candidate',
      ].map((name) => ({ name, conclusion: 'success' })),
    },
  ];
  const expected = { runId: '123', sourceRevision: previous };
  assert.doesNotThrow(() => validateRecoveryCandidate(run, jobs, expected));
  assert.equal(
    shell(guard.run, {
      ...valid,
      REVIEWED_SHA: previous,
      FINALIZE_ONLY: 'true',
      RECOVERY_RUN_ID: '123',
      REVIEWED_CLI: sri,
      REVIEWED_PLUGIN: sri,
    }).status,
    0,
  );
  assert.notEqual(shell(guard.run, { ...valid, RECOVERY_RUN_ID: '123' }).status, 0);
  for (const change of [
    { id: 456 },
    { head_sha: sha },
    { head_branch: 'staging' },
    { event: 'pull_request' },
    { path: '.github/workflows/other.yml' },
    { repository: { full_name: 'other/cli' } },
    { head_repository: { full_name: 'other/cli' } },
  ])
    assert.throws(() => validateRecoveryCandidate({ ...run, ...change }, jobs, expected));
  assert.throws(() => validateRecoveryCandidate(run, [], expected));
  assert.throws(() =>
    validateRecoveryCandidate(run, [{ ...jobs[0], conclusion: 'failure' }], expected),
  );
  assert.throws(() =>
    validateRecoveryCandidate(run, [{ ...jobs[0], steps: jobs[0].steps.slice(0, 2) }], expected),
  );
  const registryGuard = step(
    release,
    'verify',
    'Require existing exact publication before finalization',
  );
  assert.match(registryGuard.run, /check-release-registry.mjs verify/);
  assert.equal(release.jobs.publish.if, 'inputs.finalize_only != true');
});

test('failed-job retries retain the successful immutable candidate from an earlier attempt', () => {
  const steps = [
    'Build and verify Linux release candidate',
    'Share verified release candidate for review',
    'Summarize verified candidate',
  ].map((name) => ({ name, conclusion: 'success' }));
  const calls = [];
  const jobs = recoveryJobs({ run_attempt: 2 }, (url) => {
    calls.push(url);
    return url.includes('/attempts/1/')
      ? { total_count: 1, jobs: [{ conclusion: 'success', steps }] }
      : { total_count: 1, jobs: [{ conclusion: 'failure', steps: [] }] };
  });
  assert.equal(calls.length, 2);
  assert.equal(
    jobs.some((j) => j.conclusion === 'success' && j.steps.length === 3),
    true,
  );
  assert.throws(() => recoveryJobs({ run_attempt: 0 }, () => {}));
});
