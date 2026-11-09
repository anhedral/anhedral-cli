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
  owner?: 'platform';
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
const ENVIRONMENT_OPTIONS: readonly CommandOption[] = [
  ...PLATFORM_OPTIONS,
  {
    flag: '--environment',
    value: 'staging|production',
    arity: 'required',
    choices: ['staging', 'production'],
    description: 'Select the target environment explicitly.',
  },
  {
    flag: '--file',
    value: 'file',
    kind: 'file',
    arity: 'required',
    description: 'Read an owner-only UTF-8 file (up to64KiB); never put values in arguments.',
  },
  { flag: '--stdin', description: 'Read private UTF-8 input from a pipe.' },
  {
    flag: '--type',
    value: 'secret|config',
    arity: 'required',
    choices: ['secret', 'config'],
    description: 'Set the variable type; public prefixes default to config, others to secret.',
  },
  {
    flag: '--replace',
    description: 'Explicitly allow replacing existing variables with version checks.',
  },
  { flag: '--new', description: 'Start another import instead of resuming saved identity.' },
  { flag: '--dry-run', description: 'Validate input locally and print names and types only.' },
];
const STAGING_OPTIONS: readonly CommandOption[] = [
  ...PLATFORM_OPTIONS,
  {
    flag: '--candidate',
    value: 'uuid',
    arity: 'required',
    description: 'Select a ready, runtime-verified deployment candidate.',
  },
  { flag: '--new', description: 'Start a new staging deployment using the current generation.' },
];
const PRODUCTION_OPTIONS: readonly CommandOption[] = [
  ...PLATFORM_OPTIONS,
  {
    flag: '--candidate',
    value: 'uuid',
    arity: 'required',
    description: 'Select a ready, runtime-verified deployment candidate.',
  },
  {
    flag: '--name',
    value: 'slug',
    arity: 'required',
    description: 'Select the public application name for production.',
  },
  {
    flag: '--new',
    description: 'Start another production deployment using the current generation.',
  },
];
const PROJECT_OPTIONS: readonly CommandOption[] = [
  ...PLATFORM_OPTIONS,
  {
    flag: '--team',
    value: 'uuid',
    arity: 'required',
    description: 'Team ID; defaults to your selected team.',
  },
  {
    flag: '--limit',
    value: 'count',
    arity: 'required',
    description: 'List 1–100 projects (default 50).',
  },
  {
    flag: '--cursor',
    value: 'uuid',
    arity: 'required',
    description: 'Resume listing after this project ID.',
  },
  {
    flag: '--name',
    value: 'text',
    arity: 'required',
    description: 'New project name (1–160 characters).',
  },
  {
    flag: '--summary',
    value: 'text',
    arity: 'required',
    description: 'Optional project summary (up to 2000 characters).',
  },
  { flag: '--link', description: 'Verify build access and save a local link after creation.' },
  { flag: '--dry-run', description: 'Validate creation locally without authentication or writes.' },
  {
    flag: '--new',
    description: 'Start a new creation request instead of retrying the saved request.',
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
    owner: 'platform',
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
    owner: 'platform',
    description: 'Revoke this CLI session.',
    usage: 'logout',
    options: PLATFORM_OPTIONS,
    examples: ['logout'],
    note: 'Revokes server access before clearing local credentials.',
  },
  whoami: {
    owner: 'platform',
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
  projects: {
    owner: 'platform',
    description: 'List or create Platform projects.',
    usage: 'projects <list|create> [options]',
    options: PROJECT_OPTIONS,
    children: {
      list: {
        description: 'List accessible projects and available teams.',
        usage: 'projects list [--team <uuid>] [--limit <count>] [--cursor <uuid>]',
        options: PROJECT_OPTIONS.filter((option) =>
          ['--api-url', '--credential-file', '--team', '--limit', '--cursor'].includes(option.flag),
        ),
        examples: ['projects list --human'],
      },
      create: {
        description: 'Create a source-upload project with a durable retry identity.',
        usage:
          'projects create --name <text> [--summary <text>] [--team <uuid>] [--link] [--dry-run] [--new]',
        options: PROJECT_OPTIONS.filter((option) => !['--limit', '--cursor'].includes(option.flag)),
        examples: [
          'projects create --name "My app" --dry-run',
          'projects create --name "My app" --link',
        ],
        note: 'Retries reuse the saved request. Changed input or context requires --new. Creation does not generate source or deploy.',
      },
    },
    examples: ['projects list', 'projects create --name "My app"'],
  },
  link: {
    owner: 'platform',
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
    owner: 'platform',
    description: 'Remove the local project link.',
    usage: 'unlink',
    options: PLATFORM_OPTIONS,
    examples: ['unlink'],
  },
  deploy: {
    owner: 'platform',
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
  env: {
    owner: 'platform',
    description: 'Manage project configuration and write-only secrets through Platform.',
    usage: 'env <list|import|set> [options]',
    options: ENVIRONMENT_OPTIONS,
    children: {
      list: {
        description: 'List names, types and versions; values are never returned.',
        usage: 'env list [--environment staging|production]',
        options: ENVIRONMENT_OPTIONS.filter((option) =>
          ['--api-url', '--credential-file', '--environment'].includes(option.flag),
        ),
        examples: ['env list --json'],
      },
      import: {
        description: 'Import a private dotenv file atomically.',
        usage: 'env import --environment staging|production --file <file> [--replace] [--new]',
        options: ENVIRONMENT_OPTIONS,
        examples: [
          'env import --environment staging --file .env.local --dry-run',
          'env import --environment production --stdin --replace --new',
        ],
      },
      set: {
        description: 'Set one variable from a private file or stdin.',
        usage: 'env set <NAME> --environment staging|production --stdin [--replace] [--new]',
        options: ENVIRONMENT_OPTIONS,
        positional: { name: 'NAME', min: 1, max: 1 },
        examples: ['env set SERVICE_API_KEY --environment staging --stdin'],
      },
    },
    conflicts: [['--file', '--stdin']],
    examples: ['env list', 'env import --environment staging --file .env.local --dry-run'],
    note: 'Values never appear in output or retry state. Platform enforces project roles and production approvals; saving configuration does not change an existing deployment.',
  },
  staging: {
    owner: 'platform',
    description: 'Manage persistent staging deployments for the linked project.',
    usage: 'staging <status|deploy> [options]',
    options: STAGING_OPTIONS,
    positional: { name: 'operation', min: 1, max: 1, choices: ['status', 'deploy'] },
    children: {
      status: {
        description: 'Read staging history and active deployment.',
        usage: 'staging status',
        options: PLATFORM_OPTIONS,
        positional: { name: 'operation', min: 0, max: 0 },
        examples: ['staging status --json'],
      },
      deploy: {
        owner: 'platform',
        description: 'Deploy a ready candidate to staging.',
        usage: 'staging deploy --candidate <uuid> [--new]',
        options: STAGING_OPTIONS,
        positional: { name: 'operation', min: 0, max: 0 },
        examples: ['staging deploy --candidate <uuid>'],
      },
    },
    examples: ['staging status', 'staging deploy --candidate <uuid>'],
    note: 'Retried requests retain the same identity and generation. Configuration is frozen for each new staging deployment; production approval stays in Platform.',
  },
  production: {
    owner: 'platform',
    description: 'Deploy a ready candidate with your current production permissions.',
    usage: 'production <status|deploy> [options]',
    options: PRODUCTION_OPTIONS,
    positional: { name: 'operation', min: 1, max: 1, choices: ['status', 'deploy'] },
    children: {
      status: {
        description: 'Read production history and active deployment.',
        usage: 'production status',
        options: PLATFORM_OPTIONS,
        positional: { name: 'operation', min: 0, max: 0 },
        examples: ['production status --json'],
      },
      deploy: {
        owner: 'platform',
        description: 'Request production publication of a ready candidate.',
        usage: 'production deploy --candidate <uuid> --name <slug> [--new]',
        options: PRODUCTION_OPTIONS,
        positional: { name: 'operation', min: 0, max: 0 },
        examples: ['production deploy --candidate <uuid> --name my-app'],
      },
    },
    examples: ['production status', 'production deploy --candidate <uuid> --name my-app'],
    note: 'Platform checks current production permissions and freezes configuration. Self-service teams need no second approver; an explicitly required independent review remains enforced.',
  },
  logs: {
    owner: 'platform',
    description: 'Read redacted runtime logs for the linked project.',
    usage: 'logs [options]',
    positional: { name: 'arguments', min: 0, max: 0 },
    options: [
      ...PLATFORM_OPTIONS,
      {
        flag: '--environment',
        value: 'staging|production',
        arity: 'required',
        choices: ['staging', 'production'],
        description: 'Choose the environment (default: staging).',
      },
      {
        flag: '--deployment',
        value: 'uuid',
        arity: 'required',
        description: 'Filter one deployment.',
      },
      {
        flag: '--level',
        value: 'level',
        arity: 'required',
        choices: ['debug', 'info', 'warn', 'error'],
        description: 'Filter the event level.',
      },
      {
        flag: '--source',
        value: 'source',
        arity: 'required',
        choices: ['request', 'console', 'exception'],
        description: 'Filter request, console or exception events.',
      },
      {
        flag: '--range',
        value: 'range',
        arity: 'required',
        choices: ['1h', '24h', '7d'],
        description: 'Choose a time range (default: 24h).',
      },
      {
        flag: '--search',
        value: 'text',
        arity: 'required',
        description: 'Search redacted message text.',
      },
      {
        flag: '--cursor',
        value: 'cursor',
        arity: 'required',
        description: 'Read the next page using a returned cursor.',
      },
    ],
    examples: [
      'logs --environment staging --level error --json',
      'logs --environment production --range 1h',
    ],
    note: 'Runtime collection is best effort and reports unavailable coverage and dropped events. Retention is seven days; source/build logs remain separate.',
  },
  source: {
    owner: 'platform',
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
    description: 'Add backend, private storage or payments to the Anhedral Stack.',
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
    examples: ['add backend', 'add r2', 'add r2 stripe --with-dependencies --dry-run --json'],
    note: 'Adds source and local configuration only. Existing edits are preserved. No provisioning, credential installation, migration or deployment.',
  },
  stack: {
    description: 'Inspect the Anhedral Stack and its three optional additions.',
    usage: 'stack <list|status|doctor|update>',
    options: [
      { flag: '--dry-run', description: 'Preview bounded source updates without writes.' },
      {
        flag: '--offline',
        description: 'Update source without resolving a published deployment artifact.',
      },
      {
        flag: '--expect-plan',
        arity: 'required',
        value: 'sha256',
        description: 'Apply only the reviewed source update plan.',
      },
    ],
    children: {
      update: {
        description: 'Preview or apply bounded source updates without executing project scripts.',
        usage: 'stack update [--dry-run] [--expect-plan <sha256>]',
        options: [
          {
            flag: '--dry-run',
            description: 'Show exact source changes and conflicts without writes.',
          },
          {
            flag: '--offline',
            description: 'Skip published artifact resolution; leave deployment provenance pending.',
          },
          {
            flag: '--expect-plan',
            arity: 'required',
            value: 'sha256',
            description: 'Apply only if the reviewed update plan still matches.',
          },
        ],
        examples: ['stack update --dry-run --json', 'stack update --json'],
      },
      list: {
        description: 'Show the Anhedral Stack foundation and optional additions.',
        usage: 'stack list',
        options: [],
        examples: ['stack list', 'stack list --json'],
      },
      status: {
        description: 'Inspect installed Anhedral Stack additions.',
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
  init: {
    description: 'Create the Anhedral Stack: web UI first, then add backend, storage and payments.',
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
