#!/usr/bin/env node
import { runServiceCommand } from './services-command.js';
import {
  shipCloudflareApplication,
  shipSelectedVercelApplication,
  shipSelectedStack,
} from './ship.js';
import { integrationStatus, recoverIntegrationResource } from './providers/recovery.js';
import { INTEGRATION_PROVIDERS, type IntegrationProvider } from './providers/config.js';
import { recoverDeliveryLock } from './project-state.js';
import { readLifecycleOperation } from './lifecycle.js';
import { buildMobileApplication } from './mobile-delivery.js';
import { authenticateProviders } from './provider-auth.js';
import { runAdd, runRegistry } from './registry/commands.js';
import { setupRepository } from './repository.js';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
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
import {
  registerApplication,
  connectApplication,
  applicationStatus,
  verifyApplication,
  rollbackApplication,
  recoverApplication,
} from './delivery.js';
import { planProvisioning, provisionApplication } from './provision.js';
import { writeManagementOverview } from './management.js';
import { inspectProviderReadiness } from './provider-readiness.js';
import { inspectProject } from './readiness.js';
import { inspectApplication } from './project-inspector.js';
import { argv } from 'node:process';
import { STANDARD_USAGE, parseStandardOptions, scaffoldStandardProject } from './standard.js';
import { GENERATOR_VERSION } from './version.js';
import { PostCommitError } from './transaction.js';
import {
  CliArgumentError,
  globalArguments,
  inlineArguments,
  validateCommand,
} from './cli-arguments.js';
import { printResult, type OutputOptions } from './cli-output.js';
import { commandHelp } from './registry/usage.js';

let [command, ...args] = argv.slice(2);
let json = argv.includes('--json');
let output: OutputOptions = { json };

function argumentError(message: string): CliArgumentError {
  return new CliArgumentError(
    message,
    `Run anhedral ${command && commandHelp(command) ? command + ' ' : ''}--help.`,
  );
}

async function main(): Promise<void> {
  const global = globalArguments(argv.slice(2));
  [command, ...args] = global.args;
  json = global.json;
  if (json) args.push('--json');
  args = inlineArguments(command, args);
  output = { json, quiet: global.quiet };
  if (
    [undefined, '--help', '-h', 'help'].includes(command) ||
    args.includes('--help') ||
    args.includes('-h')
  ) {
    const target =
      command === 'help'
        ? args.filter((arg) => arg !== '--json')[0]
        : ['--help', '-h'].includes(command)
          ? undefined
          : command;
    const help = target ? commandHelp(target) : STANDARD_USAGE;
    if (!help) throw new CliArgumentError('Unknown help topic.', 'Run anhedral --help.');
    console.log(json ? JSON.stringify({ usage: help }) : help);
    return;
  }
  validateCommand(command, args);
  if (['--version', '-v'].includes(command)) {
    console.log(json ? JSON.stringify({ version: GENERATOR_VERSION }) : GENERATOR_VERSION);
    return;
  }
  if (global.cwd) {
    try {
      process.chdir(global.cwd);
    } catch {
      throw new CliArgumentError(
        'Working directory is unavailable.',
        'Choose an existing directory with --cwd <directory>.',
      );
    }
  }
  if (global.quiet || json) process.env.ANHEDRAL_QUIET = '1';
  if (global.verbose && !json && !global.quiet) process.env.ANHEDRAL_VERBOSE = '1';
  if (command === 'services') {
    printResult(command, await runServiceCommand(process.cwd(), args), output);
    return;
  }
  if (command === 'inspect') {
    const directories = args.filter((arg) => arg !== '--json');
    if (directories.length > 1 || directories.some((arg) => arg.startsWith('-')))
      throw argumentError('Specify at most one project directory.');
    printResult(command, inspectApplication(path.resolve(directories[0] ?? process.cwd())), output);
    return;
  }
  if (command === 'integrations') {
    const [action, ...input] = args.filter((arg) => arg !== '--json');
    const directories: string[] = [];
    const options: Record<string, string> = {};
    for (let index = 0; index < input.length; index++) {
      const flag = input[index];
      if (['--provider', '--operation', '--resource'].includes(flag))
        options[flag] = input[++index];
      else if (flag.startsWith('-')) throw argumentError('Unknown integration option.');
      else directories.push(flag);
    }
    if (directories.length > 1) throw argumentError('Specify one application directory.');
    const root = path.resolve(directories[0] ?? process.cwd());
    if (action === 'status') {
      if (Object.keys(options).length)
        throw argumentError('Integration status accepts no recovery options.');
      printResult(command, integrationStatus(root), output);
    } else if (action === 'recover') {
      if (
        !INTEGRATION_PROVIDERS.includes(options['--provider'] as IntegrationProvider) ||
        !options['--operation'] ||
        !options['--resource']
      )
        throw argumentError('Recovery requires --provider, --operation and --resource.');
      printResult(
        command,
        await recoverIntegrationResource(root, {
          provider: options['--provider'] as IntegrationProvider,
          operation: options['--operation'],
          resourceId: options['--resource'],
        }),
        output,
      );
    } else throw argumentError('Use integrations status or integrations recover.');
    return;
  }
  if (command === 'auth') {
    let provider: string | undefined;
    const directories: string[] = [];
    for (let index = 0; index < args.length; index++) {
      const flag = args[index];
      if (['--json', '--status', '--non-interactive'].includes(flag)) continue;
      if (flag === '--provider') {
        const value = args[++index];
        if (provider || !value || value.startsWith('-'))
          throw argumentError('Specify one auth provider.');
        provider = value;
      } else if (flag.startsWith('-')) throw argumentError('Unknown auth option.');
      else directories.push(flag);
    }
    if (directories.length > 1) throw argumentError('Specify one application directory.');
    const result = await authenticateProviders(path.resolve(directories[0] ?? process.cwd()), {
      provider,
      status: args.includes('--status'),
      interactive:
        !json &&
        !output.quiet &&
        !args.includes('--non-interactive') &&
        Boolean(process.stdin.isTTY),
    });
    printResult('auth', result, output);
    if (!result.authenticated) process.exitCode = 1;
    return;
  }
  if (command === 'add') {
    await runAdd(args, output);
    return;
  }
  if (command === 'registry') {
    await runRegistry(args, json, output);
    return;
  }
  if (command === 'repository') {
    let owner: string | undefined;
    let name: string | undefined;
    let visibility: 'private' | 'public' = 'private';
    let create = false;
    const directories: string[] = [];
    for (let index = 0; index < args.length; index++) {
      const flag = args[index];
      if (flag === '--json') continue;
      if (flag === '--create') {
        create = true;
        continue;
      }
      if (flag === '--owner' || flag === '--name' || flag === '--visibility') {
        const value = args[++index];
        if (!value || value.startsWith('-'))
          throw argumentError('Missing repository option value.');
        if (flag === '--owner') {
          if (owner) throw argumentError('Specify one GitHub owner.');
          owner = value;
        } else if (flag === '--name') {
          if (name) throw argumentError('Specify one repository name.');
          name = value;
        } else {
          if (!['private', 'public'].includes(value))
            throw argumentError('Visibility must be private or public.');
          visibility = value as 'private' | 'public';
        }
        continue;
      }
      if (flag.startsWith('-')) throw argumentError('Unknown repository option.');
      directories.push(flag);
    }
    if (directories.length > 1) throw argumentError('Specify one application directory.');
    printResult(
      'repository',
      await setupRepository(path.resolve(directories[0] ?? process.cwd()), {
        owner,
        name,
        visibility,
        create,
      }),
      output,
    );
    return;
  }
  if (
    [
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
    ].includes(command ?? '')
  ) {
    await runDelivery(command!, args);
    return;
  }
  if (command === 'doctor') {
    await runDoctor(args);
    return;
  }
  if (command !== 'new' && command !== 'init') {
    throw argumentError(
      `Unknown command: ${command}. Use init, auth, ship, add, registry, inspect, doctor, repository, register, connect, provision, status, manage, verify, rollback, adopt, recover, new, --help, or --version.`,
    );
  }
  const options = readOptions(command, args);
  if (options) await scaffoldStandardProject(options, undefined, output);
}

async function runDelivery(command: string, args: string[]): Promise<void> {
  const positional: string[] = [];
  let account: string | undefined;
  let audience: 'public' | 'private' | undefined;
  const emails: string[] = [];
  let releaseId: string | undefined;
  let provider: 'vercel' | 'cloudflare' | undefined;
  let scope: string | undefined;
  let use: 'personal' | 'commercial' | undefined;
  let create = false;
  let git = false;
  let platform: 'ios' | 'android' | undefined;
  let profile: string | undefined;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (command === 'ship' && (arg === '--platform' || arg === '--profile')) {
      const value = args[++index];
      if (!value || value.startsWith('-')) throw argumentError('Missing mobile build option.');
      if (arg === '--platform') {
        if (platform || !['ios', 'android'].includes(value))
          throw argumentError('Select one mobile platform.');
        platform = value as 'ios' | 'android';
      } else {
        if (profile) throw argumentError('Select one build profile.');
        profile = value;
      }
      continue;
    }
    if (command === 'recover' && arg === '--lock') continue;
    if (arg === '--provider') {
      const value = args[++index];
      if (!['vercel', 'cloudflare'].includes(value) || provider)
        throw argumentError('Specify one provider: vercel or cloudflare.');
      provider = value as 'vercel' | 'cloudflare';
      continue;
    }
    if (command === 'connect' && arg === '--scope') {
      if (scope) throw argumentError('Specify one Vercel scope.');
      scope = args[++index];
      if (!scope || scope.startsWith('-')) throw argumentError('Missing Vercel scope.');
      continue;
    }
    if (command === 'connect' && arg === '--use') {
      const value = args[++index];
      if (!['personal', 'commercial'].includes(value) || use)
        throw argumentError('Specify --use personal or commercial.');
      use = value as 'personal' | 'commercial';
      continue;
    }
    if (command === 'connect' && arg === '--git') {
      git = true;
      continue;
    }
    if (command === 'connect' && arg === '--create') {
      create = true;
      continue;
    }
    if (command === 'rollback' && arg === '--release') {
      releaseId = args[++index];
      if (!releaseId || releaseId.startsWith('-')) throw argumentError('Missing release ID.');
      continue;
    }
    if (command === 'rollback' && arg === '--data-compatible') continue;
    if (
      arg === '--json' ||
      (['ship', 'provision'].includes(command) && arg === '--dry-run') ||
      (['status', 'manage', 'verify', 'rollback', 'adopt', 'recover'].includes(command) &&
        arg === '--refresh') ||
      (command === 'manage' && arg === '--local')
    )
      continue;
    if (command === 'connect' && arg === '--account') {
      if (account) throw argumentError('Specify one account.');
      account = args[++index];
      if (!account || account.startsWith('-')) throw argumentError('Missing account ID.');
      continue;
    }
    if (
      command === 'connect' &&
      arg === '--audience' &&
      ['public', 'private'].includes(args[index + 1])
    ) {
      audience = args[index + 1] as 'public' | 'private';
      index++;
      continue;
    }
    if (command === 'connect' && arg === '--allow-email') {
      const email = args[++index];
      if (!email || email.startsWith('-')) throw argumentError('Missing allowed email address.');
      emails.push(email);
      continue;
    }
    if (arg.startsWith('-')) throw argumentError(`Unknown ${command} option: ${arg}`);
    positional.push(arg);
  }
  if (positional.length > 1) throw argumentError('Specify at most one application directory.');
  const root = path.resolve(positional[0] ?? process.cwd());
  let result: unknown;
  if (command === 'recover' && args.includes('--lock')) {
    if (provider || args.includes('--refresh'))
      throw argumentError(
        'Local lock recovery cannot be combined with provider recovery or --refresh.',
      );
    printResult(command, recoverDeliveryLock(root), output);
    return;
  }
  if (platform || profile) {
    if (!platform || !profile || provider)
      throw argumentError('Mobile shipping requires --platform and --profile, without --provider.');
    result = await buildMobileApplication(root, {
      platform,
      profile,
      dryRun: args.includes('--dry-run'),
    });
    printResult(command, result, output);
    if (
      result &&
      typeof result === 'object' &&
      'state' in result &&
      ['configuration-required', 'provider-configuration-required'].includes(String(result.state))
    )
      process.exitCode = 1;
    return;
  }
  const web =
    provider === 'vercel' ||
    (provider !== 'cloudflare' &&
      (existsSync(path.join(root, 'anhedral.web.json')) ||
        (command === 'register' &&
          existsSync(path.join(root, 'anhedral.setup.json')) &&
          JSON.parse(readFileSync(path.join(root, 'anhedral.setup.json'), 'utf8')).hosting ===
            'vercel')));
  if (command === 'ship' && !provider) {
    result = await shipSelectedStack(root, args.includes('--dry-run'));
    printResult(command, result, output);
    if (
      result &&
      typeof result === 'object' &&
      'state' in result &&
      ['configuration-required', 'provider-configuration-required', 'partial'].includes(
        String(result.state),
      )
    )
      process.exitCode = 1;
    return;
  }
  if (web) {
    if (account || emails.length)
      throw argumentError('Cloudflare account/member flags require --provider cloudflare.');
    if (command === 'register') result = registerVercelApplication(root);
    else if (command === 'connect') {
      if (!audience || !use)
        throw argumentError(
          'Vercel connect requires --audience public|private and --use personal|commercial.',
        );
      result = await connectVercelApplication(root, { scope, audience, use, create, git });
    } else if (command === 'ship')
      result = await shipSelectedVercelApplication(root, args.includes('--dry-run'));
    else if (command === 'adopt') result = await adoptVercelApplication(root);
    else if (command === 'recover') result = await recoverVercelApplication(root);
    else if (command === 'verify') result = await verifyVercelApplication(root);
    else if (command === 'rollback') {
      if (!releaseId) throw argumentError('Rollback requires --release <recorded-id>.');
      result = await rollbackVercelApplication(root, releaseId, args.includes('--data-compatible'));
    } else if (command === 'status')
      result = await vercelApplicationStatus(root, args.includes('--refresh'));
    else if (command === 'manage') {
      const snapshot = await vercelApplicationStatus(root, !args.includes('--local'));
      result = { file: writeVercelOverview(root, snapshot), evidence: snapshot.evidence };
    } else
      throw argumentError(
        'Vercel project creation is handled by connect --create; Cloudflare resource provisioning requires --provider cloudflare.',
      );
    if (command === 'status')
      result = { ...(result as object), operation: readLifecycleOperation(root) };
    printResult(command, result, output);
    if (
      result &&
      typeof result === 'object' &&
      'state' in result &&
      result.state === 'provider-configuration-required'
    )
      process.exitCode = 1;
    return;
  }
  if (scope || use || create || git)
    throw argumentError(
      'Vercel connect options require a Vercel web manifest or --provider vercel.',
    );
  if (command === 'register') result = registerApplication(root);
  else if (command === 'connect') {
    result = await connectApplication(root, account, audience, undefined, emails);
  } else if (command === 'provision')
    result = args.includes('--dry-run') ? planProvisioning(root) : await provisionApplication(root);
  else if (command === 'ship')
    result = await shipCloudflareApplication(root, args.includes('--dry-run'));
  else if (command === 'adopt')
    throw argumentError('Git deployment adoption requires --provider vercel.');
  else if (command === 'recover') result = await recoverApplication(root);
  else if (command === 'verify') result = await verifyApplication(root);
  else if (command === 'rollback') {
    if (!releaseId) throw argumentError('Rollback requires --release <recorded-id>.');
    result = await rollbackApplication(root, releaseId, args.includes('--data-compatible'));
  } else if (command === 'manage') {
    const snapshot = await applicationStatus(root, !args.includes('--local'));
    result = { file: writeManagementOverview(root, snapshot), evidence: snapshot.evidence };
  } else result = await applicationStatus(root, args.includes('--refresh'));
  if (command === 'status')
    result = { ...(result as object), operation: readLifecycleOperation(root) };
  printResult(command, result, output);
  if (
    result &&
    typeof result === 'object' &&
    'state' in result &&
    ['configuration-required', 'provider-configuration-required'].includes(String(result.state))
  )
    process.exitCode = 1;
}

async function runDoctor(args: string[]): Promise<void> {
  const positional = args.filter((arg) => arg !== '--json' && arg !== '--providers');
  if (positional.length > 1 || positional.some((arg) => arg.startsWith('-')))
    throw argumentError('Usage: anhedral doctor [directory] [--providers] [--json]');
  const root = path.resolve(positional[0] ?? process.cwd());
  const report = args.includes('--providers')
    ? await inspectProviderReadiness(root)
    : inspectProject(root);
  printResult('doctor', report, output);
  if (
    !report.localReady ||
    ('prerequisitesReady' in report &&
      (!report.prerequisitesReady || report.providerVerification !== 'verified-existing-context'))
  )
    process.exitCode = 1;
}

function readOptions(command: 'new' | 'init', args: string[]) {
  try {
    return parseStandardOptions(command, args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      json
        ? JSON.stringify({
            error: message,
            code: 'INVALID_ARGUMENT',
            nextAction: `Run anhedral ${command} --help.`,
          })
        : `Error: ${message}\nNext: Run anhedral ${command} --help.`,
    );
    process.exitCode = 1;
    return;
  }
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const code =
    error instanceof CliArgumentError
      ? error.code
      : error instanceof PostCommitError
        ? 'POST_COMMIT_FAILED'
        : [
              'repository',
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
              'integrations',
            ].includes(command ?? '')
          ? 'DELIVERY_FAILED'
          : command === 'auth'
            ? 'AUTH_FAILED'
            : command === 'doctor'
              ? 'INVALID_ARGUMENT'
              : command === 'new' || command === 'init'
                ? 'GENERATION_FAILED'
                : command === 'add'
                  ? 'ADDITION_FAILED'
                  : command === 'registry'
                    ? 'REGISTRY_FAILED'
                    : 'UNKNOWN_COMMAND';
  const nextAction =
    error instanceof CliArgumentError
      ? error.nextAction
      : `Run anhedral ${command && commandHelp(command) ? command + ' ' : ''}--help.`;
  console.error(
    json
      ? JSON.stringify({ error: message, code, nextAction })
      : `Error: ${message}\nNext: ${nextAction}`,
  );
  process.exitCode = 1;
}
