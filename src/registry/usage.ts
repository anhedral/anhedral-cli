import { COMMANDS, GLOBAL_OPTIONS, optionHelp } from '../command-schema.js';
export const COMMAND_HELP = Object.fromEntries(
  Object.entries(COMMANDS).map(([name, entry]) => [
    name,
    { ...entry, options: entry.options.map(optionHelp) },
  ]),
);
export function commandHelp(command: string): string | undefined {
  const entry = COMMAND_HELP[command];
  if (!entry) return undefined;
  return `${entry.description}\n\nUsage: anhedral ${entry.usage}\n\nOptions:\n${[...entry.options, ...GLOBAL_OPTIONS.map(optionHelp)].map((option) => `  ${option}`).join('\n')}\n\n${entry.note}\n`;
}
export const STANDARD_USAGE = `Anhedral — an open-source stack foundation\n\n${commandHelp('init')}\n${commandHelp('ui')}\n${commandHelp('add')}\n${commandHelp('stack')}\n  -v, --version  Show the CLI version.\n`;
