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
  add: {
    description: 'Add selected stack capabilities to an existing Anhedral project.',
    usage: 'add <capabilities...> [options]',
    options: [
      { flag: '--with-dependencies', description: 'Explicitly include missing prerequisites.' },
      { flag: '--skip-install', description: 'Write source without installing dependencies.' },
      {
        flag: '--dry-run',
        description: 'Preview every file and prerequisite without writes or network.',
      },
    ],
    examples: [
      'add hono',
      'add database-auth',
      'add expo native-ui stripe revenuecat --with-dependencies --dry-run --json',
    ],
    note: 'Adds source and local configuration only. Existing edits are preserved. No provisioning, credential installation, migration or deployment.',
  },
  stack: {
    description: 'List capabilities and inspect declared source state.',
    usage: 'stack <list|status|doctor>',
    options: [],
    examples: ['stack list', 'stack status --json', 'stack doctor'],
    note: 'Installed source is not proof of live provider activation.',
  },
  ui: {
    description: 'Anhedral UI: one source-owned catalog for web and native.',
    usage: 'ui <init|add|list|diff|doctor> [components...] [options]',
    options: [
      { flag: '--web', description: 'Select the Next.js application.' },
      { flag: '--native', description: 'Select the Expo/NativeWind 4 application.' },
      { flag: '--all', description: 'Explicitly select every web/native application.' },
      { flag: '--dry-run', description: 'Show the installer plan without writes or network.' },
    ],
    examples: [
      'ui list',
      'ui add button --web',
      'ui add button --native',
      'ui diff button',
      'ui doctor',
    ],
    note: 'Component installation uses the pinned official shadcn CLI. Native falls back to React Native Reusables. No automatic overwrite, provider operations or full-parity promise.',
  },
  init: {
    description:
      'Scaffold Next.js/OpenNext with source-owned Anhedral UI; add capabilities only when needed.',
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
