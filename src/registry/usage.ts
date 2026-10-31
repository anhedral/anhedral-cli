import { COMMANDS, GLOBAL_OPTIONS, optionHelp, commandTopic } from '../command-schema.js';
export const COMMAND_HELP = Object.fromEntries(
  Object.entries(COMMANDS).map(([name, entry]) => [
    name,
    { ...entry, options: entry.options.map(optionHelp) },
  ]),
);
export function commandHelp(command: string | readonly string[]): string | undefined {
  const topic = typeof command === 'string' ? command.trim().split(/\s+/) : command;
  const entry = commandTopic(topic);
  if (!entry) return undefined;
  const children = entry.children
    ? '\nCommands:\n' +
      Object.entries(entry.children)
        .map(([name, child]) => `  ${name.padEnd(10)} ${child.description}`)
        .join('\n') +
      '\n'
    : '';
  const examples = entry.examples.length
    ? '\nExamples:\n' + entry.examples.map((example) => `  anhedral ${example}`).join('\n') + '\n'
    : '';
  return `${entry.description}\n\nUsage: anhedral ${entry.usage}\n${children}${examples}\nOptions:\n${[
    ...entry.options,
    ...GLOBAL_OPTIONS,
  ]
    .filter((option) => !option.hidden)
    .map((option) => `  ${optionHelp(option)}`)
    .join(
      '\n',
    )}\n${entry.note ? `\n${entry.note}\n` : ''}\nDocs: https://github.com/anhedral/anhedral-cli#readme\n`;
}
export const STANDARD_USAGE = `Anhedral CLI — source generation and optional Platform access

Usage: anhedral <command> [options]

Start a project:
  init          Scaffold Next.js with Anhedral UI.
  add           Add API, data, Expo and other source capabilities.

Inspect source and UI:
  stack         List capabilities, inspect source or run doctor.
  ui            Initialize, add, list, diff or check UI components.

Optional Platform access:
  login/logout  Approve or revoke a CLI session.
  whoami        Inspect the current identity and optional local context.
  link/unlink   Select an existing project or remove its local link.
  source        Upload source or inspect its receipt.
  deploy        Plan, prepare or inspect a candidate; never activates it.

Shell setup:
  completion    Print Bash or zsh completion without editing profiles.

Examples:
  anhedral init my-app
  anhedral add hono --dry-run
  anhedral stack list

Global options:
${GLOBAL_OPTIONS.map((option) => '  ' + optionHelp(option)).join('\n')}
  -v, --version  Show the CLI version.

Run anhedral <command> --help for options and examples.
Docs: https://github.com/anhedral/anhedral-cli#readme
Issues: https://github.com/anhedral/anhedral-cli/issues
`;
