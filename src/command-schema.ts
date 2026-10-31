/** Machine-readable option semantics; help is presentation, never parser input. */
export interface CommandOption {
  flag: string;
  aliases?: readonly string[];
  description: string;
  value?: string;
  arity?: 'required' | 'optional';
  repeatable?: boolean;
  hidden?: boolean;
  kind?: 'file' | 'directory' | 'value';
  choices?: readonly string[];
}

export interface CommandPositional {
  name: string;
  min: number;
  max: number;
  kind?: 'directory' | 'file' | 'capability' | 'component' | 'value';
  choices?: readonly string[];
}

export interface CommandDefinition {
  description: string;
  usage: string;
  options: readonly CommandOption[];
  examples: readonly string[];
  note?: string;
  children?: Readonly<Record<string, CommandDefinition>>;
  positional?: CommandPositional;
  conflicts?: readonly (readonly string[])[];
}

export const GLOBAL_OPTIONS: readonly CommandOption[] = [
  {
    flag: '--cwd',
    aliases: ['-c'],
    value: 'directory',
    kind: 'directory',
    arity: 'required',
    description: 'Run from a selected working directory.',
  },
  { flag: '--json', description: 'Return machine-readable output.' },
  { flag: '--human', description: 'Explicitly format Platform output for people.' },
  { flag: '--non-interactive', description: 'Never prompt or start interactive approval polling.' },
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
  return command && Object.hasOwn(COMMANDS, command) ? COMMANDS[command] : undefined;
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
    kind: 'file',
    arity: 'required',
    description: 'Explicit owner-only credential file instead of the OS secret store.',
  },
];
export const COMMANDS: Readonly<Record<string, CommandDefinition>> = {
  completion: {
    description: 'Print an offline shell completion script.',
    usage: 'completion <bash|zsh>',
    options: [],
    positional: { name: 'shell', min: 1, max: 1, kind: 'value', choices: ['bash', 'zsh'] },
    examples: ['completion bash', 'completion zsh'],
    note: 'Prints the script only; never edits your shell profile or contacts Platform.',
  },
  login: {
    description: 'Approve a short-lived CLI session in your browser.',
    usage: 'login [--start|--resume]',
    options: [
      ...PLATFORM_OPTIONS,
      { flag: '--start', description: 'Start approval and return without polling.' },
      { flag: '--resume', description: 'Resume saved browser approval.' },
    ],
    conflicts: [['--start', '--resume']],
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
    options: [
      ...PLATFORM_OPTIONS,
      {
        flag: '--context',
        description: 'Include local project and credential provenance without exposing secrets.',
      },
    ],
    examples: ['whoami --json', 'whoami --context --human'],
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
        kind: 'file',
        arity: 'required',
        description: 'Explicit deployment manifest matching sealed source.',
      },
      {
        flag: '--new',
        description: 'Explicitly create a new plan request after inputs or routing change.',
      },
    ],
    children: {
      plan: {
        description: 'Plan a candidate from the saved sealed source.',
        usage: 'deploy plan --manifest <file> [--new]',
        options: [
          ...PLATFORM_OPTIONS,
          {
            flag: '--manifest',
            value: 'file',
            kind: 'file',
            arity: 'required',
            description: 'Deployment manifest matching sealed source.',
          },
          { flag: '--new', description: 'Explicitly create a new plan request.' },
        ],
        examples: [
          'deploy plan --manifest deployment.json',
          'deploy plan --manifest deployment.json --json',
        ],
      },
      prepare: {
        description: 'Reserve an immutable candidate from the saved plan.',
        usage: 'deploy prepare',
        options: PLATFORM_OPTIONS,
        examples: ['deploy prepare', 'deploy prepare --json'],
      },
      status: {
        description: 'Inspect the saved deployment plan or candidate.',
        usage: 'deploy status',
        options: PLATFORM_OPTIONS,
        examples: ['deploy status', 'deploy status --json'],
      },
    },
    examples: ['deploy plan --manifest deployment.json', 'deploy prepare', 'deploy status'],
    note: 'Preparation reserves a candidate; server policy controls build admission. No preview or deployment is activated.',
  },
  source: {
    description: 'Upload an immutable source checkpoint with resumable chunks.',
    usage: 'source <upload|status> [options]',
    options: [
      ...PLATFORM_OPTIONS,
      { flag: '--dry-run', description: 'Package and inspect source without upload.' },
      { flag: '--new', description: 'Explicitly start a new request after changing source.' },
    ],
    children: {
      upload: {
        description: 'Upload immutable source, resuming the saved request.',
        usage: 'source upload [--dry-run] [--new]',
        options: [
          ...PLATFORM_OPTIONS,
          { flag: '--dry-run', description: 'Inspect source locally without upload.' },
          { flag: '--new', description: 'Explicitly begin a new immutable request.' },
        ],
        examples: ['source upload --dry-run --json', 'source upload'],
      },
      status: {
        description: 'Read the saved upload receipt.',
        usage: 'source status',
        options: PLATFORM_OPTIONS,
        examples: ['source status', 'source status --json'],
      },
    },
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
    positional: { name: 'capabilities', min: 1, max: 50, kind: 'capability' },
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
    children: {
      list: {
        description: 'List available source capabilities.',
        usage: 'stack list',
        options: [],
        examples: ['stack list', 'stack list --json'],
      },
      status: {
        description: 'Inspect installed source capabilities.',
        usage: 'stack status',
        options: [],
        examples: ['stack status --json'],
      },
      doctor: {
        description: 'Check source completeness and prerequisites.',
        usage: 'stack doctor',
        options: [],
        examples: ['stack doctor', 'stack doctor --json'],
      },
    },
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
    conflicts: [['--web', '--native', '--all']],
    children: Object.fromEntries(
      ['init', 'add', 'list', 'diff', 'doctor'].map((action) => [
        action,
        {
          description: {
            init: 'Initialize Anhedral UI configuration.',
            add: 'Install selected UI components.',
            list: 'List available web and Expo/native components.',
            diff: 'Inspect differences for selected UI components.',
            doctor: 'Check UI configuration.',
          }[action]!,
          usage: `ui ${action}${['add', 'diff'].includes(action) ? ' <components...>' : ''} [options]`,
          options: [
            { flag: '--web', description: 'Select the Next.js application.' },
            { flag: '--native', description: 'Select the Expo/NativeWind 4 application.' },
            { flag: '--all', description: 'Select every web/native application.' },
            { flag: '--dry-run', description: 'Preview without writes or network.' },
          ],
          positional: {
            name: 'components',
            min: ['add', 'diff'].includes(action) ? 1 : 0,
            max: ['add', 'diff'].includes(action) ? 50 : 0,
            kind: 'component' as const,
          },
          examples: [
            `ui ${action}${['add', 'diff'].includes(action) ? ' button --web' : ''}`,
            `ui ${action}${['add', 'diff'].includes(action) ? ' button --native' : ''} --json`,
          ],
        },
      ]),
    ),
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
    positional: { name: 'directory', min: 0, max: 1, kind: 'directory' },
    conflicts: [['--git', '--no-git']],
    examples: [
      'init my-app',
      'init my-app --dry-run --json',
      'init my-app --skip-install --no-git',
    ],
    note: 'Generated source belongs to you. Application features, authentication, payments and hosting are your responsibility. Init never provisions or deploys resources.',
  },
};

/** Complete topic lookup; leaf options are contextual while parser acceptance stays compatible. */
export function commandTopic(topic: readonly string[]): CommandDefinition | undefined {
  let definition = commandDefinition(topic[0]);
  for (const part of topic.slice(1)) {
    if (!definition?.children || !Object.hasOwn(definition.children, part)) return undefined;
    const child = definition.children[part];
    definition = {
      ...child,
      note: child.note ?? definition.note,
      conflicts: child.conflicts ?? definition.conflicts,
    };
  }
  return definition;
}

/** Family options remain accepted before/after a child for existing scripts. */
export function commandOptions(command: string | undefined): readonly CommandOption[] {
  return [...(commandDefinition(command)?.options ?? []), ...GLOBAL_OPTIONS];
}
