#!/usr/bin/env node
import { argv } from 'node:process';
import { runCommand } from './cli-commands.js';
import { DELIVERY_COMMANDS } from './cli-delivery.js';
import { STANDARD_USAGE, commandHelp } from './registry/usage.js';
import { GENERATOR_VERSION } from './version.js';
import { PostCommitError } from './transaction.js';
import {
  CliArgumentError,
  globalArguments,
  inlineArguments,
  validateCommand,
} from './cli-arguments.js';

let [command, ...args] = argv.slice(2);
let json = argv.includes('--json');

function helpRequested(): boolean {
  return (
    [undefined, '--help', '-h', 'help'].includes(command) ||
    args.includes('--help') ||
    args.includes('-h')
  );
}
function printHelp(): void {
  const target =
    command === 'help'
      ? args.filter((arg) => arg !== '--json')[0]
      : ['--help', '-h'].includes(command)
        ? undefined
        : command;
  const help = target ? commandHelp(target) : STANDARD_USAGE;
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
  const global = globalArguments(argv.slice(2));
  [command, ...args] = global.args;
  json = global.json;
  if (json) args.push('--json');
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
  await runCommand(command, args, { json, quiet: global.quiet });
}

const errorCodes: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    [...DELIVERY_COMMANDS, 'repository', 'integrations'].map((name) => [name, 'DELIVERY_FAILED']),
  ),
  inspect: 'INSPECTION_FAILED',
  services: 'SERVICE_FAILED',
  auth: 'AUTH_FAILED',
  doctor: 'INVALID_ARGUMENT',
  init: 'GENERATION_FAILED',
  add: 'ADDITION_FAILED',
  registry: 'REGISTRY_FAILED',
};
function failureCode(error: unknown): string {
  if (error instanceof CliArgumentError) return error.code;
  if (error instanceof PostCommitError) return 'POST_COMMIT_FAILED';
  return Object.hasOwn(errorCodes, command ?? '') ? errorCodes[command!] : 'UNKNOWN_COMMAND';
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const code = failureCode(error);
  const nextAction =
    error instanceof CliArgumentError
      ? error.nextAction
      : `Run anhedral ${command && commandHelp(command) ? command + ' ' : ''}--help.`;
  console.error(
    json
      ? JSON.stringify({ error: message, code, nextAction })
      : `Error: ${message}\nNext: ${nextAction}`,
  );
  process.exitCode = 1;
}
