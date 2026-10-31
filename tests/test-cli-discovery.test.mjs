import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import {
  commandArguments,
  globalArguments,
  inlineArguments,
  validateCommand,
} from '../dist/cli-arguments.js';
import { commandDefinition, commandTopic } from '../dist/command-schema.js';
import { commandHelp, STANDARD_USAGE } from '../dist/registry/usage.js';
import { parseStandardOptions } from '../dist/registry/options.js';

test('root help is compact and detailed topics render existing examples', () => {
  assert.ok(STANDARD_USAGE.trimEnd().split('\n').length <= 45);
  assert.match(STANDARD_USAGE, /anhedral init my-app/);
  assert.match(STANDARD_USAGE, /Expo/);
  assert.match(commandHelp('init'), /Examples:\n  anhedral init my-app/);
  assert.doesNotMatch(commandHelp('whoami'), /undefined/);
  const upload = commandHelp(['source', 'upload']);
  assert.match(upload, /Usage: anhedral source upload/);
  assert.match(upload, /--dry-run/);
  assert.match(commandHelp('deploy plan'), /--manifest <file>/);
  assert.doesNotMatch(commandHelp('deploy prepare'), /--manifest/);
  assert.equal(commandHelp('deploy garbage'), undefined);
  assert.equal(commandHelp('deploy plan garbage'), undefined);
  assert.equal(commandHelp('__proto__'), undefined);
});

test('structured child commands describe completion and positional semantics', () => {
  assert.deepEqual(Object.keys(commandDefinition('stack').children), ['list', 'status', 'doctor']);
  assert.equal(commandTopic(['ui', 'add']).positional.kind, 'component');
  assert.equal(commandDefinition('add').positional.kind, 'capability');
  assert.equal(
    commandTopic(['deploy', 'plan']).options.find((o) => o.flag === '--manifest').kind,
    'file',
  );
  assert.deepEqual(commandDefinition('completion').positional.choices, ['bash', 'zsh']);
});

test('init uses the shared positional grammar and preserves its exported option contract', () => {
  const before = parseStandardOptions(['my-app', '--dry-run', '--json', '--skip-install']);
  const after = parseStandardOptions(['--dry-run', '--json', 'my-app', '--skip-install']);
  assert.deepEqual(before, after);
  assert.equal(after.root, path.resolve('my-app'));
  assert.equal(after.initializeGit, true);
  assert.throws(() => parseStandardOptions(['', '--dry-run']), /valid initialization directory/);
  assert.equal(parseStandardOptions(['my-app', '--dry-run', '--dry-run']).dryRun, true);
  assert.equal(parseStandardOptions(['my-app', '--git', '--git']).initializeGit, true);
  assert.equal(parseStandardOptions(['--dry-run']).initializeGit, false);
  assert.equal(parseStandardOptions(['my-app', '--no-git']).initializeGit, false);
  assert.equal(parseStandardOptions(['--git']).initializeGit, true);
  assert.equal(parseStandardOptions(['--dry-run', '--', '-sample']).root, path.resolve('-sample'));
  assert.throws(() => parseStandardOptions(['one', 'two']), /directory/);
  assert.throws(() => parseStandardOptions(['--git', '--no-git']), /Choose one/);
  assert.throws(() => parseStandardOptions(['--unknown']), /Unknown init option/);
});

test('global, inline and command parsers respect end-of-options', () => {
  const global = globalArguments(['--json', 'init', '--dry-run', '--', '--human', '--cwd=literal']);
  assert.equal(global.json, true);
  assert.equal(global.human, false);
  assert.equal(global.cwd, undefined);
  assert.deepEqual(global.args, ['init', '--dry-run', '--', '--human', '--cwd=literal']);
  assert.deepEqual(inlineArguments('deploy', ['--manifest=a.json', '--', '--manifest=b.json']), [
    '--manifest',
    'a.json',
    '--',
    '--manifest=b.json',
  ]);
  const literal = commandArguments('init', ['--dry-run', '--', '--json']);
  assert.deepEqual(literal.positional, ['--json']);
  assert.equal(literal.has('--json'), false);
  assert.equal(globalArguments(['whoami', '--credential-file', '--json']).json, true);
  assert.throws(
    () => commandArguments('whoami', ['--credential-file', '--json']),
    /Supply a value/,
  );
  assert.equal(globalArguments(['--human', '--non-interactive', 'whoami']).nonInteractive, true);
  assert.throws(() => globalArguments(['--human', '--json', 'whoami']), /Choose --json or --human/);
});

test('nested grammar validates before command handlers and preserves family option ordering', () => {
  assert.throws(() => validateCommand('deploy', ['plam']), /Did you mean plan/);
  assert.throws(() => validateCommand('source', ['status', 'extra']), /no extra arguments/);
  assert.throws(() => validateCommand('stack', []), /Choose stack/);
  assert.throws(() => validateCommand('login', ['--start', '--resume']), /Choose one/);
  assert.throws(() => validateCommand('ui', ['list', '--web', '--native']), /Choose one/);
  assert.throws(() => validateCommand('completion', ['fish']), /Choose bash, zsh/);
  assert.doesNotThrow(() => validateCommand('source', ['--dry-run', 'upload']));
  // Accepted no-op family flags remain accepted for older scripts.
  assert.doesNotThrow(() => validateCommand('source', ['status', '--new']));
  assert.doesNotThrow(() => validateCommand('ui', ['list', '--dry-run']));
  assert.throws(
    () => validateCommand('init', ['--skip-install', '--skip-install']),
    /Specify --skip-install once/,
  );
});
