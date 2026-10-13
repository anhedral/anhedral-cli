import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COMMANDS, GLOBAL_OPTIONS, commandDefinition, optionHelp } from '../dist/command-schema.js';
import {
  CliArgumentError,
  globalArguments,
  inlineArguments,
  validateCommand,
} from '../dist/cli-arguments.js';
import { COMMAND_HELP, commandHelp } from '../dist/registry/usage.js';

const invalid = (command, args, pattern) =>
  assert.throws(
    () => validateCommand(command, args),
    (error) => error instanceof CliArgumentError && pattern.test(error.message),
  );

test('every command has unique typed flags, valid arity and derived help', () => {
  for (const [name, command] of Object.entries(COMMANDS)) {
    const flags = command.options.flatMap((option) => [option.flag, ...(option.aliases ?? [])]);
    assert.equal(new Set(flags).size, flags.length, name);
    for (const option of command.options) {
      assert.match(option.flag, /^--[a-z][a-z0-9-]*$/);
      assert.equal(Boolean(option.arity), Boolean(option.value), option.flag);
      if (!option.hidden) assert.ok(commandHelp(name).includes(optionHelp(option)));
    }
    assert.deepEqual(
      COMMAND_HELP[name].options,
      command.options.filter((option) => !option.hidden).map(optionHelp),
    );
  }
  assert.equal(commandDefinition('new'), COMMANDS.init);
  assert.equal(commandDefinition('unrecognized'), undefined);
  for (const option of GLOBAL_OPTIONS) assert.ok(commandHelp('ship').includes(optionHelp(option)));
});

test('all declared value options normalize inline input and reject missing or duplicate values', () => {
  for (const [name, command] of Object.entries(COMMANDS)) {
    for (const option of command.options.filter((entry) => entry.arity)) {
      const normalized = inlineArguments(name, [`${option.flag}=fixture-value`]);
      assert.deepEqual(normalized, [option.flag, 'fixture-value']);
      assert.doesNotThrow(() => validateCommand(name, normalized));
      if (option.arity === 'required') {
        invalid(name, [option.flag], /Supply a value/);
        invalid(name, [option.flag, '--json'], /Supply a value/);
      } else assert.doesNotThrow(() => validateCommand(name, [option.flag, '--json']));
      if (!option.repeatable) invalid(name, [option.flag, 'one', option.flag, 'two'], /once/);
      assert.throws(() => inlineArguments(name, [`${option.flag}=`]), /Supply a value/);
      assert.throws(() => inlineArguments(name, [`${option.flag}=--json`]), /Supply a value/);
    }
  }
});

test('boolean flags reject inline values without disclosing their content', () => {
  for (const [name, command] of Object.entries(COMMANDS)) {
    for (const option of command.options.filter((entry) => !entry.arity)) {
      assert.doesNotThrow(() => validateCommand(name, [option.flag]));
      invalid(name, [`${option.flag}=sensitive-fixture`], /does not accept/);
      try {
        validateCommand(name, [`${option.flag}=sensitive-fixture`]);
      } catch (error) {
        assert.doesNotMatch(error.message, /sensitive-fixture/);
      }
    }
  }
});

test('optional previews, repeatable members and product switches remain supported', () => {
  assert.doesNotThrow(() => validateCommand('add', ['resend', '--diff', '--skip-install']));
  assert.doesNotThrow(() => validateCommand('add', ['resend', '--view', 'apps/api/index.ts']));
  assert.doesNotThrow(() =>
    validateCommand('connect', [
      '--allow-email',
      'a@example.com',
      '--allow-email',
      'b@example.com',
    ]),
  );
  assert.doesNotThrow(() =>
    validateCommand('new', ['destination', '--expo', '--neon', '--dry-run']),
  );
  assert.doesNotThrow(() => validateCommand('init', ['--hosting=cloudflare', '--hono']));
  invalid('ship', ['--dryrun'], /Did you mean --dry-run/);
  invalid('auth', ['--platform', 'android'], /Unknown auth option/);
  invalid('auth', ['--provider', 'neon', '--provider=clerk'], /once/);
});

test('global aliases and inline cwd normalize independently of command position', () => {
  assert.deepEqual(globalArguments(['-q', 'ship', '--cwd=project', '--verbose', '--json']), {
    args: ['ship'],
    cwd: 'project',
    quiet: true,
    verbose: true,
    json: true,
  });
  assert.deepEqual(globalArguments(['auth', '-c', 'project', '--status']).args, [
    'auth',
    '--status',
  ]);
  assert.throws(() => globalArguments(['--cwd=one', '-c', 'two']), /Specify one/);
  assert.throws(() => globalArguments(['--cwd', '--json']), /Specify one/);
});
