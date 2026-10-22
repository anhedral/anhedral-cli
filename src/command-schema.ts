import { STANDARD_PRODUCTS } from './stack-registry.js';

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
  services: {
    description:
      'Inspect live Cloudflare services, analytics, data, or a confirmed resource deletion.',
    usage:
      'services list | status | metrics | tables | data | delete-plan | delete [service-key] [options]',
    options: [
      {
        flag: '--hours',
        value: '1|24|168',
        arity: 'required',
        description: 'Analytics window; D1 uses complete UTC days.',
      },
      {
        flag: '--table',
        value: 'table',
        arity: 'required',
        description: 'Existing database table or keys for KV metadata.',
      },
      {
        flag: '--offset',
        value: 'number',
        arity: 'required',
        description: 'Bounded database page offset.',
      },
      {
        flag: '--cursor',
        value: 'cursor',
        arity: 'required',
        description: 'Provider cursor for object metadata pages.',
      },
      {
        flag: '--token',
        value: 'token',
        arity: 'required',
        description: 'Single-use deletion-plan token.',
      },
      {
        flag: '--confirm-name',
        value: 'name',
        arity: 'required',
        description: 'Exact resource name from the deletion plan.',
      },
    ],
    examples: ['services list --json', 'services status binding:apps/api:D1:DB --json'],
    note: 'Provider calls occur only when requested. Data output can contain private values. Deletion is limited to verified project-created D1/KV resources and requires a fresh plan and typed resource name.',
  },
  inspect: {
    description: 'Inspect local stack, setup requirements and recorded delivery evidence.',
    usage: 'inspect [directory] [options]',
    options: [],
    examples: ['inspect', 'inspect --json'],
    note: 'Read-only and offline. Recorded results do not establish live provider status or permissions.',
  },
  integrations: {
    description: 'Inspect private integration receipts or reconcile a verified pending resource.',
    usage: 'integrations status | recover [directory] [options]',
    options: [
      {
        flag: '--provider',
        value: 'name',
        arity: 'required',
        description: 'Select a bundled integration provider for recovery.',
      },
      {
        flag: '--operation',
        value: 'hash',
        arity: 'required',
        description: 'Select the exact pending operation from status.',
      },
      {
        flag: '--resource',
        value: 'id',
        arity: 'required',
        description: 'Verify and adopt this existing resource; never recreate it.',
      },
    ],
    examples: [
      'integrations status --json',
      'integrations recover --provider neon --operation recorded-hash --resource existing-id',
    ],
    note: 'Status is read-only. Recovery verifies provider identity before updating a local receipt. Unsupported receipt schemas are rejected. Recovery cannot reconstruct missing one-time credentials.',
  },
  init: {
    description: 'Scaffold a project from the bundled stack registry.',
    usage: 'init [directory] [products...] [options]',
    options: [
      ...STANDARD_PRODUCTS.map((name): CommandOption => ({
        flag: `--${name}`,
        description: `Include ${name}.`,
        hidden: true,
      })),
      {
        flag: '--preset',
        description: 'Start minimal or select the complete compatible product stack.',
        value: 'minimal|full-product',
        arity: 'required',
      },
      {
        flag: '--hosting',
        description: 'Select web hosting.',
        value: 'cloudflare|vercel',
        arity: 'required',
      },
      {
        flag: '--skip-install',
        description: 'Skip the final install (bootstrap still needs network).',
      },
      { flag: '--git', description: 'Initialize a project repository or skip it.' },
      { flag: '--no-git', description: 'Initialize a project repository or skip it.' },
      { flag: '--dry-run', description: 'Preview the selected stack without writes or network.' },
    ],
    examples: [
      'init client-app',
      'init product --preset full-product --dry-run',
      'init product --next --hono --neon --clerk --dry-run',
    ],
    note: `Default: minimal Expo web/iOS/Android app on Cloudflare; no API, auth, database or paid integrations. Add capabilities with resolved dependencies, or use --preset full-product.\nProducts: ${STANDARD_PRODUCTS.join(', ')}\nOnly bundled options are supported. --all is intentionally unsupported.`,
  },
  auth: {
    description: 'Check or guide authentication for the selected providers.',
    usage: 'auth [directory] [options]',
    options: [
      {
        flag: '--provider',
        description: 'Check one provider required by this project.',
        value: 'name',
        arity: 'required',
      },
      { flag: '--status', description: 'Check existing access without opening login.' },
      { flag: '--non-interactive', description: 'Never open an interactive login.' },
    ],
    examples: ['auth', 'auth --status --json', 'auth --provider neon'],
    note: 'Management keys come from the environment. Login does not establish all write permissions or complete provider setup. Complete provider settings in anhedral.json (providers) before shipping.',
  },
  ship: {
    description: 'Provision, configure and deploy the supported selected stack.',
    usage: 'ship [directory] [options]',
    options: [
      { flag: '--dry-run', description: 'Preview provisioning and deployment without mutations.' },
      {
        flag: '--provider',
        description: 'Select hosting in a mixed project.',
        value: 'cloudflare|vercel',
        arity: 'required',
      },
      {
        flag: '--platform',
        description: 'Build a selected mobile platform.',
        value: 'ios|android',
        arity: 'required',
      },
      {
        flag: '--profile',
        description: 'Select the configured EAS build profile.',
        value: 'name',
        arity: 'required',
      },
    ],
    examples: ['ship --dry-run', 'ship --json', 'ship --platform android --profile preview'],
    note: 'Connect the intended hosting account and audience first. Commit source before shipping; resolved tracked bindings require review and another commit. Mobile builds return links and never submit to stores.',
  },
  add: {
    description: 'Add bundled stack parts while preserving edited source.',
    usage: 'add <items...> [options]',
    options: [
      { flag: '--dry-run', description: 'Preview changed paths without installing them.' },
      {
        flag: '--diff',
        description: 'Preview source changes; implies --dry-run.',
        value: 'path',
        arity: 'optional',
      },
      {
        flag: '--view',
        description: 'Preview generated source; implies --dry-run.',
        value: 'path',
        arity: 'optional',
      },
      { flag: '--skip-install', description: 'Skip the final dependency install.' },
    ],
    examples: [
      'add resend',
      '--cwd client-app add resend --dry-run',
      'add resend --diff --cwd client-app',
    ],
    note: 'Source previews are local and bounded. A new web bootstrap cannot be previewed offline; the plan reports that limitation. Edited-source conflicts require review; there is no force overwrite.',
  },
  registry: {
    description: 'Inspect the bundled stack catalog and setup requirements.',
    usage: 'registry list | view <item> | capabilities [options]',
    options: [
      {
        flag: '--kind',
        value: 'ui',
        arity: 'required',
        description: 'Inspect the candidate UI catalog without writes.',
      },
      {
        flag: '--app',
        value: 'workspace',
        arity: 'required',
        description: 'Select an explicit UI consumer workspace.',
      },
      {
        flag: '--platform',
        value: 'web|ios|android',
        arity: 'required',
        description: 'Select the UI runtime platform.',
      },
    ],
    examples: [
      'registry list',
      'registry view neon',
      'registry capabilities',
      'registry capabilities --json',
      'registry list --kind ui --json',
      'registry view ui/button --kind ui --app apps/mobile --platform web --json',
    ],
    note: 'UI inspection is offline and read-only. Candidate source and installation remain unavailable; identified consumers do not establish foundation or runtime acceptance.',
  },
  doctor: {
    description: 'Check project provenance and local readiness without writes.',
    usage: 'doctor [directory] [options]',
    options: [
      { flag: '--providers', description: 'Also check tools and existing provider context.' },
    ],
    examples: ['doctor', 'doctor client-app --providers --json'],
  },
  connect: {
    description: 'Select the intended hosting account, project and audience.',
    usage: 'connect [directory] [options]',
    options: [
      {
        flag: '--provider',
        description: 'Select the hosting provider.',
        value: 'cloudflare|vercel',
        arity: 'required',
      },
      {
        flag: '--account',
        description: 'Select the Cloudflare account.',
        value: 'id',
        arity: 'required',
      },
      {
        flag: '--audience',
        description: 'Set the explicit hosting audience.',
        value: 'public|private',
        arity: 'required',
      },
      {
        flag: '--allow-email',
        description: 'Allow a private Cloudflare member (repeatable).',
        value: 'email',
        arity: 'required',
        repeatable: true,
      },
      { flag: '--scope', description: 'Select the Vercel team.', value: 'team', arity: 'required' },
      {
        flag: '--use',
        description: 'Declare Vercel usage.',
        value: 'personal|commercial',
        arity: 'required',
      },
      { flag: '--create', description: 'Create the selected Vercel project.' },
      { flag: '--git', description: 'Connect the verified GitHub repository.' },
    ],
    examples: [
      'connect --provider cloudflare --audience public',
      'connect --scope customer --audience private --use commercial --create',
    ],
    note: 'Vercel Hobby is personal/non-commercial. Commercial applications need an eligible existing plan; no paid plan is activated automatically.',
  },
  repository: {
    description: 'Connect or create the application owner’s GitHub repository.',
    usage: 'repository [directory] [--owner <account>] [options]',
    options: [
      {
        flag: '--owner',
        description: 'Select the GitHub owner.',
        value: 'account',
        arity: 'required',
      },
      { flag: '--name', description: 'Set the repository name.', value: 'name', arity: 'required' },
      {
        flag: '--visibility',
        description: 'Set visibility (default: private).',
        value: 'private|public',
        arity: 'required',
      },
      { flag: '--create', description: 'Create the repository when needed.' },
    ],
    examples: ['repository --owner customer --create'],
  },
  register: {
    description: 'Record application identity and delivery targets.',
    usage: 'register [directory] [--provider cloudflare|vercel]',
    options: [
      {
        flag: '--provider',
        description: 'Select the provider.',
        value: 'cloudflare|vercel',
        arity: 'required',
      },
    ],
    examples: ['register'],
  },
  provision: {
    description: 'Reconcile Cloudflare resources without deploying code.',
    usage: 'provision [directory] [options]',
    options: [
      {
        flag: '--provider',
        description: 'Select Cloudflare in a mixed project.',
        value: 'cloudflare',
        arity: 'required',
      },
      { flag: '--dry-run', description: 'Preview resources without mutations.' },
    ],
    examples: ['provision --dry-run'],
    note: 'Use ship for the full selected-integration and hosting flow.',
  },
  status: {
    description: 'Inspect recorded release and provider evidence.',
    usage: 'status [directory] [options]',
    options: [
      {
        flag: '--provider',
        description: 'Select hosting.',
        value: 'cloudflare|vercel',
        arity: 'required',
      },
      { flag: '--refresh', description: 'Refresh provider evidence.' },
    ],
    examples: ['status --refresh'],
  },
  manage: {
    description: 'Write a local overview of recorded delivery evidence.',
    usage: 'manage [directory] [options]',
    options: [
      {
        flag: '--provider',
        description: 'Select hosting.',
        value: 'cloudflare|vercel',
        arity: 'required',
      },
      { flag: '--local', description: 'Use local evidence without provider refresh.' },
      { flag: '--refresh', description: 'Refresh provider evidence.' },
    ],
    examples: ['manage --local'],
  },
  verify: {
    description: 'Exercise the application’s configured live acceptance checks.',
    usage: 'verify [directory] [options]',
    options: [
      {
        flag: '--provider',
        description: 'Select hosting.',
        value: 'cloudflare|vercel',
        arity: 'required',
      },
      { flag: '--refresh', description: 'Refresh provider evidence.' },
    ],
    examples: ['verify'],
  },
  adopt: {
    description: 'Record a verified existing Vercel Git deployment.',
    usage: 'adopt [directory] [--provider vercel]',
    options: [
      { flag: '--provider', description: 'Select Vercel.', value: 'vercel', arity: 'required' },
      { flag: '--refresh', description: 'Refresh provider evidence.' },
    ],
    examples: ['adopt --provider vercel'],
    note: 'Does not push or deploy.',
  },
  recover: {
    description: 'Recover verified hosting state or a proven interrupted local lock.',
    usage: 'recover [directory] [options]',
    options: [
      {
        flag: '--lock',
        description:
          'Release only a proven dead local delivery lock; never replay provider operations.',
      },
      {
        flag: '--provider',
        description: 'Select hosting.',
        value: 'cloudflare|vercel',
        arity: 'required',
      },
      { flag: '--refresh', description: 'Refresh provider evidence.' },
    ],
    examples: ['recover'],
    note: 'Does not recreate missing integration credentials or historical product checks.',
  },
  rollback: {
    description: 'Restore a recorded code release after compatibility review.',
    usage: 'rollback [directory] --release <id> --data-compatible [options]',
    options: [
      {
        flag: '--provider',
        description: 'Select hosting.',
        value: 'cloudflare|vercel',
        arity: 'required',
      },
      {
        flag: '--release',
        description: 'Select a recorded release.',
        value: 'id',
        arity: 'required',
      },
      { flag: '--data-compatible', description: 'Confirm data/schema compatibility.' },
      { flag: '--refresh', description: 'Refresh provider evidence.' },
    ],
    examples: ['rollback --release recorded-id --data-compatible'],
    note: 'Code rollback does not restore data.',
  },
};
