import assert from 'node:assert/strict';
import test from 'node:test';
import { createReporter } from '../dist/cli-output.js';
import { CliFailure, describeFailure } from '../dist/cli-errors.js';
import { CliArgumentError } from '../dist/cli-arguments.js';
import { PostCommitError } from '../dist/transaction.js';

function output(options = {}, defaultJson = false) {
  let stdout = '',
    stderr = '';
  const io = {
    out: {
      write: (text) => {
        stdout += text;
      },
    },
    err: {
      write: (text) => {
        stderr += text;
      },
    },
    stdinTTY: true,
    stdoutTTY: true,
    stderrTTY: true,
    ci: false,
    ...options.io,
  };
  const reporter = createReporter({ ...options, io }, () => 'Human result', defaultJson);
  return { reporter, stdout: () => stdout, stderr: () => stderr };
}

test('reporter keeps result and diagnostics in independent streams', () => {
  const captured = output();
  captured.reporter.result({ status: 'ready' });
  captured.reporter.diagnostic('Review configuration');
  captured.reporter.progress('Preparing');
  assert.equal(captured.stdout(), 'Human result\n');
  assert.equal(captured.stderr(), 'Review configuration\nPreparing\n');
});

test('explicit JSON is clean and survives quiet for human and legacy JSON families', () => {
  for (const defaultJson of [false, true]) {
    const captured = output({ json: true, quiet: true }, defaultJson);
    captured.reporter.result({ status: 'ready' });
    captured.reporter.diagnostic('hidden');
    captured.reporter.progress('hidden');
    assert.deepEqual(JSON.parse(captured.stdout()), { status: 'ready' });
    assert.equal(captured.stderr(), '');
    assert.equal(captured.reporter.canPrompt, false);
  }
});

test('quiet suppresses implicit JSON while legacy Platform stdout remains compact JSON', () => {
  const legacy = output({}, true);
  legacy.reporter.result({ status: 'ready' });
  legacy.reporter.diagnostic('Approve in browser');
  assert.equal(legacy.stdout(), '{"status":"ready"}\n');
  assert.equal(legacy.stderr(), 'Approve in browser\n');
  const quiet = output({ quiet: true }, true);
  quiet.reporter.result({ status: 'ready' });
  quiet.reporter.diagnostic('hidden');
  assert.equal(quiet.stdout() + quiet.stderr(), '');
  const human = output({ human: true }, true);
  human.reporter.result({ status: 'ready' });
  assert.equal(human.stdout(), 'Human result\n');
});

test('prompt eligibility requires both terminals and excludes CI, quiet, JSON and headless mode', () => {
  assert.equal(output().reporter.canPrompt, true);
  for (const options of [
    { io: { stdinTTY: false } },
    { io: { stdoutTTY: false } },
    { io: { ci: true } },
    { nonInteractive: true },
    { quiet: true },
    { json: true },
  ])
    assert.equal(output(options).reporter.canPrompt, false, JSON.stringify(options));
  const redirected = output({ io: { stderrTTY: false } });
  redirected.reporter.progress('hidden');
  redirected.reporter.result({ status: 'ready' });
  assert.equal(redirected.stdout(), 'Human result\n');
  assert.equal(redirected.stderr(), '');
});

test('typed failures retain old fields, classify known commands and expose post-commit state', () => {
  const usage = describeFailure(
    new CliArgumentError('Invalid origin', 'Choose --api-url'),
    'whoami',
  );
  assert.equal(usage.code, 'INVALID_ARGUMENT');
  assert.equal(usage.category, 'usage');
  const network = describeFailure(
    new CliFailure(
      'Interrupted',
      'PLATFORM_ACCESS_FAILED',
      'Retry the same command.',
      'network',
      true,
    ),
    'source',
  );
  assert.equal(network.code, 'PLATFORM_ACCESS_FAILED');
  assert.equal(network.retryable, true);
  assert.equal(network.nextAction, 'Retry the same command.');
  const committed = describeFailure(
    new PostCommitError(['package.json'], new Error('install failed')),
    'add',
  );
  assert.equal(committed.code, 'POST_COMMIT_FAILED');
  assert.deepEqual(committed.details.committedPaths, ['package.json']);
  assert.match(committed.nextAction, /files were kept/i);
  assert.equal(committed.retryable, false);
  assert.equal(describeFailure(new Error('Unexpected'), 'deploy').code, 'PLATFORM_COMMAND_FAILED');
  assert.equal(describeFailure(new Error('Unexpected'), 'ui').code, 'UI_COMMAND_FAILED');
});
