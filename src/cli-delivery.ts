import path from 'node:path';
import { commandArguments, commandArgumentError } from './cli-arguments.js';
import { printResult, type OutputOptions } from './cli-output.js';
import { hasProjectSection, readProjectSection } from './project-config.js';
import { recoverDeliveryLock } from './project-state.js';
import { readLifecycleOperation } from './lifecycle.js';
import { buildMobileApplication } from './mobile-delivery.js';
import {
  shipCloudflareApplication,
  shipSelectedVercelApplication,
  shipSelectedStack,
} from './ship.js';
import { planProvisioning, provisionApplication } from './provision.js';
import { writeManagementOverview } from './management.js';
import {
  registerApplication,
  connectApplication,
  applicationStatus,
  verifyApplication,
  rollbackApplication,
  recoverApplication,
} from './delivery.js';
import {
  registerVercelApplication,
  connectVercelApplication,
  vercelApplicationStatus,
  verifyVercelApplication,
  rollbackVercelApplication,
  adoptVercelApplication,
  recoverVercelApplication,
  writeVercelOverview,
} from './vercel.js';

export const DELIVERY_COMMANDS = [
  'register',
  'connect',
  'provision',
  'ship',
  'status',
  'manage',
  'verify',
  'rollback',
  'adopt',
  'recover',
] as const;

function deliveryOptions(command: string, args: string[]) {
  const options = commandArguments(command, args);
  const error = (message: string) => commandArgumentError(command, message);
  if (options.positional.length > 1) throw error('Specify at most one application directory.');
  function choice<T extends string>(
    flag: string,
    choices: readonly T[],
    message: string,
  ): T | undefined {
    const value = options.value(flag);
    if (value === undefined) return undefined;
    if (!choices.includes(value as T)) throw error(message);
    return value as T;
  }
  return {
    root: path.resolve(options.positional[0] ?? process.cwd()),
    account: options.value('--account'),
    audience: choice('--audience', ['public', 'private'], 'Specify --audience public or private.'),
    emails: options.values('--allow-email'),
    provider: choice(
      '--provider',
      ['vercel', 'cloudflare'],
      'Specify one provider: vercel or cloudflare.',
    ),
    scope: options.value('--scope'),
    use: choice('--use', ['personal', 'commercial'], 'Specify --use personal or commercial.'),
    create: options.has('--create'),
    git: options.has('--git'),
    platform: choice('--platform', ['ios', 'android'], 'Select one mobile platform.'),
    profile: options.value('--profile'),
    releaseId: options.value('--release'),
    dryRun: options.has('--dry-run'),
    refresh: options.has('--refresh'),
    local: options.has('--local'),
    lock: options.has('--lock'),
    dataCompatible: options.has('--data-compatible'),
  };
}
type DeliveryOptions = ReturnType<typeof deliveryOptions>;

function isVercel(command: string, { root, provider }: DeliveryOptions): boolean {
  if (provider) return provider === 'vercel';
  if (hasProjectSection(root, 'vercel')) return true;
  return (
    command === 'register' &&
    hasProjectSection(root, 'setup') &&
    readProjectSection(root, 'setup').hosting === 'vercel'
  );
}
function releaseId(command: string, options: DeliveryOptions): string {
  if (!options.releaseId)
    throw commandArgumentError(command, 'Rollback requires --release <recorded-id>.');
  return options.releaseId;
}

async function vercelCommand(command: string, options: DeliveryOptions): Promise<unknown> {
  const { root, account, emails, audience, use, scope, create, git, dryRun, refresh, local } =
    options;
  if (account || emails.length)
    throw commandArgumentError(
      command,
      'Cloudflare account/member flags require --provider cloudflare.',
    );
  switch (command) {
    case 'register':
      return registerVercelApplication(root);
    case 'connect':
      if (!audience || !use)
        throw commandArgumentError(
          command,
          'Vercel connect requires --audience public|private and --use personal|commercial.',
        );
      return connectVercelApplication(root, { scope, audience, use, create, git });
    case 'ship':
      return shipSelectedVercelApplication(root, dryRun);
    case 'adopt':
      return adoptVercelApplication(root);
    case 'recover':
      return recoverVercelApplication(root);
    case 'verify':
      return verifyVercelApplication(root);
    case 'rollback':
      return rollbackVercelApplication(root, releaseId(command, options), options.dataCompatible);
    case 'status':
      return vercelApplicationStatus(root, refresh);
    case 'manage': {
      const snapshot = await vercelApplicationStatus(root, !local);
      return { file: writeVercelOverview(root, snapshot), evidence: snapshot.evidence };
    }
    default:
      throw commandArgumentError(
        command,
        'Vercel project creation is handled by connect --create; Cloudflare resource provisioning requires --provider cloudflare.',
      );
  }
}

async function cloudflareCommand(command: string, options: DeliveryOptions): Promise<unknown> {
  const { root, account, audience, emails, scope, use, create, git, dryRun, refresh, local } =
    options;
  if (scope || use || create || git)
    throw commandArgumentError(
      command,
      'Vercel connect options require a Vercel web manifest or --provider vercel.',
    );
  switch (command) {
    case 'register':
      return registerApplication(root);
    case 'connect':
      return connectApplication(root, account, audience, undefined, emails);
    case 'provision':
      return dryRun ? planProvisioning(root) : provisionApplication(root);
    case 'ship':
      return shipCloudflareApplication(root, dryRun);
    case 'adopt':
      throw commandArgumentError(command, 'Git deployment adoption requires --provider vercel.');
    case 'recover':
      return recoverApplication(root);
    case 'verify':
      return verifyApplication(root);
    case 'rollback':
      return rollbackApplication(root, releaseId(command, options), options.dataCompatible);
    case 'manage': {
      const snapshot = await applicationStatus(root, !local);
      return { file: writeManagementOverview(root, snapshot), evidence: snapshot.evidence };
    }
    default:
      return applicationStatus(root, refresh);
  }
}

async function executeDelivery(command: string, options: DeliveryOptions) {
  const { root, provider, platform, profile, dryRun, lock, refresh } = options;
  if (command === 'recover' && lock) {
    if (provider || refresh)
      throw commandArgumentError(
        command,
        'Local lock recovery cannot be combined with provider recovery or --refresh.',
      );
    return { result: recoverDeliveryLock(root), blockedStates: [] };
  }
  if (platform || profile) {
    if (!platform || !profile || provider)
      throw commandArgumentError(
        command,
        'Mobile shipping requires --platform and --profile, without --provider.',
      );
    return {
      result: await buildMobileApplication(root, { platform, profile, dryRun }),
      blockedStates: ['configuration-required', 'provider-configuration-required'],
    };
  }
  // Resolve hosting before the mixed-stack path, retaining its configuration preflight.
  const web = isVercel(command, options);
  if (command === 'ship' && !provider)
    return {
      result: await shipSelectedStack(root, dryRun),
      blockedStates: ['configuration-required', 'provider-configuration-required', 'partial'],
    };
  let result = await (web ? vercelCommand : cloudflareCommand)(command, options);
  if (command === 'status')
    result = { ...(result as object), operation: readLifecycleOperation(root) };
  return {
    result,
    blockedStates: web
      ? ['provider-configuration-required']
      : ['configuration-required', 'provider-configuration-required'],
  };
}

export async function runDelivery(
  command: string,
  args: string[],
  output: OutputOptions,
): Promise<void> {
  const { result, blockedStates } = await executeDelivery(command, deliveryOptions(command, args));
  printResult(command, result, output);
  if (
    result &&
    typeof result === 'object' &&
    'state' in result &&
    blockedStates.includes(String(result.state))
  )
    process.exitCode = 1;
}
