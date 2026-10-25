/** Machine-readable option semantics; help is presentation, never parser input. */
export interface CommandOption {
  flag: string;
  aliases?: readonly string[];
  description: string;
  value?: string;
  arity?: 'required' | 'optional';
  repeatable?: boolean;
  hidden?: boolean;
}

export interface CommandDefinition {
  description: string;
  usage: string;
  options: readonly CommandOption[];
  examples: readonly string[];
  note?: string;
}

export const GLOBAL_OPTIONS: readonly CommandOption[] = [
  {
    flag: '--cwd',
    aliases: ['-c'],
    value: 'directory',
    arity: 'required',
    description: 'Run from a selected working directory.',
  },
  { flag: '--json', description: 'Return machine-readable output.' },
  {
    flag: '--quiet',
    aliases: ['-q'],
    description: 'Suppress human output; retain JSON and errors.',
  },
  { flag: '--verbose', description: 'Show local scaffolding tool output (human mode only).' },
  { flag: '--help', aliases: ['-h'], description: 'Show command help.' },
];

export function optionHelp(option: CommandOption): string {
  const flags = [...(option.aliases ?? []), option.flag].join(', ');
  const argument =
    option.arity === 'required'
      ? ` <${option.value}>`
      : option.arity === 'optional'
        ? ` [${option.value}]`
        : '';
  return `${flags}${argument}  ${option.description}`;
}

export function commandDefinition(command: string | undefined): CommandDefinition | undefined {
  return COMMANDS[command ?? ''];
}

export const COMMANDS: Readonly<Record<string, CommandDefinition>> = {
  init: {
    description: 'Scaffold Next.js, Expo, shadcn UI, Hono/workerd, Drizzle/D1 and private R2.',
    usage: 'init [directory] [options]',
    options: [
      { flag: '--skip-install', description: 'Write source without installing dependencies.' },
      { flag: '--git', description: 'Initialize a local Git repository.' },
      { flag: '--no-git', description: 'Skip Git initialization.' },
      { flag: '--dry-run', description: 'Preview the foundation without writes or network.' },
    ],
    examples: [
      'init my-app',
      'init my-app --dry-run --json',
      'init my-app --skip-install --no-git',
    ],
    note: 'Generated source belongs to you. Application features, authentication, payments and hosting are your responsibility. Init never provisions or deploys resources.',
  },
};
