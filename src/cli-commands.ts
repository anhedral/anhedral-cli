import { runCapabilityCommand } from './capability-command.js';
import { runUiCommand } from './ui-command.js';
import { commandArgumentError } from './cli-arguments.js';
import type { OutputOptions } from './cli-output.js';
import { parseStandardOptions, scaffoldStandardProject } from './standard.js';

export async function runCommand(
  command: string,
  args: string[],
  output: OutputOptions,
): Promise<void> {
  if (command === 'add' || command === 'stack') return runCapabilityCommand(command, args, output);
  if (command === 'ui') return runUiCommand(args, output);
  if (command !== 'init')
    throw commandArgumentError(command, 'Use init, add, stack or ui. Run anhedral --help.');
  let options;
  try {
    options = parseStandardOptions(args);
  } catch (error) {
    throw commandArgumentError('init', error instanceof Error ? error.message : String(error));
  }
  await scaffoldStandardProject(options, undefined, output);
}
