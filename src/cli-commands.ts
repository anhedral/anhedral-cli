import path from 'node:path';
import { commandArguments, commandArgumentError } from './cli-arguments.js';
import { printResult, type OutputOptions } from './cli-output.js';
import { DELIVERY_COMMANDS, runDelivery } from './cli-delivery.js';
import { runServiceCommand } from './services-command.js';
import { inspectApplication } from './project-inspector.js';
import { integrationStatus, recoverIntegrationResource } from './providers/recovery.js';
import { INTEGRATION_PROVIDERS, type IntegrationProvider } from './providers/config.js';
import { authenticateProviders } from './provider-auth.js';
import { setupRepository } from './repository.js';
import { inspectProviderReadiness } from './provider-readiness.js';
import { inspectProject } from './readiness.js';
import { parseStandardOptions, scaffoldStandardProject } from './standard.js';
import { runAdd, runRegistry } from './registry/commands.js';

type Arguments = ReturnType<typeof commandArguments>;
type Handler = (args: string[], output: OutputOptions) => Promise<void>;

function projectRoot(command: string, options: Arguments): string {
  if (options.positional.length > 1)
    throw commandArgumentError(command, 'Specify one application directory.');
  return path.resolve(options.positional[0] ?? process.cwd());
}

async function runInspect(args: string[], output: OutputOptions) {
  const options = commandArguments('inspect', args);
  if (options.positional.length > 1)
    throw commandArgumentError('inspect', 'Specify at most one project directory.');
  printResult('inspect', inspectApplication(projectRoot('inspect', options)), output);
}

async function runIntegrations(args: string[], output: OutputOptions) {
  const options = commandArguments('integrations', args);
  const action = options.positional.shift();
  const root = projectRoot('integrations', options);
  if (action === 'status') {
    if (['--provider', '--operation', '--resource'].some(options.has))
      throw commandArgumentError('integrations', 'Integration status accepts no recovery options.');
    printResult('integrations', integrationStatus(root), output);
    return;
  }
  if (action !== 'recover')
    throw commandArgumentError('integrations', 'Use integrations status or integrations recover.');
  const provider = options.value('--provider') as IntegrationProvider;
  const operation = options.value('--operation');
  const resourceId = options.value('--resource');
  if (!INTEGRATION_PROVIDERS.includes(provider) || !operation || !resourceId)
    throw commandArgumentError(
      'integrations',
      'Recovery requires --provider, --operation and --resource.',
    );
  printResult(
    'integrations',
    await recoverIntegrationResource(root, { provider, operation, resourceId }),
    output,
  );
}

async function runAuth(args: string[], output: OutputOptions) {
  const options = commandArguments('auth', args);
  const result = await authenticateProviders(projectRoot('auth', options), {
    provider: options.value('--provider'),
    status: options.has('--status'),
    interactive:
      !output.json &&
      !output.quiet &&
      !options.has('--non-interactive') &&
      Boolean(process.stdin.isTTY),
  });
  printResult('auth', result, output);
  if (!result.authenticated) process.exitCode = 1;
}

async function runRepository(args: string[], output: OutputOptions) {
  const options = commandArguments('repository', args);
  const visibility = options.value('--visibility') ?? 'private';
  if (visibility !== 'private' && visibility !== 'public')
    throw commandArgumentError('repository', 'Visibility must be private or public.');
  printResult(
    'repository',
    await setupRepository(projectRoot('repository', options), {
      owner: options.value('--owner'),
      name: options.value('--name'),
      visibility,
      create: options.has('--create'),
    }),
    output,
  );
}

async function runDoctor(args: string[], output: OutputOptions) {
  const options = commandArguments('doctor', args);
  const root = projectRoot('doctor', options);
  const report = options.has('--providers')
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

async function runInit(args: string[], output: OutputOptions) {
  let options;
  try {
    options = parseStandardOptions(args);
  } catch (error) {
    throw commandArgumentError('init', error instanceof Error ? error.message : String(error));
  }
  await scaffoldStandardProject(options, undefined, output);
}

const handlers: Readonly<Record<string, Handler>> = {
  init: runInit,
  inspect: runInspect,
  integrations: runIntegrations,
  auth: runAuth,
  repository: runRepository,
  doctor: runDoctor,
  services: async (args, output) =>
    printResult('services', await runServiceCommand(process.cwd(), args), output),
  add: runAdd,
  registry: (args, output) => runRegistry(args, Boolean(output.json), output),
  ...Object.fromEntries(
    DELIVERY_COMMANDS.map((command) => [
      command,
      (args: string[], output: OutputOptions) => runDelivery(command, args, output),
    ]),
  ),
};

/** Dispatch only after global help, output mode and working-directory handling. */
export async function runCommand(
  command: string,
  args: string[],
  output: OutputOptions,
): Promise<void> {
  const handler = Object.hasOwn(handlers, command) ? handlers[command] : undefined;
  if (!handler) throw commandArgumentError(command, 'Unknown command. Run anhedral --help.');
  await handler(args, output);
}
