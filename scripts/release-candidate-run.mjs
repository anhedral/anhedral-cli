import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A failed publication may still contain a fully verified immutable candidate.
// Recovery admits that candidate, never the failed run's publication outcome.
export function validateRecoveryCandidate(run, jobs, { runId, sourceRevision }) {
  assert.match(runId, /^[1-9]\d*$/);
  assert.match(sourceRevision, /^[a-f0-9]{40}$/);
  assert.equal(String(run.id), runId, 'Candidate run identity differs');
  assert.equal(run.repository?.full_name, 'anhedral/anhedral-cli');
  assert.equal(run.head_repository?.full_name, 'anhedral/anhedral-cli');
  assert.equal(run.head_branch, 'main');
  assert.equal(run.head_sha, sourceRevision, 'Candidate source differs');
  assert.equal(run.event, 'workflow_dispatch');
  assert.equal(run.path, '.github/workflows/release-on-main.yml');
  assert.ok(
    jobs.some(
      (job) =>
        job.conclusion === 'success' &&
        [
          'Build and verify Linux release candidate',
          'Share verified release candidate for review',
          'Summarize verified candidate',
        ].every((name) =>
          job.steps?.some((step) => step.name === name && step.conclusion === 'success'),
        ),
    ),
    'Recovery requires successful candidate preparation and immutable upload',
  );
}

export function recoveryJobs(run, api) {
  assert.ok(Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0);
  const jobs = [];
  // Re-run-failed-jobs omits successful jobs from earlier attempts. Check the
  // original preparation as well, while retaining bounded API work.
  const oldest = Math.max(1, run.run_attempt - 9);
  for (let attempt = run.run_attempt; attempt >= oldest; attempt--) {
    let count = 0;
    for (let page = 1; page <= 10; page++) {
      const result = api(`/attempts/${attempt}/jobs?per_page=100&page=${page}`);
      assert.ok(Array.isArray(result.jobs) && Number.isSafeInteger(result.total_count));
      jobs.push(...result.jobs);
      count += result.jobs.length;
      if (count >= result.total_count) break;
      assert.ok(page < 10, 'Candidate job inventory exceeds recovery bound');
    }
  }
  return jobs;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const runId = process.env.CANDIDATE_RUN_ID;
  assert.match(runId ?? '', /^[1-9]\d*$/);
  const api = (suffix) =>
    JSON.parse(
      execFileSync('gh', ['api', `repos/anhedral/anhedral-cli/actions/runs/${runId}${suffix}`], {
        encoding: 'utf8',
        maxBuffer: 2 * 1024 * 1024,
      }),
    );
  const run = api('');
  const jobs = recoveryJobs(run, api);
  validateRecoveryCandidate(run, jobs, { runId, sourceRevision: process.env.RELEASE_SHA });
  console.log(`Verified recovery candidate run ${runId} at ${run.head_sha}`);
}
