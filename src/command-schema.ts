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

const PLATFORM_OPTIONS: readonly CommandOption[] = [
  {
    flag: '--api-url',
    value: 'origin',
    arity: 'required',
    description: 'Explicit Platform API origin; defaults to https://platform.anhedral.com.',
  },
  {
    flag: '--credential-file',
    value: 'file',
    arity: 'required',
    description: 'Explicit owner-only credential file instead of the OS secret store.',
  },
];
export const COMMANDS: Readonly<Record<string, CommandDefinition>> = {
  login: {
    description: 'Approve a short-lived CLI session in your browser.',
    usage: 'login [--start|--resume]',
    options: [
      ...PLATFORM_OPTIONS,
      { flag: '--start', description: 'Start approval and return without polling.' },
      { flag: '--resume', description: 'Resume saved browser approval.' },
    ],
    examples: ['login', 'login --start --json', 'login --resume'],
    note: 'Device secrets and API tokens stay in your credential store. Server CLI access must be configured.',
  },
  logout: {
    description: 'Revoke this CLI session.',
    usage: 'logout',
    options: PLATFORM_OPTIONS,
    examples: ['logout'],
    note: 'Revokes server access before clearing local credentials.',
  },
  whoami: {
    description: 'Show the current CLI identity.',
    usage: 'whoami',
    options: PLATFORM_OPTIONS,
    examples: ['whoami --json'],
  },
  link: {
    description: 'Link this workspace to an existing project.',
    usage: 'link --project <uuid> --team <uuid>',
    options: [
      ...PLATFORM_OPTIONS,
      { flag: '--project', value: 'uuid', arity: 'required', description: 'Existing project ID.' },
      { flag: '--team', value: 'uuid', arity: 'required', description: 'Owning team ID.' },
    ],
    examples: ['link --project <uuid> --team <uuid>'],
    note: 'Requires current project build access. Existing application identities are preserved.',
  },
  unlink: {
    description: 'Remove the local project link.',
    usage: 'unlink',
    options: PLATFORM_OPTIONS,
    examples: ['unlink'],
  },
  deploy: {
    description: 'Plan deployment and reserve a candidate from sealed source.',
    usage: 'deploy <plan|prepare|status> [options]',
    options: [
      ...PLATFORM_OPTIONS,
      {
        flag: '--manifest',
        value: 'file',
        arity: 'required',
        description: 'Explicit deployment manifest matching sealed source.',
      },
      {
        flag: '--new',
        description: 'Explicitly create a new plan request after inputs or routing change.',
      },
    ],
    examples: ['deploy plan --manifest deployment.json', 'deploy prepare', 'deploy status'],
    note: 'Preparation runs an isolated build only with exact server runtime admission and a configured private builder; otherwise it awaits runtime. No preview or deployment is activated.',
  },
  source: {
    description: 'Upload an immutable source checkpoint with resumable chunks.',
    usage: 'source <upload|status> [options]',
    options: [
      ...PLATFORM_OPTIONS,
      { flag: '--dry-run', description: 'Package and inspect source without upload.' },
      { flag: '--new', description: 'Explicitly start a new request after changing source.' },
    ],
    examples: ['source upload --dry-run', 'source upload', 'source status'],
    note: 'Honors .gitignore, excludes secrets and generated files, rejects symlinks and credential material. Sealing source does not enable hosted admission or deploy.',
  },

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
