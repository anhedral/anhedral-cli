import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
const caller = parse(
  readFileSync(new URL('../.github/workflows/release-on-main.yml', import.meta.url), 'utf8'),
);
const release = parse(
  readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8'),
);
test('finalization cannot publish and requires exact registry identity before immutable completion', () => {
  assert.equal(caller.on.workflow_dispatch.inputs.finalize_only.default, false);
  assert.equal(release.jobs.publish.if, 'inputs.finalize_only != true');
  const steps = release.jobs.verify.steps;
  const registry = steps.findIndex(
    (step) => step.name === 'Require existing exact publication before finalization',
  );
  assert.ok(registry > steps.findIndex((step) => step.name === 'Verify release artifact'));
  assert.equal(steps[registry].if, 'inputs.finalize_only == true');
  assert.match(steps[registry].run, /check-release-registry.mjs verify/);
  const tags = release.jobs.tag.steps;
  assert.equal(
    tags.find((step) => step.name === 'Checkout published commit').with.ref,
    '${{ inputs.release_sha }}',
  );
  assert.ok(
    tags.findIndex((step) => step.name === 'Verify the exact artifact is already published') <
      tags.findIndex(
        (step) => step.name === 'Publish immutable plugin source from the verified ZIP',
      ),
  );
  assert.match(release.jobs.tag.if, /needs.verify.result == 'success'/);
  assert.match(release.jobs.tag.if, /needs.publish.result == 'skipped'/);
});
test('current-main admission remains required for publication; only historical-main finalization can resume', () => {
  if (process.platform === 'win32') return;
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-release-admission-'));
  try {
    const git = path.join(root, 'git');
    writeFileSync(
      git,
      '#!/bin/sh\nif [ "$1" = "rev-parse" ]; then printf "%s\\n" "$FAKE_HEAD"; elif [ "$1" = "merge-base" ]; then exit "$FAKE_ANCESTOR"; else exit 2; fi\n',
    );
    chmodSync(git, 0o755);
    const guard = caller.jobs.prepare.steps.find(
      (step) => step.name === 'Require exact reviewed commit',
    ).run;
    const reviewed = 'a'.repeat(40),
      integrity = 'sha512-' + Buffer.alloc(64).toString('base64');
    const run = (head, finalize, ancestor = 0) =>
      spawnSync('bash', ['-c', guard], {
        env: {
          ...process.env,
          PATH: root + path.delimiter + process.env.PATH,
          FAKE_HEAD: head,
          FAKE_ANCESTOR: String(ancestor),
          FINALIZE_ONLY: String(finalize),
          REVIEWED_SHA: reviewed,
          DISPATCH_SHA: head,
          RECOVERY_RUN_ID: '',
          REVIEWED_CLI: integrity,
          REVIEWED_PLUGIN: integrity,
          GITHUB_OUTPUT: path.join(root, 'output'),
        },
        encoding: 'utf8',
      });
    assert.equal(run(reviewed, false).status, 0);
    assert.notEqual(run('b'.repeat(40), false).status, 0);
    assert.equal(run('b'.repeat(40), true).status, 0);
    assert.notEqual(run('b'.repeat(40), true, 1).status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('historical finalization never reassigns GitHub latest release', () => {
  const release = readFileSync('.github/workflows/release.yml', 'utf8');
  assert.match(
    release,
    /if \[ "\$FINALIZE_ONLY" = "true" \]; then LATEST_ARGS=\(--latest=false\); fi/,
  );
  assert.match(release, /gh release create "\$TAG" \\\n\s+--draft "\$\{LATEST_ARGS\[@\]\}"/);
  assert.equal(
    (release.match(/gh release edit "\$TAG" --draft=false "\$\{LATEST_ARGS\[@\]\}"/g) ?? []).length,
    2,
  );
});
