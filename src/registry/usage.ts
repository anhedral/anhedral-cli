import { COMMANDS, GLOBAL_OPTIONS, optionHelp } from '../command-schema.js';

// Preserve the presentation API for consumers; all option text comes from typed definitions.
export const COMMAND_HELP = Object.fromEntries(
  Object.entries(COMMANDS).map(([name, entry]) => [
    name,
    { ...entry, options: entry.options.filter((option) => !option.hidden).map(optionHelp) },
  ]),
);

const primary = ['init', 'auth', 'ship', 'add', 'registry', 'inspect', 'doctor', 'connect'];
const common = GLOBAL_OPTIONS.map(optionHelp);

export function commandHelp(command: string): string | undefined {
  if (command === 'new')
    return commandHelp('init')
      ?.replace('Usage: anhedral init', 'Usage: anhedral new')
      .concat('\nCompatibility alias: new requires a destination directory.\n');
  const entry = COMMAND_HELP[command];
  if (!entry) return undefined;
  return `${entry.description}\n\nUsage: anhedral ${entry.usage}\n\nOptions:\n${[...entry.options, ...common].map((option) => `  ${option}`).join('\n')}\n\nExamples:\n${entry.examples.map((example) => `  anhedral ${example}`).join('\n')}${entry.note ? `\n\n${entry.note}` : ''}\n`;
}

export const STANDARD_USAGE = `Anhedral\nScaffold source, authenticate your providers, and ship your selected stack.\n\nUsage: anhedral <command> [options]\n\nStart here:\n${primary.map((name) => `  ${name.padEnd(12)}${COMMAND_HELP[name].description}`).join('\n')}\n\nDelivery tools:\n${Object.entries(
  COMMAND_HELP,
)
  .filter(([name]) => !primary.includes(name))
  .map(([name, entry]) => `  ${name.padEnd(12)}${entry.description}`)
  .join(
    '\n',
  )}\n\nDefault: Vinext on Cloudflare Workers, from the official shadcn pnpm/Turborepo monorepo.\nExamples:\n  anhedral init client-app\n  anhedral auth client-app\n  anhedral ship client-app --dry-run\n\nUse anhedral <command> --help for options and examples.\nUse anhedral help <command> for the same focused help.\nGlobal options:\n${common.map((option) => `  ${option}`).join('\n')}\n  -v, --version  Show the CLI version.\n\nnew remains a compatibility alias for init with an explicit destination.\n`;
