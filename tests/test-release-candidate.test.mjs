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

test('Linux release candidate is verified and executed after tests before its immutable upload', () => {
  const job = workflow.jobs.checks;
  assert.equal(job['runs-on'], 'ubuntu-latest');
  assert.deepEqual(job.needs, ['scope', 'plugin-ui']);
  assert.ok(job.strategy.matrix.node.includes('24.21.0'));
  const steps = job.steps;
  const candidate = steps.findIndex(
    (step) => step.name === 'Build and verify Linux release candidate',
  );
  assert.ok(candidate > steps.findIndex((step) => step.name === 'Run unit tests'));
  const patches = steps.findIndex((step) => step.run === 'pnpm test:patch');
  assert.ok(patches >= 0);
  assert.ok(candidate > patches);
  assert.ok(candidate > steps.findIndex((step) => step.name === 'Restore verified plugin runtime'));
  assert.equal(
    steps[candidate].if,
    "${{ needs.scope.outputs.full == 'true' && (matrix.node == '24.21.0' && github.ref == 'refs/heads/main' && github.event_name != 'pull_request') }}",
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
