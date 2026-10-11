#!/usr/bin/env node
import { runAdd, runRegistry } from './registry/commands.js';
import {
  registerManagedApplication,
  stageManagedVersion,
  saveManagedVersion,
  deployManagedVersion,
  managedApplicationStatus,
} from './managed-hosting.js';
import { setupRepository } from './repository.js';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import {
  registerVercelApplication,
  connectVercelApplication,
  planVercelDelivery,
  shipVercelApplication,
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
  planDelivery,
  shipApplication,
  applicationStatus,
  verifyApplication,
  rollbackApplication,
  recoverApplication,
} from './delivery.js';
import { planProvisioning, provisionApplication } from './provision.js';
import { writeManagementOverview } from './management.js';
import { inspectProviderReadiness } from './provider-readiness.js';
import { inspectProject } from './readiness.js';
import { argv } from 'node:process';
import { STANDARD_USAGE, parseStandardOptions, scaffoldStandardProject } from './standard.js';
import { GENERATOR_VERSION } from './version.js';
import { PostCommitError } from './transaction.js';

const [command, ...args] = argv.slice(2);
const json = args.includes('--json');

async function main(): Promise<void> {
  if ([undefined, '--help', '-h'].includes(command)) {
    console.log(json ? JSON.stringify({ usage: STANDARD_USAGE }) : STANDARD_USAGE);
    return;
  }
  if (['--version', '-v'].includes(command)) {
    console.log(json ? JSON.stringify({ version: GENERATOR_VERSION }) : GENERATOR_VERSION);
    return;
  }
  if (command === 'add') {
    await runAdd(args);
    return;
  }
  if (command === 'registry') {
    await runRegistry(args, json);
    return;
  }
  if (command === 'cloud') {
    await runCloud(args);
    return;
  }
  if (command === 'repository') {
    if (args.includes('--help') || args.includes('-h')) {
      console.log(STANDARD_USAGE);
      return;
    }
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
        if (!value || value.startsWith('-')) throw new Error('Missing repository option value.');
        if (flag === '--owner') {
          if (owner) throw new Error('Specify one GitHub owner.');
          owner = value;
        } else if (flag === '--name') {
          if (name) throw new Error('Specify one repository name.');
          name = value;
        } else {
          if (!['private', 'public'].includes(value))
            throw new Error('Visibility must be private or public.');
          visibility = value as 'private' | 'public';
        }
        continue;
      }
      if (flag.startsWith('-')) throw new Error('Unknown repository option.');
      directories.push(flag);
    }
    if (directories.length > 1) throw new Error('Specify one application directory.');
    console.log(
      JSON.stringify(
        await setupRepository(path.resolve(directories[0] ?? process.cwd()), {
          owner,
          name,
          visibility,
          create,
        }),
        null,
        2,
      ),
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
    throw new Error(
      `Unknown command: ${command}. Use new, init, add, registry, doctor, repository, cloud, register, connect, provision, ship, status, manage, verify, rollback, adopt, recover, --help, or --version.`,
    );
  }
  if (args.some((arg) => ['--help', '-h'].includes(arg))) {
    console.log(json ? JSON.stringify({ usage: STANDARD_USAGE }) : STANDARD_USAGE);
    return;
  }
  const options = readOptions(command, args);
  if (options) await scaffoldStandardProject(options);
}

async function runCloud(args: string[]): Promise<void> {
  const [action, ...flags] = args;
  if (!action || flags.includes('--help') || action === '--help') {
    console.log(
      'anhedral cloud register|stage|save|deploy|status [directory] [--artifact directory] [--version stage-id] [--audience private|public] [--json]',
    );
    return;
  }
  let artifact: string | undefined;
  let version: string | undefined;
  let audience: 'private' | 'public' = 'private';
  const directories: string[] = [];
  for (let index = 0; index < flags.length; index++) {
    const flag = flags[index];
    if (flag === '--json') continue;
    if (
      (flag === '--artifact' && action === 'stage') ||
      (flag === '--version' && ['save', 'deploy'].includes(action)) ||
      (flag === '--audience' && action === 'register')
    ) {
      const value = flags[++index];
      if (!value || value.startsWith('-')) throw new Error('Missing cloud option value.');
      if (flag === '--artifact') {
        if (artifact) throw new Error('Specify one artifact.');
        artifact = value;
      } else if (flag === '--version') {
        if (version) throw new Error('Specify one version.');
        version = value;
      } else {
        if (value !== 'private' && value !== 'public')
          throw new Error('Audience must be private or public.');
        audience = value;
      }
      continue;
    }
    if (flag.startsWith('-')) throw new Error('Unknown cloud option.');
    directories.push(flag);
  }
  if (directories.length > 1) throw new Error('Specify one application directory.');
  const root = path.resolve(directories[0] ?? process.cwd());
  let result: unknown;
  if (action === 'register') result = registerManagedApplication(root, audience);
  else if (action === 'stage') {
    if (!artifact) throw new Error('Stage requires --artifact <complete-build-directory>.');
    result = await stageManagedVersion(root, path.resolve(artifact));
  } else if (action === 'save' || action === 'deploy') {
    if (!version) throw new Error('Save/deploy requires --version <stage-id>.');
    result = await (action === 'save'
      ? saveManagedVersion(root, version)
      : deployManagedVersion(root, version));
  } else if (action === 'status') result = await managedApplicationStatus(root);
  else throw new Error('Unknown cloud action.');
  console.log(JSON.stringify(result, null, 2));
}

async function runDelivery(command: string, args: string[]): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(STANDARD_USAGE);
    return;
  }
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
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--provider') {
      const value = args[++index];
      if (!['vercel', 'cloudflare'].includes(value) || provider)
        throw new Error('Specify one provider: vercel or cloudflare.');
      provider = value as 'vercel' | 'cloudflare';
      continue;
    }
    if (command === 'connect' && arg === '--scope') {
      if (scope) throw new Error('Specify one Vercel scope.');
      scope = args[++index];
      if (!scope || scope.startsWith('-')) throw new Error('Missing Vercel scope.');
      continue;
    }
    if (command === 'connect' && arg === '--use') {
      const value = args[++index];
      if (!['personal', 'commercial'].includes(value) || use)
        throw new Error('Specify --use personal or commercial.');
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
      if (!releaseId || releaseId.startsWith('-')) throw new Error('Missing release ID.');
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
      if (account) throw new Error('Specify one account.');
      account = args[++index];
      if (!account || account.startsWith('-')) throw new Error('Missing account ID.');
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
      if (!email || email.startsWith('-')) throw new Error('Missing allowed email address.');
      emails.push(email);
      continue;
    }
    if (arg.startsWith('-')) throw new Error(`Unknown ${command} option: ${arg}`);
    positional.push(arg);
  }
  if (positional.length > 1) throw new Error('Specify at most one application directory.');
  const root = path.resolve(positional[0] ?? process.cwd());
  let result: unknown;
  const web =
    provider === 'vercel' ||
    (provider !== 'cloudflare' &&
      (existsSync(path.join(root, 'anhedral.web.json')) ||
        (command === 'register' &&
          existsSync(path.join(root, 'anhedral.setup.json')) &&
          JSON.parse(readFileSync(path.join(root, 'anhedral.setup.json'), 'utf8')).hosting ===
            'vercel')));
  if (web) {
    if (account || emails.length)
      throw new Error('Cloudflare account/member flags require --provider cloudflare.');
    if (command === 'register') result = registerVercelApplication(root);
    else if (command === 'connect') {
      if (!audience || !use)
        throw new Error(
          'Vercel connect requires --audience public|private and --use personal|commercial.',
        );
      result = await connectVercelApplication(root, { scope, audience, use, create, git });
    } else if (command === 'ship')
      result = args.includes('--dry-run')
        ? planVercelDelivery(root)
        : await shipVercelApplication(root);
    else if (command === 'adopt') result = await adoptVercelApplication(root);
    else if (command === 'recover') result = await recoverVercelApplication(root);
    else if (command === 'verify') result = await verifyVercelApplication(root);
    else if (command === 'rollback') {
      if (!releaseId) throw new Error('Rollback requires --release <recorded-id>.');
      result = await rollbackVercelApplication(root, releaseId, args.includes('--data-compatible'));
    } else if (command === 'status')
      result = await vercelApplicationStatus(root, args.includes('--refresh'));
    else if (command === 'manage') {
      const snapshot = await vercelApplicationStatus(root, !args.includes('--local'));
      result = { file: writeVercelOverview(root, snapshot), evidence: snapshot.evidence };
    } else
      throw new Error(
        'Vercel project creation is handled by connect --create; Cloudflare resource provisioning requires --provider cloudflare.',
      );
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (scope || use || create || git)
    throw new Error('Vercel connect options require a Vercel web manifest or --provider vercel.');
  if (command === 'register') result = registerApplication(root);
  else if (command === 'connect') {
    result = await connectApplication(root, account, audience, undefined, emails);
  } else if (command === 'provision')
    result = args.includes('--dry-run') ? planProvisioning(root) : await provisionApplication(root);
  else if (command === 'ship')
    result = args.includes('--dry-run') ? planDelivery(root) : await shipApplication(root);
  else if (command === 'adopt')
    throw new Error('Git deployment adoption requires --provider vercel.');
  else if (command === 'recover') result = await recoverApplication(root);
  else if (command === 'verify') result = await verifyApplication(root);
  else if (command === 'rollback') {
    if (!releaseId) throw new Error('Rollback requires --release <recorded-id>.');
    result = await rollbackApplication(root, releaseId, args.includes('--data-compatible'));
  } else if (command === 'manage') {
    const snapshot = await applicationStatus(root, !args.includes('--local'));
    result = { file: writeManagementOverview(root, snapshot), evidence: snapshot.evidence };
  } else result = await applicationStatus(root, args.includes('--refresh'));
  console.log(JSON.stringify(result, null, 2));
}

async function runDoctor(args: string[]): Promise<void> {
  const positional = args.filter((arg) => arg !== '--json' && arg !== '--providers');
  if (positional.length > 1 || positional.some((arg) => arg.startsWith('-')))
    throw new Error('Usage: anhedral doctor [directory] [--providers] [--json]');
  const root = path.resolve(positional[0] ?? process.cwd());
  const report = args.includes('--providers')
    ? await inspectProviderReadiness(root)
    : inspectProject(root);
  console.log(JSON.stringify(report, null, json ? 2 : undefined));
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
      json ? JSON.stringify({ error: message, code: 'INVALID_ARGUMENT' }) : `Error: ${message}`,
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
    error instanceof PostCommitError
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
          ].includes(command ?? '')
        ? 'DELIVERY_FAILED'
        : command === 'cloud'
          ? 'HOSTING_FAILED'
          : command === 'doctor'
            ? 'INVALID_ARGUMENT'
            : command === 'new' || command === 'init'
              ? 'GENERATION_FAILED'
              : command === 'add'
                ? 'ADDITION_FAILED'
                : command === 'registry'
                  ? 'REGISTRY_FAILED'
                  : 'UNKNOWN_COMMAND';
  console.error(json ? JSON.stringify({ error: message, code }) : `Error: ${message}`);
  process.exitCode = 1;
}
