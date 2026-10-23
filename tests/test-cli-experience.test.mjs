import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readdirSync,
  rmSync,
  existsSync,
  writeFileSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { COMMAND_HELP, commandHelp } from '../dist/registry/usage.js';
import { formatResult } from '../dist/cli-output.js';
import { sourceDiff, sourcePreview, validatePreviewPath } from '../dist/registry/preview.js';

const cli = path.resolve('dist/bin.js');
const run = (root, ...args) =>
  spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, CI: '1', NO_COLOR: '1', ANHEDRAL_VERBOSE: '', ANHEDRAL_QUIET: '' },
  });

test('help is command-specific, offline and available without a usable project directory', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-cli-help-'));
  try {
    for (const command of Object.keys(COMMAND_HELP)) {
      const direct = run(root, command, '--help');
      const topic = run(root, 'help', command, '--cwd', path.join(root, 'absent'));
      assert.equal(direct.status, 0, direct.stderr);
      assert.equal(topic.stdout, direct.stdout);
      assert.match(direct.stdout, new RegExp(`Usage: anhedral ${command}`));
      assert.match(direct.stdout, /Options:|Examples:/);
    }
    assert.doesNotMatch(run(root, 'auth', '--help').stdout, /--platform|--owner/);
    assert.equal(JSON.parse(run(root, '--json', 'help', 'ship').stdout).usage, commandHelp('ship'));
    assert.match(run(root, '--help', '--cwd', path.join(root, 'absent')).stdout, /Start here:/);
    assert.match(run(root, '-v', '--cwd', path.join(root, 'absent')).stdout, /^\d+\.\d+\.\d+/);
    assert.deepEqual(readdirSync(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('global cwd, JSON and quiet flags compose without modifying the filesystem or polluting streams', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-cli-global-'));
  try {
    const before = readdirSync(root);
    const human = run(process.cwd(), '-c', root, 'init', 'planned', '--dry-run');
    assert.equal(human.status, 0, human.stderr);
    assert.match(human.stdout, /Stack preview|Stack: hono/);
    assert.equal(human.stderr, '');
    const machine = run(
      process.cwd(),
      '--json',
      '--quiet',
      'init',
      'planned',
      '--cwd',
      root,

      '--dry-run',
    );
    assert.equal(machine.status, 0, machine.stderr);
    assert.equal(JSON.parse(machine.stdout).root, path.join(realpathSync(root), 'planned'));
    assert.equal(machine.stderr, '');
    const quiet = run(root, 'init', 'planned', '--dry-run', '-q');
    assert.equal(quiet.stdout, '');
    assert.equal(quiet.status, 0);
    const diagnosis = run(root, 'doctor');
    assert.equal(diagnosis.status, 1);
    assert.match(diagnosis.stdout, /checks need attention/);
    assert.doesNotMatch(diagnosis.stdout, /^\{/);
    assert.deepEqual(readdirSync(root), before);
    assert.equal(existsSync(path.join(root, 'planned')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('invalid commands and flags suggest a correction, preserve JSON errors and never echo flag values', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-cli-suggestions-'));
  try {
    const typo = run(root, 'shipp', '--json');
    assert.equal(typo.status, 1);
    assert.equal(typo.stdout, '');
    assert.match(JSON.parse(typo.stderr).error, /Did you mean ship/);
    assert.equal(JSON.parse(typo.stderr).code, 'UNKNOWN_COMMAND');
    const flag = run(root, 'ship', '--dryrun', '--json');
    assert.match(JSON.parse(flag.stderr).error, /--dry-run/);
    assert.equal(JSON.parse(flag.stderr).nextAction, 'Run anhedral ship --help.');
    const confidential = run(
      root,
      'auth',
      '--private-key=fixture-confidential-value',
      '--json',
      '--quiet',
    );
    assert.doesNotMatch(confidential.stderr, /fixture-confidential-value/);
    assert.equal(confidential.status, 1);
    assert.equal(confidential.stdout, '');
    const duplicate = run(root, 'init', '--cwd', root, '--cwd', root, '--dry-run', '--json');
    assert.equal(JSON.parse(duplicate.stderr).code, 'INVALID_ARGUMENT');
    assert.deepEqual(readdirSync(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('current CLI has one initialization command and selects addition projects with cwd', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-cli-current-grammar-'));
  try {
    const removed = run(root, 'new', 'destination', '--dry-run', '--json');
    assert.equal(removed.status, 1);
    assert.equal(JSON.parse(removed.stderr).code, 'UNKNOWN_COMMAND');
    assert.equal(run(root, 'new', '--help').status, 1);
    assert.doesNotMatch(run(root, '--help').stdout, /compatibility alias/);
    const positional = run(root, 'add', './destination', 'stripe', '--dry-run', '--json');
    assert.equal(positional.status, 1);
    assert.equal(JSON.parse(positional.stderr).code, 'INVALID_ARGUMENT');
    assert.match(JSON.parse(positional.stderr).nextAction, /--cwd/);
    assert.deepEqual(readdirSync(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('inspect and services distinguish operational failures from invalid arguments and unknown commands', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-cli-error-codes-'));
  try {
    for (const [args, code] of [
      [['inspect', path.join(root, 'absent')], 'INSPECTION_FAILED'],
      [['inspect', root, 'extra-directory'], 'INVALID_ARGUMENT'],
      [['services', 'status'], 'INVALID_ARGUMENT'],
      [['services', 'unsupported'], 'INVALID_ARGUMENT'],
      [['services', 'status', 'binding:apps/api:D1:DB', '--table', 'notes'], 'INVALID_ARGUMENT'],
      [['services', 'status', 'binding:apps/api:D1:DB'], 'SERVICE_FAILED'],
    ]) {
      const result = run(root, ...args, '--json');
      assert.equal(result.status, 1, JSON.stringify(args));
      assert.equal(result.stdout, '');
      const error = JSON.parse(result.stderr);
      assert.equal(error.code, code, JSON.stringify(args));
      assert.equal(error.nextAction, `Run anhedral ${args[0]} --help.`);
    }
    assert.deepEqual(readdirSync(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('human provider summaries show actionable prerequisites without dumping credentials or raw diagnostics', () => {
  const result = formatResult('ship', {
    state: 'provider-configuration-required',
    integrations: {
      results: [
        {
          provider: 'stripe',
          ready: false,
          nextActions: ['Configure the Stripe webhook.'],
          runtime: { STRIPE_SECRET_KEY: 'confidential' },
        },
      ],
    },
    diagnostics: 'confidential',
  });
  assert.match(result, /stripe: setup pending/);
  assert.match(result, /Next: Configure/);
  assert.doesNotMatch(result, /confidential|STRIPE_SECRET_KEY|diagnostics/);
  const local = formatResult('doctor', {
    localReady: true,
    checks: [],
    prerequisiteChecks: [{ id: 'pnpm', ok: false, detail: 'missing', nextAction: 'Install pnpm.' }],
  });
  assert.match(local, /fail  pnpm/);
  assert.match(local, /Next: Install pnpm/);
});

test('source preview patches apply to real files, including EOF changes and new empty files', () => {
  for (const [before, after] of [
    [undefined, 'export const enabled = true;\n'],
    [undefined, ''],
    ['', 'new\n'],
    ['old\n', 'new\n'],
    ['same\n', 'same'],
    ['same', 'same\n'],
    ['old', 'new'],
    ['first\nsecond\nthird\n', 'first\ninserted\nsecond\nthird\n'],
    ['first\nsecond\nthird\n', 'first\nthird\n'],
    ['a\nb\nc\nd\ne\nf\ng\nh\ni\nj\n', 'a\nB\nc\nd\ne\nf\ng\nh\nI\nj\n'],
  ]) {
    const root = mkdtempSync(path.join(tmpdir(), 'anhedral-diff-patch-'));
    try {
      if (before !== undefined) writeFileSync(path.join(root, 'source.ts'), before);
      const patch = sourceDiff('source.ts', before, after);
      const applied = spawnSync('git', ['apply', '-'], {
        cwd: root,
        input: patch,
        encoding: 'utf8',
      });
      assert.equal(applied.status, 0, applied.stderr + '\n' + patch);
      assert.equal(readFileSync(path.join(root, 'source.ts'), 'utf8'), after);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test('source previews exclude private paths and report binary or oversized content explicitly', () => {
  for (const file of [
    '../outside.ts',
    '/outside.ts',
    '.env',
    'apps/api/.dev.vars',
    '.anhedral/providers.json',
    'x\\y',
    'file\nname',
  ])
    assert.throws(() => validatePreviewPath(file), /relative generated source/);
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-source-preview-'));
  try {
    writeFileSync(path.join(root, 'large.ts'), 'x'.repeat(256 * 1024 + 1));
    assert.match(sourcePreview(root, root, 'large.ts', 'view').unavailable, /oversized/);
    writeFileSync(path.join(root, 'binary.bin'), Buffer.from([0, 255]));
    assert.match(sourcePreview(root, root, 'binary.bin', 'diff').unavailable, /Binary/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('human auth output distinguishes runtime access from management permissions', () => {
  const result = formatResult('auth', {
    checks: [
      {
        provider: 'stripe',
        state: 'verified',
        access: 'runtime',
        nextAction: 'Supply an account-scoped STRIPE_SECRET_KEY for webhook provisioning.',
      },
    ],
    authenticated: true,
    provisioningReady: false,
    note: 'Authentication checks do not establish every provisioning permission.',
  });
  assert.match(result, /verified \(runtime access\)/);
  assert.match(result, /STRIPE_SECRET_KEY/);
  assert.match(result, /do not establish every provisioning permission/);
});
