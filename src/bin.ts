#!/usr/bin/env node
import { argv } from 'node:process';
import { runCommand } from './cli-commands.js';
import { STANDARD_USAGE, commandHelp } from './registry/usage.js';
import { GENERATOR_VERSION } from './version.js';
import { describeFailure } from './cli-errors.js';
import { commandDefinition, GLOBAL_OPTIONS } from './command-schema.js';
import {
  CliArgumentError,
  globalArguments,
  inlineArguments,
  validateCommand,
} from './cli-arguments.js';

const input = argv.slice(2);
let [command, ...args] = input;
const separator = input.indexOf('--');
let json = input.slice(0, separator < 0 ? undefined : separator).includes('--json');

function beforeSeparator(values: readonly string[]): readonly string[] {
  const end = values.indexOf('--');
  return values.slice(0, end < 0 ? undefined : end);
}
function helpRequested(): boolean {
  return (
    [undefined, '--help', '-h', 'help'].includes(command) ||
    beforeSeparator(args).some((arg) => arg === '--help' || arg === '-h')
  );
}
function printHelp(): void {
  let topics: string[] = [];
  if (command === 'help') {
    topics = beforeSeparator(args).filter((arg) => !['--json', '--help', '-h'].includes(arg));
  } else if (command && !['--help', '-h'].includes(command)) {
    topics = [command];
    let definition = commandDefinition(command);
    const options = [...(definition?.options ?? []), ...GLOBAL_OPTIONS];
    const values = beforeSeparator(args);
    let leafArguments = 0;
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      if (value.startsWith('-')) {
        const option = options.find((item) => item.flag === value || item.aliases?.includes(value));
        if (option?.arity && values[index + 1] && !values[index + 1].startsWith('-')) index++;
        continue;
      }
      if (!definition?.children) {
        leafArguments++;
        if (leafArguments > (definition?.positional?.max ?? 0))
          throw new CliArgumentError(
            'Unknown help topic.',
            `Run anhedral ${topics.join(' ')} --help.`,
          );
        continue;
      }
      topics.push(value);
      definition = definition.children[value];
      if (!definition) break;
    }
  }
  const help = topics.length ? commandHelp(topics) : STANDARD_USAGE;
  if (!help) throw new CliArgumentError('Unknown help topic.', 'Run anhedral --help.');
  console.log(json ? JSON.stringify({ usage: help }) : help);
}
function selectDirectory(directory: string): void {
  try {
    process.chdir(directory);
  } catch {
    throw new CliArgumentError(
      'Working directory is unavailable.',
      'Choose an existing directory with --cwd <directory>.',
    );
  }
}

async function main(): Promise<void> {
  const global = globalArguments(input);
  [command, ...args] = global.args;
  json = global.json;
  if (json) {
    const end = args.indexOf('--');
    args.splice(end < 0 ? args.length : end, 0, '--json');
  }
  args = inlineArguments(command, args);
  if (helpRequested()) return printHelp();
  validateCommand(command, args);
  if (['--version', '-v'].includes(command)) {
    console.log(json ? JSON.stringify({ version: GENERATOR_VERSION }) : GENERATOR_VERSION);
    return;
  }
  if (global.cwd) selectDirectory(global.cwd);
  if (global.quiet || json) process.env.ANHEDRAL_QUIET = '1';
  if (global.verbose && !json && !global.quiet) process.env.ANHEDRAL_VERBOSE = '1';
  await runCommand(command, args, {
    json,
    quiet: global.quiet,
    human: global.human,
    nonInteractive: global.nonInteractive,
  });
}

try {
  await main();
} catch (error) {
  const failure = describeFailure(error, command);
  console.error(
    json ? JSON.stringify(failure) : `Error: ${failure.error}\nNext: ${failure.nextAction}`,
  );
  process.exitCode = 1;
}
