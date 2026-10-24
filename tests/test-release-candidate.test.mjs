import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';

const workflow = parse(
  readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'),
);
const scripts = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).scripts;

test('manual main candidate is verified after quick checks before immutable upload', () => {
  const job = workflow.jobs.gate;
  assert.equal(job['runs-on'], 'ubuntu-latest');
  assert.equal(job.strategy, undefined);
  const steps = job.steps;
  const candidate = steps.findIndex(
    (step) => step.name === 'Build and verify Linux release candidate',
  );
  assert.ok(candidate > steps.findIndex((step) => step.name === 'Fast contract smoke tests'));
  assert.ok(candidate > steps.findIndex((step) => step.name === 'Fast source checks'));
  assert.ok(
    candidate >
      steps.findIndex(
        (step) => step.name === 'Build plugin only for an explicitly requested main candidate',
      ),
  );
  assert.equal(
    steps[candidate].if,
    "github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'",
  );
  assert.deepEqual(steps[candidate].run.trim().split('\n'), [
    'node scripts/create-release-artifact.mjs',
    'pnpm release:artifact:verify',
    'pnpm release:artifact:smoke',
  ]);
  assert.match(
    scripts['release:artifact:verify'],
    /verify-release-artifact\.mjs \.artifacts\/release\/metadata\.json/,
  );
  assert.match(
    scripts['release:artifact:verify'],
    /check-release-secrets\.mjs \.artifacts\/release\/metadata\.json/,
  );
  assert.match(
    scripts['release:artifact:smoke'],
    /test-packed-cli\.js \.artifacts\/release\/metadata\.json/,
  );
  const upload = steps[candidate + 1];
  assert.equal(upload.if, steps[candidate].if);
  assert.equal(upload.uses, 'actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a');
  assert.deepEqual(upload.with, {
    name: 'release-candidate',
    path: '.artifacts/release/',
    'include-hidden-files': true,
    'if-no-files-found': 'error',
    'retention-days': 1,
    'compression-level': 0,
  });
  assert.equal(workflow.permissions.contents, 'read');
  assert.equal(workflow.permissions['id-token'], undefined);
  assert.equal(
    steps.some((step) => /npm publish/.test(step.run ?? '')),
    false,
  );
});

test('every exact-artifact smoke job provisions the generated workspace package manager first', () => {
  const release = parse(
    readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8'),
  );
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  let checked = 0;
  for (const owner of [workflow, release]) {
    for (const job of Object.values(owner.jobs)) {
      const steps = job.steps ?? [];
      const smoke = steps.findIndex((step) =>
        /test-packed-cli\.js|release:artifact:smoke/.test(step.run ?? ''),
      );
      if (smoke < 0) continue;
      const setup = steps.findIndex((step) => step.uses?.startsWith('pnpm/action-setup@'));
      assert.ok(setup >= 0 && setup < smoke, 'installed CLI smoke requires pnpm on PATH');
      assert.equal('pnpm@' + steps[setup].with.version, manifest.packageManager);
      assert.equal(
        steps[setup].with.run_install ?? false,
        false,
        'release smoke must not rebuild the reviewed artifact',
      );
      checked++;
    }
  }
  assert.equal(
    checked,
    3,
    'main candidate, release verification and exact artifact jobs are covered',
  );
});
