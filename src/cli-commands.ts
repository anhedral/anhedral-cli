import { runPlatformCommand } from './platform-command.js';
import { runStackUpdate } from './stack-update.js';
import { runCapabilityCommand } from './capability-command.js';
import { commandArgumentError } from './cli-arguments.js';
import { createReporter, type OutputOptions } from './cli-output.js';
import { scaffoldLaunchProject, parseAnhedralStackOptions } from './launch.js';
import { completionScript } from './completion.js';
import { commandArguments } from './cli-arguments.js';

export async function runCommand(
  command: string,
  args: string[],
  output: OutputOptions,
): Promise<void> {
  if (command === 'completion') {
    const parsed = commandArguments(command, args);
    const shell = parsed.positional[0] as 'bash' | 'zsh';
    const script = completionScript(shell);
    createReporter(output, () => script.trimEnd()).result({ shell, script });
    return;
  }
  if (
    [
      'login',
      'logout',
      'whoami',
      'projects',
      'link',
      'unlink',
      'source',
      'deploy',
      'env',
      'staging',
      'production',
      'logs',
    ].includes(command)
  )
    return runPlatformCommand(command, args, output);
  if (command === 'stack' && commandArguments('stack', args).positional[0] === 'update')
    return runStackUpdate(args, output);
  if (command === 'add' || command === 'stack') return runCapabilityCommand(command, args, output);
  if (command !== 'init')
    throw commandArgumentError(command, 'Use init, add or stack. Run anhedral --help.');
  let options;
  try {
    options = parseAnhedralStackOptions(args);
  } catch (error) {
    throw commandArgumentError('init', error instanceof Error ? error.message : String(error));
  }
  await scaffoldLaunchProject(options, undefined, output);
}
