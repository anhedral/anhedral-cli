import path from 'node:path';
import { commandArguments, commandArgumentError } from './cli-arguments.js';
import { printResult, type OutputOptions } from './cli-output.js';
import { recoverDeliveryLock } from './project-state.js';
import { readLifecycleOperation } from './lifecycle.js';
import { buildMobileApplication } from './mobile-delivery.js';
import { shipCloudflareApplication } from './ship.js';
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

export const DELIVERY_COMMANDS = [
  'register',
  'connect',
  'provision',
  'ship',
  'status',
  'manage',
  'verify',
  'rollback',
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
    provider: choice('--provider', ['cloudflare'], 'Only Cloudflare hosting is supported.'),
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
function releaseId(command: string, options: DeliveryOptions): string {
  if (!options.releaseId)
    throw commandArgumentError(command, 'Rollback requires --release <recorded-id>.');
  return options.releaseId;
}

async function cloudflareCommand(command: string, options: DeliveryOptions): Promise<unknown> {
  const { root, account, audience, emails, dryRun, refresh, local } = options;
  switch (command) {
    case 'register':
      return registerApplication(root);
    case 'connect':
      return connectApplication(root, account, audience, undefined, emails);
    case 'provision':
      return dryRun ? planProvisioning(root) : provisionApplication(root);
    case 'ship':
      return shipCloudflareApplication(root, dryRun);
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
  let result = await cloudflareCommand(command, options);
  if (command === 'status')
    result = { ...(result as object), operation: readLifecycleOperation(root) };
  return {
    result,
    blockedStates: ['configuration-required', 'provider-configuration-required'],
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
